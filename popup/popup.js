/**
 * Pacelet — Popup Logic
 * Communicates with active tab video and provides quick adjustments.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const speedDisplay = document.getElementById('speedDisplay');
  const speedSlider = document.getElementById('speedSlider');
  const mediaStatus = document.getElementById('mediaStatus');
  const btnOptions = document.getElementById('btnOptions');
  const btnStepDown = document.getElementById('btnStepDown');
  const btnStepReset = document.getElementById('btnStepReset');
  const btnStepUp = document.getElementById('btnStepUp');
  const btnRewind = document.getElementById('btnRewind');
  const btnForward = document.getElementById('btnForward');
  const siteToggleSwitch = document.getElementById('siteToggleSwitch');
  const siteToggleLabel = document.getElementById('siteToggleLabel');
  const presetGrid = document.getElementById('presetGrid');
  const siteDomainLabel = document.getElementById('siteDomainLabel');
  const siteSpeedValue = document.getElementById('siteSpeedValue');
  const btnSaveSiteSpeed = document.getElementById('btnSaveSiteSpeed');
  const btnSaveSiteSpeedText = document.getElementById('btnSaveSiteSpeedText');

  // A-B Loop Elements
  const abLoopStatus = document.getElementById('abLoopStatus');
  const btnSetA = document.getElementById('btnSetA');
  const btnSetB = document.getElementById('btnSetB');
  const btnClearLoop = document.getElementById('btnClearLoop');

  // Time Stats Elements
  const statsWeeklySaved = document.getElementById('statsWeeklySaved');
  const statsTotalSaved = document.getElementById('statsTotalSaved');

  let activeTab = null;
  let currentSettings = null;
  let currentHost = '';
  let cleanHost = '';
  let currentSpeed = 1.0;

  // Load settings & active tab
  if (typeof StorageManager !== 'undefined') {
    currentSettings = await StorageManager.getSettings();
  }

  // Initialize Language
  if (typeof I18n !== 'undefined') {
    I18n.init(currentSettings?.language || 'auto');
    I18n.applyToDOM(document);
  }

  // Render dynamic presets
  renderPresetButtons();

  // Render Time Saved Statistics
  renderTimeStats();

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      try {
        const url = new URL(activeTab.url);
        currentHost = url.hostname;
        cleanHost = typeof StorageManager !== 'undefined'
          ? StorageManager.cleanHostname(currentHost)
          : currentHost.replace(/^www\./, '');
      } catch (e) {
        currentHost = '';
        cleanHost = '';
      }
    }
  }

  if (siteDomainLabel) {
    siteDomainLabel.textContent = cleanHost || 'Site';
    siteDomainLabel.title = currentHost;
  }

  // Query state
  checkTabState();

  // Settings button
  btnOptions.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/options.html');
    }
  });

  // Speed slider
  speedSlider.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    applySpeed(speed);
  });

  // Fine stepper buttons
  btnStepDown.addEventListener('click', () => {
    const step = (currentSettings && currentSettings.speedStep) || 0.1;
    applySpeed(Math.max(0.05, currentSpeed - step));
  });

  btnStepReset.addEventListener('click', () => {
    applySpeed(1.0);
  });

  btnStepUp.addEventListener('click', () => {
    const step = (currentSettings && currentSettings.speedStep) || 0.1;
    applySpeed(Math.min(16.0, currentSpeed + step));
  });

  // Seek buttons
  btnRewind.addEventListener('click', () => {
    const sec = (currentSettings && currentSettings.rewindStep) || 10;
    sendTabMessage({ action: 'seek', seconds: -sec });
  });

  btnForward.addEventListener('click', () => {
    const sec = (currentSettings && currentSettings.forwardStep) || 10;
    sendTabMessage({ action: 'seek', seconds: sec });
  });

  // A-B Loop Buttons
  if (btnSetA) {
    btnSetA.addEventListener('click', () => {
      sendTabMessage({ action: 'setABPoint', pointType: 'A' }, (res) => {
        if (res && res.abLoop) {
          updateABUI(res.abLoop);
        } else {
          checkTabState();
        }
      });
    });
  }

  if (btnSetB) {
    btnSetB.addEventListener('click', () => {
      sendTabMessage({ action: 'setABPoint', pointType: 'B' }, (res) => {
        if (res && res.abLoop) {
          updateABUI(res.abLoop);
        } else {
          checkTabState();
        }
      });
    });
  }

  if (btnClearLoop) {
    btnClearLoop.addEventListener('click', () => {
      sendTabMessage({ action: 'setABPoint', pointType: 'clear' }, (res) => {
        if (res && res.abLoop) {
          updateABUI(res.abLoop);
        } else {
          checkTabState();
        }
      });
    });
  }

  // Blacklist toggle
  if (siteToggleSwitch) {
    siteToggleSwitch.addEventListener('change', async () => {
      if (!currentHost || !currentSettings) return;

      let blacklist = currentSettings.blacklist || [];
      const enable = siteToggleSwitch.checked;

      if (enable) {
        blacklist = blacklist.filter(item => item !== currentHost);
        siteToggleLabel.textContent = I18n.t('siteActive', 'Site Active');
      } else {
        if (!blacklist.includes(currentHost)) blacklist.push(currentHost);
        siteToggleLabel.textContent = I18n.t('siteDisabled', 'Site Disabled');
      }

      currentSettings.blacklist = blacklist;
      await StorageManager.saveSettings(currentSettings);
      sendTabMessage({ action: 'settingsUpdated' });
      checkTabState();
    });
  }

  // Save current speed for this site
  if (btnSaveSiteSpeed) {
    btnSaveSiteSpeed.addEventListener('click', async () => {
      if (!cleanHost || !currentSettings) return;

      if (!currentSettings.siteSpeeds) currentSettings.siteSpeeds = {};
      const existing = StorageManager.getSiteSpeed(cleanHost, currentSettings.siteSpeeds);

      if (existing !== null && Math.abs(existing - currentSpeed) < 0.01) {
        // Toggle off / remove custom site speed
        delete currentSettings.siteSpeeds[cleanHost];
        await StorageManager.saveSettings(currentSettings);
        sendTabMessage({ action: 'setSiteSpeed', speed: null });
        updateSiteSpeedDisplay(null);
      } else {
        // Save current speed for site
        currentSettings.siteSpeeds[cleanHost] = currentSpeed;
        await StorageManager.saveSettings(currentSettings);
        sendTabMessage({ action: 'setSiteSpeed', speed: currentSpeed });
        updateSiteSpeedDisplay(currentSpeed);
      }
      sendTabMessage({ action: 'settingsUpdated' });
    });
  }

  /**
   * Renders customizable preset speed buttons dynamically
   */
  function renderPresetButtons() {
    if (!presetGrid) return;
    presetGrid.innerHTML = '';
    const presets = (currentSettings && Array.isArray(currentSettings.customPresets) && currentSettings.customPresets.length > 0)
      ? currentSettings.customPresets
      : (DEFAULT_SETTINGS.customPresets || [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]);

    presets.forEach(speed => {
      const btn = document.createElement('button');
      btn.className = 'hk-preset-btn';
      btn.dataset.speed = String(speed);
      const label = speed % 1 === 0 ? `${speed.toFixed(0)}×` : `${speed.toFixed(2).replace(/0$/, '')}×`;
      btn.textContent = label;

      btn.addEventListener('click', () => {
        applySpeed(speed);
      });

      presetGrid.appendChild(btn);
    });
  }

  /**
   * Renders Time Saved Statistics
   */
  function renderTimeStats() {
    if (!statsWeeklySaved || !statsTotalSaved) return;
    const stats = currentSettings?.timeStats || { totalSecondsSaved: 0, thisWeekSecondsSaved: 0 };
    const lang = (I18n && I18n.currentLang) || 'tr';

    const weeklyFormatted = StorageManager.formatDuration(stats.thisWeekSecondsSaved, lang);
    const totalFormatted = StorageManager.formatDuration(stats.totalSecondsSaved, lang);

    const suffix = typeof I18n !== 'undefined' ? I18n.t('timeSavedSuffix', 'saved 🚀') : 'saved 🚀';
    statsWeeklySaved.textContent = `${weeklyFormatted} ${suffix}`;
    const totalPrefix = typeof I18n !== 'undefined' ? I18n.t('timeSavedTotalLabel', 'Total:') : 'Total:';
    statsTotalSaved.textContent = `${totalPrefix} ${totalFormatted}`;
  }

  /**
   * Formats seconds into MM:SS or H:MM:SS
   */
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}:${String(remM).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Updates A-B loop status badge and button styling
   */
  function updateABUI(abLoop) {
    if (!abLoopStatus) return;
    if (btnSetA) btnSetA.classList.remove('pending');
    if (btnSetB) btnSetB.classList.remove('active');
    abLoopStatus.classList.remove('pending', 'active');

    if (abLoop && abLoop.active && abLoop.start !== null && abLoop.end !== null) {
      abLoopStatus.textContent = `${formatTime(abLoop.start)} → ${formatTime(abLoop.end)}`;
      abLoopStatus.classList.add('active');
      if (btnSetB) btnSetB.classList.add('active');
    } else if (abLoop && abLoop.start !== null && abLoop.end === null) {
      abLoopStatus.textContent = `A: ${formatTime(abLoop.start)} ...`;
      abLoopStatus.classList.add('pending');
      if (btnSetA) btnSetA.classList.add('pending');
    } else {
      abLoopStatus.textContent = I18n.currentLang === 'tr' ? 'Kapalı' : 'Off';
    }
  }

  /**
   * Updates site speed badge in popup
   */
  function updateSiteSpeedDisplay(speed) {
    if (!siteSpeedValue || !btnSaveSiteSpeed) return;
    if (speed !== null && speed !== undefined) {
      siteSpeedValue.textContent = `${speed.toFixed(2)}×`;
      btnSaveSiteSpeed.classList.add('saved');
      if (btnSaveSiteSpeedText) {
        btnSaveSiteSpeedText.textContent = I18n.t('savedForSite', 'Saved');
      }
    } else {
      const fallback = (currentSettings && currentSettings.defaultSpeed) || 1.0;
      siteSpeedValue.textContent = `${fallback.toFixed(2)}×`;
      btnSaveSiteSpeed.classList.remove('saved');
      if (btnSaveSiteSpeedText) {
        btnSaveSiteSpeedText.textContent = I18n.t('saveForSite', 'Save');
      }
    }
  }

  /**
   * Check video state in active tab
   */
  async function checkTabState(retryCount = 1) {
    if (!activeTab || !activeTab.id) {
      setOfflineState(I18n.t('videoNotFound', 'No Video Found'));
      return;
    }

    // Blacklist check
    const isBlacklisted = currentSettings && StorageManager.isHostBlacklisted(currentHost, currentSettings.blacklist);
    if (siteToggleSwitch) siteToggleSwitch.checked = !isBlacklisted;
    if (siteToggleLabel) {
      siteToggleLabel.textContent = isBlacklisted
        ? I18n.t('siteDisabled', 'Site Disabled')
        : I18n.t('siteActive', 'Site Active');
    }

    // Check site-specific speed
    const siteSpeed = cleanHost && currentSettings
      ? StorageManager.getSiteSpeed(cleanHost, currentSettings.siteSpeeds)
      : null;
    updateSiteSpeedDisplay(siteSpeed);

    if (isBlacklisted) {
      mediaStatus.textContent = I18n.t('siteDisabled', 'Disabled');
      mediaStatus.classList.add('hk-inactive');
      return;
    }

    sendTabMessage({ action: 'getState' }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        setOfflineState(I18n.t('videoNotFound', 'No Video Found'));
        return;
      }

      if (response && response.found) {
        mediaStatus.textContent = response.paused
          ? I18n.t('paused', 'Paused')
          : I18n.t('playing', 'Playing');
        mediaStatus.classList.remove('hk-inactive');
        updateSpeedUI(response.speed);
        if (response.siteSpeed !== undefined) {
          updateSiteSpeedDisplay(response.siteSpeed);
        }
        if (response.abLoop !== undefined) {
          updateABUI(response.abLoop);
        }
      } else if (retryCount > 0) {
        setTimeout(() => checkTabState(retryCount - 1), 150);
      } else {
        setOfflineState(I18n.t('videoNotFound', 'No Video Found'));
        updateSpeedUI(siteSpeed || (currentSettings && currentSettings.defaultSpeed) || 1.0);
      }
    });
  }

  function setOfflineState(text) {
    mediaStatus.textContent = text;
    mediaStatus.classList.add('hk-inactive');
  }

  function applySpeed(speed) {
    currentSpeed = Math.round(speed * 100) / 100;
    updateSpeedUI(currentSpeed);
    sendTabMessage({ action: 'setSpeed', speed: currentSpeed });

    // Auto-update site speed indicator if per-site memory is enabled
    if (currentSettings && currentSettings.rememberSiteSpeed !== false && cleanHost) {
      if (!currentSettings.siteSpeeds) currentSettings.siteSpeeds = {};
      currentSettings.siteSpeeds[cleanHost] = currentSpeed;
      updateSiteSpeedDisplay(currentSpeed);
    }
  }

  function updateSpeedUI(speed) {
    currentSpeed = speed;
    speedDisplay.innerHTML = `${speed.toFixed(2)}<small>×</small>`;
    speedSlider.value = Math.min(4.0, Math.max(0.25, speed));

    const btns = presetGrid ? presetGrid.querySelectorAll('.hk-preset-btn') : [];
    btns.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      if (Math.abs(btnSpeed - speed) < 0.02) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function sendTabMessage(message, callback) {
    if (activeTab && activeTab.id && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.sendMessage) {
      chrome.tabs.sendMessage(activeTab.id, message, (res) => {
        if (callback) callback(res);
      });
    }
  }
});
