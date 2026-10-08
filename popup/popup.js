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
  const presetButtons = document.querySelectorAll('.hk-preset-btn');

  let activeTab = null;
  let currentSettings = null;
  let currentHost = '';
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

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      try {
        const url = new URL(activeTab.url);
        currentHost = url.hostname;
      } catch (e) {
        currentHost = '';
      }
    }
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

  // Preset buttons
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSpeed = parseFloat(btn.dataset.speed);
      applySpeed(targetSpeed);
    });
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
      } else if (retryCount > 0) {
        setTimeout(() => checkTabState(retryCount - 1), 150);
      } else {
        setOfflineState(I18n.t('videoNotFound', 'No Video Found'));
        updateSpeedUI(1.0);
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
  }

  function updateSpeedUI(speed) {
    currentSpeed = speed;
    speedDisplay.innerHTML = `${speed.toFixed(2)}<small>×</small>`;
    speedSlider.value = Math.min(4.0, Math.max(0.25, speed));

    presetButtons.forEach(btn => {
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
