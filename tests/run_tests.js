/**
 * Test Suite for Pacelet Speed Controller
 * Tests:
 * 1. StorageManager defaults and new settings
 * 2. Hostname sanitation & matching (cleanHostname, isHostBlacklisted)
 * 3. Per-site speed lookup and precedence (getSiteSpeed, getEffectiveSpeed)
 * 4. Settings merge logic and JSON Export/Import verification
 * 5. Badge text formatting and limit constraints (<= 4 chars)
 * 6. Player override protection simulation (ratechange handling)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Import storage module
const { DEFAULT_SETTINGS, StorageManager } = require('../shared/storage.js');
const { I18n } = require('../shared/i18n.js');

let testsPassed = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n--- Running Pacelet Test Suite ---\n');

console.log('1. Default Settings & Defaults Merging:');

it('DEFAULT_SETTINGS contains all new required fields', () => {
  assert.strictEqual(typeof DEFAULT_SETTINGS.siteSpeeds, 'object');
  assert.strictEqual(DEFAULT_SETTINGS.rememberSiteSpeed, true);
  assert.strictEqual(DEFAULT_SETTINGS.preventSiteOverride, true);
  assert.strictEqual(DEFAULT_SETTINGS.showBadge, true);
  assert.strictEqual(DEFAULT_SETTINGS.defaultSpeed, 1.0);
  assert.strictEqual(DEFAULT_SETTINGS.rememberSpeed, false);
  assert.strictEqual(DEFAULT_SETTINGS.hideInFullscreen, false);
  assert.strictEqual(DEFAULT_SETTINGS.overlayOpacityIdle, 0.35);
});

it('_mergeDefaults preserves existing settings while filling defaults', () => {
  const merged = StorageManager._mergeDefaults({
    defaultSpeed: 1.25,
    siteSpeeds: { 'youtube.com': 1.75 },
    preventSiteOverride: false,
    hideInFullscreen: true,
    overlayOpacityIdle: 0.0
  });

  assert.strictEqual(merged.defaultSpeed, 1.25);
  assert.strictEqual(merged.siteSpeeds['youtube.com'], 1.75);
  assert.strictEqual(merged.preventSiteOverride, false);
  assert.strictEqual(merged.rememberSiteSpeed, true); // default
  assert.strictEqual(merged.showBadge, true); // default
  assert.strictEqual(merged.hideInFullscreen, true);
  assert.strictEqual(merged.overlayOpacityIdle, 0.0);
});

console.log('\n2. Hostname Cleaning & Site Speed Resolution:');

it('cleanHostname properly strips protocols, www, ports, paths', () => {
  assert.strictEqual(StorageManager.cleanHostname('https://www.youtube.com/watch?v=123'), 'youtube.com');
  assert.strictEqual(StorageManager.cleanHostname('http://udemy.com:8080/course/test'), 'udemy.com');
  assert.strictEqual(StorageManager.cleanHostname('WWW.NETFLIX.COM'), 'netflix.com');
  assert.strictEqual(StorageManager.cleanHostname('music.youtube.com'), 'music.youtube.com');
});

it('getSiteSpeed resolves exact matches and parent domain matches', () => {
  const siteSpeeds = {
    'youtube.com': 1.5,
    'udemy.com': 1.25
  };

  assert.strictEqual(StorageManager.getSiteSpeed('youtube.com', siteSpeeds), 1.5);
  assert.strictEqual(StorageManager.getSiteSpeed('www.youtube.com', siteSpeeds), 1.5);
  assert.strictEqual(StorageManager.getSiteSpeed('music.youtube.com', siteSpeeds), 1.5);
  assert.strictEqual(StorageManager.getSiteSpeed('udemy.com', siteSpeeds), 1.25);
  assert.strictEqual(StorageManager.getSiteSpeed('vimeo.com', siteSpeeds), null);
});

it('getEffectiveSpeed adheres to strict priority order', () => {
  const settings = {
    defaultSpeed: 1.1,
    rememberSpeed: true,
    lastKnownSpeed: 1.3,
    siteSpeeds: {
      'youtube.com': 1.75
    }
  };

  // 1. YouTube has site speed => 1.75
  assert.strictEqual(StorageManager.getEffectiveSpeed('www.youtube.com', settings), 1.75);

  // 2. Vimeo has no site speed, but rememberSpeed is true => lastKnownSpeed (1.3)
  assert.strictEqual(StorageManager.getEffectiveSpeed('vimeo.com', settings), 1.3);

  // 3. If rememberSpeed is false, falls back to defaultSpeed (1.1)
  const settingsNoRemember = { ...settings, rememberSpeed: false };
  assert.strictEqual(StorageManager.getEffectiveSpeed('vimeo.com', settingsNoRemember), 1.1);

  // 4. Fallback to 1.0 if no defaultSpeed
  assert.strictEqual(StorageManager.getEffectiveSpeed('vimeo.com', {}), 1.0);
});

console.log('\n3. JSON Export and Import:');

it('Settings export format is valid and roundtrips completely', async () => {
  const custom = {
    ...DEFAULT_SETTINGS,
    defaultSpeed: 1.4,
    siteSpeeds: { 'youtube.com': 2.0, 'coursera.org': 1.5 },
    preventSiteOverride: true,
    showBadge: true
  };

  await StorageManager.saveSettings(custom);
  const loaded = await StorageManager.getSettings();

  assert.strictEqual(loaded.defaultSpeed, 1.4);
  assert.strictEqual(loaded.siteSpeeds['youtube.com'], 2.0);
  assert.strictEqual(loaded.siteSpeeds['coursera.org'], 1.5);

  // Export JSON string simulation
  const exportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    paceletSettings: loaded
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);

  // Import JSON simulation (wrapped with paceletSettings)
  const importedObj = JSON.parse(jsonStr);
  const dataToSave = importedObj.paceletSettings || importedObj;
  const savedImport = await StorageManager.saveSettings(dataToSave);

  assert.strictEqual(savedImport.defaultSpeed, 1.4);
  assert.strictEqual(savedImport.siteSpeeds['youtube.com'], 2.0);
  assert.strictEqual(savedImport.siteSpeeds['coursera.org'], 1.5);
});

console.log('\n4. Toolbar Badge Formatting:');

it('Badge speed text fits in Chrome 4-character maximum constraint', () => {
  function formatBadge(speed, showBadge = true) {
    if (showBadge === false) return '';
    if (!speed || Math.abs(speed - 1.0) < 0.01) return '';
    const rounded = Math.round(speed * 100) / 100;
    return rounded >= 10 ? `${Math.round(rounded)}` : `${rounded}`.slice(0, 4);
  }

  assert.strictEqual(formatBadge(1.0), '');
  assert.strictEqual(formatBadge(1.5), '1.5');
  assert.strictEqual(formatBadge(1.25), '1.25');
  assert.strictEqual(formatBadge(2.0), '2');
  assert.strictEqual(formatBadge(2.75), '2.75');
  assert.strictEqual(formatBadge(12.5), '13');
  assert.strictEqual(formatBadge(1.5, false), '');

  // Verify all lengths <= 4
  const testSpeeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 8.0, 16.0];
  testSpeeds.forEach(s => {
    const txt = formatBadge(s);
    assert(txt.length <= 4, `Badge text "${txt}" for speed ${s} exceeds 4 characters!`);
  });
});

console.log('\n5. Sitenin Hızı Ezmesini Engelleme (Prevent Site Override):');

it('Restores user speed when player resets rate to 1.0 after ads', () => {
  let mediaPlaybackRate = 1.0;
  let userSpeed = 1.75;
  let isInternalRateChange = false;
  let restoredCount = 0;
  const currentSettings = { preventSiteOverride: true };

  function onRateChange() {
    if (isInternalRateChange) return;

    const actualRate = mediaPlaybackRate;
    const preventOverride = currentSettings.preventSiteOverride !== false;

    if (preventOverride && userSpeed && Math.abs(actualRate - userSpeed) > 0.01) {
      isInternalRateChange = true;
      mediaPlaybackRate = userSpeed;
      restoredCount++;
      isInternalRateChange = false;
      return;
    }
  }

  // Set user speed
  isInternalRateChange = true;
  mediaPlaybackRate = 1.75;
  isInternalRateChange = false;

  // Simulate YouTube resetting to 1.0 after an advertisement
  mediaPlaybackRate = 1.0;
  onRateChange();

  // Verification: rate was restored back to user's 1.75!
  assert.strictEqual(mediaPlaybackRate, 1.75);
  assert.strictEqual(restoredCount, 1);
});

console.log('\n6. Internationalization (i18n):');

it('i18n keys for all features exist in en and tr dictionaries', () => {
  I18n.init('en');
  assert(I18n.t('rememberSiteSpeed').length > 0);
  assert(I18n.t('preventSiteOverride').length > 0);
  assert(I18n.t('showBadge').length > 0);
  assert(I18n.t('siteSpeedsTitle').length > 0);
  assert(I18n.t('saveForSite').length > 0);
  assert(I18n.t('customPresetsTitle').length > 0);
  assert(I18n.t('timeSavedTitle').length > 0);
  assert(I18n.t('abLoopTitle').length > 0);
  assert(I18n.t('mouseWheelSpeed').length > 0);
  assert(I18n.t('globalShortcutsTitle').length > 0);
  assert(I18n.t('hideInFullscreen').length > 0);
  assert(I18n.t('hideInFullscreenHint').length > 0);

  I18n.init('tr');
  assert.strictEqual(I18n.t('rememberSiteSpeed'), 'Site Bazlı Hız Hafızası');
  assert.strictEqual(I18n.t('preventSiteOverride'), 'Sitenin Hızı Ezmesini Engelle');
  assert.strictEqual(I18n.t('showBadge'), 'Rozette Hız Gösterimi');
  assert.strictEqual(I18n.t('siteSpeedsTitle'), 'Site Bazlı Hız Profilleri');
  assert.strictEqual(I18n.t('saveForSite'), 'Kaydet');
  assert.strictEqual(I18n.t('customPresetsTitle'), 'Hazır Hız Butonları');
  assert.strictEqual(I18n.t('timeSavedTitle'), 'Kazanılan Zaman');
  assert.strictEqual(I18n.t('abLoopTitle'), 'A-B Döngüsü');
  assert.strictEqual(I18n.t('mouseWheelSpeed'), 'Fare Tekerleğiyle Hız Ayarı');
  assert.strictEqual(I18n.t('globalShortcutsTitle'), 'Chrome Genel Kısayolları');
  assert.strictEqual(I18n.t('hideInFullscreen'), 'Tam Ekranda Kapsülü Gizle');
});

it('options.html contains hideInFullscreen toggle and overlayOpacityIdle slider supports min 0.0', () => {
  const optionsHtml = fs.readFileSync(path.join(__dirname, '../options/options.html'), 'utf8');
  assert(optionsHtml.includes('id="hideInFullscreen"'), 'hideInFullscreen checkbox exists');
  assert(optionsHtml.includes('id="overlayOpacityIdle"'), 'overlayOpacityIdle slider exists');
  assert(optionsHtml.includes('min="0.0"'), 'overlayOpacityIdle has min="0.0"');
});

console.log('\n7. Genel Kısayollar (chrome.commands):');

it('manifest.json conforms to Chrome maximum 4 suggested_key constraint and defines all commands', () => {
  const manifestRaw = fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);

  assert(manifest.commands, 'commands field must exist in manifest.json');
  assert(manifest.commands['increase-speed'], 'increase-speed command exists');
  assert(manifest.commands['decrease-speed'], 'decrease-speed command exists');
  assert(manifest.commands['reset-speed'], 'reset-speed command exists');
  assert(manifest.commands['toggle-fast'], 'toggle-fast command exists');
  assert(manifest.commands['toggle-ab-loop'], 'toggle-ab-loop command exists');

  // Chrome strictly limits suggested_key shortcuts to at most 4
  const commandsWithSuggestedKey = Object.keys(manifest.commands).filter(
    k => manifest.commands[k].suggested_key
  );
  assert(
    commandsWithSuggestedKey.length <= 4,
    `Chrome allows at most 4 suggested shortcuts, but found ${commandsWithSuggestedKey.length}`
  );

  assert.strictEqual(manifest.commands['increase-speed'].suggested_key.default, 'Alt+Shift+D');
  assert.strictEqual(manifest.commands['decrease-speed'].suggested_key.default, 'Alt+Shift+S');
  assert.strictEqual(manifest.commands['reset-speed'].suggested_key.default, 'Alt+Shift+R');
  assert.strictEqual(manifest.commands['toggle-fast'].suggested_key.default, 'Alt+Shift+G');
  assert(manifest.commands['toggle-ab-loop'].description, 'toggle-ab-loop has description');
});

console.log('\n8. Kaydedilen Zaman İstatistiği (Saved Time Statistics):');

it('Calculates time saved accurately and handles duration formatting', async () => {
  // Test math: watching 60 seconds at 2.0x saves 60 seconds
  const realDuration = 60; // 60s
  const speed = 2.0;
  const saved = realDuration * (speed - 1.0);
  assert.strictEqual(saved, 60);

  // Watching 600 seconds at 1.5x saves 300 seconds
  assert.strictEqual(600 * (1.5 - 1.0), 300);

  // Duration formatting tests
  assert.strictEqual(StorageManager.formatDuration(45, 'en'), '45s');
  assert.strictEqual(StorageManager.formatDuration(45, 'tr'), '45 sn');
  assert.strictEqual(StorageManager.formatDuration(180, 'en'), '3m');
  assert.strictEqual(StorageManager.formatDuration(180, 'tr'), '3 dk');
  assert.strictEqual(StorageManager.formatDuration(3600, 'en'), '1h');
  assert.strictEqual(StorageManager.formatDuration(3600, 'tr'), '1 saat');
  assert.strictEqual(StorageManager.formatDuration(3720, 'en'), '1h 2m');
  assert.strictEqual(StorageManager.formatDuration(3720, 'tr'), '1 sa 2 dk');

  // Date and Week identifiers
  const dateId = StorageManager.getDateIdentifier();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(dateId), `Date ID "${dateId}" matches YYYY-MM-DD`);
  const weekId = StorageManager.getWeekIdentifier();
  assert(/^\d{4}-W\d{2}$/.test(weekId), `Week ID "${weekId}" matches YYYY-Www`);

  // Record time saved persistence test
  await StorageManager.resetTimeStats();
  await StorageManager.recordTimeSaved(120);
  await StorageManager.recordTimeSaved(180);

  const stats = (await StorageManager.getSettings()).timeStats;
  assert.strictEqual(stats.totalSecondsSaved, 300);
  assert.strictEqual(stats.todaySecondsSaved, 300);
  assert.strictEqual(stats.thisWeekSecondsSaved, 300);

  // Reset stats verification
  await StorageManager.resetTimeStats();
  const resetStats = (await StorageManager.getSettings()).timeStats;
  assert.strictEqual(resetStats.totalSecondsSaved, 0);
  assert.strictEqual(resetStats.todaySecondsSaved, 0);
  assert.strictEqual(resetStats.thisWeekSecondsSaved, 0);
});

console.log('\n9. A-B Tekrar Döngüsü (A-B Loop):');

it('Handles A-B loop lifecycle, boundary seeking, and inverted point swapping', () => {
  const abLoop = { start: null, end: null, active: false };
  let mediaCurrentTime = 10.0;
  let playCalled = false;

  function setPointA(time) {
    abLoop.start = time;
    abLoop.end = null;
    abLoop.active = false;
  }

  function setPointB(time) {
    if (abLoop.start === null) {
      abLoop.start = Math.max(0, time - 5);
    }
    if (time <= abLoop.start) {
      const temp = abLoop.start;
      abLoop.start = time;
      abLoop.end = temp;
    } else {
      abLoop.end = time;
    }
    abLoop.active = true;
    mediaCurrentTime = abLoop.start;
  }

  function checkLoopBoundary() {
    if (abLoop.active && abLoop.start !== null && abLoop.end !== null) {
      if (mediaCurrentTime >= abLoop.end || mediaCurrentTime < abLoop.start - 0.5) {
        mediaCurrentTime = abLoop.start;
        playCalled = true;
      }
    }
  }

  // 1. Initial State
  assert.strictEqual(abLoop.start, null);
  assert.strictEqual(abLoop.active, false);

  // 2. Set Point A at 15.0s
  setPointA(15.0);
  assert.strictEqual(abLoop.start, 15.0);
  assert.strictEqual(abLoop.end, null);
  assert.strictEqual(abLoop.active, false);

  // 3. Set Point B at 40.0s
  setPointB(40.0);
  assert.strictEqual(abLoop.start, 15.0);
  assert.strictEqual(abLoop.end, 40.0);
  assert.strictEqual(abLoop.active, true);
  assert.strictEqual(mediaCurrentTime, 15.0); // Seeks to loop start

  // 4. Video reaches Point B -> loops back to A
  mediaCurrentTime = 40.0;
  checkLoopBoundary();
  assert.strictEqual(mediaCurrentTime, 15.0);
  assert.strictEqual(playCalled, true);

  // 5. Inverted points: user sets A at 50.0s then sets B at 20.0s -> properly swapped
  setPointA(50.0);
  setPointB(20.0);
  assert.strictEqual(abLoop.start, 20.0);
  assert.strictEqual(abLoop.end, 50.0);
  assert.strictEqual(abLoop.active, true);
  assert.strictEqual(mediaCurrentTime, 20.0);
});

console.log('\n10. Fare Tekerleğiyle Hız Ayarı (Mouse Wheel):');

it('Adjusts speed incrementally on mouse wheel scrolls with threshold filtering', () => {
  let currentSpeed = 1.0;
  const speedStep = 0.1;
  let accumulatedWheelDelta = 0;
  const threshold = 40;

  function onWheel(deltaY, enabled = true) {
    if (!enabled) return;
    accumulatedWheelDelta += deltaY;
    if (Math.abs(accumulatedWheelDelta) >= threshold) {
      const dir = accumulatedWheelDelta < 0 ? 1 : -1;
      accumulatedWheelDelta = 0;
      currentSpeed = Math.round((currentSpeed + dir * speedStep) * 100) / 100;
    }
  }

  // Scroll UP (deltaY = -50) -> Faster (+0.1)
  onWheel(-50, true);
  assert.strictEqual(currentSpeed, 1.1);

  // Scroll UP again
  onWheel(-50, true);
  assert.strictEqual(currentSpeed, 1.2);

  // Scroll DOWN (deltaY = 50) -> Slower (-0.1)
  onWheel(50, true);
  assert.strictEqual(currentSpeed, 1.1);

  // Disabled mouse wheel test
  onWheel(-100, false);
  assert.strictEqual(currentSpeed, 1.1, 'Speed should not change when mouse wheel setting is disabled');
});

console.log('\n11. Hazır Hızları Özelleştirme (Custom Speed Presets):');

it('Handles customizable speed presets merging, sanitization, and sorting', () => {
  // Default presets exist
  assert(Array.isArray(DEFAULT_SETTINGS.customPresets));
  assert(DEFAULT_SETTINGS.customPresets.includes(1.0));
  assert(DEFAULT_SETTINGS.customPresets.includes(2.0));

  // Merging with custom user list: removes duplicates, filters invalid, sorts ascending
  const merged = StorageManager._mergeDefaults({
    customPresets: [2.5, 1.25, 1.25, 0.5, 3.5, -1, 'invalid', 18]
  });

  assert.deepStrictEqual(merged.customPresets, [0.5, 1.25, 2.5, 3.5]);

  // Fallback to defaults when empty array provided
  const fallback = StorageManager._mergeDefaults({ customPresets: [] });
  assert.deepStrictEqual(fallback.customPresets, DEFAULT_SETTINGS.customPresets);
});

console.log(`\n========================================`);
console.log(`Result: ${testsPassed} / ${totalTests} tests passed.`);
console.log(`========================================\n`);

