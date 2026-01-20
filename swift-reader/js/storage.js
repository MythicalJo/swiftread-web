// storage.js - localStorage wrapper for data persistence

const STORAGE_KEYS = {
    LIBRARY: 'swiftread_library',
    SETTINGS: 'swiftread_settings',
    CATEGORIES: 'swiftread_categories',
    HISTORY: 'swiftread_history',
    SORT: 'swiftread_sort',
    SORT_ORDER: 'swiftread_sort_order',
    VIEW_MODE: 'swiftread_view_mode'
};

export const DEFAULT_SETTINGS = {
    wpm: 300,
    wpmStep: 25,
    showContext: true,
    fontSize: 48,
    theme: 'light',
    orpColor: '#ef4444',
    orpOpacity: 1.0,
    contextOpacity: 0.4,
    contextFontSize: 16,
    sentencePause: 250,
    paragraphPause: 500,
    autoHideControls: true,
    hideDelay: 3,
    rewindAmount: 10,
    wps: 300,
    showClock: true,
    showBattery: true,
    use24HourClock: false,
    language: 'en'
};

class Storage {
    constructor() {
        this.hasLoaded = false;
    }

    // Get item from localStorage with JSON parsing
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key}:`, e);
            return defaultValue;
        }
    }

    // Set item in localStorage with JSON stringification
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing ${key}:`, e);
            return false;
        }
    }

    // Remove item from localStorage
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing ${key}:`, e);
            return false;
        }
    }

    // Library methods
    getLibrary() {
        return this.getItem(STORAGE_KEYS.LIBRARY, []);
    }

    setLibrary(books) {
        if (!this.hasLoaded) return false;
        return this.setItem(STORAGE_KEYS.LIBRARY, books);
    }

    // Settings methods
    getSettings() {
        const saved = this.getItem(STORAGE_KEYS.SETTINGS, {});
        return { ...DEFAULT_SETTINGS, ...saved };
    }

    setSettings(settings) {
        return this.setItem(STORAGE_KEYS.SETTINGS, settings);
    }

    // Categories methods
    getCategories() {
        return this.getItem(STORAGE_KEYS.CATEGORIES, []);
    }

    setCategories(categories) {
        return this.setItem(STORAGE_KEYS.CATEGORIES, categories);
    }

    // History methods
    getHistory() {
        return this.getItem(STORAGE_KEYS.HISTORY, []);
    }

    setHistory(history) {
        return this.setItem(STORAGE_KEYS.HISTORY, history);
    }

    // Sort preferences
    getSort() {
        return this.getItem(STORAGE_KEYS.SORT, 'recent');
    }

    setSort(sortBy) {
        return this.setItem(STORAGE_KEYS.SORT, sortBy);
    }

    getSortOrder() {
        return this.getItem(STORAGE_KEYS.SORT_ORDER, 'desc');
    }

    setSortOrder(order) {
        return this.setItem(STORAGE_KEYS.SORT_ORDER, order);
    }

    // View mode
    getViewMode() {
        return this.getItem(STORAGE_KEYS.VIEW_MODE, 'default');
    }

    setViewMode(mode) {
        return this.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    }

    // Initialize - load all data
    async init() {
        this.hasLoaded = true;
        return {
            library: this.getLibrary(),
            settings: this.getSettings(),
            categories: this.getCategories(),
            history: this.getHistory(),
            sort: this.getSort(),
            sortOrder: this.getSortOrder(),
            viewMode: this.getViewMode()
        };
    }

    // Clear all data
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(key => {
            this.removeItem(key);
        });
    }
}

// Export singleton instance
export const storage = new Storage();
