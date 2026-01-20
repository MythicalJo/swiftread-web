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
    // Paste Text button
    document.getElementById('paste-text-btn').addEventListener('click', showPasteModal);

    // Add book button
    document.getElementById('add-book-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    // View mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            viewMode = mode;
            storage.setViewMode(viewMode);

            // Update active state
            document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            renderLibrary();
        });
    });

    // Sort select button
    document.getElementById('sort-select-btn').addEventListener('click', showSortModal);

    // Sort order button
    document.getElementById('sort-order-btn').addEventListener('click', () => {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        storage.setSortOrder(sortOrder);
        updateSortOrderIcon();
        renderLibrary();
    });

    // File input
    document.getElementById('file-input').addEventListener('change', handleFileUpload);

    // Paste modal
    document.getElementById('close-paste-btn').addEventListener('click', hidePasteModal);
    document.getElementById('paste-submit-btn').addEventListener('click', handlePasteSubmit);

    // Click outside modal to close
    document.getElementById('paste-modal').addEventListener('click', (e) => {
        if (e.target.id === 'paste-modal') {
            hidePasteModal();
        }
    });
}

// Show paste modal
function showPasteModal() {
    document.getElementById('paste-modal').classList.remove('hidden');
    document.getElementById('paste-title-input').value = '';
    document.getElementById('paste-content-input').value = '';
    document.getElementById('paste-title-input').focus();
}

// Hide paste modal
function hidePasteModal() {
    document.getElementById('paste-modal').classList.add('hidden');
}

// Handle paste submit
function handlePasteSubmit() {
    const title = document.getElementById('paste-title-input').value.trim();
    const content = document.getElementById('paste-content-input').value.trim();

    if (!content) {
        alert(t('common.pasteErrorBody', settings.language));
        return;
    }

    try {
        const words = content.split(/\s+/).filter(w => w);
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
        hidePasteModal();

    } catch (e) {
        alert(t('common.pasteErrorBody', settings.language));
    }
}

// Show sort modal
function showSortModal() {
    const lang = settings.language || 'en';
    const options = [
        { id: 'recent', label: t('library.sortRecent', lang) },
        { id: 'added', label: t('library.sortAdded', lang) },
        { id: 'az', label: t('library.sortAz', lang) },
        { id: 'finished', label: t('library.sortFinished', lang) },
        { id: 'unfinished', label: t('library.sortUnfinished', lang) }
    ];

    const selected = options.findIndex(opt => opt.id === sortBy);
    const choice = prompt(options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n') + '\n\nEnter number (1-5):', selected + 1);

    if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < options.length) {
            sortBy = options[index].id;
            storage.setSort(sortBy);
            document.getElementById('sort-label').textContent = options[index].label;
            renderLibrary();
        }
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
    document.getElementById('library-subtitle').textContent = lang === 'es' ? 'Selecciona o importa un libro' : 'Select a book or import a new one';
    document.getElementById('paste-text-label').textContent = t('library.pasteText', lang);
    document.getElementById('add-book-text').textContent = t('library.uploadFile', lang);
    document.getElementById('empty-title').textContent = t('library.emptyState', lang);
    document.getElementById('empty-subtitle').textContent = t('library.emptyStateSub', lang);

    // Update paste modal
    document.getElementById('paste-modal-title').textContent = t('library.pasteTitle', lang);
    document.getElementById('paste-title-label').textContent = t('library.docTitleLabel', lang);
    document.getElementById('paste-content-label').textContent = t('library.contentLabel', lang);
    document.getElementById('paste-submit-text').textContent = t('library.startReading', lang);
}

// Update sort order icon
function updateSortOrderIcon() {
    const icon = document.getElementById('sort-order-icon');
    if (sortOrder === 'asc') {
        icon.innerHTML = '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>';
    } else {
        icon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>';
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
