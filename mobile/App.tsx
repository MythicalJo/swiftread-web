
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReaderSettings, Category, DailyStats } from './types';
import { Library } from './components/Library';
import { Reader } from './components/Reader';
import { SettingsModal } from './components/SettingsModal';
import { PdfParser } from './components/PdfParser';
import { processFile } from './services/fileProcessor';
import { CategoriesView } from './components/CategoriesView';
import { HistoryView } from './components/HistoryView';
import { LayoutGrid, Folder, BarChart2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusOverlay } from './components/StatusOverlay';
import { BackHandler, PanResponder } from 'react-native';
import { translations } from './services/i18n';

const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  wpmStep: 25,
  showContext: true,
  fontSize: 48,
  theme: 'light',
  orpColor: '#ef4444',
  orpOpacity: 1.0,
  contextOpacity: 0.4,
  contextFontSize: 16,
  sentencePause: 250,
  paragraphPause: 500,
  autoHideControls: true,
  hideDelay: 3,
  rewindAmount: 10,
  wps: 300,
  language: 'en'
};

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'added' | 'az' | 'finished' | 'unfinished'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'default' | 'list' | 'grid'>('default');
  const [currentTab, setCurrentTab] = useState<'library' | 'categories' | 'history'>('library');
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<DailyStats[]>([]);
  const [pdfQueue, setPdfQueue] = useState<{ asset: any; pdfBase64: string }[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const booksRef = useRef<Book[]>([]);
  booksRef.current = books;
  const lastUpdateRef = useRef<number>(0);
  const tabOffset = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const switchTab = (tab: 'library' | 'categories' | 'history') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentTab(tab);

    // Animate tab offset
    const index = tab === 'library' ? 0 : (tab === 'categories' ? 1 : 2);
    Animated.spring(tabOffset, {
      toValue: index,
      useNativeDriver: true,
      friction: 8,
      tension: 50
    }).start();
  };

  // Persistence
  useEffect(() => {
    loadData();
    // Enable immersive mode
    const enableImmersive = async () => {
      if (Platform.OS === 'web') return;
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('inset-touch');
      } catch (e) {
        console.log("Navbar error", e);
      }
    };
    enableImmersive();
  }, []);

  // Global Back Handler
  useEffect(() => {
    const onBackPress = () => {
      if (selectedBookId) {
        setSelectedBookId(null);
        return true;
      }
      if (showGlobalSettings) {
        setShowGlobalSettings(false);
        return true;
      }
      if (currentTab !== 'library') {
        setCurrentTab('library');
        return true;
      }
      return false; // Let default behavior happen (exit)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedBookId, showGlobalSettings, currentTab]);

  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  const tabPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (selectedBookId) return false; // Disable tab swipe when reading
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (selectedBookId) return false; // Disable tab swipe when reading
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (selectedBookId) return;
        const tab = currentTabRef.current;
        const threshold = 40;
        if (gestureState.dx > threshold) { // Swipe Right -> Go Left
          if (tab === 'categories') switchTab('library');
          else if (tab === 'history') switchTab('categories');
        } else if (gestureState.dx < -threshold) { // Swipe Left -> Go Right
          if (tab === 'library') switchTab('categories');
          else if (tab === 'categories') switchTab('history');
        }
      },
      onPanResponderTerminate: () => { },
    })
  ).current;

  const loadData = async () => {
    try {
      const savedLibrary = await AsyncStorage.getItem('swiftread_library');
      if (savedLibrary) {
        setBooks(JSON.parse(savedLibrary));
      }

      const savedSettings = await AsyncStorage.getItem('swiftread_settings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      const savedSort = await AsyncStorage.getItem('swiftread_sort');
      if (savedSort) {
        setSortBy(savedSort as any);
      }

      const savedOrder = await AsyncStorage.getItem('swiftread_sort_order');
      if (savedOrder) {
        setSortOrder(savedOrder as any);
      }

      const savedView = await AsyncStorage.getItem('swiftread_view_mode');
      if (savedView) {
        setViewMode(savedView as any);
      }

      const savedCategories = await AsyncStorage.getItem('swiftread_categories');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }

      const savedHistory = await AsyncStorage.getItem('swiftread_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      setHasLoaded(true);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const saveLibraryNow = async (updatedBooks: Book[]) => {
    try {
      if (!hasLoaded) return; // Prevent overwriting with empty state
      setBooks(updatedBooks);
      await AsyncStorage.setItem('swiftread_library', JSON.stringify(updatedBooks));
    } catch (e) {
      console.error("Save Error", e);
    }
  };

  const updateSettings = useCallback((newSettings: ReaderSettings | ((prev: ReaderSettings) => ReaderSettings)) => {
    setSettings(prev => {
      const next = typeof newSettings === 'function' ? newSettings(prev) : newSettings;
      AsyncStorage.setItem('swiftread_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleUpload = async (assets: any[]) => {
    let successCount = 0;
    let failCount = 0;
    let validAssetsCount = 0;

    // Create a Set of normalized titles for fast, real-time duplicate checking
    const existingTitles = new Set(booksRef.current.map(b => b.title.toLowerCase().trim()));

    // Pre-check for duplicates to see if we should even show the uploading notice
    const assetsToProcess = assets.filter(asset => {
      const assetName = asset.name.replace(/\.[^/.]+$/, "").toLowerCase().trim();
      if (existingTitles.has(assetName)) {
        Alert.alert(
          translations[settings.language].common.duplicateTitle,
          translations[settings.language].common.duplicateBody
        );
        return false;
      }
      return true;
    });

    if (assetsToProcess.length === 0) return;

    setIsUploading(true);

    for (const asset of assetsToProcess) {
      const assetName = asset.name.replace(/\.[^/.]+$/, "").toLowerCase().trim();
      // Add to set immediately to block duplicates within the same batch
      existingTitles.add(assetName);

      try {
        const result = await processFile(asset);

        if ((result as any).pdfBase64) {
          setPdfQueue(prev => [...prev, { asset, pdfBase64: (result as any).pdfBase64 }]);
          continue;
        }

        // Secondary Duplicate Check: Check extracted title against existing library
        const extractedTitle = (result.title || asset.name).replace(/\.[^/.]+$/, "").toLowerCase().trim();
        if (existingTitles.has(extractedTitle)) {
          Alert.alert(
            translations[settings.language].common.duplicateTitle,
            translations[settings.language].common.duplicateBody
          );
          continue;
        }
        existingTitles.add(extractedTitle);

        const newBook: Book = {
          id: Math.random().toString(36).substr(2, 9),
          title: result.title || asset.name,
          author: '',
          content: result.content,
          cover: result.cover,
          progress: 0,
          hasBeenFinished: false,
          type: asset.name.split('.').pop()?.toLowerCase() || 'text' as any,
          addedAt: Date.now(),
          lastOpenedAt: Date.now(),
        };

        const updatedBooks = [newBook, ...booksRef.current];
        await saveLibraryNow(updatedBooks);
        successCount++;
      } catch (error) {
        console.error(error);
        failCount++;
      }
    }

    if (pdfQueue.length === 0) {
      const anyNonPdf = assetsToProcess.some(a => !a.name.toLowerCase().endsWith('.pdf'));
      if (anyNonPdf || assetsToProcess.length === 0) {
        setIsUploading(false);
        if (failCount > 0) Alert.alert("Import Finished", `Imported ${successCount}. ${failCount} failed.`);
      }
    }
  };

  const onPdfData = async (data: { title: string; content: string[], cover?: string }) => {
    if (pdfQueue.length === 0) return;
    const { asset } = pdfQueue[0];

    const title = asset.name.replace(/\.[^/.]+$/, "");
    if (booksRef.current.some(b => b.title === title)) {
      setPdfQueue(prev => prev.slice(1));
      if (pdfQueue.length === 1) setIsUploading(false);
      return;
    }

    const newBook: Book = {
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      author: 'Unknown',
      content: data.content,
      cover: data.cover,
      progress: 0,
      type: 'pdf',
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    const updatedBooks = [newBook, ...booksRef.current];
    await saveLibraryNow(updatedBooks);

    setPdfQueue(prev => {
      const next = prev.slice(1);
      if (next.length === 0) setIsUploading(false);
      return next;
    });
  };

  const handleManualMove = async (id: string, direction: 'up' | 'down') => {
    setBooks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const newBooks = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newBooks[idx], newBooks[targetIdx]] = [newBooks[targetIdx], newBooks[idx]];

      AsyncStorage.setItem('swiftread_library', JSON.stringify(newBooks));
      return newBooks;
    });
  };

  const handlePaste = async (title: string, text: string) => {
    try {
      const words = text.trim().split(/\s+/);
      if (words.length === 0) return;

      const newBook: Book = {
        id: Math.random().toString(36).substr(2, 9),
        title: title || 'Pasted Text',
        author: '',
        content: words,
        progress: 0,
        hasBeenFinished: false,
        type: 'text',
        addedAt: Date.now(),
        lastOpenedAt: Date.now(),
      };
      const updatedBooks = [newBook, ...booksRef.current];
      await saveLibraryNow(updatedBooks);
    } catch (e) {
      Alert.alert(
        translations[settings.language].common.pasteErrorTitle,
        translations[settings.language].common.pasteErrorBody
      );
    }
  };

  const updateProgress = useCallback((id: string, progress: number, secondsElapsed: number = 0) => {
    if (!hasLoaded) return;

    // Update Books state immediately for UI responsiveness
    setBooks(prev => {
      const book = prev.find(b => b.id === id);
      if (!book) return prev;

      const wordsReadDelta = Math.max(0, progress - book.progress);

      // Update History only if secondsElapsed > 0
      const now = Date.now();
      if (secondsElapsed > 0 && (now - lastUpdateRef.current > 900)) { // 900ms buffer for 1s intervals
        lastUpdateRef.current = now;
        const today = new Date().toISOString().split('T')[0];
        setHistory(hPrev => {
          const hIdx = hPrev.findIndex(s => s.date === today);
          const newHistory = [...hPrev];
          if (hIdx === -1) {
            newHistory.push({
              date: today,
              wordsRead: wordsReadDelta,
              // Initial stats entry
              secondsRead: secondsElapsed,
              avgWpm: settings.wpm,
              completedBooks: progress >= (book.content?.length || 1) - 1 ? [book.id] : []
            });
          } else {
            const existing = newHistory[hIdx];
            const completed = existing.completedBooks || [];
            const isAtEnd = progress >= (book.content?.length || 1) - 1;
            const isNewlyFinished = isAtEnd && !completed.includes(book.id);

            newHistory[hIdx] = {
              ...existing,
              wordsRead: existing.wordsRead + wordsReadDelta,
              // Accumulate time based on actual stopwatch time (User Request)
              secondsRead: existing.secondsRead + secondsElapsed,
              avgWpm: Math.round((existing.avgWpm + settings.wpm) / 2),
              completedBooks: isNewlyFinished ? [...completed, book.id] : completed
            };
          }
          AsyncStorage.setItem('swiftread_history', JSON.stringify(newHistory));
          return newHistory;
        });
      }

      const isAtEnd = progress >= (book.content?.length || 1) - 1;
      const updated = prev.map(b => b.id === id ? {
        ...b,
        progress,
        hasBeenFinished: b.hasBeenFinished || isAtEnd
      } : b);
      AsyncStorage.setItem('swiftread_library', JSON.stringify(updated));
      return updated;
    });
  }, [settings.wpm, hasLoaded]);

  const handleResetProgress = async (id: string) => {
    if (!hasLoaded) return;
    const updated = books.map(b => b.id === id ? { ...b, progress: 0, hasBeenFinished: false } : b);
    setBooks(updated);
    await AsyncStorage.setItem('swiftread_library', JSON.stringify(updated));
  };

  const handleDeleteBook = async (id: string) => {
    if (!hasLoaded) return;
    const updated = booksRef.current.filter(b => b.id !== id);
    await saveLibraryNow(updated);
  };

  const handleSelectBook = async (book: Book) => {
    const now = Date.now();
    const total = book.content?.length || 1;
    const isFinished = book.progress >= total - 1;

    const updatedBooks = books.map(b => {
      if (b.id === book.id) {
        return {
          ...b,
          lastOpenedAt: now,
          // Removed auto-reset to 0. Use b.progress to keep 100% if finished.
          progress: b.progress
        };
      }
      return b;
    });

    setBooks(updatedBooks);
    setSelectedBookId(book.id);
    AsyncStorage.setItem('swiftread_library', JSON.stringify(updatedBooks));
  };

  const sortedBooks = [...books]
    .filter(b => {
      // Use hasBeenFinished for filtered views
      if (sortBy === 'finished') return b.hasBeenFinished;
      if (sortBy === 'unfinished') return !b.hasBeenFinished;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      // Default secondary sort for filters is Recent
      if (sortBy === 'finished' || sortBy === 'unfinished') {
        cmp = (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      }
      else if (sortBy === 'recent') cmp = (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      else if (sortBy === 'added') cmp = b.addedAt - a.addedAt;
      else if (sortBy === 'az') cmp = a.title.localeCompare(b.title);

      return sortOrder === 'desc' ? cmp : -cmp;
    });

  const selectedBook = books.find(b => b.id === selectedBookId) || null;

  const themeColors = {
    bg: settings.theme === 'dark' ? '#121212' : (settings.theme === 'sepia' ? '#f4ecd8' : '#fcfcfc'),
    cardBg: settings.theme === 'dark' ? '#1e1e1e' : (settings.theme === 'sepia' ? '#e2d7b5' : '#ffffff'),
    text: settings.theme === 'dark' ? '#ffffff' : (settings.theme === 'sepia' ? '#5b4636' : '#111827'),
    subText: settings.theme === 'dark' ? '#9ca3af' : (settings.theme === 'sepia' ? 'rgba(91, 70, 54, 0.6)' : '#6b7280'),
    accent: settings.theme === 'dark' ? '#ffffff' : (settings.theme === 'sepia' ? '#5b4636' : '#000000'),
    accentText: settings.theme === 'dark' ? '#000' : (settings.theme === 'sepia' ? '#f4ecd8' : '#fff'),
    border: settings.theme === 'dark' ? 'rgba(255,255,255,0.05)' : (settings.theme === 'sepia' ? '#c4b595' : '#f3f4f6'),
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar hidden />
      {selectedBook ? (
        <Reader
          book={selectedBook}
          settings={settings}
          onUpdateSettings={updateSettings}
          onBack={async (finalProgress?: number) => {
            if (typeof finalProgress === 'number') {
              updateProgress(selectedBook.id, finalProgress, 0);
            }
            setSelectedBookId(null);
          }}
          onUpdateProgress={updateProgress}
        />
      ) : (
        <View style={{ flex: 1 }} {...tabPanResponder.panHandlers}>
          <Animated.View style={{
            flex: 1,
            flexDirection: 'row',
            width: width * 3,
            transform: [{
              translateX: tabOffset.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [0, -width, -width * 2]
              })
            }]
          }}>
            {/* Library Tab */}
            <View style={{ width: width, flex: 1 }}>
              <Library
                books={sortedBooks}
                onSelect={handleSelectBook}
                onUpload={handleUpload}
                onPaste={handlePaste}
                onDelete={handleDeleteBook}
                onResetProgress={handleResetProgress}
                onOpenSettings={() => setShowGlobalSettings(true)}
                isUploading={isUploading}
                settings={settings}
                sortBy={sortBy}
                sortOrder={sortOrder}
                viewMode={viewMode}
                onSortChange={(s) => {
                  setSortBy(s);
                  AsyncStorage.setItem('swiftread_sort', s);
                }}
                onToggleOrder={() => {
                  const next = sortOrder === 'asc' ? 'desc' : 'asc';
                  setSortOrder(next);
                  AsyncStorage.setItem('swiftread_sort_order', next);
                }}
                onViewModeChange={(m) => {
                  setViewMode(m);
                  AsyncStorage.setItem('swiftread_view_mode', m);
                }}
                categories={categories}
                onAddToCategory={async (bookId, catId) => {
                  const newCats = categories.map(cat => {
                    if (cat.id === catId) {
                      const bookIds = cat.bookIds || [];
                      const next = bookIds.includes(bookId)
                        ? bookIds.filter(id => id !== bookId)
                        : [...bookIds, bookId];
                      return { ...cat, bookIds: next };
                    }
                    return cat;
                  });
                  setCategories(newCats);
                  await AsyncStorage.setItem('swiftread_categories', JSON.stringify(newCats));
                }}
                goToCategories={() => switchTab('categories')}
              />
              <LinearGradient
                colors={['transparent', themeColors.bg]}
                style={styles.tabBarGradient}
              />
            </View>

            {/* Categories Tab */}
            <View style={{ width: width, flex: 1 }}>
              <CategoriesView
                categories={categories}
                books={books}
                onSelectBook={handleSelectBook}
                onAddCategory={(name) => {
                  const newCats = [...categories, { id: Math.random().toString(36).substr(2, 9), name, bookIds: [] }];
                  setCategories(newCats);
                  AsyncStorage.setItem('swiftread_categories', JSON.stringify(newCats));
                }}
                onDeleteCategory={(id) => {
                  const newCats = categories.filter(c => c.id !== id);
                  setCategories(newCats);
                  AsyncStorage.setItem('swiftread_categories', JSON.stringify(newCats));
                }}
                onUpdateCategoryBooks={(catId, bookIds) => {
                  const newCats = categories.map(c => c.id === catId ? { ...c, bookIds } : c);
                  setCategories(newCats);
                  AsyncStorage.setItem('swiftread_categories', JSON.stringify(newCats));
                }}
                theme={themeColors}
                settings={settings}
              />
            </View>

            {/* History Tab */}
            <View style={{ width: width, flex: 1 }}>
              <HistoryView
                history={history}
                wpm={settings.wpm}
                theme={themeColors}
                settings={settings}
              />
            </View>
          </Animated.View>

          {/* Bottom Tab Bar */}
          <View style={[styles.tabBar, { backgroundColor: themeColors.cardBg, borderTopColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => switchTab('library')}
              style={styles.tabItem}
            >
              <LayoutGrid size={24} color={currentTab === 'library' ? themeColors.accent : themeColors.subText} />
              <Text style={[styles.tabLabel, { color: currentTab === 'library' ? themeColors.accent : themeColors.subText }]}>Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchTab('categories')}
              style={styles.tabItem}
            >
              <Folder size={24} color={currentTab === 'categories' ? themeColors.accent : themeColors.subText} />
              <Text style={[styles.tabLabel, { color: currentTab === 'categories' ? themeColors.accent : themeColors.subText }]}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => switchTab('history')}
              style={styles.tabItem}
            >
              <BarChart2 size={24} color={currentTab === 'history' ? themeColors.accent : themeColors.subText} />
              <Text style={[styles.tabLabel, { color: currentTab === 'history' ? themeColors.accent : themeColors.subText }]}>History</Text>
            </TouchableOpacity>
          </View>

          {showGlobalSettings && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={updateSettings}
              onClose={() => setShowGlobalSettings(false)}
            />
          )}
        </View>
      )}
      {Platform.OS !== 'web' && pdfQueue.length > 0 && (
        <View style={{ height: 0, width: 0, opacity: 0 }}>
          <PdfParser
            pdfBase64={pdfQueue[0]?.pdfBase64}
            onData={onPdfData}
            onError={(err) => {
              console.error(err);
              setPdfQueue(prev => prev.slice(1));
              if (pdfQueue.length <= 1) setIsUploading(false);
              Alert.alert("PDF Error", "Failed to parse this PDF.");
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabBarGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 5,
  }
});
