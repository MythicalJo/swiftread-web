// library.js - Library view and book management

import { storage } from './storage.js';
import { t } from './i18n.js';
import { processFile } from './fileProcessor.js';

let books = [];
let categories = [];
let settings = {};
let sortBy = 'recent';
let sortOrder = 'desc';
let viewMode = 'default';

// Initialize library
export function initLibrary(data) {
    books = data.library;
    categories = data.categories;
    settings = data.settings;
    sortBy = data.sort;
    sortOrder = data.sortOrder;
    viewMode = data.viewMode;

    renderLibrary();
    setupEventListeners();
}

// Render library
export function renderLibrary() {
    const container = document.getElementById('books-container');
    const emptyState = document.getElementById('empty-state');

    // Update translations
    updateLibraryTranslations();

    // Sort books
    const sortedBooks = getSortedBooks();

    if (sortedBooks.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Apply view mode
    container.className = viewMode === 'list' ? 'books-grid list-view' : 'books-grid';

    // Render books
    container.innerHTML = sortedBooks.map(book => createBookCard(book)).join('');

    // Add event listeners to book cards
    sortedBooks.forEach(book => {
        const card = container.querySelector(`[data-book-id="${book.id}"]`);
        if (card) {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.book-action-btn')) {
                    window.dispatchEvent(new CustomEvent('openBook', { detail: book }));
                }
            });
        }
    });
}

// Create book card HTML
function createBookCard(book) {
    const progress = book.content ? (book.progress / book.content.length) * 100 : 0;
    const progressPercent = Math.min(100, Math.max(0, progress));
    const wordCount = book.content?.length || 0;
    const lang = settings.language || 'en';

    const coverContent = book.cover
        ? `<img src="${book.cover}" alt="${book.title}">`
        : `<span>${book.title.charAt(0).toUpperCase()}</span>`;

    return `
        <div class="book-card" data-book-id="${book.id}">
            <div class="book-cover">
                ${coverContent}
            </div>
            <div class="book-info">
                <div class="book-title">${escapeHtml(book.title)}</div>
                <div class="book-meta">${wordCount.toLocaleString()} ${t('library.words', lang)}</div>
                <div class="book-progress">
                    <div class="book-progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="book-actions">
                    <button class="book-action-btn" onclick="window.libraryActions.resetProgress('${book.id}')">
                        Reset
                    </button>
                    <button class="book-action-btn" onclick="window.libraryActions.deleteBook('${book.id}')">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get sorted books
function getSortedBooks() {
    return [...books]
        .filter(b => {
            if (sortBy === 'finished') return b.hasBeenFinished;
            if (sortBy === 'unfinished') return !b.hasBeenFinished;
            return true;
        })
        .sort((a, b) => {
            let cmp = 0;

            if (sortBy === 'finished' || sortBy === 'unfinished') {
                cmp = (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
            } else if (sortBy === 'recent') {
                cmp = (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
            } else if (sortBy === 'added') {
                cmp = b.addedAt - a.addedAt;
            } else if (sortBy === 'az') {
                cmp = a.title.localeCompare(b.title);
            }

            return sortOrder === 'desc' ? cmp : -cmp;
        });
}

// Setup event listeners
function setupEventListeners() {
    // Add book button
    document.getElementById('add-book-btn').addEventListener('click', showAddBookMenu);

    // Sort select
    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortBy = e.target.value;
        storage.setSort(sortBy);
        renderLibrary();
    });

    // Sort order button
    document.getElementById('sort-order-btn').addEventListener('click', () => {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        storage.setSortOrder(sortOrder);
        updateSortOrderIcon();
        renderLibrary();
    });

    // View mode button
    document.getElementById('view-mode-btn').addEventListener('click', () => {
        const modes = ['default', 'list', 'grid'];
        const currentIndex = modes.indexOf(viewMode);
        viewMode = modes[(currentIndex + 1) % modes.length];
        storage.setViewMode(viewMode);
        renderLibrary();
    });

    // File input
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
}

// Show add book menu
function showAddBookMenu() {
    const menu = confirm(t('library.uploadFile', settings.language) + ' or ' + t('library.pasteText', settings.language) + '?\n\nOK = Upload File\nCancel = Paste Text');

    if (menu) {
        document.getElementById('file-input').click();
    } else {
        showPasteTextDialog();
    }
}

// Handle file upload
async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Show processing indicator
    const addBtn = document.getElementById('add-book-btn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<div class="spinner"></div>';
    addBtn.disabled = true;

    // Check for duplicates
    const existingTitles = new Set(books.map(b => b.title.toLowerCase().trim()));

    for (const file of files) {
        const fileName = file.name.replace(/\.[^/.]+$/, "").toLowerCase().trim();

        if (existingTitles.has(fileName)) {
            alert(t('common.duplicateBody', settings.language));
            continue;
        }

        try {
            const result = await processFile(file);

            // Check extracted title
            const extractedTitle = result.title.toLowerCase().trim();
            if (existingTitles.has(extractedTitle)) {
                alert(t('common.duplicateBody', settings.language));
                continue;
            }

            existingTitles.add(extractedTitle);

            // Create new book
            const newBook = {
                id: Math.random().toString(36).substr(2, 9),
                title: result.title || file.name,
                author: '',
                content: result.content,
                cover: result.cover,
                progress: 0,
                hasBeenFinished: false,
                type: file.name.split('.').pop()?.toLowerCase() || 'text',
                addedAt: Date.now(),
                lastOpenedAt: Date.now()
            };

            books.unshift(newBook);
            storage.setLibrary(books);

        } catch (error) {
            console.error(error);
            alert(`Failed to process ${file.name}: ${error.message}`);
        }
    }

    // Reset file input and button
    e.target.value = '';
    addBtn.innerHTML = originalText;
    addBtn.disabled = false;

    renderLibrary();
}

// Show paste text dialog
function showPasteTextDialog() {
    const title = prompt(t('library.docTitleLabel', settings.language), '');
    if (!title) return;

    const text = prompt(t('library.contentLabel', settings.language), '');
    if (!text) return;

    try {
        const words = text.trim().split(/\s+/);
        if (words.length === 0) return;

        const newBook = {
            id: Math.random().toString(36).substr(2, 9),
            title: title || 'Pasted Text',
            author: '',
            content: words,
            progress: 0,
            hasBeenFinished: false,
            type: 'text',
            addedAt: Date.now(),
            lastOpenedAt: Date.now()
        };

        books.unshift(newBook);
        storage.setLibrary(books);
        renderLibrary();

    } catch (e) {
        alert(t('common.pasteErrorBody', settings.language));
    }
}

// Library actions (exposed globally for onclick handlers)
window.libraryActions = {
    deleteBook: (id) => {
        const book = books.find(b => b.id === id);
        if (!book) return;

        const confirmMsg = `${t('library.deleteConfirmPrefix', settings.language)} "${book.title}"${t('library.deleteConfirmSuffix', settings.language)}`;

        if (confirm(confirmMsg)) {
            books = books.filter(b => b.id !== id);
            storage.setLibrary(books);
            renderLibrary();
        }
    },

    resetProgress: (id) => {
        const book = books.find(b => b.id === id);
        if (!book) return;

        const confirmMsg = `${t('library.resetConfirmPrefix', settings.language)} "${book.title}"${t('library.resetConfirmSuffix', settings.language)}\n\n${t('library.resetProgressBody', settings.language)}`;

        if (confirm(confirmMsg)) {
            books = books.map(b => b.id === id ? { ...b, progress: 0, hasBeenFinished: false } : b);
            storage.setLibrary(books);
            renderLibrary();
        }
    }
};

// Update library translations
function updateLibraryTranslations() {
    const lang = settings.language || 'en';

    document.getElementById('library-title').textContent = t('library.title', lang);
    document.getElementById('add-book-text').textContent = t('library.addBook', lang);
    document.getElementById('empty-title').textContent = t('library.emptyState', lang);
    document.getElementById('empty-subtitle').textContent = t('library.emptyStateSub', lang);

    // Update sort select options
    const sortSelect = document.getElementById('sort-select');
    sortSelect.options[0].text = t('library.sortRecent', lang);
    sortSelect.options[1].text = t('library.sortAdded', lang);
    sortSelect.options[2].text = t('library.sortAz', lang);
    sortSelect.options[3].text = t('library.sortFinished', lang);
    sortSelect.options[4].text = t('library.sortUnfinished', lang);
    sortSelect.value = sortBy;
}

// Update sort order icon
function updateSortOrderIcon() {
    const icon = document.getElementById('sort-order-icon');
    if (sortOrder === 'asc') {
        icon.innerHTML = '<path d="M3 18h18M3 12h12M3 6h6"></path>';
    } else {
        icon.innerHTML = '<path d="M3 6h18M3 12h12M3 18h6"></path>';
    }
}

// Update books from external source
export function updateBooks(newBooks) {
    books = newBooks;
    renderLibrary();
}

// Get current books
export function getBooks() {
    return books;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initLibrary, renderLibrary, updateBooks, getBooks };
