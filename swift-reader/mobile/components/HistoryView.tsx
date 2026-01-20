import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Linking,
    ActivityIndicator
} from 'react-native';
import { DailyStats, ReaderSettings } from '../types'; // Added ReaderSettings
import { translations } from '../services/i18n';
import { BarChart2, TrendingUp, Clock, BookOpen, ExternalLink, Heart, Coffee, Crown } from 'lucide-react-native';

const DONATION_PHRASES: string[] = []; // Deprecated, using i18n

interface Supporter {
    name: string;
    year: string;
}

interface HistoryViewProps {
    history: DailyStats[];
    wpm?: number;
    theme: any;
    settings: ReaderSettings; // Added settings
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, wpm = 300, theme, settings }) => {
    const t = translations[settings.language].history;
    const tl = translations[settings.language].library;
    // Standardize wpm-based time calculation
    const totalWords = history.reduce((acc, curr) => acc + curr.wordsRead, 0);
    // Use recorded secondsRead for accurate time tracking
    const totalTimeMins = Math.round(history.reduce((acc, curr) => acc + (curr.secondsRead || 0), 0) / 60);
    const totalBooks = history.reduce((acc, curr) => acc + (curr.completedBooks?.length || 0), 0);

    const flavorText = useMemo(() => {
        const phrases = t.donationPhrases || [];
        if (phrases.length === 0) return "";
        const idx = Math.floor(Math.random() * phrases.length);
        return phrases[idx];
    }, [t.donationPhrases]);

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = (minutes / 60).toFixed(1);
        return `${hours.endsWith('.0') ? hours.slice(0, -2) : hours}h`;
    };

    const [supporters, setSupporters] = useState<Supporter[]>([]);
    const [showSupporters, setShowSupporters] = useState(false);

    useEffect(() => {
        const fetchSupporters = async () => {
            try {
                const response = await fetch('https://gist.githubusercontent.com/MythicalJo/493d770c9e6a6d98ae98bdbe6670f502/raw/vip-users.json');
                if (!response.ok) throw new Error('Network response drop');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setSupporters(data);
                    setShowSupporters(true);
                }
            } catch (error) {
                // Silent fail: User never knows it failed
                setShowSupporters(false);
            }
        };
        fetchSupporters();
    }, []);

    const handleDonate = () => {
        Linking.openURL('https://ko-fi.com/myth_jo');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                    <Text style={[styles.subtitle, { color: theme.subText }]}>{t.flavorText}</Text>
                </View>
                <TrendingUp size={24} color={theme.accent} />
            </View>

            <View style={styles.statsOverview}>
                <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <BookOpen size={20} color={theme.accent} style={{ marginBottom: 8 }} />
                    <Text style={[styles.statValue, { color: theme.text }]}>{totalWords.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: theme.subText }]}>{t.wordsRead.toUpperCase()}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Clock size={20} color={theme.accent} style={{ marginBottom: 8 }} />
                    <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(totalTimeMins)}</Text>
                    <Text style={[styles.statLabel, { color: theme.subText }]}>{t.timeRead.toUpperCase()}</Text>
                </View>
            </View>

            <View style={[styles.totalCompleted, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={[styles.completedCount, { color: theme.text }]}>{totalBooks}</Text>
                <Text style={[styles.completedLabel, { color: theme.subText }]}>LIFETIME {t.totalBooks.toUpperCase()} COMPLETED</Text>
            </View>

            <View style={styles.dailySection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.dailyGoal}</Text>
                {history.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.subText }]}>{t.noHistory}</Text>
                ) : (
                    [...history].reverse().map((day, idx) => {
                        const dayMins = Math.round((day.secondsRead || 0) / 60);
                        return (
                            <View key={idx} style={[styles.dayRow, { borderBottomColor: theme.border }]}>
                                <View>
                                    <Text style={[styles.dayDate, { color: theme.text }]}>{day.date}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.dayMeta, { color: theme.subText }]}>
                                            {day.wordsRead.toLocaleString()} {tl.words} • {formatTime(dayMins)}
                                        </Text>
                                        {(day.completedBooks?.length || 0) > 0 && (
                                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                                <Text style={[styles.badgeText, { color: theme.accentText }]}>
                                                    +{day.completedBooks.length} {t.totalBooks}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <BarChart2 size={16} color={theme.subText} />
                            </View>
                        );
                    })
                )}
            </View>

            <View style={styles.donationContainer}>
                <Text style={[styles.flavorText, { color: theme.subText }]}>{flavorText}</Text>
                <TouchableOpacity
                    onPress={handleDonate}
                    style={[styles.donateButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                >
                    <Coffee size={20} color="#6F4E37" style={{ marginRight: 10 }} />
                    <Text style={[styles.donateText, { color: theme.text }]}>{t.donateTitle} (Ko-fi)</Text>
                    <ExternalLink size={16} color={theme.subText} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>

            {showSupporters && (
                <View style={[styles.hallOfFameContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <View style={styles.hofHeader}>
                        <Crown size={20} color="#FFD700" fill="#FFD700" style={{ marginRight: 8 }} />
                        <Text style={[styles.hofTitle, { color: theme.text }]}>{t.hallOfFameTitle}</Text>
                    </View>
                    <View style={styles.supporterList}>
                        {supporters.map((supporter, idx) => (
                            <View key={idx} style={[styles.supporterRow, idx < supporters.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                                <Text style={[styles.supporterName, { color: theme.text }]}>{supporter.name}</Text>
                                <View style={[styles.yearBadge, { backgroundColor: theme.accent + '20' }]}>
                                    <Text style={[styles.yearText, { color: theme.accent }]}>{supporter.year}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 100
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32
    },
    title: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    subtitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    statsOverview: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statBox: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1 },
    statValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '800', opacity: 0.6 },
    totalCompleted: { padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center', marginBottom: 32 },
    completedCount: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
    completedLabel: { fontSize: 12, fontWeight: '700', opacity: 0.6, letterSpacing: 1 },
    dailySection: { flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    dayDate: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    dayMeta: { fontSize: 13, fontWeight: '500' },
    badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, fontWeight: '600' },
    donateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 5, // Reduced from 15
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    donateText: {
        fontSize: 16,
        fontWeight: '700',
    },
    donationContainer: {
        marginTop: 10, // Reduced from 20
        marginBottom: 20,
    },
    flavorText: {
        fontSize: 12,
        fontWeight: '600',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 12,
        paddingHorizontal: 20,
        lineHeight: 18,
    },
    hallOfFameContainer: {
        marginTop: 20,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 40
    },
    hofHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)'
    },
    hofTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    supporterList: {
        paddingHorizontal: 20
    },
    supporterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14
    },
    supporterName: {
        fontSize: 15,
        fontWeight: '600'
    },
    yearBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    yearText: {
        fontSize: 11,
        fontWeight: '800'
    }
});
