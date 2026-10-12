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
  
  // Per-Site Speed Memory
  siteSpeeds: {},              // Domain-specific speed memory: { "youtube.com": 1.5, "udemy.com": 1.25 }
  rememberSiteSpeed: true,     // Automatically remember speed per site

  // Player Override Protection
  preventSiteOverride: true,   // Restore user's chosen speed if site/ads reset it back to 1.0

  // Badge Display
  showBadge: true,             // Show playback speed in toolbar icon badge (e.g. 1.5)

  // Overlay & HUD Settings
  showOverlay: true,           // Show on-video controller pill
  hideInFullscreen: false,     // Hide controller pill in fullscreen mode
  showHud: true,               // Show HUD flash on shortcut press
  mouseWheelSpeed: true,       // Adjust speed via mouse wheel on the overlay capsule
  overlayOpacityIdle: 0.35,    // Idle opacity (0.0 - 1.0)
  overlayOpacityHover: 1.0,    // Hover opacity
  autoHideDelay: 2.0,          // Auto-dim delay (seconds)
  overlayPosition: 'top-left', // Controller position
  customPosition: { top: 16, left: 16 }, // Saved dragged position coordinates
  
  // Custom Speed Presets for Popup
  customPresets: [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0],

  // Saved Time Statistics
  timeStats: {
    totalSecondsSaved: 0,      // All-time accumulated saved seconds
    todaySecondsSaved: 0,      // Seconds saved today
    thisWeekSecondsSaved: 0,   // Seconds saved this week
    lastDate: '',              // YYYY-MM-DD
    lastWeek: ''               // YYYY-Www
  },

  // Keyboard Shortcuts
  shortcuts: {
    slower: { key: 's', label: 'Hızı Yavaşlat' },
    faster: { key: 'd', label: 'Hızı Artır' },
    reset: { key: 'r', label: 'Hızı Sıfırla (1.0x)' },
    toggleFast: { key: 'g', label: 'Hızlı Hıza Geç / Dön' },
    rewind: { key: 'z', label: 'Geri Sar' },
    forward: { key: 'x', label: 'İleri Sar' },
    toggleOverlay: { key: 'v', label: 'Paneli Gizle / Göster' },
    mute: { key: 'm', label: 'Sesi Kapat / Aç' },
    abLoop: { key: 'l', label: 'A-B Döngüsü (Belirle / Sıfırla)' }
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
   * Sanitizes a hostname (strips protocol, port, www, leading/trailing slashes).
   */
  cleanHostname(hostname) {
    if (!hostname || typeof hostname !== 'string') return '';
    let host = hostname.trim().toLowerCase();
    host = host.replace(/^[a-z]+:\/\//i, '');
    host = host.split('/')[0].split('?')[0].split(':')[0];
    host = host.replace(/^www\./, '');
    return host;
  },

  /**
   * Checks if a hostname is on the blacklist.
   */
  isHostBlacklisted(hostname, blacklist = []) {
    if (!hostname || !Array.isArray(blacklist)) return false;
    const cleanHost = this.cleanHostname(hostname);
    return blacklist.some(item => {
      const entry = this.cleanHostname(item);
      return entry && (cleanHost === entry || cleanHost.endsWith('.' + entry));
    });
  },

  /**
   * Gets configured speed for a specific hostname.
   * Matches exact domain or parent domain (e.g. music.youtube.com matches youtube.com).
   */
  getSiteSpeed(hostname, siteSpeeds = {}) {
    const host = this.cleanHostname(hostname);
    if (!host || !siteSpeeds || typeof siteSpeeds !== 'object') return null;

    if (typeof siteSpeeds[host] === 'number') {
      return siteSpeeds[host];
    }

    const keys = Object.keys(siteSpeeds);
    for (const key of keys) {
      const cleanKey = this.cleanHostname(key);
      if (cleanKey && (host === cleanKey || host.endsWith('.' + cleanKey))) {
        return siteSpeeds[key];
      }
    }
    return null;
  },

  /**
   * Gets effective playback speed for a hostname given settings hierarchy:
   * 1. Per-site speed if configured
   * 2. Remembered last speed across sessions (if rememberSpeed is on)
   * 3. Global default initial speed
   * 4. 1.0 fallback
   */
  getEffectiveSpeed(hostname, settings) {
    if (!settings) return 1.0;
    const siteSpeed = this.getSiteSpeed(hostname, settings.siteSpeeds);
    if (siteSpeed !== null && typeof siteSpeed === 'number') {
      return siteSpeed;
    }
    if (settings.rememberSpeed && typeof settings.lastKnownSpeed === 'number') {
      return settings.lastKnownSpeed;
    }
    if (typeof settings.defaultSpeed === 'number') {
      return settings.defaultSpeed;
    }
    return 1.0;
  },

  /**
   * Returns YYYY-MM-DD string for current local date
   */
  getDateIdentifier(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Returns ISO week identifier string e.g. '2026-W42'
   */
  getWeekIdentifier(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  },

  /**
   * Formats duration in seconds into human-readable string (e.g. "3 sa 12 dk" or "3h 12m")
   */
  formatDuration(totalSeconds, lang = 'tr') {
    const sec = Math.max(0, Math.round(totalSeconds || 0));
    if (sec < 60) {
      return lang === 'tr' ? `${sec} sn` : `${sec}s`;
    }
    const mins = Math.floor(sec / 60);
    if (mins < 60) {
      return lang === 'tr' ? `${mins} dk` : `${mins}m`;
    }
    const hrs = Math.floor(sec / 3600);
    const remMins = Math.floor((sec % 3600) / 60);
    if (lang === 'tr') {
      return remMins > 0 ? `${hrs} sa ${remMins} dk` : `${hrs} saat`;
    } else {
      return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
    }
  },

  /**
   * Records saved seconds and persists to storage
   */
  async recordTimeSaved(secondsSaved) {
    if (!secondsSaved || secondsSaved <= 0) return null;
    const settings = await this.getSettings();
    const today = this.getDateIdentifier();
    const thisWeek = this.getWeekIdentifier();

    const stats = settings.timeStats || {
      totalSecondsSaved: 0,
      todaySecondsSaved: 0,
      thisWeekSecondsSaved: 0,
      lastDate: today,
      lastWeek: thisWeek
    };

    if (stats.lastDate !== today) {
      stats.todaySecondsSaved = 0;
      stats.lastDate = today;
    }
    if (stats.lastWeek !== thisWeek) {
      stats.thisWeekSecondsSaved = 0;
      stats.lastWeek = thisWeek;
    }

    stats.totalSecondsSaved = (stats.totalSecondsSaved || 0) + secondsSaved;
    stats.todaySecondsSaved = (stats.todaySecondsSaved || 0) + secondsSaved;
    stats.thisWeekSecondsSaved = (stats.thisWeekSecondsSaved || 0) + secondsSaved;

    settings.timeStats = stats;
    await this.saveSettings(settings);
    return stats;
  },

  /**
   * Resets time statistics back to zero
   */
  async resetTimeStats() {
    const settings = await this.getSettings();
    const today = this.getDateIdentifier();
    const thisWeek = this.getWeekIdentifier();
    settings.timeStats = {
      totalSecondsSaved: 0,
      todaySecondsSaved: 0,
      thisWeekSecondsSaved: 0,
      lastDate: today,
      lastWeek: thisWeek
    };
    await this.saveSettings(settings);
    return settings.timeStats;
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
    if (userSettings.siteSpeeds && typeof userSettings.siteSpeeds === 'object' && !Array.isArray(userSettings.siteSpeeds)) {
      merged.siteSpeeds = { ...userSettings.siteSpeeds };
    } else {
      merged.siteSpeeds = {};
    }
    if (!Array.isArray(merged.blacklist)) {
      merged.blacklist = [];
    }
    if (userSettings.rememberSiteSpeed !== undefined) {
      merged.rememberSiteSpeed = !!userSettings.rememberSiteSpeed;
    }
    if (userSettings.preventSiteOverride !== undefined) {
      merged.preventSiteOverride = !!userSettings.preventSiteOverride;
    }
    if (userSettings.showBadge !== undefined) {
      merged.showBadge = !!userSettings.showBadge;
    }
    if (userSettings.hideInFullscreen !== undefined) {
      merged.hideInFullscreen = !!userSettings.hideInFullscreen;
    }
    if (userSettings.overlayOpacityIdle !== undefined) {
      const parsedOp = parseFloat(userSettings.overlayOpacityIdle);
      merged.overlayOpacityIdle = (!isNaN(parsedOp) && parsedOp >= 0 && parsedOp <= 1) ? parsedOp : DEFAULT_SETTINGS.overlayOpacityIdle;
    }
    if (userSettings.mouseWheelSpeed !== undefined) {
      merged.mouseWheelSpeed = !!userSettings.mouseWheelSpeed;
    }

    // Merge & sanitize custom speed presets
    if (Array.isArray(userSettings.customPresets) && userSettings.customPresets.length > 0) {
      const sanitized = [...new Set(userSettings.customPresets
        .map(n => Math.round(parseFloat(n) * 100) / 100)
        .filter(n => typeof n === 'number' && !isNaN(n) && n > 0 && n <= 16)
      )].sort((a, b) => a - b);
      merged.customPresets = sanitized.length > 0 ? sanitized : [...DEFAULT_SETTINGS.customPresets];
    } else {
      merged.customPresets = [...DEFAULT_SETTINGS.customPresets];
    }

    // Merge & sanitize time savings statistics
    const today = this.getDateIdentifier();
    const thisWeek = this.getWeekIdentifier();
    const incomingStats = userSettings.timeStats || {};
    merged.timeStats = {
      totalSecondsSaved: typeof incomingStats.totalSecondsSaved === 'number' ? incomingStats.totalSecondsSaved : 0,
      todaySecondsSaved: (incomingStats.lastDate === today && typeof incomingStats.todaySecondsSaved === 'number') ? incomingStats.todaySecondsSaved : 0,
      thisWeekSecondsSaved: (incomingStats.lastWeek === thisWeek && typeof incomingStats.thisWeekSecondsSaved === 'number') ? incomingStats.thisWeekSecondsSaved : 0,
      lastDate: today,
      lastWeek: thisWeek
    };

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
