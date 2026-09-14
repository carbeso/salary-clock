# 🕒 薪資時鐘 (Salary Clock) - 即時薪資視覺化工具

一個輕量、流暢、隱私優先的即時薪資視覺化工具。精準計算工作日每一微秒的收入累積，並將努力換算為實體獎勵（例如：咖啡、雞排、便當），讓每一刻的工作付出都看得見！

支援最新 Chrome / Edge 原生 **畫中畫置頂懸浮視窗 (Document PiP)** 與 **一鍵老闆鍵防窺保護**。

---

## 💡 專案緣起與鳴謝 (Credits)

本專案的核心構想參考自社群同好優秀的「即時薪水計時器 / 薪資時鐘」概念。因深感在漫長工作日中看著微小進度跳動能帶來極大心理慰藉，特此以現代化 Web 技術與更嚴謹的工時演算法重構此版本：

- **原始概念討論串**：感謝 [@termcavetw 在 Threads 上的發想討論](https://www.threads.com/@termcavetw/post/DcyMmfQDzqw)
- **參考程式概念**：感謝 [@duratgw0413 在 Threads 上的程式實作概念分享](https://www.threads.com/@duratgw0413/post/Dc2-zrRGMUX)

本版本在此基礎上進一步重構與功能延伸：
- 升級為 **Document Picture-in-Picture API**，不需安裝第三方軟體即可在 Windows 桌面置頂懸浮。
- 引入 **4 位數老虎機微秒級轉輪 (Slot Machine Reel)**，極致流暢且精準對齊。
- 加入嚴謹的淨工時防漂移、午休凍結、平閏年換算與工作日/自由接案雙模式。

歡迎社群同好自由 Fork、提出 PR 或分享修改建議！

---

## ✨ 核心特色

1. **4 位數微秒老虎機滾輪**
   - 英雄卡數字末 4 位數採用垂直機械滾輪動畫，毫秒級轉動帶來源源不絕的滿足感。
   - 經像素級垂直居中校正，切換維度平滑無卡頓。

2. **原生桌面置頂懸浮 (Document PiP)**
   - 運用最新瀏覽器標準 Document Picture-in-Picture API。
   - 無需安裝龐大的 Electron 軟體，直接以輕量獨立小視窗懸浮在桌面最上層。

3. **老闆鍵與防窺雙重保護**
   - 主畫面支援快速鍵 `B` 或 `Esc` 快速切換防窺模式。
   - 懸浮小視窗支援點擊直接切換防窺；防窺時自動偽裝為低調數位時鐘或星號遮罩，避免在主管或同事面前露出薪資數字。

4. **多維度累計與換算參考**
   - 提供「今日」、「本週」、「本月」三種累積金額切換。
   - 動態換算「每秒 / 每分 / 每時 / 每天」產值，一目了然。

5. **趣味戰利品進度牆**
   - 自動將當前收益換算為咖啡、雞排、便當、電影票、大麥克或拉麵。
   - 預設精簡顯示前 30 個戰利品圖示，並支援一鍵展開/收合全部，兼顧成就感與效能。

6. **100% 隱私安全 (LocalStorage 純本地儲存空間)**
   - 純本機運作，所有薪資設定皆保存在瀏覽器的 `LocalStorage` 本機儲存空間中。
   - 不使用 Cookie（避免資料隨 HTTP 請求往返伺服器），零網路連線、零追蹤、零上傳，徹底杜絕外洩風險。

---

## 🗺️ 專案藍圖 (Roadmap)

- [x] **Web 網頁版**：純靜態零依賴 Vanilla JS 架構，支援現代桌面瀏覽器與 Document PiP。
- [ ] **Windows 原生桌面版 (Tauri v2)**：
  - 規劃以 Tauri v2 + Rust 建置，原生支援系統匣 (System Tray)、全螢幕遊戲覆蓋 (Game Overlay) 與全域老闆鍵快速鍵 (`Win + Alt + B`)。
- [ ] **Android 原生 App (Capacitor)**：
  - 規劃使用 Capacitor 封裝，搭配 Android 前景常駐服務 (Foreground Service)，支援常駐通知欄即時跳動與桌面小工具 (App Widget)。
- [ ] **macOS / iOS 平台說明**：
  - ⚠️ **暫無發行計畫**：因目前開發者缺乏 Mac 電腦、iPhone 實體硬體設備及 Apple 開發者帳號 (Apple Developer Program)，短期內無法進行建置、除錯與上架。未來若有設備支援或社群夥伴願意協助打包發布，十分歡迎 PR 協作！

---

## 🚀 快速上手 (本地執行)

本專案無任何建置步驟（No Build Step），任何現代瀏覽器皆可直接運行：

### 方法一：直接點擊
雙擊 `index.html` 即可在瀏覽器開啟。*(註：部分瀏覽器限制 `file://` 協議下的進階 PiP API，建議使用本地伺服器)*

### 方法二：本地 HTTP 伺服器 (推薦)
使用 Laragon、Live Server 或指令列工具：

```bash
# 使用 npx serve
npx serve .

# 或使用 Python 內建伺服器
python -m http.server 8080
```
開啟瀏覽器前往 `http://localhost:8080` 即可體驗完整功能。

---

## 🌐 Cloudflare Pages 免費公開部署教學

本專案完全為靜態檔案，非常推薦使用 **Cloudflare Pages** 進行全球免費託管發布：

### 步驟說明：
1. **將專案推送到 GitHub**：
   - 依下述「Git 提交流程」將程式碼推送至您的 GitHub 個人儲存庫。
2. **登入 Cloudflare Dashboard**：
   - 前往 [Cloudflare 儀表板](https://dash.cloudflare.com/)。
   - 進入左側選單的 **「Workers 和 Pages」 (Workers & Pages)** -> 點選 **「建立應用程式」 (Create application)** -> 選擇 **「Pages」** 標籤頁。
3. **連結 GitHub 儲存庫**：
   - 點選 **「連線至 Git」 (Connect to Git)** 並授權選取 `salary-clock` 儲存庫。
4. **設定建置參數 (Build Settings)**：
   - **專案名稱 (Project name)**：可自訂，如 `salary-clock`。
   - **生產分支 (Production branch)**：選擇 `main`。
   - **架構預設 (Framework preset)**：選擇 `None`。
   - **建置命令 (Build command)**：**留空**（不需要任何編譯指令）。
   - **建置輸出目錄 (Build output directory)**：填入 `/` 或留空。
5. **儲存並部署 (Save and Deploy)**：
   - 點擊「儲存並部署」，Cloudflare 會在數秒內完成全球 CDN 發布，並提供一個專屬網址（例如 `https://salary-clock.pages.dev`）供任何人公開訪問！

---

## 🧪 單元測試

本專案針對核心計薪演算法、淨工時折算、平閏年天數與工作日排程撰寫了完整的單元測試：

```bash
node test/engine.test.mjs
```

---

## 📄 授權條款 (License)

本專案採用 [MIT 授權條款](LICENSE) 開源釋出。歡迎任何人自由使用、修改與二次分發。
