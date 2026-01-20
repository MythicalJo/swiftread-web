// reader.js - Speed reader with ORP highlighting (matching React Native)

import { storage } from './storage.js';
import { t } from './i18n.js';

let currentBook = null;
let settings = {};
let isPlaying = false;
let currentIndex = 0;
let intervalId = null;
let startTime = null;
let elapsedSeconds = 0;
let controlsVisible = true;
let controlsTimeout = null;

// Initialize reader
export function initReader(book, userSettings) {
    currentBook = book;
    settings = userSettings;
    currentIndex = book.progress || 0;
    isPlaying = false;
    elapsedSeconds = 0;
    controlsVisible = true;

    renderReader();
    setupReaderControls();
    applyTheme();

    // Keep screen awake
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(() => { });
    }
}

// Render reader view
function renderReader() {
    const readerView = document.getElementById('reader-view');
    const lang = settings.language || 'en';
    const progress = Math.round((currentIndex / (currentBook.content?.length || 1)) * 100);

    readerView.innerHTML = `
        <!-- Top Bar -->
        <div class="reader-top-bar" id="reader-top-bar">
            <button id="reader-back-btn" class="reader-icon-btn">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            <div class="reader-top-title">
                <div class="reader-book-title">${escapeHtml(currentBook.title)}</div>
                <div class="reader-progress-text">${progress}% ${t('reader.complete', lang)}</div>
            </div>
            <button id="reader-fulltext-btn" class="reader-icon-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <!-- Reader Content Area -->
        <div class="reader-content-area" id="reader-content-area">
            <!-- Scanning overlay -->
            <div class="scanning-overlay" id="scanning-overlay">
                <div class="scanning-text">${t('reader.scanning', lang)}</div>
            </div>
            
            <!-- Word Display with Guides -->
            <div class="word-display-container">
                <div class="word-guide word-guide-top"></div>
                <div class="word-display-main" id="word-display"></div>
                <div class="word-guide word-guide-bottom"></div>
            </div>
            
            <!-- Context (following words) -->
            <div class="word-context" id="word-context"></div>
        </div>
        
        <!-- Bottom Panel -->
        <div class="reader-bottom-panel" id="reader-bottom-panel">
            <!-- Progress Slider -->
            <div class="reader-slider-container">
                <input type="range" 
                    id="reader-slider" 
                    class="reader-slider" 
                    min="0" 
                    max="${Math.max(0, (currentBook.content?.length || 1) - 1)}" 
                    value="${currentIndex}"
                    step="1">
            </div>
            
            <!-- Control Card -->
            <div class="reader-control-card">
                <!-- WPM Control (Left) -->
                <div class="reader-wpm-control">
                    <button id="wpm-decrease" class="wpm-btn">−</button>
                    <div class="wpm-display">
                        <div class="wpm-value" id="wpm-value">${settings.wpm}</div>
                        <div class="wpm-label">${t('reader.wpm', lang)}</div>
                    </div>
                    <button id="wpm-increase" class="wpm-btn">+</button>
                </div>
                
                <!-- Center Controls -->
                <div class="reader-center-controls">
                    <button id="rewind-btn" class="reader-rewind-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                            <path d="M3 3v5h5"></path>
                        </svg>
                    </button>
                    
                    <button id="play-pause-btn" class="reader-play-btn">
                        <svg id="play-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <svg id="pause-icon" class="hidden" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    </button>
                </div>
                
                <!-- Settings Icon (Right) -->
                <div class="reader-settings-control">
                    <button id="reader-settings-btn" class="reader-icon-btn">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Floating Pause Button (when controls hidden) -->
        <button id="floating-pause-btn" class="floating-pause-btn hidden">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
        </button>
    `;

    readerView.classList.remove('hidden');
    displayWord(currentIndex);
}

// Setup reader controls
function setupReaderControls() {
    // Back button
    document.getElementById('reader-back-btn').addEventListener('click', closeReader);

    // Play/Pause
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('floating-pause-btn').addEventListener('click', () => {
        stopReading();
        showControls();
    });

    // Rewind
    document.getElementById('reader-back-btn').addEventListener('click', rewind);

    // WPM controls
    document.getElementById('wpm-decrease').addEventListener('click', () => adjustWPM(-settings.wpmStep));
    document.getElementById('wpm-increase').addEventListener('click', () => adjustWPM(settings.wpmStep));

    // Slider
    const slider = document.getElementById('reader-slider');
    slider.addEventListener('input', (e) => {
        stopReading();
        const newIndex = parseInt(e.target.value);
        displayWord(newIndex);
    });

    slider.addEventListener('change', (e) => {
        const newIndex = parseInt(e.target.value);
        saveProgress(newIndex, 0);
    });

    // Settings button
    document.getElementById('reader-settings-btn').addEventListener('click', () => {
        stopReading();
        window.dispatchEvent(new CustomEvent('openSettings'));
    });

    // Tap to toggle controls
    document.getElementById('reader-content-area').addEventListener('click', toggleControls);

    // Auto-hide controls
    if (settings.autoHideControls) {
        resetAutoHideTimer();
    }
}

// Display word with ORP highlighting
function displayWord(index) {
    if (!currentBook.content || index >= currentBook.content.length) {
        stopReading();
        document.getElementById('word-display').innerHTML = `<div style="font-size: ${settings.fontSize}px; font-weight: 700;">${t('reader.complete', settings.language)}</div>`;
        document.getElementById('word-context').textContent = '';
        return;
    }

    const word = currentBook.content[index] || '';
    currentIndex = index;

    // Calculate ORP (Optimal Recognition Point)
    const length = word.length;
    let midStart, midEnd;

    if (length <= 1) {
        midStart = 0;
        midEnd = 1;
    } else if (length % 2 === 0) {
        midStart = (length / 2) - 1;
        midEnd = midStart + 2;
    } else {
        midStart = Math.floor(length / 2);
        midEnd = midStart + 1;
    }

    const prefix = word.substring(0, midStart);
    const middle = word.substring(midStart, midEnd);
    const suffix = word.substring(midEnd);

    // Dynamic font size for long words
    const maxWidth = window.innerWidth * 0.85;
    const estimatedWidth = word.length * settings.fontSize * 0.6;
    const displayFontSize = estimatedWidth > maxWidth
        ? Math.floor(maxWidth / (word.length * 0.6))
        : settings.fontSize;

    // Update word display
    document.getElementById('word-display').innerHTML = `
        <div style="font-size: ${displayFontSize}px; font-weight: 700; font-family: monospace; letter-spacing: -0.5px;">
            <span>${escapeHtml(prefix)}</span><span style="color: ${settings.orpColor}; opacity: ${settings.orpOpacity};">${escapeHtml(middle)}</span><span>${escapeHtml(suffix)}</span>
        </div>
    `;

    // Update context (following words)
    if (settings.showContext) {
        const contextWords = currentBook.content.slice(index + 1, index + 40).join(' ');
        document.getElementById('word-context').textContent = contextWords;
        document.getElementById('word-context').style.opacity = settings.contextOpacity;
        document.getElementById('word-context').style.fontSize = settings.contextFontSize + 'px';
    } else {
        document.getElementById('word-context').textContent = '';
    }

    // Update slider
    document.getElementById('reader-slider').value = index;

    // Update progress in top bar
    const progress = Math.round((index / (currentBook.content.length || 1)) * 100);
    document.querySelector('.reader-progress-text').textContent = `${progress}% ${t('reader.complete', settings.language)}`;
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
    if (currentIndex >= (currentBook.content?.length || 0) - 1) return;

    isPlaying = true;
    startTime = Date.now();

    document.getElementById('play-icon').classList.add('hidden');
    document.getElementById('pause-icon').classList.remove('hidden');

    // Start stats tracking
    const statsInterval = setInterval(() => {
        if (isPlaying) {
            elapsedSeconds++;
        } else {
            clearInterval(statsInterval);
        }
    }, 1000);

    // Start word advancement
    advanceWord();

    // Auto-hide controls
    if (settings.autoHideControls) {
        hideControls();
    }
}

// Stop reading
function stopReading() {
    isPlaying = false;

    if (intervalId) {
        clearTimeout(intervalId);
        intervalId = null;
    }

    document.getElementById('play-icon').classList.remove('hidden');
    document.getElementById('pause-icon').classList.add('hidden');

    // Save progress
    saveProgress(currentIndex, elapsedSeconds);
    elapsedSeconds = 0;

    // Show controls
    showControls();
}

// Advance to next word
function advanceWord() {
    if (!isPlaying || currentIndex >= (currentBook.content?.length || 0) - 1) {
        stopReading();
        return;
    }

    currentIndex++;
    displayWord(currentIndex);

    // Calculate delay with pauses
    const word = currentBook.content[currentIndex - 1] || '';
    let delay = 60000 / settings.wpm;

    if (/[.!?]$/.test(word)) {
        delay += settings.sentencePause;
    } else if (word === '' || word === '\n') {
        delay += settings.paragraphPause;
    }

    intervalId = setTimeout(advanceWord, delay);
}

// Rewind
function rewind() {
    const newIndex = Math.max(0, currentIndex - settings.rewindAmount);
    displayWord(newIndex);
}

// Adjust WPM
function adjustWPM(delta) {
    settings.wpm = Math.max(50, Math.min(1500, settings.wpm + delta));
    document.getElementById('wpm-value').textContent = settings.wpm;

    // Adjust font size if > 999
    if (settings.wpm > 999) {
        document.getElementById('wpm-value').style.fontSize = '16px';
    } else {
        document.getElementById('wpm-value').style.fontSize = '18px';
    }

    storage.setSettings(settings);

    // Restart if playing
    if (isPlaying) {
        stopReading();
        startReading();
    }
}

// Toggle controls visibility
function toggleControls() {
    if (controlsVisible) {
        hideControls();
    } else {
        showControls();
    }
}

// Show controls
function showControls() {
    controlsVisible = true;
    document.getElementById('reader-top-bar').style.opacity = '1';
    document.getElementById('reader-top-bar').style.transform = 'translateY(0)';
    document.getElementById('reader-bottom-panel').style.opacity = '1';
    document.getElementById('reader-bottom-panel').style.transform = 'translateY(0)';
    document.getElementById('floating-pause-btn').classList.add('hidden');

    resetAutoHideTimer();
}

// Hide controls
function hideControls() {
    if (!isPlaying) return; // Don't hide when paused

    controlsVisible = false;
    document.getElementById('reader-top-bar').style.opacity = '0';
    document.getElementById('reader-top-bar').style.transform = 'translateY(-100px)';
    document.getElementById('reader-bottom-panel').style.opacity = '0';
    document.getElementById('reader-bottom-panel').style.transform = 'translateY(200px)';
    document.getElementById('floating-pause-btn').classList.remove('hidden');
}

// Reset auto-hide timer
function resetAutoHideTimer() {
    if (controlsTimeout) {
        clearTimeout(controlsTimeout);
    }

    if (isPlaying && settings.autoHideControls && controlsVisible) {
        controlsTimeout = setTimeout(() => {
            hideControls();
        }, settings.hideDelay * 1000);
    }
}

// Save progress
function saveProgress(index, seconds) {
    if (currentBook) {
        window.dispatchEvent(new CustomEvent('updateProgress', {
            detail: {
                bookId: currentBook.id,
                progress: index,
                secondsElapsed: seconds
            }
        }));
    }
}

// Close reader
function closeReader() {
    stopReading();
    saveProgress(currentIndex, 0);

    document.getElementById('reader-view').classList.add('hidden');
    window.dispatchEvent(new CustomEvent('closeReader'));
}

// Apply theme
function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initReader };
