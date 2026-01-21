
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    FlatList,
    Animated,
    Modal,
    SafeAreaView,
    BackHandler,
    PanResponder,
    TouchableWithoutFeedback
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import Slider from '@react-native-community/slider';
import { Book, ReaderSettings } from '../types';
import { WordDisplay } from './WordDisplay';
import { SettingsModal } from './SettingsModal';
import { translations } from '../services/i18n';
import { ChevronLeft, List, Settings, Play, Pause, X as CloseIcon, RotateCcw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ReaderProps {
    book: Book;
    settings: ReaderSettings;
    onUpdateSettings: (newSettings: ReaderSettings | ((prev: ReaderSettings) => ReaderSettings)) => void;
    onBack: (finalProgress?: number) => void;
    onUpdateProgress: (id: string, progress: number, secondsElapsed: number) => void;
}

const TopBar = React.memo(({ book, progress, onBack, onShowFullText, theme, opacity, t }: any) => (
    <Animated.View style={[
        styles.topBar,
        {
            backgroundColor: theme.cardBg + 'E6',
            borderColor: theme.border,
            opacity: opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }]
        }
    ]}>
        <TouchableOpacity onPress={onBack} style={styles.topBarIcon}>
            <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.topBarTitleContainer}>
            <Text style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>{book.title}</Text>
            <Text style={[styles.topBarSubtitle, { color: theme.subText }]}>{progress}% {t.reader.complete}</Text>
        </View>
        <TouchableOpacity onPress={onShowFullText} style={styles.topBarIcon}>
            <List size={24} color={theme.text} />
        </TouchableOpacity>
    </Animated.View>
));

const BottomPanel = React.memo(({
    currentIndex, totalWords, isPlaying, settings, theme, opacity,
    onValueChange, onRewind, onPlayPause, onOpenSettings, onUpdateSettings, t
}: any) => (
    <Animated.View style={[
        styles.bottomPanel,
        {
            opacity: opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }]
        }
    ]}>
        <View style={styles.sliderRow}>
            <Slider
                style={styles.bottomSlider}
                minimumValue={0}
                maximumValue={Math.max(0, totalWords - 1)}
                value={currentIndex}
                onValueChange={onValueChange}
                minimumTrackTintColor={theme.accent}
                maximumTrackTintColor={theme.isDark ? '#374151' : '#e5e7eb'}
                thumbTintColor={theme.accent}
            />
        </View>

        <View style={[styles.controlCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.wpmControl}>
                <TouchableOpacity
                    onPress={() => onUpdateSettings((s: any) => ({ ...s, wpm: Math.max(50, s.wpm - s.wpmStep) }))}
                    style={styles.wpmButton}
                >
                    <Text style={[styles.wpmButtonText, { color: theme.subText }]}>−</Text>
                </TouchableOpacity>
                <View style={styles.wpmTextContainer}>
                    <Text style={[
                        styles.wpmValue,
                        { color: theme.text },
                        settings.wpm > 999 && { fontSize: 14 }
                    ]}>{settings.wpm}</Text>
                    <Text style={[styles.wpmLabel, { color: theme.subText }]}>{t.reader.wpm}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => onUpdateSettings((s: any) => ({ ...s, wpm: Math.min(1500, s.wpm + s.wpmStep) }))}
                    style={styles.wpmButton}
                >
                    <Text style={[styles.wpmButtonText, { color: theme.subText }]}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.centerControls}>
                <TouchableOpacity onPress={onRewind} style={styles.rewindButton}>
                    <RotateCcw size={22} color={theme.subText} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onPlayPause}
                    style={[styles.playPauseButton, { backgroundColor: theme.accent }]}
                >
                    {isPlaying ? (
                        <Pause size={28} color={theme.accentText} fill={theme.accentText} />
                    ) : (
                        <Play size={28} color={theme.accentText} fill={theme.accentText} />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.settingsIcon}>
                <TouchableOpacity onPress={onOpenSettings} style={styles.iconButton}>
                    <Settings size={28} color={theme.subText} />
                </TouchableOpacity>
            </View>
        </View>
    </Animated.View>
));

export const Reader: React.FC<ReaderProps> = ({
    book, settings, onUpdateSettings, onBack, onUpdateProgress
}) => {
    useKeepAwake();
    const t = translations[settings.language];
    const [currentIndex, setCurrentIndex] = useState(book.progress || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showFullText, setShowFullText] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isScrubbing, setIsScrubbing] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const scrubStartPos = useRef(0);

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const currentIndexRef = useRef(currentIndex);
    currentIndexRef.current = currentIndex;
    const isScrubbingRef = useRef(isScrubbing);
    isScrubbingRef.current = isScrubbing;
    const controlsVisibleRef = useRef(controlsVisible);
    controlsVisibleRef.current = controlsVisible;

    const resetHideTimer = useCallback(() => {
        setControlsVisible(true);
        Animated.timing(controlsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

        // User Request: Only auto-hide if playing
        if (isPlaying && settings.autoHideControls) {
            hideTimerRef.current = setTimeout(() => {
                Animated.timing(controlsOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }).start(() => setControlsVisible(false));
            }, settings.hideDelay * 1000);
        }
    }, [isPlaying, settings.autoHideControls, settings.hideDelay, controlsOpacity]);

    // Ensure controls are visible when paused
    useEffect(() => {
        if (!isPlaying) {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            setControlsVisible(true);
            Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        } else {
            resetHideTimer();
        }
    }, [isPlaying, resetHideTimer]);

    const toggleControls = useCallback(() => {
        const isVisible = controlsVisibleRef.current;
        const nextValue = isVisible ? 0 : 1;

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

        // Immediately set visible if we are showing them, otherwise set false AFTER animation
        if (!isVisible) setControlsVisible(true);

        Animated.timing(controlsOpacity, {
            toValue: nextValue,
            duration: 300,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && nextValue === 0) setControlsVisible(false);
            if (finished && nextValue === 1) resetHideTimer();
        });
    }, [resetHideTimer, controlsOpacity]);

    const stopPlaying = useCallback(() => {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        resetHideTimer();
    }, [resetHideTimer]);

    const startPlaying = useCallback(() => {
        if (currentIndex >= (book.content?.length || 0) - 1) return;
        setIsPlaying(true);
    }, [currentIndex, book.content]);

    const handleRewind = useCallback(() => {
        setCurrentIndex(prev => Math.max(0, prev - settings.rewindAmount));
        resetHideTimer();
    }, [settings.rewindAmount, resetHideTimer]);

    const touchStart = useRef({ time: 0, x: 0, y: 0 });

    const panResponder = useRef(
        PanResponder.create({
            // Disable scanning completely if playing
            onStartShouldSetPanResponder: () => {
                return !isPlayingRef.current; // Only allow if NOT playing
            },
            onStartShouldSetPanResponderCapture: () => {
                return !isPlayingRef.current; // Only allow if NOT playing
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (isPlayingRef.current) return false;
                return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
            },
            onPanResponderGrant: (evt) => {
                scrubStartPos.current = currentIndexRef.current;
                touchStart.current = {
                    time: Date.now(),
                    x: evt.nativeEvent.pageX,
                    y: evt.nativeEvent.pageY
                };
            },
            onPanResponderMove: (_, gestureState) => {
                if (isPlayingRef.current) return;

                // Scrubbing threshold: 25px (more buffer for taps)
                if (!isScrubbingRef.current && Math.abs(gestureState.dx) > 25) {
                    setIsScrubbing(true);
                    isScrubbingRef.current = true;
                }

                if (isScrubbingRef.current) {
                    const total = book.content?.length || 1;
                    // SLOWER: 0.6% per screen width (was 1.25%) - User requested halving again
                    const baseScrollRange = total * 0.006;
                    // CALMER: Reduced velocity scaling (0.15x instead of 0.25x)
                    const velocityFactor = 1 + (Math.abs(gestureState.vx) * 0.15);
                    const delta = Math.floor((gestureState.dx / width) * baseScrollRange * velocityFactor);
                    const next = Math.max(0, Math.min(total - 1, scrubStartPos.current + delta));

                    if (next !== currentIndexRef.current) {
                        setCurrentIndex(next);
                        currentIndexRef.current = next;
                    }
                    resetHideTimer();
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                const duration = Date.now() - touchStart.current.time;
                const distance = Math.sqrt(
                    Math.pow(evt.nativeEvent.pageX - touchStart.current.x, 2) +
                    Math.pow(evt.nativeEvent.pageY - touchStart.current.y, 2)
                );

                // TAP DETECTION is now handled by TouchableWithoutFeedback
                // because onStartShouldSetPanResponder returns false.

                // If we WERE scrubbing, save progress immediately on release (no stats)
                if (isScrubbingRef.current) {
                    onUpdateProgress(book.id, currentIndexRef.current, 0);
                }

                setIsScrubbing(false);
                isScrubbingRef.current = false;
                resetHideTimer();
            },
            onPanResponderTerminate: () => {
                setIsScrubbing(false);
                isScrubbingRef.current = false;
            },
        })
    ).current;

    const advanceWord = useCallback(() => {
        if (!book.content) return;
        setCurrentIndex((prev) => {
            const next = prev + 1;
            if (next >= book.content.length) {
                stopPlaying();
                return prev;
            }
            const currentWord = book.content[prev];
            let delay = 60000 / settings.wpm;
            if (/[.!?]$/.test(currentWord)) delay += settings.sentencePause;
            else if (currentWord === "" || currentWord === "\n") delay += settings.paragraphPause;

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(advanceWord, delay);
            return next;
        });
    }, [book.content, settings.wpm, settings.sentencePause, settings.paragraphPause, stopPlaying]);

    useEffect(() => {
        if (isPlaying) timerRef.current = setInterval(advanceWord, 60000 / settings.wpm);
        else if (timerRef.current) clearInterval(timerRef.current);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying, advanceWord, settings.wpm]);

    // Dedicated Stats Reporting Interval
    // This fixes the bug where rapid updates (useEffect) cancelled the timeout
    useEffect(() => {
        let statsInterval: NodeJS.Timeout | null = null;
        if (isPlaying) {
            statsInterval = setInterval(() => {
                onUpdateProgress(book.id, currentIndexRef.current, 1);
            }, 1000);
        }
        return () => {
            if (statsInterval) clearInterval(statsInterval);
        };
    }, [isPlaying, book.id]); // Deliberately exclude currentIndex to avoid resetting interval

    // Report progress when pausing or leaving (to ensure last chunk is saved)
    useEffect(() => {
        return () => {
            onUpdateProgress(book.id, currentIndexRef.current, 0); // Save progress, no stats
        };
    }, []);

    useEffect(() => {
        const onBackPress = () => {
            if (showSettings) { setShowSettings(false); return true; }
            if (showFullText) { setShowFullText(false); return true; }
            onBack(currentIndexRef.current);
            return true;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [showFullText, showSettings, onBack]);



    const isDark = settings.theme === 'dark';
    const isSepia = settings.theme === 'sepia';

    const themeColors = useMemo(() => ({
        bg: isDark ? '#121212' : (isSepia ? '#f4ecd8' : '#fcfcfc'),
        cardBg: isDark ? '#1e1e1e' : (isSepia ? '#e2d7b5' : '#ffffff'),
        text: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#111827'),
        subText: isDark ? '#9ca3af' : (isSepia ? 'rgba(91, 70, 54, 0.6)' : '#6b7280'),
        accent: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#000000'),
        accentText: isDark ? '#000' : (isSepia ? '#f4ecd8' : '#fff'),
        border: isDark ? 'rgba(255,255,255,0.05)' : (isSepia ? '#c4b595' : '#f3f4f6'),
        isDark
    }), [isDark, isSepia]);

    const currentWord = (book.content && book.content[currentIndex]) || "";
    const progress = Math.round((currentIndex / (book.content?.length || 1)) * 100);

    const wordChunks = useMemo(() => {
        if (!book.content || !showFullText) return [];
        const chunkSize = 150; // Smaller chunk for better scroll accuracy
        const chunks = [];
        for (let i = 0; i < book.content.length; i += chunkSize) {
            chunks.push({ id: i.toString(), startIndex: i, words: book.content.slice(i, i + chunkSize) });
        }
        return chunks;
    }, [book.id, showFullText]);

    const initialChunkIndex = useMemo(() => {
        const chunkSize = 150;
        return Math.floor(currentIndex / chunkSize);
    }, [currentIndex]);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
            <TopBar
                book={book}
                progress={progress}
                onBack={() => onBack(currentIndexRef.current)}
                onShowFullText={() => setShowFullText(true)}
                theme={themeColors}
                opacity={controlsOpacity}
                t={t}
            />

            <View style={styles.readerArea} {...panResponder.panHandlers}>
                <TouchableWithoutFeedback onPress={toggleControls}>
                    <View style={{ flex: 1, justifyContent: 'center', width: '100%' }}>
                        <View style={[styles.scrubberOverlay, { opacity: isScrubbing ? 0.3 : 0 }]}>
                            <Text style={[styles.scrubText, { color: themeColors.text }]}>
                                {isScrubbing ? t.reader.scanning : ''}
                            </Text>
                        </View>
                        <WordDisplay word={currentWord} fontSize={settings.fontSize} theme={settings.theme} />
                        {settings.showContext && (
                            <Animated.View style={[styles.contextArea, { opacity: controlsOpacity }]}>
                                <Text numberOfLines={3} style={[styles.contextText, { color: themeColors.subText, fontSize: 16, opacity: 0.6 }]}>
                                    {book.content?.slice(currentIndex + 1, currentIndex + 40).join(" ")}
                                </Text>
                            </Animated.View>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </View>

            <BottomPanel
                currentIndex={currentIndex}
                totalWords={book.content?.length || 1}
                isPlaying={isPlaying}
                settings={settings}
                theme={themeColors}
                opacity={controlsOpacity}
                t={t}
                onValueChange={(v: number) => { stopPlaying(); setCurrentIndex(Math.floor(v)); currentIndexRef.current = Math.floor(v); }}
                onSlidingComplete={(v: number) => onUpdateProgress(book.id, Math.floor(v), 0)}
                onRewind={handleRewind}
                onPlayPause={isPlaying ? stopPlaying : startPlaying}
                onOpenSettings={() => { stopPlaying(); setShowSettings(true); }}
                onUpdateSettings={onUpdateSettings}
            />

            {!controlsVisible && isPlaying && (
                <TouchableOpacity onPress={stopPlaying} style={[styles.floatingPause, { backgroundColor: themeColors.accent }]}>
                    <Pause size={32} color={themeColors.accentText} fill={themeColors.accentText} />
                </TouchableOpacity>
            )}

            <Modal visible={showFullText} animationType="slide" onRequestClose={() => setShowFullText(false)}>
                <SafeAreaView style={[styles.fullTextContainer, { backgroundColor: themeColors.bg }]}>
                    <View style={styles.fullTextHeader}>
                        <View style={{ flex: 1, marginRight: 16 }}>
                            <Text style={[styles.fullTextTitle, { color: themeColors.text }]}>{t.reader.fullText}</Text>
                            <Text style={{ color: themeColors.subText, fontSize: 12, marginTop: 4 }}>
                                {t.reader.fullTextInstruction}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowFullText(false)} style={styles.closeFullText}>
                            <CloseIcon size={32} color={themeColors.text} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={wordChunks}
                        keyExtractor={item => item.id}
                        initialNumToRender={10}
                        windowSize={10}
                        initialScrollIndex={initialChunkIndex > 0 ? initialChunkIndex : undefined}
                        getItemLayout={(_, index) => ({
                            length: 220, // Estimated height of a chunk container (padding + wrap-around text)
                            offset: 220 * index,
                            index,
                        })}
                        onScrollToIndexFailed={(info) => {
                            console.warn('Scroll to index failed:', info);
                        }}
                        renderItem={({ item }) => (
                            <View style={[styles.chunkContainer, { minHeight: 200 }]}>
                                {item.words.map((word: string, i: number) => {
                                    const actualIndex = item.startIndex + i;
                                    const isActive = actualIndex === currentIndex;
                                    return (
                                        <TouchableOpacity key={actualIndex} onPress={() => { setCurrentIndex(actualIndex); setShowFullText(false); }} style={[styles.wordTouch, isActive && { backgroundColor: themeColors.accent + '20', borderRadius: 4 }]}>
                                            <Text style={[styles.fullTextWord, { color: isActive ? themeColors.accent : themeColors.text, fontWeight: isActive ? 'bold' : 'normal' }]}>{word}{' '}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                        contentContainerStyle={styles.fullTextScroll}
                    />
                </SafeAreaView>
            </Modal>
            {showSettings && <SettingsModal settings={settings} onUpdateSettings={onUpdateSettings} onClose={() => setShowSettings(false)} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 20, borderBottomWidth: 1, zIndex: 100 },
    topBarIcon: { padding: 10 },
    topBarTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
    topBarTitle: { fontSize: 16, fontWeight: '800' },
    topBarSubtitle: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    readerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    contextArea: { marginTop: 60, paddingHorizontal: 40, alignItems: 'center' },
    contextText: { textAlign: 'center', lineHeight: 24 },
    bottomPanel: { position: 'absolute', bottom: 30, left: 16, right: 16, zIndex: 100 },
    sliderRow: { marginBottom: 12, paddingHorizontal: 16 },
    bottomSlider: { width: '100%', height: 40 },
    controlCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 40, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8, height: 80 },
    wpmControl: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
    wpmButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    wpmButtonText: { fontSize: 24, fontWeight: '400' },
    wpmTextContainer: { alignItems: 'center', minWidth: 44, marginHorizontal: 2 },
    wpmValue: { fontSize: 16, fontWeight: '800' },
    wpmLabel: { fontSize: 8, fontWeight: '900', marginTop: -2 },
    centerControls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    rewindButton: { padding: 8 },
    playPauseButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    settingsIcon: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row' },
    iconButton: { padding: 10 },
    floatingPause: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, zIndex: 200 },
    fullTextContainer: { flex: 1 },
    fullTextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    fullTextTitle: { fontSize: 28, fontWeight: '800' },
    closeFullText: { padding: 10 },
    fullTextScroll: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },
    chunkContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    wordTouch: { padding: 2 },
    fullTextWord: { fontSize: 18, lineHeight: 28 },
    scrubberOverlay: { position: 'absolute', top: '20%', alignItems: 'center', width: '100%' },
    scrubText: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 }
});
