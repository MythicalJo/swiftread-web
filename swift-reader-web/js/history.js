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
        
        <div style="margin-top: 32px; padding: 20px; background-color: var(--card-bg); border-radius: var(--radius-md); text-align: center;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${t('history.donateTitle', lang)}</h3>
            <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">${getRandomDonationPhrase(lang)}</p>
            <a href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener" class="primary-btn" style="display: inline-flex; text-decoration: none;">
                ☕ ${t('history.donateTitle', lang)}
            </a>
        </div>
        
        <div id="hall-of-fame" style="margin-top: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">${t('history.hallOfFameTitle', lang)}</h3>
            <div id="hall-of-fame-content" style="padding: 20px; background-color: var(--card-bg); border-radius: var(--radius-md); text-align: center; color: var(--text-secondary);">
                Loading supporters...
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
    const content = document.getElementById('hall-of-fame-content');
    if (!content) return;

    try {
        const response = await fetch('https://raw.githubusercontent.com/yourusername/swiftread-supporters/main/supporters.json');

        if (!response.ok) {
            throw new Error('Failed to load');
        }

        const supporters = await response.json();

        if (supporters.length === 0) {
            content.innerHTML = '<p style="color: var(--text-secondary);">No supporters yet. Be the first!</p>';
            return;
        }

        content.innerHTML = supporters.map(supporter => `
            <div style="display: inline-block; margin: 8px; padding: 8px 16px; background-color: var(--border-color); border-radius: var(--radius-sm); font-weight: 600;">
                ${escapeHtml(supporter.name)}
            </div>
        `).join('');

    } catch (error) {
        content.innerHTML = '<p style="color: var(--text-secondary);">Unable to load supporters list.</p>';
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
