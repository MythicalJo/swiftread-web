
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    Switch,
    SafeAreaView,
    TextInput,
    Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import { ReaderSettings, Book } from '../types';
import { translations } from '../services/i18n';
import { X, Moon, Sun, Coffee, Type, Settings as SettingsIcon, Clock, Zap } from 'lucide-react-native';

interface SettingsModalProps {
    settings: ReaderSettings;
    onUpdateSettings: (newSettings: ReaderSettings | ((prev: ReaderSettings) => ReaderSettings)) => void;
    onClose: () => void;
    book?: Book;
    onJumpToBookmark?: (index: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    settings,
    onUpdateSettings,
    onClose,
    book,
    onJumpToBookmark
}) => {
    const isDark = settings.theme === 'dark';
    const isSepia = settings.theme === 'sepia';

    const theme = {
        bg: isDark ? '#1e1e1e' : (isSepia ? '#f4ecd8' : '#ffffff'),
        text: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#111827'),
        subText: isDark ? '#9ca3af' : (isSepia ? 'rgba(91, 70, 54, 0.6)' : '#6b7280'),
        border: isDark ? 'rgba(255,255,255,0.1)' : (isSepia ? '#c4b595' : '#f3f4f6'),
        accent: isDark ? '#ef4444' : (isSepia ? '#5b4636' : '#000000'),
        inputBg: isDark ? '#000000' : (isSepia ? '#e2d7b5' : '#f9fafb')
    };

    const t = translations[settings.language].settings;

    const updateSetting = (key: keyof ReaderSettings, value: any) => {
        onUpdateSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: theme.bg }]}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <SettingsIcon size={24} color={theme.accent} style={styles.headerIcon} />
                            <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={28} color={theme.subText} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.subText }]}>{t.readingPace}</Text>

                            {/* Reading Speed (WPM) */}
                            <View style={styles.sectionHeader}>
                                <Zap size={20} color={theme.accent} />
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.readingSpeed}</Text>
                            </View>

                            <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>Speed</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, borderColor: theme.border, minWidth: 80, textAlign: 'center' }]}
                                        keyboardType="numeric"
                                        defaultValue={settings.wpm.toString()}
                                        onEndEditing={(e) => {
                                            let val = parseInt(e.nativeEvent.text.replace(/[^0-9]/g, ''), 10);
                                            if (isNaN(val)) val = 300; // Default if invalid
                                            if (val < 60) val = 60;
                                            if (val > 1200) val = 1200;
                                            updateSetting('wpm', val);
                                        }}
                                    />
                                </View>
                                <Slider
                                    style={{ height: 40 }}
                                    minimumValue={60}
                                    maximumValue={1200}
                                    step={1}
                                    value={settings.wpm}
                                    onValueChange={(val) => updateSetting('wpm', val)}
                                    minimumTrackTintColor={theme.accent}
                                    maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                                    thumbTintColor={theme.accent}
                                />
                            </View>

                            <View style={[styles.settingColumn, { marginTop: 24 }]}>
                                <Text style={[styles.settingName, { color: theme.text }]}>{t.wpmIncrement}</Text>
                                <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.wpmIncrementDesc}</Text>
                                <View style={[styles.stepToggleContainer, { marginTop: 12, alignSelf: 'flex-start' }]}>
                                    {[5, 10, 25, 50].map(step => (
                                        <TouchableOpacity
                                            key={step}
                                            onPress={() => updateSetting('wpmStep', step)}
                                            style={[
                                                styles.stepButton,
                                                { backgroundColor: settings.wpmStep === step ? theme.accent : theme.inputBg }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.stepButtonText,
                                                { color: settings.wpmStep === step ? '#fff' : theme.text }
                                            ]}>{step}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={[styles.settingColumn, { marginTop: 24 }]}>
                                <Text style={[styles.settingName, { color: theme.text }]}>{t.rewindAmount}</Text>
                                <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.rewindAmountDesc}</Text>
                                <View style={[styles.stepToggleContainer, { marginTop: 12, alignSelf: 'flex-start' }]}>
                                    {[5, 10, 15, 20].map(amount => (
                                        <TouchableOpacity
                                            key={amount}
                                            onPress={() => updateSetting('rewindAmount', amount)}
                                            style={[
                                                styles.stepButton,
                                                { backgroundColor: settings.rewindAmount === amount ? theme.accent : theme.inputBg }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.stepButtonText,
                                                { color: settings.rewindAmount === amount ? '#fff' : theme.text }
                                            ]}>{amount}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Pauses Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.subText }]}>{t.flowPauses}</Text>

                            <View style={styles.sliderGroup}>
                                <View style={styles.sliderHeader}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.sentencePause}</Text>
                                    <Text style={[styles.sliderValue, { color: theme.accent }]}>{settings.sentencePause}ms</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0}
                                    maximumValue={1000}
                                    step={50}
                                    value={settings.sentencePause}
                                    onValueChange={(v) => updateSetting('sentencePause', v)}
                                    minimumTrackTintColor={theme.accent}
                                    maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                                    thumbTintColor={theme.accent}
                                />
                            </View>

                            <View style={styles.sliderGroup}>
                                <View style={styles.sliderHeader}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.paragraphPause}</Text>
                                    <Text style={[styles.sliderValue, { color: theme.accent }]}>{settings.paragraphPause}ms</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0}
                                    maximumValue={2000}
                                    step={100}
                                    value={settings.paragraphPause}
                                    onValueChange={(v) => updateSetting('paragraphPause', v)}
                                    minimumTrackTintColor={theme.accent}
                                    maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                                    thumbTintColor={theme.accent}
                                />
                            </View>
                        </View>

                        {/* Interface Section */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: theme.subText }]}>{t.interface}</Text>
                            <View style={styles.settingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.autoHide}</Text>
                                    <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.autoHideDesc}</Text>
                                </View>
                                <Switch
                                    value={settings.autoHideControls}
                                    onValueChange={(v) => updateSetting('autoHideControls', v)}
                                    trackColor={{ false: isDark ? '#374151' : '#e5e7eb', true: theme.accent }}
                                    thumbColor={isDark ? '#fff' : (isSepia ? '#f4ecd8' : '#fff')}
                                    {...(Platform.OS === 'web' ? { activeTrackColor: theme.accent } : {})}
                                />
                            </View>

                            {settings.autoHideControls && (
                                <View style={[styles.sliderGroup, { marginTop: 12 }]}>
                                    <View style={styles.sliderHeader}>
                                        <Text style={[styles.settingName, { color: theme.text }]}>{t.hideDelay}</Text>
                                        <Text style={[styles.sliderValue, { color: theme.accent }]}>{settings.hideDelay}s</Text>
                                    </View>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={1}
                                        maximumValue={15}
                                        step={1}
                                        value={settings.hideDelay}
                                        onValueChange={(v) => updateSetting('hideDelay', v)}
                                        minimumTrackTintColor={theme.accent}
                                        maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                                        thumbTintColor={theme.accent}
                                    />
                                </View>
                            )}

                            <View style={[styles.settingRow, { marginTop: 24 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.showClock}</Text>
                                    <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.showClockDesc}</Text>
                                </View>
                                <Switch
                                    value={settings.showClock}
                                    onValueChange={(v) => updateSetting('showClock', v)}
                                    trackColor={{ false: isDark ? '#374151' : '#e5e7eb', true: theme.accent }}
                                    thumbColor={isDark ? '#fff' : (isSepia ? '#f4ecd8' : '#fff')}
                                    {...(Platform.OS === 'web' ? { activeTrackColor: theme.accent } : {})}
                                />
                            </View>

                            <View style={[styles.settingRow, { marginTop: 12 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.showBattery}</Text>
                                    <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.showBatteryDesc}</Text>
                                </View>
                                <Switch
                                    value={settings.showBattery}
                                    onValueChange={(v) => updateSetting('showBattery', v)}
                                    trackColor={{ false: isDark ? '#374151' : '#e5e7eb', true: theme.accent }}
                                    thumbColor={isDark ? '#fff' : (isSepia ? '#f4ecd8' : '#fff')}
                                    {...(Platform.OS === 'web' ? { activeTrackColor: theme.accent } : {})}
                                />
                            </View>

                            <View style={[styles.settingRow, { marginTop: 12 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.settingName, { color: theme.text }]}>{t.use24Hour}</Text>
                                    <Text style={[styles.settingDesc, { color: theme.subText }]}>{t.use24HourDesc}</Text>
                                </View>
                                <Switch
                                    value={settings.use24HourClock}
                                    onValueChange={(v) => updateSetting('use24HourClock', v)}
                                    trackColor={{ false: isDark ? '#374151' : '#e5e7eb', true: theme.accent }}
                                    thumbColor={isDark ? '#fff' : (isSepia ? '#f4ecd8' : '#fff')}
                                    {...(Platform.OS === 'web' ? { activeTrackColor: theme.accent } : {})}
                                />
                            </View>

                            <View style={[styles.settingColumn, { marginTop: 24 }]}>
                                <Text style={[styles.settingName, { color: theme.text }]}>{t.appLanguage}</Text>
                                <Text style={[styles.settingDesc, { color: theme.subText }]}>Current selection: {settings.language === 'en' ? 'English' : 'Spanish'}</Text>
                                <View style={[styles.stepToggleContainer, { marginTop: 12, alignSelf: 'flex-start' }]}>
                                    {[
                                        { id: 'en', label: 'English' },
                                        { id: 'es', label: 'Español' }
                                    ].map(lang => (
                                        <TouchableOpacity
                                            key={lang.id}
                                            onPress={() => updateSetting('language', lang.id)}
                                            style={[
                                                styles.stepButton,
                                                {
                                                    backgroundColor: settings.language === lang.id ? theme.accent : theme.inputBg,
                                                    paddingHorizontal: 15
                                                }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.stepButtonText,
                                                { color: settings.language === lang.id ? '#fff' : theme.text }
                                            ]}>{lang.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Display Section */}
                        <View style={[styles.section, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.sectionLabel, { color: theme.subText }]}>{t.themeTypography}</Text>

                            <View style={styles.themeGrid}>
                                <TouchableOpacity
                                    onPress={() => updateSetting('theme', 'light')}
                                    style={[styles.themeCard, {
                                        backgroundColor: '#ffffff',
                                        borderColor: settings.theme === 'light' ? '#000' : '#f3f4f6'
                                    }]}
                                >
                                    <Sun size={20} color="#000" />
                                    <Text style={styles.themeCardText}>{t.light}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => updateSetting('theme', 'sepia')}
                                    style={[styles.themeCard, {
                                        backgroundColor: '#f4ecd8',
                                        borderColor: settings.theme === 'sepia' ? '#5b4636' : '#c4b595'
                                    }]}
                                >
                                    <Coffee size={20} color="#5b4636" />
                                    <Text style={[styles.themeCardText, { color: '#5b4636' }]}>{t.sepia}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => updateSetting('theme', 'dark')}
                                    style={[styles.themeCard, {
                                        backgroundColor: '#121212',
                                        borderColor: settings.theme === 'dark' ? '#ef4444' : 'rgba(255,255,255,0.1)'
                                    }]}
                                >
                                    <Moon size={20} color="#fff" />
                                    <Text style={[styles.themeCardText, { color: '#fff' }]}>{t.dark}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.sliderGroup}>
                                <View style={styles.sliderHeader}>
                                    <View style={styles.row}>
                                        <Type size={18} color={theme.text} style={{ marginRight: 8 }} />
                                        <Text style={[styles.settingName, { color: theme.text }]}>{t.fontSize}</Text>
                                    </View>
                                    <Text style={[styles.sliderValue, { color: theme.accent }]}>{settings.fontSize}px</Text>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={32}
                                    maximumValue={120}
                                    step={1}
                                    value={settings.fontSize}
                                    onValueChange={(v) => updateSetting('fontSize', v)}
                                    minimumTrackTintColor={theme.accent}
                                    maximumTrackTintColor={isDark ? '#374151' : '#e5e7eb'}
                                    thumbTintColor={theme.accent}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    section: {
        marginBottom: 32,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginLeft: 8,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 20,
        paddingLeft: 4,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingItem: {
        marginBottom: 20,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    settingColumn: {
        flexDirection: 'column',
        marginBottom: 20,
    },
    settingName: {
        fontSize: 17,
        fontWeight: '700',
    },
    settingDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    stepToggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    stepButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    stepButtonText: {
        fontSize: 14,
        fontWeight: '800',
    },
    sliderGroup: {
        marginBottom: 24,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sliderValue: {
        fontSize: 14,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    themeCard: {
        flex: 1,
        height: 80,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    themeCardText: {
        fontSize: 13,
        fontWeight: '700',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 16,
        fontWeight: '600'
    }
});
