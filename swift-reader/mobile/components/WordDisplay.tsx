
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: viewportWidth } = Dimensions.get('window');

interface WordDisplayProps {
    word: string;
    fontSize: number;
    theme: 'light' | 'dark' | 'sepia';
}

export const WordDisplay = React.memo<WordDisplayProps>(({
    word,
    fontSize,
    theme
}) => {
    if (!word) return null;

    // Dynamic font size adjustment for long words
    const displayFontSize = useMemo(() => {
        const charCount = word.length;
        const maxWordWidth = viewportWidth * 0.85;

        // Estimate width: monospaced characters are roughly 0.6 of font size in width
        const estimatedWidth = charCount * fontSize * 0.6;

        if (estimatedWidth > maxWordWidth) {
            return Math.floor(maxWordWidth / (charCount * 0.6));
        }
        return fontSize;
    }, [word, fontSize]);

    const isDark = theme === 'dark';
    const isSepia = theme === 'sepia';

    const colors = {
        text: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#000000'),
        orp: '#ef4444',
        guide: isDark ? 'rgba(255,255,255,0.1)' : (isSepia ? 'rgba(91, 70, 54, 0.1)' : 'rgba(0,0,0,0.1)')
    };

    // Optimal Recognition Point (ORP) calculation
    const length = word.length;
    let midStart: number;
    let midEnd: number;

    if (length <= 1) {
        midStart = 0;
        midEnd = 1;
    } else if (length % 2 === 0) {
        midStart = (length / 2) - 1;
        midEnd = midStart + 2;
    } else {
        midStart = Math.floor(length / 2);
        midEnd = midStart + 1;
    }

    const prefix = word.substring(0, midStart);
    const middle = word.substring(midStart, midEnd);
    const suffix = word.substring(midEnd);

    return (
        <View style={styles.container}>
            {/* Visual Alignment Guides */}
            <View style={[styles.guide, { backgroundColor: colors.guide, top: '25%' }]} />

            {/* Word Container */}
            <View style={styles.wordRow}>
                <Text style={[styles.wordText, { fontSize: displayFontSize, color: colors.text }]}>
                    {prefix}
                    <Text style={{ color: colors.orp }}>{middle}</Text>
                    {suffix}
                </Text>
            </View>

            <View style={[styles.guide, { backgroundColor: colors.guide, bottom: '25%' }]} />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        height: 200,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    guide: {
        width: 80,
        height: 1,
        position: 'absolute',
    },
    wordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wordText: {
        fontWeight: '700',
        fontFamily: 'monospace',
        letterSpacing: -0.5,
        textAlign: 'center',
    }
});
