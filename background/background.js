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
            showOverlay: true,
            showHud: true,
            overlayOpacityIdle: 0.35,
            overlayOpacityHover: 1.0,
            autoHideDelay: 2.0,
            overlayPosition: 'top-left',
            customPosition: { top: 16, left: 16 },
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
            blacklist: []
          }
        }, () => {
          console.log('[Pacelet] Default settings initialized.');
        });
      }
    });
  }
});

// Update badge if requested
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge' && sender.tab) {
    const tabId = sender.tab.id;
    const text = request.speed && request.speed !== 1.0 ? `${request.speed.toFixed(1)}x` : '';
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#38bdf8' });
    sendResponse({ success: true });
  }
  return true;
});
