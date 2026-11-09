# 🕒 薪資時鐘 (Salary Clock)

> 一個極致輕量、流暢、隱私優先的即時薪資視覺化工具。精準計算每一微秒的工時價值，將努力轉化為實體獎勵（如咖啡、便當、雞排），讓工作的每分付出都清晰可見！

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)](#-核心特色)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange.svg)](#-核心特色)
[![Tests Passing](https://img.shields.io/badge/Tests-236%20Pass-success.svg)](test/engine.test.mjs)

👉 **線上免安裝立即體驗 (Live Demo)**：[https://salary-clock-378.pages.dev/](https://salary-clock-378.pages.dev/)

---

## ✨ 核心特色

1. **隨開即用，零配置門檻 (Zero Setup)**
   - 打開網頁即可自動起跑，不需複雜的日曆同步或初始化設定。
2. **100% 本機隱私與安全 (Privacy First)**
   - 所有薪資設定僅保存在本機 `localStorage`，零 Cookie、零後端連線、零資料上傳。
3. **原生桌面置頂懸浮 (Document PiP)**
   - 採用瀏覽器最新 Document Picture-in-Picture API，網頁也能在桌面右下角以獨立小視窗永遠置頂，免裝肥大軟體。
4. **4 位數微秒機械滾輪 (Slot Machine Reel)**
   - 英雄卡末 4 位數具備平滑流暢的老虎機垂直機械位移，帶來極佳視覺滿足感。
5. **雙重防窺老闆鍵 (Boss Key)**
   - 按 `B` 或 `Esc` 瞬間切換為星號遮罩或低調數位時鐘，同事主管走近不尷尬。
6. **帶薪摸魚即時碼錶 (Paid Poop Break)**
   - 點擊即刻啟動，具備待命睡眠防過度漂移保護與下班時間自動截斷，純當下爽感零儲存負擔。
7. **每月發薪日倒數與噴錢慶祝 (Payday Celebration)**
   - 自動倒數發薪日；發薪當日滿天金幣雨與 Web Audio 賀彩樂音，支援 Esc 瞬間斷音急煞與點擊回味重播。
8. **PWA 支援與離線秒開 (Offline PWA)**
   - 支援安裝為桌面或手機獨立 App，無網路環境亦能秒速開啟。
9. **純 Web Audio 合成音效**
   - 零外部音訊檔案，千元里程碑與發薪日音效純代碼合成，預設靜音、防窺時自動靜音。

---

## 🚀 快速上手 (Quick Start)

本專案為純靜態網頁，**完全無建置流程 (No Build Step)**：

### 本地直接執行
```bash
# 使用 npx 快速預覽
npx serve .

# 或使用 Python 內建伺服器
python -m http.server 8080
```
瀏覽器開啟 `http://localhost:8080` 即可使用。

---

## 📚 專案文件導覽 (Documentation)

更深入的技術細節與設計架構，請參閱 `docs/` 文件夾：

- 🛠️ **[技術棧文件 (Tech Stack)](docs/TECH_STACK.md)**：使用的現代 Web API、CSS 規範與純原生架構說明。
- 🏛️ **[系統架構文件 (Architecture)](docs/ARCHITECTURE.md)**：模組分層、目錄對照、狀態生命週期與資料流動圖。
- 🧠 **[設計邏輯與演算法 (Design Logic)](docs/DESIGN_LOGIC.md)**：淨工時排除、跨月首週工作天換算、防睡眠漂移與數值公式。
- 🤖 **[AI Agent 開發指引 (AGENT.md)](AGENT.md)**：專為 AI 助理與開發者設計的快速掌握手冊與不變原則。
- 📱 **[跨平台原生打包指引 (Platform Guide)](docs/PLATFORM_GUIDE.md)**：Tauri 桌面版與 Android 原生常駐服務規劃。
- 📋 **[需求規格說明書 (Requirements)](docs/REQUIREMENTS.md)**：原始桌面版概念剖析與功能規劃規格。

---

## 🧪 單元測試 (Unit Tests)

專案配備完整測試套件，涵蓋演算法運算、跨月防縮水、發薪日倒數、音效容錯與 PWA 檢驗：

```bash
npm test
# 或
node test/engine.test.mjs
```

---

## 💡 專案緣起與鳴謝 (Credits)

- **概念發起人**：感謝 [@duratgw0413 在 Threads 上的概念發起與程式實作分享](https://www.threads.com/@duratgw0413/post/Dc2-zrRGMUX)
- **討論串發起人**：感謝 [@termcavetw 發起的 Threads 討論串交流](https://www.threads.com/@termcavetw/post/DcyMmfQDzqw)

---

## 📄 授權條款 (License)

本專案採用 [MIT 授權條款](LICENSE) 開源釋出。歡迎任何人自由使用、修改與二次分發。
