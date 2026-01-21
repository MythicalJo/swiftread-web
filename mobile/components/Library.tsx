
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    TextInput,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Book, ReaderSettings, Category } from '../types';
import { Plus, BookOpen, Clock, Settings, Search, Trash2, X, ChevronRight, LayoutGrid, List as ListIcon, FileText, ArrowUp, ArrowDown, Square, Star, FolderPlus, Check } from 'lucide-react-native';
import { translations } from '../services/i18n';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AppModal } from './AppModal';

interface LibraryProps {
    books: Book[];
    onSelect: (book: Book) => void;
    onUpload: (assets: DocumentPicker.DocumentPickerAsset[]) => void;
    onPaste: (title: string, text: string) => void;
    onDelete: (id: string) => void;
    onResetProgress: (id: string) => void;
    onOpenSettings: () => void;
    isUploading: boolean;
    settings: ReaderSettings;
    sortBy: 'recent' | 'added' | 'az' | 'finished' | 'unfinished';
    sortOrder: 'asc' | 'desc';
    viewMode: 'default' | 'list' | 'grid';
    onSortChange: (sort: 'recent' | 'added' | 'az' | 'finished' | 'unfinished') => void;
    onToggleOrder: () => void;
    onViewModeChange: (mode: 'default' | 'list' | 'grid') => void;
    categories: Category[];
    onAddToCategory: (bookId: string, categoryId: string) => void;
    goToCategories: () => void;
    debugStatus?: string;
}

export const Library: React.FC<LibraryProps> = ({
    books, onSelect, onUpload, onPaste, onDelete, onResetProgress, onOpenSettings, isUploading, settings, sortBy, sortOrder, viewMode, onSortChange, onToggleOrder, onViewModeChange, categories, onAddToCategory, goToCategories, debugStatus
}) => {
    const t = translations[settings.language].library;
    const commonT = translations[settings.language].common;
    const catT = translations[settings.language].categories;
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [resetBook, setResetBook] = useState<Book | null>(null);
    const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
    const [pasteTitle, setPasteTitle] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [selectedBookForCategorization, setSelectedBookForCategorization] = useState<string | null>(null);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/epub+zip', 'text/plain'],
                multiple: true
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                onUpload(result.assets);
            }
        } catch (err) {
            console.error('Error picking document:', err);
            Alert.alert(t.pickerErrorTitle, t.pickerErrorBody);
        }
    };

    const handlePasteSubmit = () => {
        if (pasteContent.trim()) {
            onPaste(pasteTitle || 'Pasted Text', pasteContent);
            setPasteTitle('');
            setPasteContent('');
            setShowPasteModal(false);
        }
    };

    const handleAddToCategory = (bookId: string) => {
        setSelectedBookForCategorization(bookId);
    };

    const isDark = settings.theme === 'dark';
    const isSepia = settings.theme === 'sepia';

    const theme = {
        bg: isDark ? '#121212' : (isSepia ? '#f4ecd8' : '#fcfcfc'),
        cardBg: isDark ? '#1e1e1e' : (isSepia ? '#e2d7b5' : '#ffffff'),
        text: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#111827'),
        subText: isDark ? '#9ca3af' : (isSepia ? 'rgba(91, 70, 54, 0.6)' : '#6b7280'),
        accent: isDark ? '#ffffff' : (isSepia ? '#5b4636' : '#000000'),
        accentText: isDark ? '#000000' : (isSepia ? '#f4ecd8' : '#ffffff'),
        border: isDark ? 'rgba(255,255,255,0.05)' : (isSepia ? '#c4b595' : '#f3f4f6')
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.bg }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                    <Text style={[styles.subtitle, { color: theme.subText }]}>{t.title === 'Biblioteca' ? 'Selecciona o importa un libro' : 'Select a book or import a new one'}</Text>
                </View>
                <TouchableOpacity
                    onPress={onOpenSettings}
                    style={[styles.settingsButton, { borderColor: theme.border, backgroundColor: theme.cardBg }]}
                >
                    <Settings size={24} color={theme.text} strokeWidth={1.5} />
                </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={() => setShowPasteModal(true)}
                    style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                >
                    <FileText size={20} color={theme.text} style={styles.buttonIcon} />
                    <Text style={[styles.actionButtonText, { color: theme.text }]}>{t.pasteText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={pickDocument}
                    style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                >
                    <Plus size={20} color={theme.accentText} style={styles.buttonIcon} />
                    <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>{t.uploadFile}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.controlsRow}>
                <View style={styles.headerLeftRow}>
                    <TouchableOpacity
                        onPress={() => onViewModeChange('default')}
                        style={[styles.viewModeBtn, viewMode === 'default' && { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    >
                        <LayoutGrid size={16} color={viewMode === 'default' ? theme.text : theme.subText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onViewModeChange('list')}
                        style={[styles.viewModeBtn, viewMode === 'list' && { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    >
                        <ListIcon size={16} color={viewMode === 'list' ? theme.text : theme.subText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onViewModeChange('grid')}
                        style={[styles.viewModeBtn, viewMode === 'grid' && { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    >
                        <Square size={16} color={viewMode === 'grid' ? theme.text : theme.subText} />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerRightRow}>
                    <TouchableOpacity
                        onPress={() => setShowSortModal(true)}
                        style={[styles.sortButton, { borderColor: theme.border, backgroundColor: theme.cardBg, marginRight: 8 }]}
                    >
                        <Clock size={12} color={theme.subText} style={{ marginRight: 4 }} />
                        <Text style={[styles.sortButtonText, { color: theme.text }]}>
                            {sortBy === 'recent' ? t.sortRecent : sortBy === 'added' ? t.sortAdded : sortBy === 'az' ? t.sortAz : sortBy === 'finished' ? t.sortFinished : t.sortUnfinished}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={onToggleOrder}
                        style={[styles.orderButton, { borderColor: theme.border, backgroundColor: theme.cardBg }]}
                    >
                        {sortOrder === 'desc' ? (
                            <ArrowDown size={14} color={theme.text} />
                        ) : (
                            <ArrowUp size={14} color={theme.text} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {isUploading && (
                <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>{t.processing}</Text>
                    {debugStatus ? (
                        <Text style={{ color: theme.subText, marginTop: 10, fontSize: 12 }}>{debugStatus}</Text>
                    ) : null}
                </View>
            )}

            {books.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <BookOpen size={64} color={isDark ? '#374151' : '#e5e7eb'} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: theme.subText }]}>
                        {t.emptyState}{"\n"}{t.emptyStateSub}
                    </Text>
                </View>
            ) : (
                <View style={[viewMode === 'grid' ? styles.bookGridContainer : styles.bookListContainer]}>
                    {books.map((book) => {
                        const total = book.content?.length || 1;
                        const isFinished = book.hasBeenFinished || (book.progress >= (total - 1));

                        if (viewMode === 'list') {
                            return (
                                <TouchableOpacity
                                    key={book.id}
                                    onPress={() => onSelect(book)}
                                    onLongPress={() => setResetBook(book)}
                                    activeOpacity={0.7}
                                    style={[styles.listItem, { borderBottomColor: theme.border }]}
                                >
                                    <View style={styles.listItemLeft}>
                                        <FileText size={20} color={theme.subText} style={{ marginRight: 12 }} />
                                        <View style={styles.listTitleContainer}>
                                            <Text style={[styles.listItemTitle, { color: theme.text }]} numberOfLines={1}>
                                                {book.title}
                                            </Text>
                                            <LinearGradient
                                                colors={['transparent', theme.bg]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.textGradient}
                                            />
                                        </View>
                                        {isFinished && (
                                            <Star size={14} color="#FFD700" fill="#FFD700" style={{ marginLeft: 20, marginRight: 5 }} />
                                        )}
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                        <TouchableOpacity onPress={() => handleAddToCategory(book.id)}>
                                            <FolderPlus size={18} color={theme.subText} />
                                        </TouchableOpacity>
                                        <Trash2 size={16} color={theme.subText} onPress={() => setBookToDelete(book)} />
                                    </View>
                                </TouchableOpacity>
                            );
                        }

                        if (viewMode === 'grid') {
                            return (
                                <TouchableOpacity
                                    key={book.id}
                                    onPress={() => onSelect(book)}
                                    onLongPress={() => setResetBook(book)}
                                    activeOpacity={0.8}
                                    style={styles.gridItem}
                                >
                                    <View style={[styles.gridCoverContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                                        {book.cover ? (
                                            <Image source={{ uri: book.cover }} style={styles.gridCoverImage} />
                                        ) : (
                                            <BookOpen size={24} color={isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                                        )}
                                        {isFinished && (
                                            <View style={styles.gridStarContainer}>
                                                <Star size={12} color="#FFD700" fill="#FFD700" />
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            style={styles.gridTrash}
                                            onPress={() => setBookToDelete(book)}
                                        >
                                            <Trash2 size={12} color="#ff4444" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.gridTrash, { right: 32, backgroundColor: theme.accent }]}
                                            onPress={() => handleAddToCategory(book.id)}
                                        >
                                            <FolderPlus size={12} color={theme.accentText} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.gridTitleContainer}>
                                        <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>
                                            {book.title}
                                        </Text>
                                        <LinearGradient
                                            colors={['transparent', theme.bg]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.textGradient}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        }

                        // Default Card View
                        return (
                            <TouchableOpacity
                                key={book.id}
                                onPress={() => onSelect(book)}
                                onLongPress={() => setResetBook(book)}
                                activeOpacity={0.8}
                                style={[styles.bookCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                            >
                                <View style={[styles.coverPlaceholder, { backgroundColor: isDark ? '#000' : (isSepia ? '#f4ecd8' : '#f9fafb') }]}>
                                    {book.cover ? (
                                        <Image source={{ uri: book.cover }} style={styles.coverImage} />
                                    ) : (
                                        <BookOpen size={32} color={isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                                    )}
                                </View>
                                <View style={styles.bookDetails}>
                                    <View style={styles.bookMeta}>
                                        <Text style={[styles.bookType, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', color: theme.subText }]}>
                                            {book.type.toUpperCase()}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <TouchableOpacity onPress={() => handleAddToCategory(book.id)}>
                                                <FolderPlus size={16} color={theme.subText} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setBookToDelete(book)}>
                                                <Trash2 size={16} color={theme.subText} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
                                        {book.title}
                                    </Text>
                                    <Text style={[styles.bookStats, { color: theme.subText }]}>
                                        {(book.content?.length || 0).toLocaleString()} {t.words}
                                    </Text>

                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                            <View
                                                style={[styles.progressIndicator, {
                                                    backgroundColor: isFinished ? '#FFD700' : theme.accent,
                                                    width: `${Math.max(2, Math.min(100, (book.progress / ((book.content?.length || 1) - 1)) * 100))}%`
                                                }]}
                                            />
                                        </View>
                                        <View style={styles.progressTextRow}>
                                            <Text style={[styles.progressLabel, { color: theme.subText }]}>{t.progress}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.progressPercent, { color: isFinished ? '#FFD700' : theme.text }]}>
                                                    {Math.round((book.progress / ((book.content?.length || 1) - 1)) * 100)}%
                                                </Text>
                                                {isFinished && <Star size={10} color="#FFD700" fill="#FFD700" style={{ marginLeft: 4 }} />}
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Paste Modal */}
            <Modal
                visible={showPasteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.pasteTitle}</Text>
                            <TouchableOpacity onPress={() => setShowPasteModal(false)}>
                                <X size={28} color={theme.subText} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.subText }]}>{t.docTitleLabel}</Text>
                            <TextInput
                                value={pasteTitle}
                                onChangeText={setPasteTitle}
                                placeholder={t.docTitlePlaceholder}
                                placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                                style={[styles.input, {
                                    backgroundColor: isDark ? '#000' : (isSepia ? 'rgba(0,0,0,0.05)' : '#f9fafb'),
                                    borderColor: theme.border,
                                    color: theme.text
                                }]}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.subText }]}>{t.contentLabel}</Text>
                            <TextInput
                                value={pasteContent}
                                onChangeText={setPasteContent}
                                placeholder={t.pastePlaceholder}
                                placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                style={[styles.textArea, {
                                    backgroundColor: isDark ? '#000' : (isSepia ? 'rgba(0,0,0,0.05)' : '#f9fafb'),
                                    borderColor: theme.border,
                                    color: theme.text
                                }]}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handlePasteSubmit}
                            style={[styles.submitButton, { backgroundColor: theme.accent }]}
                        >
                            <Text style={[styles.submitButtonText, { color: theme.accentText }]}>
                                {t.startReading}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Category Checklist Modal */}
            <AppModal
                visible={!!selectedBookForCategorization}
                onClose={() => setSelectedBookForCategorization(null)}
                title={t.addToCategory}
                theme={theme}
                footer={
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <TouchableOpacity
                            onPress={() => setSelectedBookForCategorization(null)}
                            style={[styles.modalFooterBtn, { backgroundColor: theme.accent, flex: 1 }]}
                        >
                            <Text style={[styles.modalFooterBtnText, { color: theme.accentText }]}>{t.done}</Text>
                        </TouchableOpacity>
                    </View>
                }
            >
                {categories.length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ textAlign: 'center', color: theme.subText, marginBottom: 15 }}>
                            {t.noCategories}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedBookForCategorization(null);
                                goToCategories();
                            }}
                            style={[styles.smallLinkBtn, { borderColor: theme.accent }]}
                        >
                            <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.createCategory}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    categories.map(cat => {
                        const isIn = selectedBookForCategorization ? (cat.bookIds || []).includes(selectedBookForCategorization) : false;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryCheckItem, { borderBottomColor: theme.border }]}
                                onPress={() => selectedBookForCategorization && onAddToCategory(selectedBookForCategorization, cat.id)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: isIn ? theme.accent : 'transparent' }]}>
                                        {isIn && <Check size={12} color={theme.accentText} />}
                                    </View>
                                    <Text style={[styles.categoryCheckText, { color: theme.text }]}>{cat.name}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </AppModal>

            {/* Sort Choice Modal */}
            <AppModal
                visible={showSortModal}
                onClose={() => setShowSortModal(false)}
                title={t.sortTitle}
                theme={theme}
            >
                <View style={{ paddingBottom: 20 }}>
                    {[
                        { id: 'recent', label: t.sortRecent },
                        { id: 'added', label: t.sortAdded },
                        { id: 'az', label: t.sortAz },
                        { id: 'finished', label: t.sortFinished },
                        { id: 'unfinished', label: t.sortUnfinished }
                    ].map((item) => {
                        const isSelected = sortBy === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.categoryCheckItem, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    onSortChange(item.id as any);
                                    setShowSortModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.categoryCheckText,
                                    { color: isSelected ? theme.accent : theme.text, marginLeft: 0 },
                                    isSelected && { fontWeight: '800' }
                                ]}>
                                    {item.label}
                                </Text>
                                {isSelected && <Check size={20} color={theme.accent} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </AppModal>

            {/* Reset Progress Modal */}
            <AppModal
                visible={!!resetBook}
                onClose={() => setResetBook(null)}
                title={t.resetProgressTitle}
                theme={theme}
                footer={
                    <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => setResetBook(null)}
                            style={[styles.modalFooterBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', flex: 1 }]}
                        >
                            <Text style={[styles.modalFooterBtnText, { color: theme.text }]}>{t.cancelButton}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (resetBook) onResetProgress(resetBook.id);
                                setResetBook(null);
                            }}
                            style={[styles.modalFooterBtn, { backgroundColor: '#ff4444', flex: 1 }]}
                        >
                            <Text style={[styles.modalFooterBtnText, { color: '#fff' }]}>{t.resetButton}</Text>
                        </TouchableOpacity>
                    </View>
                }
            >
                <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: theme.subText, fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
                        {t.resetConfirmPrefix} <Text style={{ color: theme.text, fontWeight: '700' }}>"{resetBook?.title}"</Text>{t.resetConfirmSuffix}
                    </Text>
                </View>
            </AppModal>

            {/* Delete Book Modal */}
            <AppModal
                visible={!!bookToDelete}
                onClose={() => setBookToDelete(null)}
                title={t.deleteButton}
                theme={theme}
                footer={
                    <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => setBookToDelete(null)}
                            style={[styles.modalFooterBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', flex: 1 }]}
                        >
                            <Text style={[styles.modalFooterBtnText, { color: theme.text }]}>{t.cancelButton}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                if (bookToDelete) onDelete(bookToDelete.id);
                                setBookToDelete(null);
                            }}
                            style={[styles.modalFooterBtn, { backgroundColor: '#ff4444', flex: 1 }]}
                        >
                            <Text style={[styles.modalFooterBtnText, { color: '#fff' }]}>{t.deleteButton}</Text>
                        </TouchableOpacity>
                    </View>
                }
            >
                <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: theme.subText, fontSize: 16, textAlign: 'center', lineHeight: 22 }}>
                        {t.deleteConfirmPrefix} <Text style={{ color: theme.text, fontWeight: '700' }}>"{bookToDelete?.title}"</Text>{t.deleteConfirmSuffix}
                    </Text>
                </View>
            </AppModal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    title: {
        fontSize: 40,
        fontWeight: '800',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    settingsButton: {
        padding: 10,
        borderRadius: 25,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonIcon: {
        marginRight: 8,
    },
    actionButtonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeftRow: {
        flexDirection: 'row',
        gap: 6,
    },
    viewModeBtn: {
        padding: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    headerRightRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    orderButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    sortButtonText: {
        fontSize: 11,
        fontWeight: '700',
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        fontWeight: '700',
        fontSize: 16,
    },
    uploadingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    spinner: {
        marginRight: 12,
    },
    uploadingText: {
        fontWeight: '700',
        fontSize: 14,
    },
    emptyState: {
        padding: 60,
        borderRadius: 40,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyText: {
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 16,
        paddingHorizontal: 20,
        lineHeight: 22,
    },
    bookListContainer: {
        width: '100%',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    listItemTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    listTitleContainer: {
        flex: 1,
        position: 'relative',
        height: 24,
        justifyContent: 'center',
    },
    bookGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: (Dimensions.get('window').width - 48 - 24) / 3, // 48 padding, 24 gap (12*2)
        marginBottom: 20,
    },
    gridCoverContainer: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    gridCoverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gridTitleContainer: {
        height: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    gridTitle: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    textGradient: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 15,
    },
    gridStarContainer: {
        position: 'absolute',
        top: 4,
        left: 4,
        zIndex: 10,
    },
    gridTrash: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: 4,
        borderRadius: 10,
    },
    bookGrid: {
        gap: 24,
    },
    bookCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 8,
    },
    coverPlaceholder: {
        width: 96,
        height: 128,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    bookDetails: {
        flex: 1,
        marginLeft: 16,
        paddingVertical: 4,
    },
    bookMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    bookType: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    bookDate: {
        fontSize: 10,
        fontWeight: '600',
    },
    bookTitle: {
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 22,
        marginBottom: 4,
    },
    bookStats: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
    },
    progressContainer: {
        marginTop: 'auto',
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        marginBottom: 6,
        overflow: 'hidden',
    },
    progressIndicator: {
        height: '100%',
        borderRadius: 3,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    progressPercent: {
        fontSize: 10,
        fontWeight: '900',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 40,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 8,
        paddingLeft: 4,
    },
    input: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 18,
        fontWeight: '600',
        borderWidth: 1,
    },
    textArea: {
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 18,
        fontWeight: '600',
        borderWidth: 1,
        height: 160,
    },
    submitButton: {
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalFooterBtn: {
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
    },
    modalFooterBtnText: {
        fontSize: 17,
        fontWeight: '700',
    },
    smallLinkBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
    },
    categoryCheckItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    categoryCheckText: {
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 15,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        fontWeight: '600',
    }
});
