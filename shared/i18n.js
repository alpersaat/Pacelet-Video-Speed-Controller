/**
 * Pacelet — Internationalization (i18n) Module
 * Supports automatic browser locale detection with manual language override (en / tr).
 */

const I18n = {
  currentLang: 'en',

  MESSAGES: {
    en: {
      extensionName: "Pacelet — Video Speed Controller",
      extensionShortName: "Pacelet",
      connecting: "Connecting",
      playing: "Playing",
      paused: "Paused",
      videoNotFound: "No Video Found",
      siteActive: "Site Active",
      siteDisabled: "Site Disabled",
      settings: "Settings",
      preferences: "Preferences",
      autoSaved: "Auto-saved",
      playbackAndSpeed: "Playback & Speed",
      defaultSpeed: "Default Initial Speed",
      speedStep: "Speed Step Increment",
      fastSpeed: "Quick Toggle Speed (G key)",
      seekStep: "Seek Duration (Z / X keys)",
      preservesPitch: "Preserve Pitch (Pitch Correction)",
      preservesPitchHint: "Keeps natural voice timbre when speed changes (prevents chipmunk distortion)",
      rememberSiteSpeed: "Per-Site Speed Memory",
      rememberSiteSpeedHint: "Automatically remembers and applies custom speed for each website",
      preventSiteOverride: "Prevent Site from Overriding Speed",
      preventSiteOverrideHint: "Automatically restores your speed if the player or video ads reset it to 1.0 (e.g. YouTube)",
      rememberSpeed: "Remember Last Speed (Global)",
      rememberSpeedHint: "Automatically applies last used speed to new videos",
      displayAndOverlay: "Display & Overlay",
      showBadge: "Show Speed on Toolbar Badge",
      showBadgeHint: "Displays the active playback speed on the extension icon in the toolbar (e.g. 1.5)",
      showOverlay: "Show On-Video Controller",
      showOverlayHint: "Displays floating control pill in the corner of video players",
      hideInFullscreen: "Hide Controller in Fullscreen",
      hideInFullscreenHint: "Completely hides the on-video pill overlay whenever the video enters fullscreen mode",
      idleOpacity: "Idle Opacity",
      autoHideDelay: "Dimming Delay (Seconds)",
      languageLabel: "Language",
      langAuto: "Auto (Browser Default)",
      langEn: "English",
      langTr: "Türkçe",
      keyboardShortcuts: "Keyboard Shortcuts",
      resetShortcuts: "Reset Shortcuts",
      siteSpeedsTitle: "Per-Site Speed Profiles",
      siteSpeedsHint: "Set individual default speeds for specific websites (e.g. YouTube 1.5×, Udemy 1.25×).",
      siteSpeedDomainPlaceholder: "e.g. youtube.com, udemy.com",
      blacklistTitle: "Domain Blacklist",
      blacklistPlaceholder: "e.g. netflix.com",
      add: "Add",
      saveForSite: "Save",
      savedForSite: "Saved",
      saveSiteSpeedTooltip: "Save current speed as default for this site",
      backupTitle: "Backup & Reset",
      exportSettings: "Export Settings (JSON)",
      importSettings: "Import Settings",
      resetAll: "Factory Reset",
      shortcutSlower: "Decrease Speed",
      shortcutFaster: "Increase Speed",
      shortcutReset: "Reset Speed (1.0x)",
      shortcutToggleFast: "Quick Speed Toggle",
      shortcutRewind: "Rewind",
      shortcutForward: "Forward",
      shortcutToggleOverlay: "Hide / Show Overlay",
      shortcutMute: "Mute / Unmute",
      dragHandleTooltip: "Drag to reposition",
      resetTooltip: "Reset",
      normalSpeedTooltip: "Normal Speed",
      hideOverlayTooltip: "Hide Controller",
      mutedToast: "Muted",
      unmutedToast: "Sound On",
      savedToast: "Saved",
      shortcutsResetToast: "Shortcuts reset to defaults",
      factoryResetToast: "Reset to factory defaults",
      settingsExportedToast: "Settings downloaded",
      settingsImportedToast: "Settings successfully imported",
      invalidFileToast: "Invalid settings file format",
      popupFooterHint: "Shortcuts: D / S (Speed) • R (1×) • G (Quick) • L (A-B)",
      stepDownTooltip: "Slow down (-0.1)",
      stepResetTooltip: "Normal Speed (1.0×)",
      stepUpTooltip: "Speed up (+0.1)",
      rewind10Tooltip: "10s Rewind",
      forward10Tooltip: "10s Forward",
      customPresetsTitle: "Custom Speed Presets",
      customPresetsHint: "Customize the quick preset speed buttons in the popup",
      addPreset: "Add Preset",
      resetPresets: "Reset Presets",
      invalidPresetToast: "Enter a valid speed between 0.1 and 16",
      mouseWheelSpeed: "Mouse Wheel Speed Adjustment",
      mouseWheelSpeedHint: "Scroll mouse wheel over the on-video capsule to adjust speed",
      timeSavedTitle: "Time Saved",
      timeSavedWeeklyLabel: "Saved this week:",
      timeSavedTodayLabel: "Saved today:",
      timeSavedTotalLabel: "Total saved:",
      timeSavedSuffix: "saved 🚀",
      resetStats: "Reset Statistics",
      statsResetToast: "Time statistics reset",
      abLoopTitle: "A-B Loop",
      abLoopSetA: "Set A",
      abLoopSetB: "Set B",
      abLoopClear: "Clear Loop",
      abLoopTooltip: "A-B Repeat Loop",
      shortcutAbLoop: "A-B Loop (Set / Clear)",
      globalShortcutsTitle: "Chrome Global Shortcuts",
      globalShortcutsHint: "Control video speed even when the page is not in focus (customize in chrome://extensions/shortcuts)",
      openChromeShortcuts: "Configure Global Shortcuts",
      chromeShortcutsCopied: "Shortcut settings link copied"
    },
    tr: {
      extensionName: "Pacelet — Video Speed Controller",
      extensionShortName: "Pacelet",
      connecting: "Bağlanıyor",
      playing: "Video Oynatılıyor",
      paused: "Video Duraklatıldı",
      videoNotFound: "Video Bulunamadı",
      siteActive: "Site Aktif",
      siteDisabled: "Site Devre Dışı",
      settings: "Ayarlar",
      preferences: "Tercihler",
      autoSaved: "Otomatik kaydedilir",
      playbackAndSpeed: "Oynatma & Hız",
      defaultSpeed: "Varsayılan Başlangıç Hızı",
      speedStep: "Hız Değişim Adımı",
      fastSpeed: "Hızlı Mod Hızı (G tuşu)",
      seekStep: "Sarma Süresi (Z / X tuşları)",
      preservesPitch: "Ses Tonunu Koru (Pitch Correction)",
      preservesPitchHint: "Hız arttığında sesin incelmesini engeller (sincaplaşmayı önler)",
      rememberSiteSpeed: "Site Bazlı Hız Hafızası",
      rememberSiteSpeedHint: "Her web sitesi için son ayarlanan hızı ayrı ayrı hatırlar ve otomatik uygular",
      preventSiteOverride: "Sitenin Hızı Ezmesini Engelle",
      preventSiteOverrideHint: "YouTube reklamları veya video oynatıcılar hızı 1.0'a sıfırladığında belirlediğiniz hızı otomatik geri yükler",
      rememberSpeed: "Son Hızı Hatırla (Genel)",
      rememberSpeedHint: "Yeni videolarda en son ayarlanan hızı otomatik uygular",
      displayAndOverlay: "Görünüm & Gösterge",
      showBadge: "Rozette Hız Gösterimi",
      showBadgeHint: "Araç çubuğu simgesinin üzerinde anlık oynatma hızını gösterir (örn. 1.5)",
      showOverlay: "Video Üstü Kapsülü Göster",
      showOverlayHint: "Video oynatılırken sol üstte yüzen kontrol panelini gösterir",
      hideInFullscreen: "Tam Ekranda Kapsülü Gizle",
      hideInFullscreenHint: "Video tam ekrana geçtiğinde kontrol kapsülünü ekrandan tamamen kaldırır",
      idleOpacity: "Boşta Dururken Saydamlık",
      autoHideDelay: "Soluklaşma Süresi (Saniye)",
      languageLabel: "Arayüz Dili (Language)",
      langAuto: "Otomatik (Tarayıcı Dili)",
      langEn: "English",
      langTr: "Türkçe",
      keyboardShortcuts: "Klavye Kısayolları",
      resetShortcuts: "Kısayolları Sıfırla",
      siteSpeedsTitle: "Site Bazlı Hız Profilleri",
      siteSpeedsHint: "Her site için ayrı bir varsayılan hız belirleyin (örn. YouTube 1.5×, Udemy 1.25×).",
      siteSpeedDomainPlaceholder: "Örn: youtube.com, udemy.com",
      blacklistTitle: "Alan Adı Kara Listesi",
      blacklistPlaceholder: "Örn: netflix.com",
      add: "Ekle",
      saveForSite: "Kaydet",
      savedForSite: "Kaydedildi",
      saveSiteSpeedTooltip: "Mevcut hızı bu site için varsayılan olarak kaydet",
      backupTitle: "Yedekleme & Sıfırlama",
      exportSettings: "Ayarları Dışa Aktar (JSON)",
      importSettings: "Ayarları İçe Aktar",
      resetAll: "Fabrika Ayarlarına Dön",
      shortcutSlower: "Hızı Yavaşlat",
      shortcutFaster: "Hızı Artır",
      shortcutReset: "Hızı Sıfırla (1.0x)",
      shortcutToggleFast: "Hızlı Hıza Geç / Dön",
      shortcutRewind: "Geri Sar",
      shortcutForward: "İleri Sar",
      shortcutToggleOverlay: "Paneli Gizle / Göster",
      shortcutMute: "Sesi Kapat / Aç",
      dragHandleTooltip: "Taşımak için sürükleyin",
      resetTooltip: "Sıfırla",
      normalSpeedTooltip: "Normal Hız",
      hideOverlayTooltip: "Göstergeyi Gizle",
      mutedToast: "Sessiz",
      unmutedToast: "Ses Açık",
      savedToast: "Kaydedildi",
      shortcutsResetToast: "Kısayollar varsayılana sıfırlandı",
      factoryResetToast: "Fabrika ayarlarına dönüldü",
      settingsExportedToast: "Ayarlar indirildi",
      settingsImportedToast: "Ayarlar başarıyla yüklendi",
      invalidFileToast: "Geçersiz ayar dosyası formatı",
      popupFooterHint: "Kısayollar: D / S (Hız) • R (1×) • G (Hızlı) • L (A-B)",
      stepDownTooltip: "Yavaşlat (-0.1)",
      stepResetTooltip: "Normal Hız (1.0×)",
      stepUpTooltip: "Hızlandır (+0.1)",
      rewind10Tooltip: "10 Saniye Geri",
      forward10Tooltip: "10 Saniye İleri",
      customPresetsTitle: "Hazır Hız Butonları",
      customPresetsHint: "Açılır menüde (popup) gösterilen hazır hız butonlarını özelleştirin",
      addPreset: "Hız Ekle",
      resetPresets: "Varsayılanlara Sıfırla",
      invalidPresetToast: "0.1 ile 16 arasında geçerli bir hız değeri girin",
      mouseWheelSpeed: "Fare Tekerleğiyle Hız Ayarı",
      mouseWheelSpeedHint: "Video üstündeki kapsülün üzerindeyken fare tekerleğini çevirerek hızı değiştirin",
      timeSavedTitle: "Kazanılan Zaman",
      timeSavedWeeklyLabel: "Bu hafta kazanılan:",
      timeSavedTodayLabel: "Bugün kazanılan:",
      timeSavedTotalLabel: "Toplam kazanılan:",
      timeSavedSuffix: "kazandın 🚀",
      resetStats: "İstatistikleri Sıfırla",
      statsResetToast: "Zaman istatistikleri sıfırlandı",
      abLoopTitle: "A-B Döngüsü",
      abLoopSetA: "A Belirle",
      abLoopSetB: "B Belirle",
      abLoopClear: "Döngüyü Sıfırla",
      abLoopTooltip: "A-B Tekrar Döngüsü",
      shortcutAbLoop: "A-B Döngüsü (Belirle / Sıfırla)",
      globalShortcutsTitle: "Chrome Genel Kısayolları",
      globalShortcutsHint: "Sayfa odakta değilken bile video hızını değiştirin (chrome://extensions/shortcuts üzerinden düzenlenebilir)",
      openChromeShortcuts: "Genel Kısayolları Ayarla",
      chromeShortcutsCopied: "Kısayol ayar linki kopyalandı"
    }
  },

  /**
   * Initializes language based on preference or browser locale
   * @param {string} preferredLang - 'auto', 'en', or 'tr'
   */
  init(preferredLang = 'auto') {
    if (preferredLang && preferredLang !== 'auto' && this.MESSAGES[preferredLang]) {
      this.currentLang = preferredLang;
      return;
    }

    // Detect browser/UI language
    const uiLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage)
      ? chrome.i18n.getUILanguage()
      : (navigator.language || navigator.userLanguage || 'en');

    if (uiLang.toLowerCase().startsWith('tr')) {
      this.currentLang = 'tr';
    } else {
      this.currentLang = 'en';
    }
  },

  /**
   * Returns translated string for key
   */
  t(key, fallback = '') {
    // If chrome.i18n has it and language matches browser locale
    const dict = this.MESSAGES[this.currentLang] || this.MESSAGES.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const msg = chrome.i18n.getMessage(key);
      if (msg) return msg;
    }
    return fallback || key;
  },

  /**
   * Automatically translates all elements in document/root containing data-i18n attributes
   */
  applyToDOM(root = document) {
    // text / innerHTML
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const text = this.t(key);
      if (text) {
        el.textContent = text;
      }
    });

    // title attribute
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      const text = this.t(key);
      if (text) {
        el.setAttribute('title', text);
      }
    });

    // placeholder attribute
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const text = this.t(key);
      if (text) {
        el.setAttribute('placeholder', text);
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18n };
} else {
  window.I18n = I18n;
}

