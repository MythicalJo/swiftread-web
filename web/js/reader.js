// reader.js - Speed reader with ORP highlighting

import { storage } from './storage.js';
import { t } from './i18n.js';

let currentBook = null;
let settings = {};
let isPlaying = false;
let currentIndex = 0;
let intervalId = null;
let startTime = null;
let elapsedSeconds = 0;
let stopwatchInterval = null;

// Initialize reader
export function initReader(book, userSettings) {
    currentBook = book;
    settings = userSettings;
    currentIndex = book.progress || 0;
    isPlaying = false;
    elapsedSeconds = 0;

    renderReader();
    setupReaderControls();
    applyTheme();
}

// Render reader view
function renderReader() {
    const readerView = document.getElementById('reader-view');
    const lang = settings.language || 'en';

    readerView.innerHTML = `
        <div class="reader-header">
            <button id="reader-back-btn" class="icon-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            <h2 style="flex: 1; text-align: center; font-size: 16px; font-weight: 700;">${escapeHtml(currentBook.title)}</h2>
            <button id="reader-settings-btn" class="icon-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
                </svg>
            </button>
        </div>
        
        <div class="reader-content">
            <div class="word-display">
                <div class="word-context" id="word-before"></div>
                <div class="word-main" id="word-current"></div>
                <div class="word-context" id="word-after"></div>
            </div>
            
            <div class="reader-controls" id="reader-controls">
                <div class="reader-progress" id="reader-progress">
                    <div class="reader-progress-bar" id="reader-progress-bar"></div>
                </div>
                
                <div class="reader-buttons">
                    <button id="rewind-btn" class="icon-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 19 2 12 11 5 11 19"></polygon>
                            <polygon points="22 19 13 12 22 5 22 19"></polygon>
                        </svg>
                    </button>
                    
                    <button id="play-pause-btn" class="reader-btn">
                        <svg id="play-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <svg id="pause-icon" class="hidden" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    </button>
                    
                    <button id="forward-btn" class="icon-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="13 19 22 12 13 5 13 19"></polygon>
                            <polygon points="2 19 11 12 2 5 2 19"></polygon>
                        </svg>
                    </button>
                </div>
                
                <div class="reader-wpm">
                    <button id="wpm-decrease" class="wpm-btn">−</button>
                    <div class="wpm-display">
                        <span id="wpm-value">${settings.wpm}</span>
                        <div style="font-size: 12px; color: var(--text-secondary);">${t('reader.wpm', lang)}</div>
                    </div>
                    <button id="wpm-increase" class="wpm-btn">+</button>
                </div>
            </div>
        </div>
    `;

    readerView.classList.remove('hidden');
    displayWord(currentIndex);
    updateProgress();
}

// Setup reader controls
function setupReaderControls() {
    document.getElementById('reader-back-btn').addEventListener('click', closeReader);
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('rewind-btn').addEventListener('click', rewind);
    document.getElementById('forward-btn').addEventListener('click', forward);
    document.getElementById('wpm-decrease').addEventListener('click', () => adjustWPM(-settings.wpmStep));
    document.getElementById('wpm-increase').addEventListener('click', () => adjustWPM(settings.wpmStep));

    // Progress bar click
    document.getElementById('reader-progress').addEventListener('click', handleProgressClick);

    // Auto-hide controls
    if (settings.autoHideControls) {
        setupAutoHide();
    }
}

// Display word
function displayWord(index) {
    if (!currentBook.content || index >= currentBook.content.length) {
        stopReading();
        showComplete();
        return;
    }

    const word = currentBook.content[index] || '';
    const wordBefore = settings.showContext && index > 0 ? currentBook.content[index - 1] : '';
    const wordAfter = settings.showContext && index < currentBook.content.length - 1 ? currentBook.content[index + 1] : '';

    // Calculate ORP (Optimal Recognition Point)
    const orpIndex = Math.floor(word.length / 3);
    const before = word.slice(0, orpIndex);
    const orp = word[orpIndex] || '';
    const after = word.slice(orpIndex + 1);

    // Update display
    document.getElementById('word-before').textContent = wordBefore;
    document.getElementById('word-before').style.opacity = settings.contextOpacity;
    document.getElementById('word-before').style.fontSize = settings.contextFontSize + 'px';

    const currentWordEl = document.getElementById('word-current');
    currentWordEl.innerHTML = `
        <span>${escapeHtml(before)}</span><span class="word-orp" style="color: ${settings.orpColor}; opacity: ${settings.orpOpacity};">${escapeHtml(orp)}</span><span>${escapeHtml(after)}</span>
    `;
    currentWordEl.style.fontSize = settings.fontSize + 'px';

    document.getElementById('word-after').textContent = wordAfter;
    document.getElementById('word-after').style.opacity = settings.contextOpacity;
    document.getElementById('word-after').style.fontSize = settings.contextFontSize + 'px';

    currentIndex = index;
    updateProgress();
}

// Toggle play/pause
function togglePlayPause() {
    if (isPlaying) {
        stopReading();
    } else {
        startReading();
    }
}

// Start reading
function startReading() {
    isPlaying = true;
    startTime = Date.now();

    document.getElementById('play-icon').classList.add('hidden');
    document.getElementById('pause-icon').classList.remove('hidden');

    // Start stopwatch
    stopwatchInterval = setInterval(() => {
        elapsedSeconds++;
    }, 1000);

    // Calculate delay with pauses
    const baseDelay = 60000 / settings.wpm; // ms per word

    const readNext = () => {
        if (!isPlaying) return;

        if (currentIndex >= currentBook.content.length - 1) {
            stopReading();
            showComplete();
            return;
        }

        currentIndex++;
        displayWord(currentIndex);

        // Check for sentence/paragraph pauses
        const word = currentBook.content[currentIndex - 1] || '';
        let delay = baseDelay;

        if (/[.!?]$/.test(word)) {
            delay += settings.sentencePause;
        }
        if (word === '\n' || word === '\n\n') {
            delay += settings.paragraphPause;
        }

        intervalId = setTimeout(readNext, delay);
    };

    readNext();
}

// Stop reading
function stopReading() {
    isPlaying = false;

    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
    }

    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }

    document.getElementById('play-icon').classList.remove('hidden');
    document.getElementById('pause-icon').classList.add('hidden');

    // Save progress
    saveProgress();
}

// Rewind
function rewind() {
    const newIndex = Math.max(0, currentIndex - settings.rewindAmount);
    displayWord(newIndex);
}

// Forward
function forward() {
    const newIndex = Math.min(currentBook.content.length - 1, currentIndex + settings.rewindAmount);
    displayWord(newIndex);
}

// Adjust WPM
function adjustWPM(delta) {
    settings.wpm = Math.max(50, Math.min(1000, settings.wpm + delta));
    document.getElementById('wpm-value').textContent = settings.wpm;

    // Save settings
    storage.setSettings(settings);

    // Restart if playing
    if (isPlaying) {
        stopReading();
        startReading();
    }
}

// Handle progress bar click
function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newIndex = Math.floor(percent * currentBook.content.length);

    displayWord(newIndex);
}

// Update progress bar
function updateProgress() {
    const percent = (currentIndex / currentBook.content.length) * 100;
    document.getElementById('reader-progress-bar').style.width = percent + '%';
}

// Save progress
function saveProgress() {
    if (currentBook && elapsedSeconds > 0) {
        window.dispatchEvent(new CustomEvent('updateProgress', {
            detail: {
                bookId: currentBook.id,
                progress: currentIndex,
                secondsElapsed: elapsedSeconds
            }
        }));
        elapsedSeconds = 0;
    }
}

// Show complete message
function showComplete() {
    const lang = settings.language || 'en';
    document.getElementById('word-current').textContent = t('reader.complete', lang);
    document.getElementById('word-before').textContent = '';
    document.getElementById('word-after').textContent = '';
}

// Close reader
function closeReader() {
    stopReading();
    saveProgress();

    document.getElementById('reader-view').classList.add('hidden');
    window.dispatchEvent(new CustomEvent('closeReader'));
}

// Apply theme
function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme);
}

// Setup auto-hide controls
function setupAutoHide() {
    let hideTimeout;
    const controls = document.getElementById('reader-controls');
    const content = document.querySelector('.reader-content');

    const showControls = () => {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';

        clearTimeout(hideTimeout);
        if (isPlaying) {
            hideTimeout = setTimeout(() => {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }, settings.hideDelay * 1000);
        }
    };

    content.addEventListener('click', showControls);
    content.addEventListener('touchstart', showControls);

    showControls();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initReader };
