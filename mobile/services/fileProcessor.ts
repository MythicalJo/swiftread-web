
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import { Buffer } from 'buffer';

let pdfjsLib: any = null;

async function ensurePdfLib() {
    if (pdfjsLib) return;

    if (Platform.OS === 'web') {
        const win = window as any;
        // Wait briefly for the global script to initialize if it hasn't yet
        if (!win.pdfjsLib) {
            console.log("Waiting for global PDF.js...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (win.pdfjsLib) {
            pdfjsLib = win.pdfjsLib;
            if (pdfjsLib.GlobalWorkerOptions) {
                // Force disable worker on web to avoid CORS/loading issues with CDN workers
                console.log("Disabling PDF worker for robustness...");
                pdfjsLib.GlobalWorkerOptions.workerSrc = '';
                pdfjsLib.GlobalWorkerOptions.disableWorker = true;
            }
            console.log("PDF Engine linked successfully.");
        } else {
            // Fallback: This is critically bad if the CDN script failed to load
            throw new Error("Critical: PDF.js script header failed to load. Please refresh.");
        }
    } else {
        try {
            pdfjsLib = require('pdfjs-dist/legacy/build/pdf');
            pdfjsLib.GlobalWorkerOptions.disableWorker = true;
        } catch (e) {
            throw new Error("Native PDF init failed: " + e);
        }
    }
}

export async function processFile(asset: any, onProgress?: (msg: string) => void): Promise<{ title: string; content: string[]; cover?: string; pdfBase64?: string }> {
    const extension = asset.name.split('.').pop()?.toLowerCase();

    const log = (msg: string) => {
        console.log(msg);
        if (onProgress) onProgress(msg);
    };

    try {
        if (Platform.OS === 'web') {
            log(`Web processing: ${asset.name}`);

            let arrayBuffer: ArrayBuffer;
            try {
                if (asset.file) {
                    log("Reading file directly...");
                    arrayBuffer = await asset.file.arrayBuffer();
                } else {
                    log(`Fetching URI: ${asset.uri}`);
                    const response = await fetch(asset.uri);
                    arrayBuffer = await response.arrayBuffer();
                }
                log(`Data loaded: ${arrayBuffer.byteLength} bytes`);

                // Magic Byte Check
                const header = new Uint8Array(arrayBuffer.slice(0, 5));
                const headerStr = String.fromCharCode(...header);
                if (extension === 'pdf' && headerStr !== '%PDF-') {
                    throw new Error(`Invalid PDF header: ${headerStr}`);
                }

            } catch (loadErr) {
                log(`Load Error: ${loadErr}`);
                throw new Error("Could not read file data.");
            }

            if (extension === 'pdf') {
                log("Initializing PDF Engine...");
                await ensurePdfLib();
                log("Engine Ready. Parsing...");
                return await processPDFFromBuffer(arrayBuffer, asset.name, log);
            } else if (extension === 'epub') {
                const buffer = Buffer.from(arrayBuffer);
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

async function processPDFFromBuffer(data: ArrayBuffer | Buffer, filename: string, log?: (m: string) => void): Promise<{ title: string; content: string[]; cover?: string }> {
    let pdf: any = null;
    try {
        if (log) log("Loading document...");
        const uint8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

        // Use a timeout for the loading task to prevent indefinite hangs
        const loadingTask = pdfjsLib.getDocument({
            data: uint8,
            verbosity: 1,
            stopAtErrors: false,
            disableFontFace: true,
            cMapPacked: true
        });

        pdf = await Promise.race([
            loadingTask.promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: PDF parse took >15s")), 15000))
        ]);

        if (log) log(`PDF Loaded. Pages: ${pdf.numPages}`);
        const result = await extractFromPdf(pdf, filename, log);
        return result;
    } catch (err: any) {
        if (log) log(`PDF Error: ${err.message}`);
        console.error("PDF.js Processing Error:", err);
        throw new Error(`PDF Error: ${(err as Error).message}`);
    } finally {
        if (pdf) {
            try { await pdf.destroy(); } catch (e) { }
        }
    }
}

async function extractFromPdf(pdf: any, filename: string, log?: (m: string) => void): Promise<{ title: string; content: string[]; cover?: string }> {
    const words: string[] = [];
    const maxPages = Math.min(pdf.numPages, 1200);
    console.log(`Extracting text from ${maxPages} pages...`);

    for (let i = 1; i <= maxPages; i++) {
        if (log && i % 10 === 0) log(`Parsing page ${i}/${maxPages}...`);
        try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // If we have no items on the page, skip it
            if (!textContent.items || textContent.items.length === 0) {
                page.cleanup();
                continue;
            }

            const viewport = page.getViewport({ scale: 1.0 });
            const height = viewport.height;
            // More conservative thresholds (only skip if extremely close to edge)
            const headerThreshold = height * 0.96;
            const footerThreshold = height * 0.04;

            for (const item of (textContent.items as any[])) {
                if (item.str) {
                    const y = item.transform[5];
                    // Skip if it looks like a lone page number or is in the extreme margin
                    if ((y > headerThreshold || y < footerThreshold) && /^\s*\d+\s*$/.test(item.str)) continue;

                    const chunks = item.str.trim().split(/\s+/);
                    for (const w of chunks) { if (w) words.push(w); }
                }
            }
            page.cleanup();
        } catch (pageErr) {
            console.warn(`Error on page ${i}, skipping:`, pageErr);
        }
        if (words.length > 600000) {
            console.log("Word limit reached (600k), stopping extraction.");
            break;
        }
    }

    console.log("Extraction complete. Total words:", words.length);
    if (words.length === 0) {
        throw new Error("No readable text found. This PDF might be a scanned image or restricted.");
    }
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
