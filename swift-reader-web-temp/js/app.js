// app.js - Main application controller

import { storage } from './storage.js';
import { initLibrary, updateBooks as updateLibraryBooks } from './library.js';
import { initCategories, updateBooks as updateCategoryBooks, updateCategories } from './categories.js';
import { initHistory, updateHistory } from './history.js';
import { initSettings, showSettings } from './settings.js';
import { initReader } from './reader.js';

// App state
let appData = {};
let currentTab = 'library';

// Initialize app
async function init() {
    try {
        // Load data from storage
        appData = await storage.init();

        // Apply theme
        document.documentElement.setAttribute('data-theme', appData.settings.theme);

        // Initialize modules
        initLibrary(appData);
        initCategories(appData);
        initHistory(appData);
        initSettings(appData.settings, handleSettingsUpdate);

        // Setup tab navigation
        setupTabNavigation();

        // Setup global event listeners
        setupGlobalListeners();

        // Setup status overlay
        setupStatusOverlay();

        // Setup swipe gestures
        setupSwipeGestures();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to load app. Please refresh the page.');
    }
}

// Setup tab navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-item');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

// Switch tab
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });
}

// Setup global listeners
function setupGlobalListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        showSettings();
    });

    // Open book event
    window.addEventListener('openBook', (e) => {
        const book = e.detail;
        openBook(book);
    });

    // Close reader event
    window.addEventListener('closeReader', () => {
        // Refresh library to show updated progress
        appData.library = storage.getLibrary();
        updateLibraryBooks(appData.library);
        updateCategoryBooks(appData.library);
    });

    // Update progress event
    window.addEventListener('updateProgress', (e) => {
        const { bookId, progress, secondsElapsed } = e.detail;
        updateProgress(bookId, progress, secondsElapsed);
    });
}

// Open book
function openBook(book) {
    // Update last opened time
    const now = Date.now();
    appData.library = appData.library.map(b =>
        b.id === book.id ? { ...b, lastOpenedAt: now } : b
    );
    storage.setLibrary(appData.library);

    // Open reader
    const updatedBook = appData.library.find(b => b.id === book.id);
    initReader(updatedBook, appData.settings);
}

// Update progress
function updateProgress(bookId, progress, secondsElapsed) {
    const book = appData.library.find(b => b.id === bookId);
    if (!book) return;

    const wordsReadDelta = Math.max(0, progress - book.progress);
    const isAtEnd = progress >= (book.content?.length || 1) - 1;

    // Update book
    appData.library = appData.library.map(b =>
        b.id === bookId ? {
            ...b,
            progress,
            hasBeenFinished: b.hasBeenFinished || isAtEnd
        } : b
    );
    storage.setLibrary(appData.library);

    // Update history
    if (secondsElapsed > 0) {
        const today = new Date().toISOString().split('T')[0];
        const historyIndex = appData.history.findIndex(h => h.date === today);

        if (historyIndex === -1) {
            appData.history.push({
                date: today,
                wordsRead: wordsReadDelta,
                secondsRead: secondsElapsed,
                avgWpm: appData.settings.wpm,
                completedBooks: isAtEnd ? [bookId] : []
            });
        } else {
            const existing = appData.history[historyIndex];
            const completed = existing.completedBooks || [];
            const isNewlyFinished = isAtEnd && !completed.includes(bookId);

            appData.history[historyIndex] = {
                ...existing,
                wordsRead: existing.wordsRead + wordsReadDelta,
                secondsRead: existing.secondsRead + secondsElapsed,
                avgWpm: Math.round((existing.avgWpm + appData.settings.wpm) / 2),
                completedBooks: isNewlyFinished ? [...completed, bookId] : completed
            };
        }

        storage.setHistory(appData.history);
        updateHistory(appData.history);
    }
}

// Handle settings update
function handleSettingsUpdate(newSettings) {
    appData.settings = newSettings;

    // Apply theme
    document.documentElement.setAttribute('data-theme', newSettings.theme);

    // Update status overlay
    updateStatusOverlay();

    // Refresh all views with new language
    updateLibraryBooks(appData.library);
    updateCategories(appData.categories);
    updateHistory(appData.history);
}

// Setup status overlay
function setupStatusOverlay() {
    updateStatusOverlay();

    // Update clock every second
    setInterval(updateStatusOverlay, 1000);
}

// Update status overlay
function updateStatusOverlay() {
    const overlay = document.getElementById('status-overlay');
    const clockDisplay = document.getElementById('clock-display');
    const batteryDisplay = document.getElementById('battery-display');

    const showClock = appData.settings?.showClock;
    const showBattery = appData.settings?.showBattery;

    if (!showClock && !showBattery) {
        overlay.classList.add('hidden');
        return;
    }

    overlay.classList.remove('hidden');

    // Update clock
    if (showClock) {
        const now = new Date();
        const hours = appData.settings.use24HourClock
            ? now.getHours().toString().padStart(2, '0')
            : (now.getHours() % 12 || 12).toString();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = appData.settings.use24HourClock ? '' : (now.getHours() >= 12 ? ' PM' : ' AM');

        clockDisplay.textContent = `${hours}:${minutes}${ampm}`;
        clockDisplay.style.display = 'block';
    } else {
        clockDisplay.style.display = 'none';
    }

    // Update battery
    if (showBattery && 'getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const level = Math.round(battery.level * 100);
            batteryDisplay.textContent = `${level}%`;
            batteryDisplay.style.display = 'block';
        }).catch(() => {
            batteryDisplay.style.display = 'none';
        });
    } else {
        batteryDisplay.style.display = 'none';
    }
}

// Setup swipe gestures
function setupSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    const tabContainer = document.getElementById('tab-container');

    tabContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    tabContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) < swipeThreshold) return;

        if (diff > 0) {
            // Swipe left - go to next tab
            if (currentTab === 'library') switchTab('categories');
            else if (currentTab === 'categories') switchTab('history');
        } else {
            // Swipe right - go to previous tab
            if (currentTab === 'categories') switchTab('library');
            else if (currentTab === 'history') switchTab('categories');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.appDebug = {
    getState: () => appData,
    storage
};
