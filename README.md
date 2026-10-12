# Pacelet — Video Speed Controller

<p align="center">
  <strong>A minimalist, ultra-fast, and unobtrusive HTML5 video speed controller with pitch preservation.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-38bdf8.svg?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4.svg?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/Zero-Dependencies-emerald.svg?style=flat-square" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/License-MIT-slate.svg?style=flat-square" alt="License: MIT" />
</p>

---

## ⚡ What is Pacelet?

**Pacelet** is an open-source, privacy-first browser extension that gives you seamless, granular control over any HTML5 video and audio playback across the web (YouTube, Netflix, Twitch, Coursera, Udemy, Vimeo, and more).

Unlike cluttered alternatives with bloated overlays, tracking scripts, or neon UI gradients, Pacelet stays out of your way:
* **Distraction-Free:** A featherweight, draggable matte pill on the video player that fades when you're watching.
* **Natural Sound (Pitch Preservation):** Speeds up audio without turning voices into squeaky chipmunks.
* **Reflex Hotkeys:** Effortlessly change playback speed or skip backwards/forwards without ever lifting your hands to the mouse.
* **Zero Telemetry:** 100% client-side, offline-capable, and completely private.

---

## ✨ Key Features

- **🎯 Pitch Correction (`preservesPitch`):** Maintains natural vocal timbre and audio clarity even at 2×, 3×, or higher speeds.
- **⏱️ Time Saved Tracker:** Automatic real-time statistics showing how many hours and minutes you saved by accelerating videos this week and all time (e.g., "Saved 3h 12m this week 🚀").
- **🔁 A-B Repeat Loop:** Select Point A and Point B to loop video segments seamlessly—ideal for language learners, tutorials, and musicians.
- **🖱️ Mouse Wheel Speed Tuning:** Smoothly adjust speed by scrolling the mouse wheel directly over the video controller capsule without scrolling the webpage.
- **⚡ Customizable Speed Presets:** Select and customize quick speed preset buttons (e.g. 0.75×, 1.25×, 2.5×) in Settings, rendered dynamically in the Popup.
- **🌐 Global Browser Shortcuts (`chrome.commands`):** Change playback speed even when the video page is not in active focus using Chrome global hotkeys (`Alt+Shift+D`, `Alt+Shift+S`, `Alt+Shift+R`, `Alt+Shift+G`, `Alt+Shift+L`).
- **🌐 Per-Site Speed Memory:** Remember custom default playback speeds per website (e.g. YouTube at 1.5×, Udemy at 1.25×).
- **🏷️ Toolbar Badge Display:** Displays the current active speed right over the extension toolbar icon (e.g. `1.5`, `1.25`, `2`) without needing any extra permissions.
- **🛡️ Player Override Protection:** Automatically restores your selected speed if video players or mid-roll advertisements (like YouTube ads) attempt to force playback back to 1.0×.
- **💾 JSON Backup & Export/Import:** Export your personalized shortcuts, site speeds, and preferences to a JSON backup file and import it anytime across devices.
- **🛡️ Isolated Shadow DOM:** The on-player controller styles never leak into webpage styles, and site stylesheets cannot break Pacelet.
- **⚡ Granular Speed Control:** Step by 0.05×, 0.1×, or any custom increment up to 16.0×.
- **⌨️ Muscle-Memory Shortcuts:** Fully customizable hotkeys (`D` to speed up, `S` to slow down, `R` to reset, `G` to quick-toggle, `L` to A-B loop, etc.).
- **👆 Draggable & Auto-Dimming:** Drag the speed badge anywhere on the screen. It automatically fades when idle and illuminates on hover.
- **🚀 YouTube SPA Compatible:** Seamlessly persists across YouTube video changes, playlists, and full-screen toggles.
- **🚫 Site Blacklist:** Disable Pacelet on specific websites with a single click.
- **🌍 Bilingual & i18n:** Full native English and Turkish support (auto-detects browser locale, with instant manual toggle in Settings).

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Global (Chrome Commands) | Action | Description |
| :---: | :---: | :--- | :--- |
| <kbd>D</kbd> | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> | **Increase Speed** | Accelerates playback by the configured step (Default: `+0.10×`) |
| <kbd>S</kbd> | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | **Decrease Speed** | Decelerates playback by the configured step (Default: `-0.10×`) |
| <kbd>R</kbd> | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> | **Reset Speed** | Instantly resets playback speed back to `1.00×` |
| <kbd>G</kbd> | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> | **Quick Speed Toggle** | Toggles between preferred speed (Default: `1.80×`) and previous speed |
| <kbd>L</kbd> | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> | **A-B Loop** | Sets Point A, then Point B, or clears active loop |
| <kbd>Z</kbd> | — | **Rewind** | Seeks backward (Default: `-10s`) |
| <kbd>X</kbd> | — | **Advance** | Seeks forward (Default: `+10s`) |
| <kbd>V</kbd> | — | **Toggle Overlay** | Shows or hides the floating on-screen controller pill |
| <kbd>M</kbd> | — | **Toggle Mute** | Mutes or unmutes the active media player |

> *Note: In-page shortcuts are intelligently disabled when typing in text fields, comments, or search bars (`<input>`, `<textarea>`, `contenteditable`). Global Chrome shortcuts work everywhere even outside page focus and can be reconfigured at `chrome://extensions/shortcuts`.*

---

## 🛠️ Installation

### Option 1: Chrome Web Store
*(Coming soon once published)*

### Option 2: Manual / Developer Mode

1. **Download this repository:**
   - Click the green **"<> Code"** button at the top right of this page and select **"Download ZIP"**.
   - Extract the downloaded ZIP file to any folder on your computer.
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** in the top-left corner.
5. Select the extracted project folder (the folder containing `manifest.json`).
6. Done! Pacelet is now active on all HTML5 video players.

---

## 📦 Project Structure

```text
pacelet/
├── manifest.json              # Chrome Manifest V3 configuration
├── shared/
│   └── storage.js             # Shared settings engine & storage synchronization
├── content/
│   ├── content.js             # Media scanning, Shadow DOM pill & event listeners
│   └── overlay.css            # Scoped controller styling
├── popup/
│   ├── popup.html             # Toolbar menu interface
│   ├── popup.css              # Compact modern dark-mode styles
│   └── popup.js               # Quick speed presets & tab messenger
├── options/
│   ├── options.html           # Full settings dashboard
│   ├── options.css            # Settings styling
│   └── options.js             # Interactive key recorder, blacklist & JSON export
├── assets/
│   └── icons/                 # Crisp 16x16, 48x48, 128x128 extension icons
└── README.md                  # Project documentation
```

---

## 📝 Chrome Web Store Description Template

When submitting to the Chrome Web Store, you can use the following metadata:

**Title:** `Pacelet — Video Speed Controller`  
**Summary:** `Minimalist HTML5 video speed controller with pitch preservation, customizable shortcuts, and an unobtrusive overlay.`  

**Detailed Description:**
```text
Pacelet is a clean, modern, and lightning-fast video speed controller for Google Chrome.

Speed up, slow down, advance, or rewind any HTML5 video on YouTube, Netflix, Twitch, Coursera, Udemy, and virtually any other website with customizable keyboard shortcuts.

KEY FEATURES:
• Pitch Preservation: Audio voices remain natural and intelligible without chipmunk distortion even at high speeds.
• Unobtrusive Overlay: A compact, draggable matte pill sits quietly on the video and dims automatically during playback.
• Reflex Hotkeys: Press 'D' to speed up, 'S' to slow down, 'R' to reset to 1.0x, or customize your own keys.
• Granular Precision: Adjust speed in smooth 0.05x or 0.1x increments up to 16.0x.
• Lightweight & Private: Zero trackers, zero ads, zero third-party scripts. Runs 100% locally on your machine.
• Dark Mode UI: Carefully crafted neutral dark theme inspired by modern desktop tools.
• Site Blacklist: Easily disable on specific domains when desired.

DEFAULT SHORTCUTS:
[D] Increase Speed (+0.1x)
[S] Decrease Speed (-0.1x)
[R] Reset Speed (1.0x)
[G] Toggle Preferred Fast Speed (1.8x)
[Z] Rewind (-10s)
[X] Forward (+10s)
[V] Hide/Show On-screen Controller
[M] Mute/Unmute

Open source under the MIT License.
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to open an issue or submit a pull request on GitHub.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
