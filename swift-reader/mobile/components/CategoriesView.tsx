
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Dimensions,
    StatusBar,
    Platform,
    SafeAreaView
} from 'react-native';
import { Book, Category, ReaderSettings } from '../types'; // Added ReaderSettings
import { translations } from '../services/i18n';
import { Plus, Folder, ChevronRight, Trash2, BookOpen, Check } from 'lucide-react-native';
import { AppModal } from './AppModal';

interface CategoriesViewProps {
    categories: Category[];
    books: Book[];
    onAddCategory: (name: string) => void;
    onDeleteCategory: (id: string) => void;
    onSelectBook: (book: Book) => void;
    onUpdateCategoryBooks: (categoryId: string, bookIds: string[]) => void;
    theme: any;
    settings: ReaderSettings; // Added settings
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
    categories,
    books,
    onAddCategory,
    onDeleteCategory,
    onSelectBook,
    onUpdateCategoryBooks,
    theme,
    settings
}) => {
    const t = translations[settings.language].categories; // Shortcut
    const tc = translations[settings.language].common;
    const [isCreating, setIsCreating] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [showBookSelector, setShowBookSelector] = useState(false);
    const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

    const handleCreate = () => {
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName.trim());
            setNewCategoryName('');
            setIsCreating(false);
        }
    };

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    if (selectedCategory) {
        const categoryBooks = books.filter(b => (selectedCategory.bookIds || []).includes(b.id));

        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedCategoryId(null)} style={styles.backButton}>
                        <Text style={[styles.backText, { color: theme.accent }]}>← {t.title}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{selectedCategory.name}</Text>
                    <TouchableOpacity onPress={() => setShowBookSelector(true)} style={styles.headerIconButton}>
                        <Plus size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {duplicateNotice && (
                    <View style={[styles.notice, { backgroundColor: '#ef4444' }]}>
                        <Text style={styles.noticeText}>{duplicateNotice}</Text>
                    </View>
                )}

                <ScrollView contentContainerStyle={styles.scroll}>
                    {categoryBooks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <BookOpen size={48} color={theme.subText} />
                            <Text style={[styles.emptyText, { color: theme.subText }]}>{t.empty}</Text>
                            <TouchableOpacity
                                onPress={() => setShowBookSelector(true)}
                                style={[styles.addBookBtn, { backgroundColor: theme.accent, marginTop: 20 }]}
                            >
                                <Text style={{ color: theme.accentText, fontWeight: '700' }}>{tc.save}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        categoryBooks.map(book => (
                            <TouchableOpacity
                                key={book.id}
                                style={[styles.bookItem, { borderBottomColor: theme.border }]}
                                onPress={() => onSelectBook(book)}
                            >
                                <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>{book.title}</Text>
                                <TouchableOpacity onPress={() => {
                                    const newBookIds = (selectedCategory.bookIds || []).filter(id => id !== book.id);
                                    onUpdateCategoryBooks(selectedCategory.id, newBookIds);
                                }}>
                                    <Trash2 size={18} color="#ff4444" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                <AppModal
                    visible={showBookSelector}
                    onClose={() => setShowBookSelector(false)}
                    title="Select Books"
                    theme={theme}
                    footer={
                        <TouchableOpacity
                            onPress={() => setShowBookSelector(false)}
                            style={[styles.fullWidthBtn, { backgroundColor: theme.accent }]}
                        >
                            <Text style={{ color: theme.accentText, fontWeight: '700' }}>{t.items}</Text>
                        </TouchableOpacity>
                    }
                >
                    {books.map(book => {
                        const isIn = (selectedCategory.bookIds || []).includes(book.id);
                        return (
                            <TouchableOpacity
                                key={book.id}
                                style={[styles.selectorItem, { borderBottomColor: theme.border }]}
                                onPress={() => {
                                    if (isIn) {
                                        setDuplicateNotice(`"${book.title}" is already added`);
                                        setTimeout(() => setDuplicateNotice(null), 2000);
                                        return;
                                    }
                                    const newBookIds = [...(selectedCategory.bookIds || []), book.id];
                                    onUpdateCategoryBooks(selectedCategory.id, newBookIds);
                                }}
                            >
                                <Text style={[styles.selectorTitle, { color: theme.text }]} numberOfLines={1}>{book.title}</Text>
                                {isIn && <Check size={20} color={theme.accent} />}
                            </TouchableOpacity>
                        );
                    })}
                </AppModal>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{t.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.headerIconButton}>
                    <Plus size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <AppModal
                visible={isCreating}
                onClose={() => setIsCreating(false)}
                title={t.createTitle}
                theme={theme}
                footer={
                    <TouchableOpacity
                        onPress={handleCreate}
                        style={[styles.fullWidthBtn, { backgroundColor: theme.accent }]}
                    >
                        <Text style={{ color: theme.accentText, fontWeight: '700' }}>{t.createButton}</Text>
                    </TouchableOpacity>
                }
            >
                <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 15 }]}
                    placeholder={t.createPlaceholder}
                    placeholderTextColor={theme.subText}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    autoFocus
                />
            </AppModal>

            <ScrollView contentContainerStyle={styles.scroll}>
                {categories.length === 0 && !isCreating ? (
                    <View style={styles.emptyState}>
                        <Folder size={64} color={theme.subText} style={{ opacity: 0.2 }} />
                        <Text style={[styles.emptyText, { color: theme.subText }]}>{t.emptySub}</Text>
                    </View>
                ) : (
                    categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                            onPress={() => setSelectedCategoryId(cat.id)}
                        >
                            <View style={styles.categoryInfo}>
                                <Folder size={24} color={theme.accent} style={{ marginRight: 15 }} />
                                <View>
                                    <Text style={[styles.categoryName, { color: theme.text }]}>{cat.name}</Text>
                                    <Text style={[styles.categoryCount, { color: theme.subText }]}>{(cat.bookIds || []).length} {t.items}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => onDeleteCategory(cat.id)}>
                                <Trash2 size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 50, // Added significant space
        paddingBottom: 24
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
        // Remove flex:1 if it's causing wrapping issues
        marginRight: 10,
        lineHeight: 42,
    },
    subtitle: { fontSize: 13, fontWeight: '600', marginTop: 0 },
    headerIconButton: { padding: 10, borderRadius: 25 },
    scroll: { paddingHorizontal: 24, paddingBottom: 100 },
    input: { fontSize: 18, paddingVertical: 15, fontWeight: '600' },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    categoryInfo: { flexDirection: 'row', alignItems: 'center' },
    categoryName: { fontSize: 18, fontWeight: '700' },
    categoryCount: { fontSize: 13, fontWeight: '600', marginTop: 2 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { marginTop: 16, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    backButton: { marginRight: 15, paddingVertical: 8 },
    backText: { fontSize: 16, fontWeight: '700' },
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1
    },
    bookTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 10 },
    addBookBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    fullWidthBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    selectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    selectorTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 15,
    },
    notice: {
        marginHorizontal: 24,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    noticeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    }
});
