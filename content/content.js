/**
 * Pacelet — Video Speed Controller
 * Content Script for HTML5 media elements with pitch preservation and Shadow DOM isolation.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__PACELET_INITIALIZED__ || window.__HIZ_KONTROL_INITIALIZED__) return;
  window.__PACELET_INITIALIZED__ = true;
  window.__HIZ_KONTROL_INITIALIZED__ = true;

  let currentSettings = null;
  const activeControllers = new Map(); // videoElement => VideoControllerInstance
  let lastSpeedBeforeFast = 1.0;

  // Minimalist, modern SVG simgeleri
  const ICONS = {
    drag: `<svg viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    rewind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>`,
    forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  /**
   * Araç çubuğu simgesindeki rozet hızını günceller
   */
  function updateBadge(speed) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateBadge',
        speed: typeof speed === 'number' ? speed : 1.0,
        showBadge: !currentSettings || currentSettings.showBadge !== false
      }, () => {
        if (chrome.runtime.lastError) { /* ignore */ }
      });
    }
  }

  /**
   * Ayarları yükle ve başlat
   */
  async function init() {
    currentSettings = await loadSettings();

    if (typeof I18n !== 'undefined') {
      I18n.init(currentSettings?.language || 'auto');
    }

    // Kara liste kontrolü
    if (isBlacklisted(window.location.hostname)) {
      return;
    }

    if (currentSettings && currentSettings.enabled === false) {
      return;
    }

    // Mevcut videoları tara
    scanForMedia(document);

    // Dinamik olarak sonradan eklenen videoları izle
    initObserver();

    // YouTube gibi tek sayfa (SPA) geçişlerini izle
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => scanForMedia(document), 200);
    });

    // Global klavye kısayollarını başlat
    initKeyboardShortcuts();

    // Mesajlaşma dinleyicisi (Popup ve Arka Plan için)
    initMessageListener();

    // Tam ekran değişikliklerini izle
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Sayfa kapandığında veya sekme arka plana geçtiğinde kaydedilen zamanı kaydet
    const flushAllTimeStats = () => {
      activeControllers.forEach(controller => {
        controller.tickSavedTime();
        controller.flushSavedTime();
      });
    };
    window.addEventListener('beforeunload', flushAllTimeStats);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushAllTimeStats();
    });
  }

  /**
   * Sayfadaki tüm medya öğelerini tarar
   */
  function scanForMedia(root) {
    if (!root) return;
    try {
      const mediaElements = root.querySelectorAll ? root.querySelectorAll('video, audio') : [];
      mediaElements.forEach(media => setupMediaController(media));

      // Shadow Root içlerini de tara
      const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      allElements.forEach(el => {
        if (el.shadowRoot) {
          scanForMedia(el.shadowRoot);
        }
      });
    } catch (e) {
      // Güvenlik kısıtlamalarını sessizce geç
    }
  }

  /**
   * Dinamik DOM değişikliklerini izler
   */
  function initObserver() {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && (node.matches('video') || node.matches('audio'))) {
              setupMediaController(node);
            } else if (node.querySelectorAll) {
              scanForMedia(node);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Bir video öğesi için kontrol panelini başlatır
   */
  function setupMediaController(media) {
    if (!media) return;
    if (activeControllers.has(media)) return;
    if (media.dataset && media.dataset.hizKontrolIgnored === 'true') return;

    // Çok küçük önizleme / reklam thumbnail'lerini filtrele
    if (media.classList && media.classList.contains('video-thumbnail')) return;

    const isAudio = media.tagName && media.tagName.toLowerCase() === 'audio';

    const controller = new VideoController(media, isAudio);
    activeControllers.set(media, controller);

    media.addEventListener('emptied', () => {
      // Bazı oynatıcılar kaynak yenilediğinde referansı koru
    });
  }

  /**
   * VideoController Sınıfı
   * Her video için Shadow DOM içinde bağımsız kontrol paneli yönetir
   */
  class VideoController {
    constructor(media, isAudio) {
      this.media = media;
      this.isAudio = isAudio;
      this.hostElement = null;
      this.shadowRoot = null;
      this.pillEl = null;
      this.speedBadgeEl = null;
      this.abLoopBtn = null;
      this.toastEl = null;
      this.hideTimer = null;
      this.isDragging = false;
      this.isHovered = false;
      this.isInternalRateChange = false;

      // A-B Tekrar Döngüsü Durumu
      this.abLoop = {
        start: null,
        end: null,
        active: false
      };

      // Zaman İstatistiği Takibi
      this.bufferedSavedSeconds = 0;
      this.lastPlaybackTick = null;
      this.statsTimer = null;

      // Hiyerarşik başlangıç hızı: 1. Site hafızası, 2. Son hatırlanan hız, 3. Varsayılan hız
      const host = window.location.hostname;
      const effectiveSpeed = (typeof StorageManager !== 'undefined')
        ? StorageManager.getEffectiveSpeed(host, currentSettings)
        : ((currentSettings && currentSettings.defaultSpeed) || 1.0);

      this.currentSpeed = effectiveSpeed;
      this.userSpeed = effectiveSpeed;
      this.init();
    }

    init() {
      // Ses tonu korumasını (pitch preservation) uygula
      this.applyPitchPreservation();

      // Başlangıç hızını uygula
      if (Math.abs(this.currentSpeed - 1.0) > 0.01) {
        this.setSpeed(this.currentSpeed, false, false);
      } else {
        updateBadge(1.0);
      }

      // Medya hız değişimlerini dinle
      this.media.addEventListener('ratechange', () => {
        if (this.isInternalRateChange) {
          return;
        }

        const actualRate = this.media.playbackRate;
        const preventOverride = !currentSettings || currentSettings.preventSiteOverride !== false;

        // Oynatıcı veya reklam hızı ezmeye çalıştığında (örn. YouTube reklam sonrası 1.0'a çekince) kullanıcının hızını geri yükle
        if (preventOverride && this.userSpeed && Math.abs(actualRate - this.userSpeed) > 0.01) {
          this.isInternalRateChange = true;
          this.media.playbackRate = this.userSpeed;
          this.applyPitchPreservation();
          this.updateDisplay();
          updateBadge(this.userSpeed);
          setTimeout(() => {
            this.isInternalRateChange = false;
          }, 100);
          return;
        }

        if (Math.abs(actualRate - this.currentSpeed) > 0.01) {
          this.currentSpeed = actualRate;
          this.userSpeed = actualRate;
          this.updateDisplay();
          updateBadge(this.currentSpeed);
        }
        // Oynatıcı hız değiştirdiğinde ses tonu korumasını her zaman yenile
        this.applyPitchPreservation();
      });

      // A-B Döngüsü Takibi
      this.media.addEventListener('timeupdate', () => {
        if (this.abLoop && this.abLoop.active && this.abLoop.start !== null && this.abLoop.end !== null) {
          if (this.media.currentTime >= this.abLoop.end || this.media.currentTime < this.abLoop.start - 0.5) {
            this.media.currentTime = this.abLoop.start;
            if (this.media.paused) {
              this.media.play().catch(() => {});
            }
          }
        }
      });

      // Zaman İstatistiği Başlatma ve Durdurma Dinleyicileri
      this.media.addEventListener('play', () => {
        this.lastPlaybackTick = Date.now();
        this.startStatsTracking();
      });
      this.media.addEventListener('pause', () => {
        this.tickSavedTime();
        this.flushSavedTime();
        this.stopStatsTracking();
      });
      this.media.addEventListener('ended', () => {
        this.tickSavedTime();
        this.flushSavedTime();
        this.stopStatsTracking();
      });

      // Reklam sonrası veya oynatma başladığında hızı kontrol edip gerekirse geri yükle
      const restoreUserSpeed = () => {
        const preventOverride = !currentSettings || currentSettings.preventSiteOverride !== false;
        if (preventOverride && this.userSpeed && Math.abs(this.media.playbackRate - this.userSpeed) > 0.01) {
          this.isInternalRateChange = true;
          this.media.playbackRate = this.userSpeed;
          this.applyPitchPreservation();
          this.updateDisplay();
          updateBadge(this.userSpeed);
          setTimeout(() => {
            this.isInternalRateChange = false;
          }, 100);
        }
      };

      this.media.addEventListener('playing', restoreUserSpeed);
      this.media.addEventListener('loadedmetadata', restoreUserSpeed);

      // Video görünürlüğü/oynatımı kontrolü (yalnızca video için overlay ekle)
      if (!this.isAudio) {
        this.createOverlay();
      }
    }

    applyPitchPreservation() {
      const preserve = !currentSettings || currentSettings.preservesPitch !== false;
      if ('preservesPitch' in this.media) {
        this.media.preservesPitch = preserve;
      }
      if ('mozPreservesPitch' in this.media) {
        this.media.mozPreservesPitch = preserve;
      }
      if ('webkitPreservesPitch' in this.media) {
        this.media.webkitPreservesPitch = preserve;
      }
    }

    createOverlay() {
      if (currentSettings && currentSettings.showOverlay === false) return;

      // Host oluştur ve Shadow DOM bağla
      this.hostElement = document.createElement('div');
      this.hostElement.className = 'hk-controller-host';
      this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

      // Stilleri yükle
      const styleEl = document.createElement('style');
      styleEl.textContent = getInlineOverlayCSS();
      this.shadowRoot.appendChild(styleEl);

      // Ana Kapsül Oluştur
      this.pillEl = document.createElement('div');
      this.pillEl.className = 'hk-pill-container';

      // Sürükleme Tutamacı
      const dragHandle = document.createElement('div');
      dragHandle.className = 'hk-drag-handle';
      dragHandle.innerHTML = ICONS.drag;
      dragHandle.title = (typeof I18n !== 'undefined' ? I18n.t('dragHandleTooltip', 'Drag to reposition') : 'Drag to reposition');

      // Kısayol referansları
      const shortcuts = (currentSettings && currentSettings.shortcuts) || DEFAULT_SETTINGS.shortcuts;
      const speedStep = (currentSettings && currentSettings.speedStep) || 0.1;
      const rewindStep = (currentSettings && currentSettings.rewindStep) || 10;
      const forwardStep = (currentSettings && currentSettings.forwardStep) || 10;

      const tReset = typeof I18n !== 'undefined' ? I18n.t('resetTooltip', 'Reset') : 'Reset';
      const tNormal = typeof I18n !== 'undefined' ? I18n.t('normalSpeedTooltip', 'Normal Speed') : 'Normal Speed';
      const tSlower = typeof I18n !== 'undefined' ? I18n.t('shortcutSlower', 'Slow down') : 'Slow down';
      const tFaster = typeof I18n !== 'undefined' ? I18n.t('shortcutFaster', 'Speed up') : 'Speed up';
      const tRewind = typeof I18n !== 'undefined' ? I18n.t('shortcutRewind', 'Rewind') : 'Rewind';
      const tForward = typeof I18n !== 'undefined' ? I18n.t('shortcutForward', 'Forward') : 'Forward';
      const tClose = typeof I18n !== 'undefined' ? I18n.t('hideOverlayTooltip', 'Hide Controller') : 'Hide Controller';

      // Hız Rozeti
      this.speedBadgeEl = document.createElement('div');
      this.speedBadgeEl.className = 'hk-speed-badge';
      this.speedBadgeEl.textContent = this.formatSpeed(this.currentSpeed);
      this.speedBadgeEl.innerHTML += `<div class="hk-tooltip">${tReset} <kbd>${(shortcuts.reset?.key || 'r').toUpperCase()}</kbd></div>`;
      this.speedBadgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetSpeed();
      });

      // Butonlar Grubu
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'hk-actions-group';

      // Yavaşlat (-)
      const slowerBtn = this.createButton('-', ICONS.minus, `${tSlower} (-${speedStep}×)`, shortcuts.slower?.key, () => {
        this.adjustSpeed(-speedStep);
      });

      // Hızlandır (+)
      const fasterBtn = this.createButton('+', ICONS.plus, `${tFaster} (+${speedStep}×)`, shortcuts.faster?.key, () => {
        this.adjustSpeed(speedStep);
      });

      // Geri Sar (<<)
      const rewindBtn = this.createButton('<<', ICONS.rewind, `${tRewind} (${rewindStep}s)`, shortcuts.rewind?.key, () => {
        this.adjustTime(-rewindStep);
      });

      // İleri Sar (>>)
      const forwardBtn = this.createButton('>>', ICONS.forward, `${tForward} (${forwardStep}s)`, shortcuts.forward?.key, () => {
        this.adjustTime(forwardStep);
      });

      // Hızlı Sıfırla (1×)
      const resetBtn = document.createElement('button');
      resetBtn.className = 'hk-btn hk-btn-reset';
      resetBtn.textContent = '1×';
      resetBtn.innerHTML += `<div class="hk-tooltip">${tNormal} <kbd>${(shortcuts.reset?.key || 'r').toUpperCase()}</kbd></div>`;
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetSpeed();
      });

      // A-B Tekrar Döngüsü Butonu
      const tLoop = typeof I18n !== 'undefined' ? I18n.t('abLoopTooltip', 'A-B Repeat Loop') : 'A-B Repeat Loop';
      this.abLoopBtn = document.createElement('button');
      this.abLoopBtn.className = 'hk-btn hk-btn-ab';
      this.abLoopBtn.textContent = 'A-B';
      this.abLoopBtn.innerHTML += `<div class="hk-tooltip">${tLoop} <kbd>${(shortcuts.abLoop?.key || 'l').toUpperCase()}</kbd></div>`;
      this.abLoopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleABLoopAction();
      });

      // Gizle (X)
      const closeBtn = this.createButton('X', ICONS.close, tClose, shortcuts.toggleOverlay?.key, () => {
        this.hideOverlay();
      });
      closeBtn.classList.add('hk-btn-close');

      actionsGroup.appendChild(slowerBtn);
      actionsGroup.appendChild(fasterBtn);
      actionsGroup.appendChild(rewindBtn);
      actionsGroup.appendChild(forwardBtn);
      actionsGroup.appendChild(this.abLoopBtn);
      actionsGroup.appendChild(resetBtn);
      actionsGroup.appendChild(closeBtn);

      // Hızlı Bildirim (Toast)
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'hk-toast';

      this.pillEl.appendChild(dragHandle);
      this.pillEl.appendChild(this.speedBadgeEl);
      this.pillEl.appendChild(actionsGroup);
      this.pillEl.appendChild(this.toastEl);

      // Fare tekerleğiyle hız ayarı (Kapsül üzerindeyken)
      let accumulatedWheelDelta = 0;
      let wheelResetTimer = null;
      this.pillEl.addEventListener('wheel', (e) => {
        if (currentSettings && currentSettings.mouseWheelSpeed === false) return;
        e.preventDefault();
        e.stopPropagation();

        accumulatedWheelDelta += e.deltaY;
        const threshold = 40;
        if (Math.abs(accumulatedWheelDelta) >= threshold) {
          const dir = accumulatedWheelDelta < 0 ? 1 : -1;
          accumulatedWheelDelta = 0;
          const step = (currentSettings && currentSettings.speedStep) || 0.1;
          this.adjustSpeed(dir * step);
        }
        clearTimeout(wheelResetTimer);
        wheelResetTimer = setTimeout(() => {
          accumulatedWheelDelta = 0;
        }, 180);
      }, { passive: false });

      // Tıklamaların videoya sızmasını önle (video pause/play tetiklenmesin)
      this.pillEl.addEventListener('click', (e) => e.stopPropagation());
      this.pillEl.addEventListener('dblclick', (e) => e.stopPropagation());

      this.shadowRoot.appendChild(this.pillEl);

      // Konumlandır ve Ekle
      this.attachToDOM();
      this.setupDragging(dragHandle);
      this.setupHoverAndIdle();
      this.updateDisplay();
      this.updateABLoopUI();
    }

    createButton(text, iconSvg, tooltipText, shortcutKey, onClick) {
      const btn = document.createElement('button');
      btn.className = 'hk-btn';
      btn.innerHTML = iconSvg + `<div class="hk-tooltip">${tooltipText} <kbd>${(shortcutKey || '').toUpperCase()}</kbd></div>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
      return btn;
    }

    attachToDOM() {
      // Hedef ebeveyni bul: Videonun doğrudan kapsayıcısı
      const parent = this.media.parentElement || document.body;
      const computedPos = window.getComputedStyle(parent).position;
      if (computedPos === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(this.hostElement);
      this.applySavedPosition();
    }

    applySavedPosition() {
      if (!this.hostElement) return;
      const pos = (currentSettings && currentSettings.customPosition) || { top: 16, left: 16 };
      this.hostElement.style.top = `${Math.max(8, pos.top)}px`;
      this.hostElement.style.left = `${Math.max(8, pos.left)}px`;
      this.hostElement.style.right = 'auto';
      this.hostElement.style.bottom = 'auto';
    }

    setupDragging(handle) {
      let isDragging = false;
      let startX, startY;
      let initialLeft, initialTop;

      const onMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        this.isDragging = true;

        startX = e.clientX;
        startY = e.clientY;

        const rect = this.hostElement.getBoundingClientRect();
        const parentRect = (this.hostElement.parentElement || document.body).getBoundingClientRect();

        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;

        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseup', onMouseUp, true);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const newLeft = Math.max(4, initialLeft + dx);
        const newTop = Math.max(4, initialTop + dy);

        this.hostElement.style.left = `${newLeft}px`;
        this.hostElement.style.top = `${newTop}px`;
      };

      const onMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        this.isDragging = false;

        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);

        // Yeni konumu kaydet
        const finalLeft = parseInt(this.hostElement.style.left, 10);
        const finalTop = parseInt(this.hostElement.style.top, 10);
        if (currentSettings) {
          currentSettings.customPosition = { left: finalLeft, top: finalTop };
          saveSettingsPartial({ customPosition: currentSettings.customPosition });
        }
      };

      handle.addEventListener('mousedown', onMouseDown);
    }

    setupHoverAndIdle() {
      const resetTimer = () => {
        const hoverOp = (currentSettings && currentSettings.overlayOpacityHover !== undefined) ? currentSettings.overlayOpacityHover : '1.0';
        this.hostElement.style.opacity = hoverOp;
        this.hostElement.style.pointerEvents = 'auto';
        clearTimeout(this.hideTimer);

        if (!this.isHovered && !this.isDragging) {
          const delay = ((currentSettings && currentSettings.autoHideDelay) || 2.5) * 1000;
          this.hideTimer = setTimeout(() => {
            if (!this.isHovered && !this.isDragging) {
              const idleOp = (currentSettings && currentSettings.overlayOpacityIdle !== undefined) ? currentSettings.overlayOpacityIdle : 0.35;
              this.hostElement.style.opacity = idleOp;
              if (Number(idleOp) === 0) {
                this.hostElement.style.pointerEvents = 'none';
              }
            }
          }, delay);
        }
      };

      this.hostElement.addEventListener('mouseenter', () => {
        this.isHovered = true;
        const hoverOp = (currentSettings && currentSettings.overlayOpacityHover !== undefined) ? currentSettings.overlayOpacityHover : '1.0';
        this.hostElement.style.opacity = hoverOp;
        this.hostElement.style.pointerEvents = 'auto';
        clearTimeout(this.hideTimer);
      });

      this.hostElement.addEventListener('mouseleave', () => {
        this.isHovered = false;
        resetTimer();
      });

      this.media.addEventListener('mousemove', resetTimer);
      resetTimer();
    }

    setSpeed(speed, showNotification = true, isUserAction = true) {
      const clamped = Math.min(16.0, Math.max(0.05, Math.round(speed * 100) / 100));
      this.currentSpeed = clamped;
      if (isUserAction) {
        this.userSpeed = clamped;
      }

      this.isInternalRateChange = true;
      this.media.playbackRate = clamped;
      this.applyPitchPreservation();
      this.updateDisplay();
      updateBadge(clamped);

      setTimeout(() => {
        this.isInternalRateChange = false;
      }, 100);

      if (showNotification) {
        this.showToast(this.formatSpeed(clamped));
      }

      if (isUserAction && currentSettings) {
        const partial = {};
        // Site bazlı hız hafızası
        if (currentSettings.rememberSiteSpeed !== false) {
          const host = (typeof StorageManager !== 'undefined')
            ? StorageManager.cleanHostname(window.location.hostname)
            : window.location.hostname.replace(/^www\./, '');
          if (host) {
            const updatedSiteSpeeds = { ...(currentSettings.siteSpeeds || {}), [host]: clamped };
            currentSettings.siteSpeeds = updatedSiteSpeeds;
            partial.siteSpeeds = updatedSiteSpeeds;
          }
        }
        // Genel son hız hafızası
        if (currentSettings.rememberSpeed) {
          partial.lastKnownSpeed = clamped;
          currentSettings.lastKnownSpeed = clamped;
        }
        if (Object.keys(partial).length > 0) {
          saveSettingsPartial(partial);
        }
      }
    }

    adjustSpeed(delta) {
      this.setSpeed(this.currentSpeed + delta);
    }

    resetSpeed() {
      this.setSpeed(1.0);
    }

    toggleFastSpeed() {
      const fastTarget = (currentSettings && currentSettings.fastSpeed) || 1.8;
      if (Math.abs(this.currentSpeed - fastTarget) > 0.05) {
        lastSpeedBeforeFast = this.currentSpeed;
        this.setSpeed(fastTarget);
      } else {
        this.setSpeed(lastSpeedBeforeFast || 1.0);
      }
    }

    adjustTime(seconds) {
      if (Number.isFinite(this.media.duration)) {
        this.media.currentTime = Math.min(this.media.duration, Math.max(0, this.media.currentTime + seconds));
      } else {
        this.media.currentTime = Math.max(0, this.media.currentTime + seconds);
      }
      this.showToast(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    }

    toggleMute() {
      this.media.muted = !this.media.muted;
      const msg = this.media.muted
        ? (typeof I18n !== 'undefined' ? I18n.t('mutedToast', 'Muted') : 'Muted')
        : (typeof I18n !== 'undefined' ? I18n.t('unmutedToast', 'Sound On') : 'Sound On');
      this.showToast(msg);
    }

    hideOverlay() {
      if (this.hostElement) {
        this.hostElement.style.display = 'none';
      }
    }

    showOverlay() {
      if (!this.hostElement) {
        this.createOverlay();
      } else {
        this.hostElement.style.display = 'block';
      }
    }

    toggleOverlay() {
      if (this.hostElement && this.hostElement.style.display !== 'none') {
        this.hideOverlay();
      } else {
        this.showOverlay();
      }
    }

    updateDisplay() {
      if (!this.speedBadgeEl) return;
      if (this.speedBadgeEl.firstChild) {
        this.speedBadgeEl.firstChild.textContent = this.formatSpeed(this.currentSpeed);
      }

      this.speedBadgeEl.classList.remove('hk-boosted', 'hk-slowed');
      if (this.currentSpeed > 1.0) {
        this.speedBadgeEl.classList.add('hk-boosted');
      } else if (this.currentSpeed < 1.0) {
        this.speedBadgeEl.classList.add('hk-slowed');
      }
    }

    showToast(message) {
      if (!this.toastEl) return;
      this.toastEl.textContent = message;
      this.toastEl.classList.add('hk-show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        if (this.toastEl) this.toastEl.classList.remove('hk-show');
      }, 900);
    }

    formatSpeed(val) {
      return `${val.toFixed(2)}×`;
    }

    // Zaman İstatistiği Metotları
    startStatsTracking() {
      if (!this.statsTimer) {
        this.statsTimer = setInterval(() => {
          this.tickSavedTime();
        }, 2000);
      }
    }

    stopStatsTracking() {
      if (this.statsTimer) {
        clearInterval(this.statsTimer);
        this.statsTimer = null;
      }
    }

    tickSavedTime() {
      if (!this.media.paused && !this.media.ended && this.currentSpeed > 1.0) {
        const now = Date.now();
        if (this.lastPlaybackTick) {
          const elapsedSec = (now - this.lastPlaybackTick) / 1000;
          if (elapsedSec > 0 && elapsedSec <= 5) {
            const savedSec = elapsedSec * (this.currentSpeed - 1.0);
            this.bufferedSavedSeconds += savedSec;
            if (this.bufferedSavedSeconds >= 5) {
              this.flushSavedTime();
            }
          }
        }
        this.lastPlaybackTick = now;
      } else {
        this.lastPlaybackTick = Date.now();
      }
    }

    flushSavedTime() {
      if (this.bufferedSavedSeconds > 0) {
        const secToSave = this.bufferedSavedSeconds;
        this.bufferedSavedSeconds = 0;
        if (typeof StorageManager !== 'undefined' && StorageManager.recordTimeSaved) {
          StorageManager.recordTimeSaved(secToSave);
        }
      }
    }

    // A-B Tekrar Döngüsü Metotları
    formatTime(seconds) {
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

    handleABLoopAction() {
      if (this.abLoop.start === null) {
        this.abLoop.start = Math.max(0, this.media.currentTime);
        this.abLoop.end = null;
        this.abLoop.active = false;
        const msg = typeof I18n !== 'undefined'
          ? (I18n.t('abLoopStartSet', 'Point A: {time}') || 'Point A: {time}').replace('{time}', this.formatTime(this.abLoop.start))
          : `A: ${this.formatTime(this.abLoop.start)}`;
        this.showToast(msg);
      } else if (this.abLoop.end === null) {
        let pos = this.media.currentTime;
        if (pos <= this.abLoop.start) {
          const temp = this.abLoop.start;
          this.abLoop.start = pos;
          this.abLoop.end = temp;
        } else {
          this.abLoop.end = pos;
        }
        this.abLoop.active = true;
        this.media.currentTime = this.abLoop.start;
        const msg = typeof I18n !== 'undefined'
          ? (I18n.t('abLoopActive', 'Loop: {start} - {end}') || 'Loop: {start} - {end}')
              .replace('{start}', this.formatTime(this.abLoop.start))
              .replace('{end}', this.formatTime(this.abLoop.end))
          : `A-B: ${this.formatTime(this.abLoop.start)} - ${this.formatTime(this.abLoop.end)}`;
        this.showToast(msg);
      } else {
        this.clearABLoop();
        const msg = typeof I18n !== 'undefined' ? I18n.t('abLoopCleared', 'Loop Cleared') : 'Loop Cleared';
        this.showToast(msg);
      }
      this.updateABLoopUI();
    }

    clearABLoop() {
      this.abLoop.start = null;
      this.abLoop.end = null;
      this.abLoop.active = false;
      this.updateABLoopUI();
    }

    setABPoint(type) {
      const cur = Math.max(0, this.media.currentTime);
      if (type === 'A') {
        this.abLoop.start = cur;
        if (this.abLoop.end !== null && this.abLoop.end <= this.abLoop.start) {
          this.abLoop.end = null;
          this.abLoop.active = false;
        }
        const msg = typeof I18n !== 'undefined'
          ? (I18n.t('abLoopStartSet', 'Point A: {time}') || 'Point A: {time}').replace('{time}', this.formatTime(this.abLoop.start))
          : `A: ${this.formatTime(this.abLoop.start)}`;
        this.showToast(msg);
      } else if (type === 'B') {
        if (this.abLoop.start === null) {
          this.abLoop.start = Math.max(0, cur - 5);
        }
        if (cur <= this.abLoop.start) {
          const temp = this.abLoop.start;
          this.abLoop.start = cur;
          this.abLoop.end = temp;
        } else {
          this.abLoop.end = cur;
        }
        this.abLoop.active = true;
        this.media.currentTime = this.abLoop.start;
        const msg = typeof I18n !== 'undefined'
          ? (I18n.t('abLoopActive', 'Loop: {start} - {end}') || 'Loop: {start} - {end}')
              .replace('{start}', this.formatTime(this.abLoop.start))
              .replace('{end}', this.formatTime(this.abLoop.end))
          : `A-B: ${this.formatTime(this.abLoop.start)} - ${this.formatTime(this.abLoop.end)}`;
        this.showToast(msg);
      } else if (type === 'clear') {
        this.clearABLoop();
        const msg = typeof I18n !== 'undefined' ? I18n.t('abLoopCleared', 'Loop Cleared') : 'Loop Cleared';
        this.showToast(msg);
      }
      this.updateABLoopUI();
    }

    updateABLoopUI() {
      if (!this.abLoopBtn) return;
      this.abLoopBtn.classList.remove('hk-ab-waiting', 'hk-ab-active');
      if (this.abLoop.start !== null && this.abLoop.end === null) {
        this.abLoopBtn.textContent = 'A→';
        this.abLoopBtn.classList.add('hk-ab-waiting');
      } else if (this.abLoop.active) {
        this.abLoopBtn.textContent = 'A-B';
        this.abLoopBtn.classList.add('hk-ab-active');
      } else {
        this.abLoopBtn.textContent = 'A-B';
      }
    }

    destroy() {
      this.stopStatsTracking();
      this.flushSavedTime();
      clearTimeout(this.hideTimer);
      clearTimeout(this.toastTimer);
      if (this.hostElement && this.hostElement.parentElement) {
        this.hostElement.parentElement.removeChild(this.hostElement);
      }
    }
  }

  /**
   * Tam ekran durumu değiştiğinde kontrol panelinin görünür kalmasını sağlar
   */
  function handleFullscreenChange() {
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    activeControllers.forEach(controller => {
      if (!controller.hostElement) return;

      if (fsElement) {
        if (fsElement.contains(controller.media) || fsElement === controller.media) {
          fsElement.appendChild(controller.hostElement);
          controller.applySavedPosition();
        }
        if (currentSettings && currentSettings.hideInFullscreen) {
          controller.hostElement.style.display = 'none';
        } else {
          controller.hostElement.style.display = (currentSettings && currentSettings.showOverlay === false) ? 'none' : 'block';
        }
      } else {
        controller.attachToDOM();
        controller.hostElement.style.display = (currentSettings && currentSettings.showOverlay === false) ? 'none' : 'block';
      }
    });
  }

  /**
   * Global klavye kısayollarını dinler
   */
  function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (!currentSettings || currentSettings.enabled === false) return;

      // Kullanıcı yazı yazıyorsa kısayolları yutma
      if (isTypingContext(e.target)) return;

      // Özel sistem tuş kombinasyonlarını bozma (Ctrl+S, Alt+F4 vb.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const shortcuts = currentSettings.shortcuts || DEFAULT_SETTINGS.shortcuts;
      const speedStep = currentSettings.speedStep || 0.1;
      const rewindStep = currentSettings.rewindStep || 10;
      const forwardStep = currentSettings.forwardStep || 10;

      const pressedKey = e.key.toLowerCase();

      // Aktif veya oynatılan ilk videoyu bul
      const controller = getActiveOrFirstController();
      if (!controller) return;

      if (pressedKey === (shortcuts.faster?.key || 'd').toLowerCase()) {
        e.preventDefault();
        controller.adjustSpeed(speedStep);
      } else if (pressedKey === (shortcuts.slower?.key || 's').toLowerCase()) {
        e.preventDefault();
        controller.adjustSpeed(-speedStep);
      } else if (pressedKey === (shortcuts.reset?.key || 'r').toLowerCase()) {
        e.preventDefault();
        controller.resetSpeed();
      } else if (pressedKey === (shortcuts.toggleFast?.key || 'g').toLowerCase()) {
        e.preventDefault();
        controller.toggleFastSpeed();
      } else if (pressedKey === (shortcuts.rewind?.key || 'z').toLowerCase()) {
        e.preventDefault();
        controller.adjustTime(-rewindStep);
      } else if (pressedKey === (shortcuts.forward?.key || 'x').toLowerCase()) {
        e.preventDefault();
        controller.adjustTime(forwardStep);
      } else if (pressedKey === (shortcuts.toggleOverlay?.key || 'v').toLowerCase()) {
        e.preventDefault();
        controller.toggleOverlay();
      } else if (pressedKey === (shortcuts.mute?.key || 'm').toLowerCase()) {
        e.preventDefault();
        controller.toggleMute();
      } else if (pressedKey === (shortcuts.abLoop?.key || 'l').toLowerCase()) {
        e.preventDefault();
        controller.handleABLoopAction();
      }
    }, true);
  }

  /**
   * Kullanıcının metin giriş alanında olup olmadığını tespit eder
   */
  function isTypingContext(el) {
    if (!el) return false;
    const tagName = el.tagName ? el.tagName.toUpperCase() : '';
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }
    if (el.isContentEditable || (el.getAttribute && el.getAttribute('contenteditable') === 'true')) {
      return true;
    }
    return false;
  }

  /**
   * O an oynatılmakta olan veya sayfadaki birincil videoyu döndürür
   */
  function getActiveOrFirstController() {
    if (activeControllers.size === 0) {
      scanForMedia(document);
    }

    // 1. O an oynatılmakta olan video
    for (const [media, controller] of activeControllers.entries()) {
      if (!media.paused && !media.ended && media.currentTime > 0) {
        return controller;
      }
    }

    // 2. YouTube ana oynatıcı videosu
    const ytVideo = document.querySelector('video.html5-main-video') ||
                    document.querySelector('#movie_player video');
    if (ytVideo && activeControllers.has(ytVideo)) {
      return activeControllers.get(ytVideo);
    }

    // 3. Map içindeki ilk kontrolcü
    const first = activeControllers.values().next();
    return first.done ? null : first.value;
  }

  /**
   * Popup ve Ayarlar sayfası mesajlaşması
   */
  function initMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getState') {
          const controller = getActiveOrFirstController();
          const host = window.location.hostname;
          const siteSpeed = (typeof StorageManager !== 'undefined')
            ? StorageManager.getSiteSpeed(host, currentSettings?.siteSpeeds)
            : null;

          sendResponse({
            found: !!controller,
            speed: controller ? controller.currentSpeed : 1.0,
            userSpeed: controller ? controller.userSpeed : 1.0,
            paused: controller ? controller.media.paused : true,
            isBlacklisted: isBlacklisted(host),
            enabled: currentSettings ? currentSettings.enabled !== false : true,
            siteSpeed: siteSpeed,
            abLoop: controller ? {
              start: controller.abLoop.start,
              end: controller.abLoop.end,
              active: controller.abLoop.active
            } : null,
            currentTime: controller ? controller.media.currentTime : 0
          });
          return true;
        } else if (request.action === 'setSpeed') {
          const controller = getActiveOrFirstController();
          if (controller) {
            controller.setSpeed(request.speed, true, true);
          }
          sendResponse({ success: true });
          return true;
        } else if (request.action === 'setSiteSpeed') {
          if (currentSettings) {
            const host = (typeof StorageManager !== 'undefined')
              ? StorageManager.cleanHostname(window.location.hostname)
              : window.location.hostname.replace(/^www\./, '');
            if (host) {
              const updatedSiteSpeeds = { ...(currentSettings.siteSpeeds || {}) };
              if (request.speed === null || request.speed === undefined) {
                delete updatedSiteSpeeds[host];
              } else {
                updatedSiteSpeeds[host] = request.speed;
              }
              currentSettings.siteSpeeds = updatedSiteSpeeds;
              saveSettingsPartial({ siteSpeeds: updatedSiteSpeeds });
            }
          }
          sendResponse({ success: true });
          return true;
        } else if (request.action === 'seek') {
          const controller = getActiveOrFirstController();
          if (controller) {
            controller.adjustTime(request.seconds);
          }
          sendResponse({ success: true });
          return true;
        } else if (request.action === 'setABPoint') {
          const controller = getActiveOrFirstController();
          if (controller) {
            controller.setABPoint(request.pointType);
            sendResponse({
              success: true,
              abLoop: {
                start: controller.abLoop.start,
                end: controller.abLoop.end,
                active: controller.abLoop.active
              }
            });
          } else {
            sendResponse({ success: false });
          }
          return true;
        } else if (request.action === 'chromeCommand') {
          const controller = getActiveOrFirstController();
          if (controller) {
            const step = (currentSettings && currentSettings.speedStep) || 0.1;
            switch (request.command) {
              case 'increase-speed':
                controller.adjustSpeed(step);
                break;
              case 'decrease-speed':
                controller.adjustSpeed(-step);
                break;
              case 'reset-speed':
                controller.resetSpeed();
                break;
              case 'toggle-fast':
                controller.toggleFastSpeed();
                break;
              case 'toggle-ab-loop':
                controller.handleABLoopAction();
                break;
            }
          }
          sendResponse({ success: true });
          return true;
        } else if (request.action === 'settingsUpdated') {
          loadSettings().then(s => {
            currentSettings = s;
            const controller = getActiveOrFirstController();
            if (controller) {
              updateBadge(controller.currentSpeed);
            }
            activeControllers.forEach(c => {
              c.applyPitchPreservation();
              c.updateDisplay();
              c.updateABLoopUI();
              if (c.hostElement) {
                const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
                const isFs = !!fsElement && (fsElement.contains(c.media) || fsElement === c.media);
                if (isFs && s.hideInFullscreen) {
                  c.hostElement.style.display = 'none';
                } else {
                  c.hostElement.style.display = s.showOverlay !== false ? 'block' : 'none';
                }
                const idleOp = s.overlayOpacityIdle !== undefined ? s.overlayOpacityIdle : 0.35;
                if (!c.isHovered) {
                  c.hostElement.style.opacity = idleOp;
                  if (Number(idleOp) === 0) {
                    c.hostElement.style.pointerEvents = 'none';
                  } else {
                    c.hostElement.style.pointerEvents = 'auto';
                  }
                }
              }
            });
          });
          sendResponse({ success: true });
          return true;
        }
        return false;
      });
    }
  }

  /**
   * Ayarları yükleme yardımcısı
   */
  async function loadSettings() {
    if (typeof StorageManager !== 'undefined') {
      return StorageManager.getSettings();
    }
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get('hizKontrolSettings', res => {
          resolve(res.hizKontrolSettings || DEFAULT_SETTINGS);
        });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  /**
   * Ayarların bir kısmını kaydetme yardımcısı
   */
  function saveSettingsPartial(partial) {
    if (typeof StorageManager !== 'undefined') {
      StorageManager.getSettings().then(s => {
        Object.assign(s, partial);
        StorageManager.saveSettings(s);
      });
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get('hizKontrolSettings', res => {
        const s = res.hizKontrolSettings || DEFAULT_SETTINGS;
        Object.assign(s, partial);
        chrome.storage.sync.set({ hizKontrolSettings: s });
      });
    }
  }

  /**
   * Host kara listede mi kontrol et
   */
  function isBlacklisted(hostname) {
    if (!currentSettings || !currentSettings.blacklist) return false;
    return currentSettings.blacklist.some(item => {
      const clean = item.toLowerCase().trim();
      return hostname.toLowerCase().includes(clean);
    });
  }

  /**
   * Shadow DOM içerisindeki kontrol paneli stilleri
   * Minimalist, şık, nötr koyu tema (AI şablonu/slop hissi vermeyen mat tasarım)
   */
  function getInlineOverlayCSS() {
    return `
      :host {
        all: initial;
        position: absolute !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 12px !important;
        line-height: 1 !important;
        color: #f4f4f5 !important;
        box-sizing: border-box !important;
        transition: opacity 0.2s ease !important;
      }
      *, *::before, *::after {
        box-sizing: inherit;
        margin: 0;
        padding: 0;
      }
      .hk-pill-container {
        display: inline-flex;
        align-items: center;
        background: rgba(18, 18, 20, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.6);
        padding: 3px 6px;
        gap: 2px;
        cursor: default;
        transition: background 0.2s ease, border-color 0.2s ease;
        white-space: nowrap;
      }
      .hk-pill-container:hover {
        background: rgba(24, 24, 27, 0.98);
        border-color: rgba(255, 255, 255, 0.22);
      }
      .hk-drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 12px;
        height: 20px;
        cursor: grab;
        color: #71717a;
        padding: 0 1px;
      }
      .hk-drag-handle:active { cursor: grabbing; color: #fff; }
      .hk-drag-handle svg { width: 8px; height: 12px; fill: currentColor; }
      .hk-speed-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 3px 7px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        color: #38bdf8;
        cursor: pointer;
        position: relative;
        font-variant-numeric: tabular-nums;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .hk-speed-badge:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
      .hk-speed-badge.hk-boosted { color: #38bdf8; }
      .hk-speed-badge.hk-slowed { color: #fb923c; }
      .hk-actions-group {
        display: flex;
        align-items: center;
        gap: 2px;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
        pointer-events: none;
      }
      .hk-pill-container:hover .hk-actions-group {
        max-width: 280px;
        opacity: 1;
        pointer-events: auto;
        margin-left: 2px;
      }
      .hk-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: none;
        background: transparent;
        color: #a1a1aa;
        font-size: 11px;
        cursor: pointer;
        position: relative;
        transition: all 0.12s ease;
      }
      .hk-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
      .hk-btn:active { transform: scale(0.92); }
      .hk-btn svg { width: 12px; height: 12px; }
      .hk-btn-reset { font-size: 10px; font-weight: 700; color: #d4d4d8; width: 22px; }
      .hk-btn-reset:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
      .hk-btn-ab { font-size: 10px; font-weight: 700; color: #a1a1aa; width: 26px; }
      .hk-btn-ab.hk-ab-waiting { color: #f59e0b; background: rgba(245, 158, 11, 0.18); font-weight: 800; }
      .hk-btn-ab.hk-ab-active { color: #10b981; background: rgba(16, 185, 129, 0.22); font-weight: 800; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
      .hk-btn-close:hover { color: #f87171; background: rgba(239, 68, 68, 0.18); }
      .hk-tooltip {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%) translateY(2px);
        background: #18181b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e4e4e7;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.12s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 20;
      }
      .hk-tooltip kbd {
        display: inline-block;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;
        padding: 0 3px;
        font-size: 9px;
        font-weight: 700;
        color: #a1a1aa;
        margin-left: 2px;
      }
      .hk-btn:hover .hk-tooltip, .hk-speed-badge:hover .hk-tooltip {
        opacity: 1;
      }
      .hk-toast {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(4px);
        background: rgba(24, 24, 27, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s ease;
      }
      .hk-toast.hk-show { opacity: 1; transform: translateX(-50%) translateY(2px); }
    `;
  }

  // Sayfa hazır olduğunda çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
