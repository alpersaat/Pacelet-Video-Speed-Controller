/**
 * Pacelet — Options Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  let settings = await StorageManager.getSettings();
  let recordingActionKey = null;

  // Initialize Language
  if (typeof I18n !== 'undefined') {
    I18n.init(settings.language || 'auto');
    I18n.applyToDOM(document);
  }

  // DOM Elements
  const langSelect = document.getElementById('language');
  const idleRange = document.getElementById('overlayOpacityIdle');
  const idleVal = document.getElementById('idleOpacityVal');
  const blacklistInput = document.getElementById('blacklistInput');
  const btnAddBlacklist = document.getElementById('btnAddBlacklist');
  const blacklistChips = document.getElementById('blacklistChips');
  const siteSpeedDomainInput = document.getElementById('siteSpeedDomainInput');
  const siteSpeedValInput = document.getElementById('siteSpeedValInput');
  const btnAddSiteSpeed = document.getElementById('btnAddSiteSpeed');
  const siteSpeedsContainer = document.getElementById('siteSpeedsContainer');
  const shortcutsContainer = document.getElementById('shortcutsContainer');
  const btnResetShortcuts = document.getElementById('btnResetShortcuts');
  const btnExportSettings = document.getElementById('btnExportSettings');
  const importFileInput = document.getElementById('importFileInput');
  const btnResetAll = document.getElementById('btnResetAll');
  const toastEl = document.getElementById('hkToast');

  // Custom Presets Elements
  const presetValInput = document.getElementById('presetValInput');
  const btnAddPreset = document.getElementById('btnAddPreset');
  const btnResetPresets = document.getElementById('btnResetPresets');
  const presetChipsContainer = document.getElementById('presetChipsContainer');

  // Time Stats Elements
  const statsWeekVal = document.getElementById('statsWeekVal');
  const statsTodayVal = document.getElementById('statsTodayVal');
  const statsTotalVal = document.getElementById('statsTotalVal');
  const btnResetStats = document.getElementById('btnResetStats');

  // Global Shortcuts Config Button
  const btnConfigureGlobalShortcuts = document.getElementById('btnConfigureGlobalShortcuts');

  // Populate fields
  populateFormFields();
  renderShortcuts();
  renderBlacklist();
  renderSiteSpeeds();
  renderPresets();
  renderTimeStats();

  // General Settings
  bindAutoSave('defaultSpeed', 'number');
  bindAutoSave('speedStep', 'float');
  bindAutoSave('fastSpeed', 'number');
  bindAutoSave('rewindStep', 'number');
  bindAutoSave('preservesPitch', 'checkbox');
  bindAutoSave('rememberSiteSpeed', 'checkbox');
  bindAutoSave('preventSiteOverride', 'checkbox');
  bindAutoSave('rememberSpeed', 'checkbox');

  // Display Settings
  bindAutoSave('showBadge', 'checkbox');
  bindAutoSave('showOverlay', 'checkbox');
  bindAutoSave('hideInFullscreen', 'checkbox');
  bindAutoSave('mouseWheelSpeed', 'checkbox');
  bindAutoSave('autoHideDelay', 'float');

  // Language change
  if (langSelect) {
    langSelect.value = settings.language || 'auto';
    langSelect.addEventListener('change', () => {
      settings.language = langSelect.value;
      I18n.init(settings.language);
      I18n.applyToDOM(document);
      renderShortcuts();
      saveAndNotify();
    });
  }

  if (idleRange) {
    idleRange.addEventListener('input', () => {
      const val = parseFloat(idleRange.value);
      if (idleVal) idleVal.textContent = `%${Math.round(val * 100)}`;
      settings.overlayOpacityIdle = val;
      saveAndNotify();
    });
  }

  // Reset Shortcuts
  btnResetShortcuts.addEventListener('click', () => {
    const confirmMsg = I18n.currentLang === 'tr'
      ? 'Klavye kısayollarını varsayılan değerlere sıfırlamak istiyor musunuz?'
      : 'Reset keyboard shortcuts to default values?';
    if (confirm(confirmMsg)) {
      settings.shortcuts = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.shortcuts));
      saveAndNotify();
      renderShortcuts();
      showToast(I18n.t('shortcutsResetToast', 'Shortcuts reset to defaults'));
    }
  });

  // Blacklist
  function addBlacklistDomain() {
    let domain = blacklistInput.value.trim().toLowerCase();
    if (!domain) return;

    try {
      if (!domain.startsWith('http')) domain = 'http://' + domain;
      const parsed = new URL(domain);
      domain = parsed.hostname;
    } catch (e) {}

    domain = domain.replace(/^www\./, '');

    if (!settings.blacklist.includes(domain)) {
      settings.blacklist.push(domain);
      saveAndNotify();
      renderBlacklist();
      showToast(`${domain} +`);
    }
    blacklistInput.value = '';
  }

  btnAddBlacklist.addEventListener('click', addBlacklistDomain);
  blacklistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBlacklistDomain();
    }
  });

  // Site-Specific Speeds
  function addSiteSpeedProfile() {
    if (!siteSpeedDomainInput || !siteSpeedValInput) return;
    const rawDomain = siteSpeedDomainInput.value.trim();
    if (!rawDomain) return;

    const domain = StorageManager.cleanHostname(rawDomain);
    if (!domain) return;

    const speed = Math.min(16.0, Math.max(0.05, Math.round(parseFloat(siteSpeedValInput.value || 1.0) * 100) / 100));

    if (!settings.siteSpeeds) settings.siteSpeeds = {};
    settings.siteSpeeds[domain] = speed;

    saveAndNotify();
    renderSiteSpeeds();
    showToast(`${domain} (${speed.toFixed(2)}×) +`);

    siteSpeedDomainInput.value = '';
    siteSpeedValInput.value = '1.50';
  }

  if (btnAddSiteSpeed) {
    btnAddSiteSpeed.addEventListener('click', addSiteSpeedProfile);
  }
  if (siteSpeedDomainInput) {
    siteSpeedDomainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSiteSpeedProfile();
      }
    });
  }

  // Export Settings
  btnExportSettings.addEventListener('click', () => {
    const exportPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      paceletSettings: settings
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `pacelet-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(I18n.t('settingsExportedToast', 'Settings downloaded'));
  });

  // Import Settings
  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let imported = JSON.parse(event.target.result);
        if (typeof imported === 'object' && imported !== null) {
          if (imported.paceletSettings && typeof imported.paceletSettings === 'object') {
            imported = imported.paceletSettings;
          }
          settings = await StorageManager.saveSettings(imported);
          if (settings.language) {
            I18n.init(settings.language);
            I18n.applyToDOM(document);
          }
          populateFormFields();
          renderShortcuts();
          renderBlacklist();
          renderSiteSpeeds();
          renderPresets();
          renderTimeStats();
          showToast(I18n.t('settingsImportedToast', 'Settings successfully imported'));
          notifyTabs();
        } else {
          showToast(I18n.t('invalidFileToast', 'Invalid settings file format'));
        }
      } catch (err) {
        showToast(I18n.t('invalidFileToast', 'Invalid settings file format'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Factory Reset
  btnResetAll.addEventListener('click', async () => {
    const confirmMsg = I18n.currentLang === 'tr'
      ? 'Tüm ayarlar ve kısayollar ilk kurulum haline sıfırlansın mı?'
      : 'Reset all settings and shortcuts to initial installation defaults?';
    if (confirm(confirmMsg)) {
      settings = await StorageManager.resetToDefaults();
      if (settings.language) {
        I18n.init(settings.language);
        I18n.applyToDOM(document);
      }
      populateFormFields();
      renderShortcuts();
      renderBlacklist();
      renderSiteSpeeds();
      renderPresets();
      renderTimeStats();
      showToast(I18n.t('factoryResetToast', 'Reset to factory defaults'));
      notifyTabs();
    }
  });

  /**
   * Populate form fields
   */
  function populateFormFields() {
    if (langSelect) langSelect.value = settings.language || 'auto';
    document.getElementById('defaultSpeed').value = settings.defaultSpeed || 1.0;
    document.getElementById('speedStep').value = String(settings.speedStep || 0.1);
    document.getElementById('fastSpeed').value = settings.fastSpeed || 1.8;
    document.getElementById('rewindStep').value = String(settings.rewindStep || 10);
    document.getElementById('preservesPitch').checked = settings.preservesPitch !== false;
    document.getElementById('rememberSiteSpeed').checked = settings.rememberSiteSpeed !== false;
    document.getElementById('preventSiteOverride').checked = settings.preventSiteOverride !== false;
    document.getElementById('rememberSpeed').checked = !!settings.rememberSpeed;

    document.getElementById('showBadge').checked = settings.showBadge !== false;
    document.getElementById('showOverlay').checked = settings.showOverlay !== false;
    const hideInFsEl = document.getElementById('hideInFullscreen');
    if (hideInFsEl) hideInFsEl.checked = !!settings.hideInFullscreen;
    document.getElementById('mouseWheelSpeed').checked = settings.mouseWheelSpeed !== false;
    document.getElementById('autoHideDelay').value = String(settings.autoHideDelay || 2.0);

    const idleValNum = settings.overlayOpacityIdle !== undefined ? settings.overlayOpacityIdle : 0.35;
    if (idleRange) idleRange.value = idleValNum;
    if (idleVal) idleVal.textContent = `%${Math.round(idleValNum * 100)}`;
  }

  /**
   * Render Shortcuts
   */
  function renderShortcuts() {
    shortcutsContainer.innerHTML = '';
    const shortcuts = settings.shortcuts || DEFAULT_SETTINGS.shortcuts;

    const actionKeyToI18n = {
      slower: 'shortcutSlower',
      faster: 'shortcutFaster',
      reset: 'shortcutReset',
      toggleFast: 'shortcutToggleFast',
      rewind: 'shortcutRewind',
      forward: 'shortcutForward',
      toggleOverlay: 'shortcutToggleOverlay',
      mute: 'shortcutMute',
      abLoop: 'shortcutAbLoop'
    };

    Object.keys(shortcuts).forEach(actionKey => {
      const item = shortcuts[actionKey];
      const div = document.createElement('div');
      div.className = 'hk-shortcut-item';

      const label = document.createElement('span');
      label.className = 'hk-shortcut-name';
      const i18nKey = actionKeyToI18n[actionKey];
      label.textContent = i18nKey ? I18n.t(i18nKey, item.label || actionKey) : (item.label || actionKey);

      const kbd = document.createElement('button');
      kbd.className = 'hk-kbd-btn';
      kbd.textContent = formatKeyDisplay(item.key);
      kbd.title = I18n.currentLang === 'tr' ? 'Değiştirmek için tıkla' : 'Click to change hotkey';

      kbd.addEventListener('click', () => {
        startRecordingKey(actionKey, kbd);
      });

      div.appendChild(label);
      div.appendChild(kbd);
      shortcutsContainer.appendChild(div);
    });
  }

  /**
   * Hotkey Recording
   */
  function startRecordingKey(actionKey, kbdBtn) {
    if (recordingActionKey) return;
    recordingActionKey = actionKey;

    kbdBtn.classList.add('recording');
    kbdBtn.textContent = '...';

    const onKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      if (e.key === 'Escape') {
        cleanup();
        renderShortcuts();
        return;
      }

      let newKey = e.key.toLowerCase();
      if (newKey === ' ') newKey = 'Space';

      settings.shortcuts[actionKey].key = newKey;
      saveAndNotify();

      cleanup();
      renderShortcuts();
      showToast(`${newKey.toUpperCase()}`);
    };

    const cleanup = () => {
      recordingActionKey = null;
      document.removeEventListener('keydown', onKeyDown, true);
    };

    document.addEventListener('keydown', onKeyDown, true);
  }

  function formatKeyDisplay(key) {
    if (!key) return '-';
    if (key === ' ' || key.toLowerCase() === 'space') return 'Space';
    return key.toUpperCase();
  }

  /**
   * Render Blacklist
   */
  function renderBlacklist() {
    blacklistChips.innerHTML = '';
    const list = settings.blacklist || [];

    if (list.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'hk-empty-hint';
      empty.textContent = I18n.currentLang === 'tr' ? 'Henüz eklenmiş site yok.' : 'No blacklisted domains yet.';
      blacklistChips.appendChild(empty);
      return;
    }

    list.forEach(domain => {
      const chip = document.createElement('div');
      chip.className = 'hk-chip';

      const text = document.createElement('span');
      text.textContent = domain;

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '&times;';
      removeBtn.title = I18n.currentLang === 'tr' ? 'Kaldır' : 'Remove';
      removeBtn.addEventListener('click', () => {
        settings.blacklist = settings.blacklist.filter(d => d !== domain);
        saveAndNotify();
        renderBlacklist();
        showToast(`${domain} -`);
      });

      chip.appendChild(text);
      chip.appendChild(removeBtn);
      blacklistChips.appendChild(chip);
    });
  }

  /**
   * Render Site-Specific Speeds
   */
  function renderSiteSpeeds() {
    if (!siteSpeedsContainer) return;
    siteSpeedsContainer.innerHTML = '';
    const siteSpeeds = settings.siteSpeeds || {};
    const domains = Object.keys(siteSpeeds);

    if (domains.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'hk-no-chips';
      empty.textContent = I18n.currentLang === 'tr'
        ? 'Henüz site bazlı hız profili eklenmedi.'
        : 'No site-specific speed profiles yet.';
      siteSpeedsContainer.appendChild(empty);
      return;
    }

    domains.forEach(domain => {
      const speed = siteSpeeds[domain];
      const chip = document.createElement('div');
      chip.className = 'hk-site-chip';

      const domainSpan = document.createElement('span');
      domainSpan.className = 'hk-site-chip-domain';
      domainSpan.textContent = domain;

      const speedSpan = document.createElement('span');
      speedSpan.className = 'hk-site-chip-speed';
      speedSpan.textContent = `${Number(speed).toFixed(2)}×`;

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '&times;';
      removeBtn.title = I18n.currentLang === 'tr' ? 'Kaldır' : 'Remove';
      removeBtn.addEventListener('click', () => {
        delete settings.siteSpeeds[domain];
        saveAndNotify();
        renderSiteSpeeds();
        showToast(`${domain} -`);
      });

      chip.appendChild(domainSpan);
      chip.appendChild(speedSpan);
      chip.appendChild(removeBtn);
      siteSpeedsContainer.appendChild(chip);
    });
  }

  // Custom Presets
  function renderPresets() {
    if (!presetChipsContainer) return;
    presetChipsContainer.innerHTML = '';
    const presets = settings.customPresets || DEFAULT_SETTINGS.customPresets;

    presets.forEach(speed => {
      const chip = document.createElement('div');
      chip.className = 'hk-site-chip';

      const speedSpan = document.createElement('span');
      speedSpan.className = 'hk-site-chip-speed';
      speedSpan.textContent = `${Number(speed).toFixed(2).replace(/0$/, '')}×`;

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '&times;';
      removeBtn.title = I18n.currentLang === 'tr' ? 'Kaldır' : 'Remove';
      removeBtn.addEventListener('click', () => {
        if (settings.customPresets.length <= 1) {
          showToast(I18n.currentLang === 'tr' ? 'En az bir hazır hız bulunmalıdır.' : 'At least one preset must remain.');
          return;
        }
        settings.customPresets = settings.customPresets.filter(s => Math.abs(s - speed) >= 0.01);
        saveAndNotify();
        renderPresets();
        showToast(`${speed}× -`);
      });

      chip.appendChild(speedSpan);
      chip.appendChild(removeBtn);
      presetChipsContainer.appendChild(chip);
    });
  }

  function addPreset() {
    if (!presetValInput) return;
    const val = Math.round(parseFloat(presetValInput.value || 0) * 100) / 100;
    if (isNaN(val) || val < 0.1 || val > 16) {
      showToast(I18n.t('invalidPresetToast', 'Enter a valid speed between 0.1 and 16'));
      return;
    }

    if (!Array.isArray(settings.customPresets)) {
      settings.customPresets = [...DEFAULT_SETTINGS.customPresets];
    }

    if (!settings.customPresets.some(s => Math.abs(s - val) < 0.01)) {
      settings.customPresets.push(val);
      settings.customPresets.sort((a, b) => a - b);
      saveAndNotify();
      renderPresets();
      showToast(`${val}× +`);
    }
    presetValInput.value = '1.20';
  }

  if (btnAddPreset) btnAddPreset.addEventListener('click', addPreset);
  if (presetValInput) {
    presetValInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addPreset();
      }
    });
  }

  if (btnResetPresets) {
    btnResetPresets.addEventListener('click', () => {
      const confirmMsg = I18n.currentLang === 'tr'
        ? 'Hazır hız butonlarını varsayılan değerlere sıfırlamak istiyor musunuz?'
        : 'Reset preset speeds to default list?';
      if (confirm(confirmMsg)) {
        settings.customPresets = [...DEFAULT_SETTINGS.customPresets];
        saveAndNotify();
        renderPresets();
        showToast(I18n.t('savedToast', 'Saved'));
      }
    });
  }

  // Time Saved Statistics
  function renderTimeStats() {
    if (!statsWeekVal || !statsTodayVal || !statsTotalVal) return;
    const stats = settings.timeStats || { totalSecondsSaved: 0, todaySecondsSaved: 0, thisWeekSecondsSaved: 0 };
    const lang = settings.language === 'en' ? 'en' : (I18n.currentLang || 'tr');

    statsWeekVal.textContent = StorageManager.formatDuration(stats.thisWeekSecondsSaved, lang);
    statsTodayVal.textContent = StorageManager.formatDuration(stats.todaySecondsSaved, lang);
    statsTotalVal.textContent = StorageManager.formatDuration(stats.totalSecondsSaved, lang);
  }

  if (btnResetStats) {
    btnResetStats.addEventListener('click', async () => {
      const confirmMsg = I18n.currentLang === 'tr'
        ? 'Kaydedilen zaman istatistikleri sıfırlansın mı?'
        : 'Reset saved time statistics to zero?';
      if (confirm(confirmMsg)) {
        const newStats = await StorageManager.resetTimeStats();
        settings.timeStats = newStats;
        renderTimeStats();
        showToast(I18n.t('statsResetToast', 'Time statistics reset'));
      }
    });
  }

  // Global Shortcuts Config Link
  if (btnConfigureGlobalShortcuts) {
    btnConfigureGlobalShortcuts.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {
          copyShortcutsLink();
        });
      } else {
        copyShortcutsLink();
      }
    });
  }

  function copyShortcutsLink() {
    navigator.clipboard.writeText('chrome://extensions/shortcuts').then(() => {
      showToast(I18n.t('chromeShortcutsCopied', 'Shortcut settings link copied'));
    }).catch(() => {
      prompt(I18n.t('globalShortcutsHint', 'Open in Chrome:'), 'chrome://extensions/shortcuts');
    });
  }

  function bindAutoSave(elementId, type) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.addEventListener('change', () => {
      let val;
      if (type === 'checkbox') val = el.checked;
      else if (type === 'float') val = parseFloat(el.value);
      else if (type === 'number') val = parseFloat(el.value);
      else val = el.value;

      settings[elementId] = val;
      saveAndNotify();
    });
  }

  async function saveAndNotify() {
    await StorageManager.saveSettings(settings);
    notifyTabs();
    showToast(I18n.t('savedToast', 'Saved'));
  }

  function notifyTabs() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        });
      });
    }
  }

  let toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1800);
  }
});
