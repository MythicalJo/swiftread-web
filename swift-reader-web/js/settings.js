// settings.js - Settings modal

import { storage } from './storage.js';
import { t } from './i18n.js';

let settings = {};
let onUpdateCallback = null;

// Initialize settings
export function initSettings(userSettings, callback) {
    settings = userSettings;
    onUpdateCallback = callback;
}

// Show settings modal
export function showSettings() {
    const modal = document.getElementById('settings-modal');
    const lang = settings.language || 'en';

    modal.querySelector('.modal-content').innerHTML = `
        <div class="modal-header">
            <h2>${t('settings.title', lang)}</h2>
            <button id="close-settings-btn" class="icon-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        
        <div class="modal-section">
            <h3>${t('settings.themeTypography', lang)}</h3>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>Theme</h4>
                </div>
                <div class="theme-selector">
                    <button class="theme-btn ${settings.theme === 'light' ? 'active' : ''}" data-theme="light">${t('settings.light', lang)}</button>
                    <button class="theme-btn ${settings.theme === 'sepia' ? 'active' : ''}" data-theme="sepia">${t('settings.sepia', lang)}</button>
                    <button class="theme-btn ${settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">${t('settings.dark', lang)}</button>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.fontSize', lang)}</h4>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="fontSize" data-delta="-4">−</button>
                    <span id="fontSize-value" style="min-width: 50px; text-align: center; font-weight: 600;">${settings.fontSize}px</span>
                    <button class="wpm-btn" data-action="fontSize" data-delta="4">+</button>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.orpColor', lang)}</h4>
                    <p>${t('settings.orpColorDesc', lang)}</p>
                </div>
                <input type="color" id="orp-color-input" value="${settings.orpColor}" style="width: 60px; height: 40px; border: none; border-radius: 8px; cursor: pointer;">
            </div>
        </div>
        
        <div class="modal-section">
            <h3>${t('settings.readingPace', lang)}</h3>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.readingSpeed', lang)}</h4>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="wpm" data-delta="-25">−</button>
                    <span id="wpm-value" style="min-width: 70px; text-align: center; font-weight: 600;">${settings.wpm} WPM</span>
                    <button class="wpm-btn" data-action="wpm" data-delta="25">+</button>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.wpmIncrement', lang)}</h4>
                    <p>${t('settings.wpmIncrementDesc', lang)}</p>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="wpmStep" data-delta="-5">−</button>
                    <span id="wpmStep-value" style="min-width: 50px; text-align: center; font-weight: 600;">${settings.wpmStep}</span>
                    <button class="wpm-btn" data-action="wpmStep" data-delta="5">+</button>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.rewindAmount', lang)}</h4>
                    <p>${t('settings.rewindAmountDesc', lang)}</p>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="rewindAmount" data-delta="-5">−</button>
                    <span id="rewindAmount-value" style="min-width: 50px; text-align: center; font-weight: 600;">${settings.rewindAmount}</span>
                    <button class="wpm-btn" data-action="rewindAmount" data-delta="5">+</button>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>${t('settings.flowPauses', lang)}</h3>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.sentencePause', lang)}</h4>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="sentencePause" data-delta="-50">−</button>
                    <span id="sentencePause-value" style="min-width: 60px; text-align: center; font-weight: 600;">${settings.sentencePause}ms</span>
                    <button class="wpm-btn" data-action="sentencePause" data-delta="50">+</button>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.paragraphPause', lang)}</h4>
                </div>
                <div class="setting-control">
                    <button class="wpm-btn" data-action="paragraphPause" data-delta="-100">−</button>
                    <span id="paragraphPause-value" style="min-width: 70px; text-align: center; font-weight: 600;">${settings.paragraphPause}ms</span>
                    <button class="wpm-btn" data-action="paragraphPause" data-delta="100">+</button>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>${t('settings.interface', lang)}</h3>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.autoHide', lang)}</h4>
                    <p>${t('settings.autoHideDesc', lang)}</p>
                </div>
                <div class="toggle ${settings.autoHideControls ? 'active' : ''}" data-setting="autoHideControls">
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.showClock', lang)}</h4>
                    <p>${t('settings.showClockDesc', lang)}</p>
                </div>
                <div class="toggle ${settings.showClock ? 'active' : ''}" data-setting="showClock">
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.showBattery', lang)}</h4>
                    <p>${t('settings.showBatteryDesc', lang)}</p>
                </div>
                <div class="toggle ${settings.showBattery ? 'active' : ''}" data-setting="showBattery">
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.use24Hour', lang)}</h4>
                    <p>${t('settings.use24HourDesc', lang)}</p>
                </div>
                <div class="toggle ${settings.use24HourClock ? 'active' : ''}" data-setting="use24HourClock">
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.contextVisibility', lang)}</h4>
                    <p>${t('settings.contextVisibilityDesc', lang)}</p>
                </div>
                <div class="toggle ${settings.showContext ? 'active' : ''}" data-setting="showContext">
                    <div class="toggle-thumb"></div>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-label">
                    <h4>${t('settings.appLanguage', lang)}</h4>
                </div>
                <div class="theme-selector">
                    <button class="theme-btn ${settings.language === 'en' ? 'active' : ''}" data-language="en">English</button>
                    <button class="theme-btn ${settings.language === 'es' ? 'active' : ''}" data-language="es">Español</button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    setupSettingsListeners();
}

// Setup settings listeners
function setupSettingsListeners() {
    // Close button
    document.getElementById('close-settings-btn').addEventListener('click', hideSettings);

    // Click outside to close
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            hideSettings();
        }
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            settings.theme = btn.dataset.theme;
            updateSetting('theme', settings.theme);
            document.querySelectorAll('.theme-btn[data-theme]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Language buttons
    document.querySelectorAll('.theme-btn[data-language]').forEach(btn => {
        btn.addEventListener('click', () => {
            settings.language = btn.dataset.language;
            updateSetting('language', settings.language);
            hideSettings();
            showSettings(); // Refresh with new language
        });
    });

    // Number controls
    document.querySelectorAll('.wpm-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const delta = parseInt(btn.dataset.delta);

            if (action === 'wpm') {
                settings.wpm = Math.max(50, Math.min(1000, settings.wpm + delta));
                document.getElementById('wpm-value').textContent = settings.wpm + ' WPM';
            } else if (action === 'wpmStep') {
                settings.wpmStep = Math.max(5, Math.min(100, settings.wpmStep + delta));
                document.getElementById('wpmStep-value').textContent = settings.wpmStep;
            } else if (action === 'fontSize') {
                settings.fontSize = Math.max(24, Math.min(96, settings.fontSize + delta));
                document.getElementById('fontSize-value').textContent = settings.fontSize + 'px';
            } else if (action === 'rewindAmount') {
                settings.rewindAmount = Math.max(5, Math.min(100, settings.rewindAmount + delta));
                document.getElementById('rewindAmount-value').textContent = settings.rewindAmount;
            } else if (action === 'sentencePause') {
                settings.sentencePause = Math.max(0, Math.min(2000, settings.sentencePause + delta));
                document.getElementById('sentencePause-value').textContent = settings.sentencePause + 'ms';
            } else if (action === 'paragraphPause') {
                settings.paragraphPause = Math.max(0, Math.min(5000, settings.paragraphPause + delta));
                document.getElementById('paragraphPause-value').textContent = settings.paragraphPause + 'ms';
            }

            updateSetting(action, settings[action]);
        });
    });

    // Toggles
    document.querySelectorAll('.toggle[data-setting]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const setting = toggle.dataset.setting;
            settings[setting] = !settings[setting];
            toggle.classList.toggle('active');
            updateSetting(setting, settings[setting]);
        });
    });

    // Color picker
    document.getElementById('orp-color-input').addEventListener('change', (e) => {
        settings.orpColor = e.target.value;
        updateSetting('orpColor', settings.orpColor);
    });
}

// Hide settings
function hideSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

// Update setting
function updateSetting(key, value) {
    settings[key] = value;
    storage.setSettings(settings);

    if (onUpdateCallback) {
        onUpdateCallback(settings);
    }
}

// Export
export default { initSettings, showSettings };
