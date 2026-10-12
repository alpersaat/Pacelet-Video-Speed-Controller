/**
 * Pacelet — Video Speed Controller
 * Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.get(['paceletSettings', 'hizKontrolSettings'], (result) => {
      if (!result?.paceletSettings && !result?.hizKontrolSettings) {
        chrome.storage.sync.set({
          paceletSettings: {
            version: 1,
            enabled: true,
            defaultSpeed: 1.0,
            speedStep: 0.1,
            fastSpeed: 1.8,
            rewindStep: 10,
            forwardStep: 10,
            rememberSpeed: false,
            preservesPitch: true,
            siteSpeeds: {},
            rememberSiteSpeed: true,
            preventSiteOverride: true,
            showBadge: true,
            showOverlay: true,
            showHud: true,
            mouseWheelSpeed: true,
            overlayOpacityIdle: 0.35,
            overlayOpacityHover: 1.0,
            autoHideDelay: 2.0,
            overlayPosition: 'top-left',
            customPosition: { top: 16, left: 16 },
            customPresets: [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0],
            timeStats: {
              totalSecondsSaved: 0,
              todaySecondsSaved: 0,
              thisWeekSecondsSaved: 0,
              lastDate: '',
              lastWeek: ''
            },
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
            blacklist: []
          }
        }, () => {
          console.log('[Pacelet] Default settings initialized.');
        });
      }
    });
  }
});

// Global Shortcuts (chrome.commands)
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'chromeCommand',
        command: command
      }, () => {
        if (chrome.runtime.lastError) {
          // Tab may not have content script running (e.g. chrome:// internal pages)
        }
      });
    }
  } catch (err) {
    console.warn('[Pacelet] Command handling error:', err);
  }
});

// Update badge if requested
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    if (tabId) {
      if (request.showBadge === false) {
        chrome.action.setBadgeText({ tabId, text: '' });
      } else {
        const speed = request.speed;
        let text = '';
        if (typeof speed === 'number' && Math.abs(speed - 1.0) >= 0.01) {
          const rounded = Math.round(speed * 100) / 100;
          text = rounded >= 10 ? `${Math.round(rounded)}` : `${rounded}`.slice(0, 4);
        }
        chrome.action.setBadgeText({ tabId, text });
        chrome.action.setBadgeBackgroundColor({ tabId, color: '#0284c7' });
        if (chrome.action.setBadgeTextColor) {
          chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
        }
      }
      sendResponse({ success: true });
    }
    return true;
  }
  return true;
});
