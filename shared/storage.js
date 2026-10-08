/**
 * Pacelet - Settings & Storage Module
 * Shared by content script, popup, options, and background service worker.
 */

const DEFAULT_SETTINGS = {
  version: 1,
  enabled: true,                // Extension enabled globally
  defaultSpeed: 1.0,           // Default initial playback rate
  speedStep: 0.1,              // Speed increment / decrement step
  fastSpeed: 1.8,              // Quick toggle target speed (G key)
  rewindStep: 10,              // Rewind step (seconds)
  forwardStep: 10,             // Forward step (seconds)
  rememberSpeed: false,        // Remember last used speed across sessions
  preservesPitch: true,        // Preserve audio pitch (prevents chipmunk distortion)
  language: 'auto',            // Interface language: 'auto', 'en', 'tr'
  
  // Overlay & HUD Settings
  showOverlay: true,           // Show on-video controller pill
  showHud: true,               // Show HUD flash on shortcut press
  overlayOpacityIdle: 0.35,    // Idle opacity (0.1 - 1.0)
  overlayOpacityHover: 1.0,    // Hover opacity
  autoHideDelay: 2.0,          // Auto-dim delay (seconds)
  overlayPosition: 'top-left', // Controller position
  customPosition: { top: 16, left: 16 }, // Saved dragged position coordinates
  
  // Keyboard Shortcuts
  shortcuts: {
    slower: { key: 's', label: 'Hızı Yavaşlat' },
    faster: { key: 'd', label: 'Hızı Artır' },
    reset: { key: 'r', label: 'Hızı Sıfırla (1.0x)' },
    toggleFast: { key: 'g', label: 'Hızlı Hıza Geç / Dön' },
    rewind: { key: 'z', label: 'Geri Sar' },
    forward: { key: 'x', label: 'İleri Sar' },
    toggleOverlay: { key: 'v', label: 'Paneli Gizle / Göster' },
    mute: { key: 'm', label: 'Sesi Kapat / Aç' }
  },

  // Blacklisted domain hostnames
  blacklist: []
};

const StorageManager = {
  STORAGE_KEY: 'paceletSettings',
  LEGACY_STORAGE_KEY: 'hizKontrolSettings',

  /**
   * Retrieves settings from chrome.storage.sync (or fallback localStorage).
   */
  async getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get([this.STORAGE_KEY, this.LEGACY_STORAGE_KEY], (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('[Pacelet] storage.sync error, falling back:', chrome.runtime.lastError);
            resolve(this._getFallbackSettings());
            return;
          }
          const saved = result?.[this.STORAGE_KEY] || result?.[this.LEGACY_STORAGE_KEY];
          if (saved) {
            resolve(this._mergeDefaults(saved));
          } else {
            resolve(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
          }
        });
      } else {
        resolve(this._getFallbackSettings());
      }
    });
  },

  /**
   * Saves settings to storage.
   */
  async saveSettings(updatedSettings) {
    const full = this._mergeDefaults(updatedSettings);
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [this.STORAGE_KEY]: full }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(full);
          }
        });
      } else {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(full));
          resolve(full);
        } catch (e) {
          reject(e);
        }
      }
    });
  },

  /**
   * Resets all settings to factory defaults.
   */
  async resetToDefaults() {
    return this.saveSettings(DEFAULT_SETTINGS);
  },

  /**
   * Checks if a hostname is on the blacklist.
   */
  isHostBlacklisted(hostname, blacklist = []) {
    if (!hostname || !Array.isArray(blacklist)) return false;
    const cleanHost = hostname.toLowerCase().trim();
    return blacklist.some(item => {
      const entry = item.toLowerCase().trim();
      return cleanHost === entry || cleanHost.endsWith('.' + entry);
    });
  },

  _mergeDefaults(userSettings) {
    if (!userSettings) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    const merged = { ...DEFAULT_SETTINGS, ...userSettings };
    if (userSettings.shortcuts) {
      merged.shortcuts = { ...DEFAULT_SETTINGS.shortcuts, ...userSettings.shortcuts };
    }
    if (userSettings.customPosition) {
      merged.customPosition = { ...DEFAULT_SETTINGS.customPosition, ...userSettings.customPosition };
    }
    if (!Array.isArray(merged.blacklist)) {
      merged.blacklist = [];
    }
    return merged;
  },

  _getFallbackSettings() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.LEGACY_STORAGE_KEY);
      if (stored) {
        return this._mergeDefaults(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
};

// Global export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_SETTINGS, StorageManager };
} else {
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.StorageManager = StorageManager;
}
