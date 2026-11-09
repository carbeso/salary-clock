# 🛠️ 薪資時鐘 (Salary Clock) - 技術棧文件 (Tech Stack)

本文件詳述「薪資時鐘」所採用的技術選型、原生 Web API 標準、架構原則與測試環境。

---

## 🌟 核心架構哲學

1. **零外部依賴 (Zero Runtime Dependencies)**：
   - 不使用 React、Vue、Angular、jQuery 等前端框架，亦不依賴 lodash、moment、dayjs、Bootstrap 等任何第三方 Runtime 套件。
   - 保持極致輕量（全專案靜態檔案小於 100KB），隨開即用，無需 `npm install` 即可在任何現代瀏覽器中原生運行。
2. **無建置流程 (No Build Step / No Bundler)**：
   - 無需 Webpack、Vite、Rollup 等打包工具或 Babel 編譯轉換。
   - 所有原始碼均以標準瀏覽器原生 ES Modules (`<script type="module">`) 直接載入。
3. **100% 本機隱私與離線可用 (Privacy First & Offline Ready)**：
   - 零伺服器後端，不進行任何遠端 API 請求與使用者行為追蹤。
   - 零 Cookie，所有使用者偏好僅儲存在本機 `localStorage`。
   - 支援 PWA (Progressive Web App) 與 Service Worker 離線快取，無網路環境亦可秒開運行。

---

## 📐 前端技術棧與語法標準

### 1. 核心語言標準
| 領域 | 技術與規範 | 說明 |
| :--- | :--- | :--- |
| **HTML** | HTML5 語義化標籤 | 包含 `<template>`（PiP HUD 樣板）、`<dialog>`/客製 Modal、`<canvas>`（金幣雨慶祝）等。 |
| **CSS** | 現代 CSS3 規範 | 深度運用 **CSS Custom Properties (Variables)**、Flexbox、CSS Grid、`backdrop-filter` 磨砂毛玻璃特效、CSS Keyframe 高效能硬體加速動畫。 |
| **JavaScript** | ECMAScript 2022+ (ES Modules) | 原生 `import` / `export` 模組劃分，採用類別 (Classes)、可選串連 (`?.`)、空值合併 (`??`) 與非同步 API。 |

### 2. 現代瀏覽器專用 Web API
本專案充分利用現代瀏覽器提供的先進 Web API，達到以往必須安裝龐大桌面軟體才能實現的功能：

- **Document Picture-in-Picture API (`window.documentPictureInPicture`)**：
  - 突破以往視訊畫中畫 (Video PiP) 的限制，支援在獨立桌面置頂視窗中渲染任意 HTML/CSS 內容。
  - 將主網頁的計薪 HUD 與縮小化控制項無縫投射至桌面右下角，支援點擊切換老闆鍵防窺與同步即時金額。
- **Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)**：
  - **純程式碼合成音效**：使用正弦波 (Sine) 與三角波 (Triangle) 進行頻率漸變與振幅包絡控制，合成清脆收銀機聲 (`playKaChingSound`) 與發薪日上行琵音 (`playPaydayFanfare`)。
  - **零音訊檔案依賴**：完全不載入 `.mp3` 或 `.wav` 等外部檔案，節省流量並消除網路加載延遲。
  - **急煞靜音機制 (`stopAllSounds`)**：維護中斷佇列，在使用者按 Esc、啟動老闆鍵或視窗失焦時立即將增益歸零並中斷，杜絕辦公室尷尬。
- **Service Worker API & Web App Manifest (PWA)**：
  - `manifest.webmanifest`：定義應用名稱、圖示 (`icons/icon.svg`)、啟動色彩與獨立視窗模式 (`display: "standalone"`)，可直接在 Windows / macOS / Android / iOS 安裝為獨立 App。
  - `sw.js`：實作 `install`、`activate` 與 `fetch` 攔截，採 Cache-first 策略快取核心 HTML/CSS/JS 靜態資源，達成離線秒開。
- **Screen Wake Lock API (`navigator.wakeLock`)**：
  - 在使用者切換至「橫向全螢幕時鐘」模式時，自動請求螢幕常亮鎖定，防止電腦或手機因閒置休眠鎖定。
  - 退出時鐘模式或切換分頁時自動釋放，具備冪等性與安全容錯。
- **Canvas 2D API (`HTMLCanvasElement`)**：
  - 發薪日慶祝的動態金幣雨特效採用純原生 Canvas 粒子系統，配合 `requestAnimationFrame` 進行高效能物理模擬（重力、水平飄移與旋轉）。
- **Web Storage API (`localStorage`)**：
  - 負責使用者偏好設定（薪資額度、工作起訖時間、午休設定、幣別符號、小數點位數、防窺樣式等）的本機持久化。

---

## 🧪 測試環境與工具鏈

| 項目 | 選型 | 說明 |
| :--- | :--- | :--- |
| **執行環境** | Node.js (v18+ LTS) | 採用原生 ESM 模式執行測試，無需 Babel 或 ts-node。 |
| **測試框架** | 純原生測試驅動 (`test/engine.test.mjs`) | 使用 Node.js 內建 `assert` 模組，不引入 Jest/Mocha/Vitest 等龐大框架，測試執行時間 < 300ms。 |
| **測試涵蓋範圍** | 236+ 項單元與整合測試 | 涵蓋：<br>1. 核心計薪引擎（連續制、工作日制、有效工時與午休扣除）<br>2. 跨月與跨年邊界換算（防縮水邏輯）<br>3. 發薪日倒數計算（平閏年月底安全夾取）<br>4. 帶薪摸魚碼錶邏輯（睡眠防漂移與下班截斷）<br>5. Web Audio 音效降級與容錯性<br>6. PWA 資源、Web Manifest 與 Service Worker 結構驗證<br>7. DOM 結構、鍵盤無障礙與防窺隱私安全保護 |

---

## ☁️ 部署與託管平台

由於專案全為靜態資源，可部署於任何靜態網頁代管服務：
- **Cloudflare Pages**（官方 Demo 推薦）：全球 Anycast CDN，秒級部署，內建 HTTPS。
- **GitHub Pages**：直接於儲存庫設定 `Settings -> Pages`，分支選取 `main` 即可發布。
- **Vercel / Netlify / Firebase Hosting**：零設定支援。
