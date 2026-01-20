# SwiftRead - Speed Reading PWA

A Progressive Web App for speed reading with support for TXT, PDF, and EPUB files.

## 🚀 Live App

**[Launch SwiftRead](https://mythicaljo.github.io/swiftread-web/)**

## 📱 Features

- **Speed Reading**: Customizable WPM (50-1000) with ORP highlighting
- **File Support**: Upload TXT, PDF, and EPUB files
- **Progress Tracking**: Save your reading progress
- **Categories**: Organize your books
- **History & Stats**: Track words read, time spent, and completed books
- **Themes**: Light, Dark, and Sepia modes
- **Offline Support**: Works without internet (PWA)
- **iOS Optimized**: Add to Home Screen for native app experience
- **Multilingual**: English and Spanish support

## 🛠️ Local Development

```bash
# Serve locally (requires a local server for service worker)
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000`

## 🎯 How to Use

1. **Upload a book** - Click "Add Book" and select TXT, PDF, or EPUB
2. **Start reading** - Click on any book to open the speed reader
3. **Adjust WPM** - Use +/- buttons to change reading speed
4. **Track progress** - Your progress is automatically saved
5. **Add to Home Screen** (iOS) - For native app experience

## 🏗️ Tech Stack

- **HTML5** - Semantic structure
- **Vanilla CSS** - Modern styling with CSS Grid/Flexbox
- **Vanilla JavaScript** - ES6+ modules, no frameworks
- **PDF.js** - PDF parsing
- **JSZip** - EPUB parsing
- **Service Worker** - Offline PWA support

## 📄 License

MIT
