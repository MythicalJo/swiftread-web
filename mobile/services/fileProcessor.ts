
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

let pdfjsLib: any = null;

async function ensurePdfLib() {
    try {
        if (!pdfjsLib) {
            if (Platform.OS === 'web') {
                console.log("Checking for global pdfjsLib...");
                // @ts-ignore
                pdfjsLib = window.pdfjsLib;
                if (!pdfjsLib) {
                    console.log("Global pdfjsLib not found, falling back to require...");
                    pdfjsLib = require('pdfjs-dist/build/pdf');
                }
            } else {
                pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
            }

            if (pdfjsLib) {
                console.log("PDF engine found, version:", pdfjsLib.version);
                if (pdfjsLib.GlobalWorkerOptions) {
                    if (Platform.OS === 'web') {
                        const version = pdfjsLib.version || '2.16.105';
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
                        console.log("Set web worker source:", pdfjsLib.GlobalWorkerOptions.workerSrc);
                    } else {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                        pdfjsLib.GlobalWorkerOptions.disableWorker = true;
                    }
                }
            } else {
                throw new Error("PDF engine not found.");
            }
        }
    } catch (err) {
        console.error("PDF Library Error Details:", err);
        throw new Error("PDF engine failed to start.");
    }
}

export async function processFile(asset: any): Promise<{ title: string; content: string[]; cover?: string; pdfBase64?: string }> {
    const extension = asset.name.split('.').pop()?.toLowerCase();

    try {
        if (Platform.OS === 'web') {
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if (extension === 'pdf') {
                await ensurePdfLib();
                return await processPDFFromBuffer(buffer, asset.name);
            } else if (extension === 'epub') {
                return await processEPUBFromBuffer(buffer, asset.name);
            } else if (extension === 'txt') {
                const text = new TextDecoder().decode(arrayBuffer);
                return { title: asset.name, content: text.trim().split(/\s+/) };
            }
        }

        // Native/Fallback
        if (extension === 'pdf') {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as any });
            // Return base64 so App.tsx can use PdfParser component (WebView) on mobile
            return { title: asset.name, content: [], pdfBase64: base64 };
        } else if (extension === 'epub') {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as any });
            const buffer = Buffer.from(base64, 'base64');
            return await processEPUBFromBuffer(buffer, asset.name);
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

async function processPDFFromBuffer(buffer: Buffer, filename: string): Promise<{ title: string; content: string[]; cover?: string }> {
    let pdf: any = null;
    try {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            verbosity: 0,
            stopAtErrors: false,
            disableFontFace: true,
            cMapPacked: true
        });

        pdf = await loadingTask.promise;
        const result = await extractFromPdf(pdf, filename);
        return result;
    } catch (err) {
        throw new Error(`PDF Error: ${(err as Error).message}`);
    } finally {
        if (pdf) {
            try { await pdf.destroy(); } catch (e) { }
        }
    }
}

async function extractFromPdf(pdf: any, filename: string): Promise<{ title: string; content: string[]; cover?: string }> {
    const words: string[] = [];
    const maxPages = Math.min(pdf.numPages, 1200);

    for (let i = 1; i <= maxPages; i++) {
        let page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const height = viewport.height;
        const headerThreshold = height * 0.93;
        const footerThreshold = height * 0.07;

        const textContent = await page.getTextContent();
        for (const item of (textContent.items as any[])) {
            const y = item.transform[5];
            if (y > headerThreshold || y < footerThreshold) continue;
            if (item.str) {
                if (/^\s*\d+\s*$/.test(item.str) || /^\s*Page\s+\d+\s*$/i.test(item.str)) continue;
                const chunks = item.str.trim().split(/\s+/);
                for (const w of chunks) { if (w) words.push(w); }
            }
        }
        page.cleanup();
        if (words.length > 600000) break;
    }

    if (words.length === 0) throw new Error("No readable text found in PDF.");
    return { title: filename.replace('.pdf', ''), content: words };
}

async function processEPUBFromBuffer(buffer: Buffer, filename: string): Promise<{ title: string; content: string[]; cover?: string }> {
    try {
        const zip = await JSZip.loadAsync(buffer);
        const containerXml = await zip.file("META-INF/container.xml")?.async("string");
        if (!containerXml) throw new Error("Invalid EPUB: Missing container.xml");

        const fullPathMatch = containerXml.match(/full-path="([^"]+)"/);
        const opfPath = fullPathMatch ? fullPathMatch[1] : "";
        const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
        const opfContent = await zip.file(opfPath)?.async("string");
        if (!opfContent) throw new Error("Manifest error: Could not read OPF file.");

        let title = filename.replace('.epub', '');
        const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
        if (titleMatch) title = titleMatch[1];

        const manifest: Record<string, string> = {};
        const items = (opfContent.match(/<item\s+[^>]*>/gi) || []) as string[];
        items.forEach(tag => {
            const idMatch = tag.match(/id="([^"]+)"/i);
            const hrefMatch = tag.match(/href="([^"]+)"/i);
            if (idMatch && hrefMatch) manifest[idMatch[1]] = hrefMatch[1];
        });

        const spineHrefs: string[] = [];
        const itemrefs = (opfContent.match(/<itemref\s+[^>]*>/gi) || []) as string[];
        itemrefs.forEach(tag => {
            const idrefMatch = tag.match(/idref="([^"]+)"/i);
            if (idrefMatch && manifest[idrefMatch[1]]) spineHrefs.push(manifest[idrefMatch[1]]);
        });

        let words: string[] = [];
        for (let i = 0; i < Math.min(spineHrefs.length, 1500); i++) {
            const filePath = opfDir + spineHrefs[i];
            const file = zip.file(filePath) || zip.file(decodeURI(filePath)) || zip.file(spineHrefs[i]);
            if (file) {
                const html = await file.async("string");
                const cleanedHtml = html
                    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
                    .replace(/<[^>]*epub:type="pagebreak"[^>]*>.*?<\/[^>]*>/gi, "")
                    .replace(/<div[^>]*class="[^"]*footnote[^"]*"[^>]*>.*?<\/div>/gi, "")
                    .replace(/<head[\s\S]*?<\/head>/gi, "")
                    .replace(/<style[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                const sectionWords = cleanedHtml.split(/\s+/);
                for (const w of sectionWords) {
                    if (!/^\d+$/.test(w) && w) words.push(w);
                }
            }
        }

        if (words.length === 0) throw new Error("No readable text found in EPUB.");

        let cover: string | undefined = undefined;
        try {
            const metaCoverId = opfContent.match(/<meta[^>]+name="cover"[^>]+content="([^"]+)"/i)?.[1];
            let coverHref = metaCoverId ? manifest[metaCoverId] : "";
            if (!coverHref) {
                const coverItem = items.find(tag => tag.toLowerCase().includes('cover') && tag.toLowerCase().includes('image/'));
                if (coverItem) {
                    const match = coverItem.match(/href="([^"]+)"/i);
                    if (match) coverHref = match[1];
                }
            }

            if (coverHref) {
                const cp = opfDir + coverHref;
                const coverFile = zip.file(cp) || zip.file(decodeURI(cp)) || zip.file(coverHref);
                if (coverFile) {
                    const coverBase64 = await coverFile.async("base64");
                    const ext = coverHref.split('.').pop()?.toLowerCase() || 'jpeg';
                    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                        cover = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${coverBase64.replace(/\s/g, "")}`;
                    }
                }
            }
        } catch (e) { }

        return { title, content: words, cover };
    } catch (err) {
        throw new Error("EPUB Processing Error: " + (err as Error).message);
    }
}
