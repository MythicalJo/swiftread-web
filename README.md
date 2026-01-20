# SwiftRead - Speed Reading App

A speed reading application available on multiple platforms: Android (React Native), iOS (PWA), and Web.

## 🚀 Features

- **Speed Reading**: Customizable WPM (50-1000) with RSVP technology
- **File Support**: Upload TXT, PDF, and EPUB files
- **Progress Tracking**: Save your reading progress
- **Categories**: Organize your books
- **History & Stats**: Track words read, time spent, and completed books
- **Themes**: Light, Dark, and Sepia modes
- **Multilingual**: English and Spanish support

## 📁 Project Structure

```
swift-reader/
├── mobile/          # React Native app (Android/iOS native)
├── web/             # Progressive Web App (iOS web)
├── shared/          # Shared code between platforms
├── android/         # Android native build files
└── assets/          # Shared assets (icons, images)
```

## 🛠️ Development

### Mobile App (React Native)

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

### Web App (PWA)

```bash
# Serve locally
cd web
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000`

## 📦 Building for Production

### Android APK/AAB

```bash
# Build release AAB (for Google Play)
cd android
./gradlew bundleRelease

# Build release APK
./gradlew assembleRelease
```

Output:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### Web (PWA)

The web app is static and can be deployed to any web server or hosting service (GitHub Pages, Netlify, Vercel, etc.)

## 🎯 How to Use

1. **Upload a book** - Click "Add Book" and select TXT, PDF, or EPUB
2. **Start reading** - Click on any book to open the speed reader
3. **Adjust WPM** - Use +/- buttons to change reading speed
4. **Track progress** - Your progress is automatically saved

## 🏗️ Tech Stack

### Mobile
- React Native 0.81.5
- Expo ~54.0
- TypeScript
- React 19.1

### Web
- HTML5, CSS3, Vanilla JavaScript
- PDF.js for PDF parsing
- JSZip for EPUB parsing
- Service Worker for offline support

## 📄 License

MIT

