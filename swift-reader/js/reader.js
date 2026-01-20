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
let wakeLock = null;
let stopwatchInterval = null;

// Initialize reader
export function initReader(book, userSettings) {
    currentBook = book;
    settings = userSettings;
    currentIndex = book.progress || 0;
    isPlaying = false;
    elapsedSeconds = 0;

    applyTheme();
    renderReader();
    setupReaderControls();
}

// Render reader view (Update existing DOM)
function renderReader() {
    const readerView = document.getElementById('reader-view');
    const lang = settings.language || 'en';

    // Update Top Bar
    document.getElementById('reader-book-title').textContent = currentBook.title;
    updateProgressSubtitle();

    // Update WPM
    document.getElementById('reader-wpm-value').textContent = settings.wpm;
    document.getElementById('reader-wpm-label').textContent = t('reader.wpm', lang);

    // Scrubber
    document.getElementById('scrubber-text').textContent = t('reader.scanning', lang);

    // Show view
    readerView.classList.remove('hidden');

    // Initial display
    displayWord(currentIndex);
}

function updateProgressSubtitle() {
    const lang = settings.language || 'en';
    const progress = Math.round((currentIndex / (currentBook.content?.length || 1)) * 100);
    document.getElementById('reader-progress-subtitle').textContent = `${progress}% ${t('reader.complete', lang)}`;
}

// Setup reader controls
function setupReaderControls() {
    document.getElementById('reader-back-btn').addEventListener('click', closeReader);
    document.getElementById('reader-list-btn').addEventListener('click', openFullTextModal);
    document.getElementById('reader-play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('reader-rewind-btn').addEventListener('click', rewind);
    document.getElementById('wpm-decrease-btn').addEventListener('click', () => adjustWPM(-settings.wpmStep));
    document.getElementById('wpm-increase-btn').addEventListener('click', () => adjustWPM(settings.wpmStep));
    document.getElementById('reader-settings-btn').addEventListener('click', openSettings);

    const slider = document.getElementById('reader-progress-slider');
    slider.max = currentBook.content?.length - 1 || 0;
    slider.value = currentIndex;
    slider.addEventListener('input', (e) => {
        stopReading();
        displayWord(parseInt(e.target.value));
    });

    // Scrubber / Toggle Controls logic
    setupInteractionArea();

    // Full Text listeners
    document.getElementById('close-full-text-btn').addEventListener('click', closeFullTextModal);
}

function openSettings() {
    stopReading();
    window.dispatchEvent(new CustomEvent('openSettings'));
}

// Display word
function displayWord(index) {
    if (!currentBook.content || index >= currentBook.content.length) {
        stopReading();
        showComplete();
        return;
    }

    const word = currentBook.content[index] || '';

    // Context (similar to Android: 40 words ahead)
    const contextContent = settings.showContext
        ? currentBook.content.slice(index + 1, index + 40).join(' ')
        : '';

    // Calculate ORP (Optimal Recognition Point)
    const orpIndex = Math.floor(word.length / 3);
    const before = word.slice(0, orpIndex);
    const orp = word[orpIndex] || '';
    const after = word.slice(orpIndex + 1);

    // Update display
    const currentWordEl = document.getElementById('word-display-main');
    currentWordEl.innerHTML = `
        <span>${escapeHtml(before)}</span><span class="word-orp" style="color: ${settings.orpColor}; opacity: ${settings.orpOpacity};">${escapeHtml(orp)}</span><span>${escapeHtml(after)}</span>
    `;
    currentWordEl.style.fontSize = settings.fontSize + 'px';

    const contextEl = document.getElementById('context-text');
    contextEl.textContent = contextContent;
    document.getElementById('context-area').style.display = settings.showContext ? 'block' : 'none';

    currentIndex = index;
    updateProgress();
    updateProgressSubtitle();
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

    document.getElementById('web-play-icon').classList.add('hidden');
    document.getElementById('web-pause-icon').classList.remove('hidden');

    requestWakeLock();

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

    document.getElementById('web-play-icon').classList.remove('hidden');
    document.getElementById('web-pause-icon').classList.add('hidden');

    releaseWakeLock();

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
    settings.wpm = Math.max(50, Math.min(1500, settings.wpm + delta));
    document.getElementById('reader-wpm-value').textContent = settings.wpm;

    // Save settings
    storage.setSettings(settings);

    // Restart if playing
    if (isPlaying) {
        stopReading();
        startReading();
    }
}

// Update progress bar/slider
function updateProgress() {
    document.getElementById('reader-progress-slider').value = currentIndex;
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
    document.getElementById('word-display-main').textContent = t('reader.complete', lang);
    document.getElementById('context-text').textContent = '';
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

// Setup interaction area (Scrubbing / Tapping)
function setupInteractionArea() {
    const contentArea = document.querySelector('.reader-content-area');
    let isDragging = false;
    let startX = 0;
    let baseIndex = 0;

    const handleStart = (e) => {
        if (isPlaying) return;
        isDragging = true;
        startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        baseIndex = currentIndex;
        document.getElementById('scrubber-overlay').classList.remove('hidden');
        document.getElementById('scrubber-overlay').classList.add('visible');
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const dx = currentX - startX;
        const width = window.innerWidth;

        // Halved again for precision (same as Android logic)
        const total = currentBook.content.length;
        const baseScrollRange = total * 0.006;
        const delta = Math.floor((dx / width) * baseScrollRange);

        const next = Math.max(0, Math.min(total - 1, baseIndex + delta));
        if (next !== currentIndex) {
            displayWord(next);
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        document.getElementById('scrubber-overlay').classList.add('hidden');
        document.getElementById('scrubber-overlay').classList.remove('visible');
    };

    contentArea.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    contentArea.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    // Tap to toggle controls
    contentArea.addEventListener('click', (e) => {
        if (!isDragging) {
            toggleControls();
        }
    });
}

function toggleControls() {
    const topBar = document.getElementById('reader-top-bar');
    const bottomPanel = document.getElementById('reader-bottom-panel');
    const isVisible = topBar.style.opacity !== '0';

    const targetOpacity = isVisible ? '0' : '1';
    const targetPointer = isVisible ? 'none' : 'auto';

    topBar.style.opacity = targetOpacity;
    topBar.style.pointerEvents = targetPointer;
    bottomPanel.style.opacity = targetOpacity;
    bottomPanel.style.pointerEvents = targetPointer;
}

// Full Text Modal logic
function openFullTextModal() {
    stopReading();
    const modal = document.getElementById('full-text-modal');
    modal.classList.remove('hidden');

    const lang = settings.language || 'en';
    document.getElementById('full-text-title').textContent = t('reader.fullText', lang);
    document.getElementById('full-text-instruction').textContent = t('reader.fullTextInstruction', lang);

    renderFullText();

    // Scroll Sync
    const chunkSize = 150;
    const chunkIndex = Math.floor(currentIndex / chunkSize);
    const body = document.getElementById('full-text-body');
    const row = body.querySelector(`[data-chunk-index="${chunkIndex}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
}

function closeFullTextModal() {
    document.getElementById('full-text-modal').classList.add('hidden');
}

function renderFullText() {
    const container = document.getElementById('full-text-body');
    const words = currentBook.content || [];
    const chunkSize = 150;
    let html = '';

    for (let i = 0; i < words.length; i += chunkSize) {
        const chunkIndex = i / chunkSize;
        const chunkWords = words.slice(i, i + chunkSize);

        html += `<div class="chunk-row" data-chunk-index="${chunkIndex}">`;
        html += chunkWords.map((word, idx) => {
            const actualIndex = i + idx;
            const isActive = actualIndex === currentIndex;
            return `
                <span class="full-text-word-btn ${isActive ? 'active' : ''}" 
                      onclick="window.readerActions.jumpTo(${actualIndex})">
                    ${escapeHtml(word)}
                </span>
            `;
        }).join(' ');
        html += `</div>`;
    }

    container.innerHTML = html;
}

window.readerActions = {
    jumpTo: (index) => {
        displayWord(index);
        closeFullTextModal();
    }
};

// Wake Lock API
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
        });
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initReader };
