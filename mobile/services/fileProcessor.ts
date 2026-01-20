
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

let pdfjsLib: any = null;

async function ensurePdfLib() {
    try {
        if (!pdfjsLib) {
            pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                pdfjsLib.GlobalWorkerOptions.disableWorker = true;
            }
        }
    } catch (err) {
        console.error("PDF library load error:", err);
        throw new Error("PDF engine failed to start.");
    }
}

export async function processFile(asset: { uri: string; name: string; mimeType?: string }): Promise<{ title: string; content: string[]; cover?: string }> {
    const extension = asset.name.split('.').pop()?.toLowerCase();

    try {
        if (extension === 'pdf') {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as any });
            return { title: asset.name, content: [], pdfBase64: base64 } as any;
        } else if (extension === 'epub') {
            return await processEPUB(asset.uri, asset.name);
        } else if (extension === 'txt') {
            const text = await FileSystem.readAsStringAsync(asset.uri);
            return { title: asset.name, content: text.trim().split(/\s+/) };
        } else {
            throw new Error('Unsupported format: ' + extension);
        }
    } catch (err) {
        console.error("Processing error:", err);
        throw err;
    }
}

async function processPDF(uri: string, filename: string): Promise<{ title: string; content: string[]; cover?: string }> {
    let pdf: any = null;
    let dataPtr: Uint8Array | null = null;
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists && (fileInfo.size || 0) > 30 * 1024 * 1024) {
            throw new Error("File too large (>30MB).");
        }

        // NO-BUFFER STRATEGY: Read and immediately convert
        let base64: string | null = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
        dataPtr = new Uint8Array(Buffer.from(base64, 'base64'));
        base64 = null; // Kill the large string immediately

        const loadingTask = pdfjsLib.getDocument({
            data: dataPtr,
            disableWorker: true,
            verbosity: 0,
            stopAtErrors: false,
            disableFontFace: true,
            cMapPacked: true
        });

        pdf = await loadingTask.promise;
        dataPtr = null; // Kill the buffer once loaded into PDF engine

        const words: string[] = [];
        const maxPages = Math.min(pdf.numPages, 1200);

        for (let i = 1; i <= maxPages; i++) {
            let page: any = null;
            try {
                page = await pdf.getPage(i);
                // Get page height for header/footer filtering
                const viewport = page.getViewport({ scale: 1.0 });
                const height = viewport.height;
                const headerThreshold = height * 0.93; // Top 7%
                const footerThreshold = height * 0.07; // Bottom 7%

                const textContent = await page.getTextContent();

                for (const item of (textContent.items as any[])) {
                    // Filter based on Vertical Position (item.transform[5] is Y)
                    // PDF coordinates: (0,0) is usually bottom-left
                    const y = item.transform[5];

                    // Skip potential Headers and Footers
                    if (y > headerThreshold || y < footerThreshold) continue;

                    if (item.str) {
                        // Skip likely page numbers (single or double digits in isolation)
                        if (/^\s*\d+\s*$/.test(item.str) || /^\s*Page\s+\d+\s*$/i.test(item.str)) continue;

                        const chunks = item.str.trim().split(/\s+/);
                        for (const w of chunks) {
                            if (w) words.push(w);
                        }
                    }
                }
            } catch (pageErr) {
                console.warn(`Page ${i} skip`);
            } finally {
                if (page) {
                    (page as any)._destroy?.();
                    page = null;
                }
            }
            // Memory guard for massive text extraction
            if (words.length > 600000) break;
        }

        if (words.length === 0) throw new Error("No readable text.");

        return { title: filename.replace('.pdf', ''), content: words };
    } catch (err) {
        throw new Error(`PDF Error: ${(err as Error).message}`);
    } finally {
        if (pdf) {
            try {
                await pdf.destroy();
                await pdf.cleanup();
            } catch (e) { }
            pdf = null;
        }
        dataPtr = null;
    }
}

async function processEPUB(uri: string, filename: string): Promise<{ title: string; content: string[]; cover?: string }> {
    let base64: string | null = null;
    try {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
        const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
        base64 = null; // Kill string

        const containerXml = await zip.file("META-INF/container.xml")?.async("string");
        if (!containerXml) throw new Error("Invalid EPUB");

        const fullPathMatch = containerXml.match(/full-path="([^"]+)"/);
        const opfPath = fullPathMatch ? fullPathMatch[1] : "";
        const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
        const opfContent = await zip.file(opfPath)?.async("string");
        if (!opfContent) throw new Error("Manifest error");

        let title = filename.replace('.epub', '');
        const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (titleMatch) title = titleMatch[1];

        const manifest: Record<string, string> = {};
        const items = opfContent.match(/<item\s+[^>]*>/gi) || [];
        items.forEach(tag => {
            const id = tag.match(/id="([^"]+)"/i)?.[1];
            const href = tag.match(/href="([^"]+)"/i)?.[1];
            if (id && href) manifest[id] = href;
        });

        const spineHrefs: string[] = [];
        const itemrefs = opfContent.match(/<itemref\s+[^>]*>/gi) || [];
        itemrefs.forEach(tag => {
            const idref = tag.match(/idref="([^"]+)"/i)?.[1];
            if (idref && manifest[idref]) spineHrefs.push(manifest[idref]);
        });

        let words: string[] = [];
        for (let i = 0; i < Math.min(spineHrefs.length, 1500); i++) {
            const file = zip.file(opfDir + spineHrefs[i]) || zip.file(decodeURI(opfDir + spineHrefs[i])) || zip.file(spineHrefs[i]);
            if (file) {
                const html = await file.async("string");

                // Pre-process HTML to remove footnotes, page numbers, and markers
                const cleanedHtml = html
                    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // Remove superscript (footnote markers)
                    .replace(/<[^>]*epub:type="pagebreak"[^>]*>.*?<\/[^>]*>/gi, "") // Remove page numbers
                    .replace(/<div[^>]*class="[^"]*footnote[^"]*"[^>]*>.*?<\/div>/gi, "") // Remove footnote divs
                    .replace(/<head[\s\S]*?<\/head>/gi, "")
                    .replace(/<style[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                const sectionWords = cleanedHtml.split(/\s+/);
                for (const w of sectionWords) {
                    // Filter purely numeric "words" that might be left-over page numbers
                    if (!/^\d+$/.test(w) && w) words.push(w);
                }
            }
        }

        if (words.length === 0) throw new Error("No text");

        let cover: string | undefined = undefined;
        try {
            // Find cover item in manifest
            const metaCoverId = opfContent.match(/<meta[^>]+name="cover"[^>]+content="([^"]+)"/i)?.[1];
            let coverHref = metaCoverId ? manifest[metaCoverId] : "";

            if (!coverHref) {
                const coverItem = items.find(tag => {
                    const t = tag.toLowerCase();
                    return (t.includes('cover') || t.includes('id="img')) && t.includes('image/');
                });
                if (coverItem) coverHref = coverItem.match(/href="([^"]+)"/i)?.[1] || "";
            }

            if (coverHref) {
                const coverFile = zip.file(opfDir + coverHref) || zip.file(decodeURI(opfDir + coverHref)) || zip.file(coverHref);
                if (coverFile) {
                    const coverBase64 = await coverFile.async("base64");
                    const ext = coverHref.split('.').pop()?.toLowerCase() || 'jpeg';
                    // Check if it's a valid image (not SVG)
                    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                        cover = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${coverBase64.replace(/\s/g, "")}`;
                    }
                }
            }
        } catch (e) { }

        return { title, content: words, cover };
    } catch (err) {
        throw new Error("EPUB Error: " + (err as Error).message);
    } finally {
        base64 = null;
    }
}
