
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View } from 'react-native';

interface PdfParserProps {
  pdfBase64?: string;
  onData: (data: { title: string; content: string[]; cover?: string }) => void;
  onError: (error: string) => void;
}

export const PdfParser: React.FC<PdfParserProps> = ({ pdfBase64, onData, onError }) => {
  const webViewRef = useRef<WebView>(null);
  const isParsingRef = useRef(false);

  useEffect(() => {
    if (pdfBase64 && webViewRef.current && !isParsingRef.current) {
      isParsingRef.current = true;
      webViewRef.current.injectJavaScript(`window.parsePDF("${pdfBase64}"); void(0);`);
    }
  }, [pdfBase64]);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

          window.parsePDF = async (base64) => {
            try {
              const binary = atob(base64);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
              }

              const loadingTask = pdfjsLib.getDocument({ data: bytes });
              const pdf = await loadingTask.promise;
              const maxPages = Math.min(pdf.numPages, 1200);
              let allText = [];
              let cover = null;

              // Extract text and first-page cover
              for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                
                // First page cover extraction
                if (i === 1) {
                  try {
                    const viewport = page.getViewport({ scale: 0.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    // Small delay to ensure rendering is committed to canvas
                    await new Promise(r => setTimeout(r, 500));
                    
                    cover = canvas.toDataURL('image/jpeg', 0.6);
                  } catch (e) {
                    console.error("Cover error", e);
                  }
                }

                const textContent = await page.getTextContent();
                const strings = textContent.items.map(item => item.str);
                allText.push(...strings.join(' ').split(/\\s+/));
                
                page.cleanup();
              }

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                content: allText.filter(w => w.length > 0),
                cover: cover
              }));
              
              pdf.destroy();
            } catch (err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: err.message
              }));
            }
          };
        </script>
      </head>
      <body></body>
    </html>
  `;

  return (
    <View style={{ position: 'absolute', top: -100, left: -100, width: 10, height: 10, opacity: 0.01, zIndex: -1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          isParsingRef.current = false;
          if (data.type === 'success') {
            onData({ title: '', content: data.content, cover: data.cover });
          } else {
            onError(data.message);
          }
        }}
        javaScriptEnabled={true}
      />
    </View>
  );
};
