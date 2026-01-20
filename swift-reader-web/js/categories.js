// categories.js - Categories management

import { storage } from './storage.js';
import { t } from './i18n.js';

let categories = [];
let books = [];
let settings = {};

// Initialize categories
export function initCategories(data) {
    categories = data.categories;
    books = data.library;
    settings = data.settings;

    renderCategories();
    setupEventListeners();
}

// Render categories
export function renderCategories() {
    const container = document.getElementById('categories-container');
    const emptyState = document.getElementById('categories-empty');
    const lang = settings.language || 'en';

    // Update translations
    document.getElementById('categories-title').textContent = t('categories.title', lang);
    document.getElementById('categories-empty-title').textContent = t('categories.empty', lang);
    document.getElementById('categories-empty-subtitle').textContent = t('categories.emptySub', lang);

    if (categories.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    container.innerHTML = categories.map(category => createCategoryCard(category)).join('');
}

// Create category card
function createCategoryCard(category) {
    const categoryBooks = books.filter(b => category.bookIds?.includes(b.id));
    const lang = settings.language || 'en';

    return `
        <div class="category-card">
            <div class="category-header">
                <div>
                    <div class="category-name">${escapeHtml(category.name)}</div>
                    <div class="category-count">${categoryBooks.length} ${t('categories.items', lang)}</div>
                </div>
                <button class="icon-btn" onclick="window.categoryActions.deleteCategory('${category.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            <div class="category-books">
                ${categoryBooks.map(book => `
                    <div class="book-card" onclick="window.categoryActions.openBook('${book.id}')" style="cursor: pointer;">
                        <div class="book-cover" style="aspect-ratio: 3/4; font-size: 24px;">
                            ${book.cover ? `<img src="${book.cover}" alt="${book.title}">` : `<span>${book.title.charAt(0).toUpperCase()}</span>`}
                        </div>
                        <div class="book-info" style="padding: 8px;">
                            <div class="book-title" style="font-size: 12px;">${escapeHtml(book.title)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('add-category-btn').addEventListener('click', showAddCategoryDialog);
}

// Show add category dialog
function showAddCategoryDialog() {
    const lang = settings.language || 'en';
    const name = prompt(t('categories.createPlaceholder', lang), '');

    if (name && name.trim()) {
        const newCategory = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            bookIds: []
        };

        categories.push(newCategory);
        storage.setCategories(categories);
        renderCategories();
    }
}

// Category actions
window.categoryActions = {
    deleteCategory: (id) => {
        const lang = settings.language || 'en';
        if (confirm(t('categories.deleteBody', lang))) {
            categories = categories.filter(c => c.id !== id);
            storage.setCategories(categories);
            renderCategories();
        }
    },

    openBook: (bookId) => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            window.dispatchEvent(new CustomEvent('openBook', { detail: book }));
        }
    }
};

// Update categories
export function updateCategories(newCategories) {
    categories = newCategories;
    renderCategories();
}

// Update books
export function updateBooks(newBooks) {
    books = newBooks;
    renderCategories();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initCategories, renderCategories, updateCategories, updateBooks };
