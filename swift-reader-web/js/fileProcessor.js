// fileProcessor.js - File upload and processing (TXT, PDF, EPUB)

// Process uploaded files
export async function processFile(file) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
        if (extension === 'txt') {
            return await processTXT(file);
        } else if (extension === 'pdf') {
            return await processPDF(file);
        } else if (extension === 'epub') {
            return await processEPUB(file);
        } else {
            throw new Error('Unsupported format: ' + extension);
        }
    } catch (err) {
        console.error("Processing error:", err);
        throw err;
    }
}

// Process TXT files
async function processTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const words = text.trim().split(/\s+/);
                const title = file.name.replace('.txt', '');

                resolve({
                    title,
                    content: words,
                    cover: null
                });
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Process PDF files using PDF.js
async function processPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);

                // Load PDF
                const pdf = await pdfjsLib.getDocument({
                    data: typedarray,
                    disableWorker: true
                }).promise;

                const words = [];
                const maxPages = Math.min(pdf.numPages, 1200);

                // Extract text from each page
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.0 });
                    const height = viewport.height;
                    const headerThreshold = height * 0.93;
                    const footerThreshold = height * 0.07;

                    const textContent = await page.getTextContent();

                    for (const item of textContent.items) {
                        const y = item.transform[5];

                        // Skip headers and footers
                        if (y > headerThreshold || y < footerThreshold) continue;

                        if (item.str) {
                            // Skip page numbers
                            if (/^\s*\d+\s*$/.test(item.str) || /^\s*Page\s+\d+\s*$/i.test(item.str)) continue;

                            const chunks = item.str.trim().split(/\s+/);
                            for (const w of chunks) {
                                if (w) words.push(w);
                            }
                        }
                    }

                    // Memory guard
                    if (words.length > 600000) break;
                }

                if (words.length === 0) {
                    throw new Error("No readable text found in PDF");
                }

                const title = file.name.replace('.pdf', '');

                resolve({
                    title,
                    content: words,
                    cover: null
                });

            } catch (err) {
                reject(new Error(`PDF Error: ${err.message}`));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Process EPUB files using JSZip
async function processEPUB(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const zip = await JSZip.loadAsync(arrayBuffer);

                // Read container.xml
                const containerXml = await zip.file("META-INF/container.xml")?.async("string");
                if (!containerXml) throw new Error("Invalid EPUB");

                // Get OPF path
                const fullPathMatch = containerXml.match(/full-path="([^"]+)"/);
                const opfPath = fullPathMatch ? fullPathMatch[1] : "";
                const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

                // Read OPF content
                const opfContent = await zip.file(opfPath)?.async("string");
                if (!opfContent) throw new Error("Manifest error");

                // Extract title
                let title = file.name.replace('.epub', '');
                const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
                if (titleMatch) title = titleMatch[1];

                // Build manifest
                const manifest = {};
                const items = opfContent.match(/<item\s+[^>]*>/gi) || [];
                items.forEach(tag => {
                    const id = tag.match(/id="([^"]+)"/i)?.[1];
                    const href = tag.match(/href="([^"]+)"/i)?.[1];
                    if (id && href) manifest[id] = href;
                });

                // Get spine order
                const spineHrefs = [];
                const itemrefs = opfContent.match(/<itemref\s+[^>]*>/gi) || [];
                itemrefs.forEach(tag => {
                    const idref = tag.match(/idref="([^"]+)"/i)?.[1];
                    if (idref && manifest[idref]) spineHrefs.push(manifest[idref]);
                });

                // Extract text from spine files
                let words = [];
                for (let i = 0; i < Math.min(spineHrefs.length, 1500); i++) {
                    const filePath = opfDir + spineHrefs[i];
                    const htmlFile = zip.file(filePath) || zip.file(decodeURI(filePath)) || zip.file(spineHrefs[i]);

                    if (htmlFile) {
                        const html = await htmlFile.async("string");

                        // Clean HTML - remove footnotes, page numbers, etc.
                        const cleanedHtml = html
                            .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // Remove superscripts
                            .replace(/<[^>]*epub:type="pagebreak"[^>]*>.*?<\/[^>]*>/gi, "") // Remove page breaks
                            .replace(/<div[^>]*class="[^"]*footnote[^"]*"[^>]*>.*?<\/div>/gi, "") // Remove footnotes
                            .replace(/<head[\s\S]*?<\/head>/gi, "")
                            .replace(/<style[\s\S]*?<\/style>/gi, "")
                            .replace(/<[^>]+>/g, " ")
                            .replace(/\s+/g, " ")
                            .trim();

                        const sectionWords = cleanedHtml.split(/\s+/);
                        for (const w of sectionWords) {
                            // Filter purely numeric words (page numbers)
                            if (!/^\d+$/.test(w) && w) words.push(w);
                        }
                    }
                }

                if (words.length === 0) throw new Error("No text found in EPUB");

                // Try to extract cover image
                let cover = null;
                try {
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
                        const coverPath = opfDir + coverHref;
                        const coverFile = zip.file(coverPath) || zip.file(decodeURI(coverPath)) || zip.file(coverHref);

                        if (coverFile) {
                            const coverBase64 = await coverFile.async("base64");
                            const ext = coverHref.split('.').pop()?.toLowerCase() || 'jpeg';

                            if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                                cover = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${coverBase64.replace(/\s/g, "")}`;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Could not extract cover:', e);
                }

                resolve({
                    title,
                    content: words,
                    cover
                });

            } catch (err) {
                reject(new Error("EPUB Error: " + err.message));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Export
export default { processFile };
