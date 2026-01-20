// history.js - Reading history and statistics

import { storage } from './storage.js';
import { t } from './i18n.js';

let history = [];
let settings = {};

// Initialize history
export function initHistory(data) {
    history = data.history;
    settings = data.settings;

    renderHistory();
}

// Render history
export function renderHistory() {
    const container = document.getElementById('history-container');
    const emptyState = document.getElementById('history-empty');
    const lang = settings.language || 'en';

    // Update translations
    document.getElementById('history-title').textContent = t('history.title', lang);
    document.getElementById('history-empty-title').textContent = t('history.noHistory', lang);
    document.getElementById('history-empty-subtitle').textContent = t('history.flavorText', lang);

    if (history.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // Calculate totals
    const totalWords = history.reduce((sum, day) => sum + day.wordsRead, 0);
    const totalSeconds = history.reduce((sum, day) => sum + day.secondsRead, 0);
    const totalBooks = new Set(history.flatMap(day => day.completedBooks || [])).size;

    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    container.innerHTML = `
        <div class="history-stats">
            <div class="stat-card">
                <div class="stat-value">${totalBooks}</div>
                <div class="stat-label">${t('history.totalBooks', lang)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalWords.toLocaleString()}</div>
                <div class="stat-label">${t('history.wordsRead', lang)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalHours}h ${totalMinutes}m</div>
                <div class="stat-label">${t('history.timeRead', lang)}</div>
            </div>
        </div>
        
        <div style="margin-top: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">${t('history.dailyGoal', lang)}</h3>
            <div class="history-list">
                ${history.slice().reverse().slice(0, 30).map(day => createHistoryItem(day)).join('')}
            </div>
        </div>
        
        <div class="donation-card glass-card">
            <p class="flavor-text">${getRandomDonationPhrase(lang)}</p>
            <a href="https://ko-fi.com/myth_jo" target="_blank" rel="noopener" class="donate-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6F4E37" stroke-width="2">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
                <span>${t('history.donateTitle', lang)} (Ko-fi)</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; opacity: 0.5;">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        </div>
        
        <div id="hall-of-fame" class="hall-of-fame glass-card hidden">
            <div class="hof-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700">
                    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                </svg>
                <h3>${t('history.hallOfFameTitle', lang)}</h3>
            </div>
            <div id="hall-of-fame-list" class="supporter-list">
                <!-- Supporters injected here -->
            </div>
        </div>
    `;

    // Load Hall of Fame
    loadHallOfFame();
}

// Create history item
function createHistoryItem(day) {
    const date = new Date(day.date);
    const formattedDate = date.toLocaleDateString(settings.language === 'es' ? 'es-ES' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const hours = Math.floor(day.secondsRead / 3600);
    const minutes = Math.floor((day.secondsRead % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return `
        <div class="history-item">
            <div class="history-date">${formattedDate}</div>
            <div class="history-data">
                ${day.wordsRead.toLocaleString()} words • ${timeStr} • ${day.avgWpm} WPM
            </div>
        </div>
    `;
}

// Get random donation phrase
function getRandomDonationPhrase(lang) {
    const phrases = t('history.donationPhrases', lang);
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// Load Hall of Fame
async function loadHallOfFame() {
    const list = document.getElementById('hall-of-fame-list');
    const container = document.getElementById('hall-of-fame');
    if (!list) return;

    try {
        const response = await fetch('https://gist.githubusercontent.com/MythicalJo/493d770c9e6a6d98ae98bdbe6670f502/raw/vip-users.json');

        if (!response.ok) throw new Error('Failed to load');

        const supporters = await response.json();

        if (Array.isArray(supporters) && supporters.length > 0) {
            container.classList.remove('hidden');
            list.innerHTML = supporters.map((supporter, idx) => `
                <div class="supporter-row">
                    <span class="supporter-name">${escapeHtml(supporter.name)}</span>
                    <span class="year-badge">${escapeHtml(supporter.year)}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.warn('Hall of Fame load failed:', error);
        container.classList.add('hidden');
    }
}

// Update history
export function updateHistory(newHistory) {
    history = newHistory;
    renderHistory();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export
export default { initHistory, renderHistory, updateHistory };
