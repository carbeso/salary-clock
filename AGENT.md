# 🤖 AI Agent 快速上手指南 (AGENT.md)

> **給其他 AI 助理 (AI Coding Assistant / Agent) 的指引**：
> 當你被指派維護、擴充或除錯此專案時，**請先完整閱讀本指南**。這能讓你在 30 秒內掌握專案架構、開發哲學與關鍵約束，避免寫出違反專案原則的程式碼。

---

## ⚡ 專案 30 秒全貌 (Quick Orientation)

- **專案名稱**：薪資時鐘 (Salary Clock)
- **定位**：輕量、流暢、隱私優先的即時薪資視覺化工具。將每微秒收入換算為實體獎勵，支援桌面畫中畫 (Document PiP)、老闆鍵防窺、帶薪摸魚碼錶、發薪日慶祝與離線 PWA。
- **架構特質**：**純原生 Vanilla Web 架構**（HTML5 + 現代 CSS3 + 原生 ES Modules），**完全零打包步驟 (No Build Step)**、**完全零執行期依賴 (Zero Runtime Dependencies)**。
- **線上展示**：[https://salary-clock-378.pages.dev/](https://salary-clock-378.pages.dev/)

---

## 🛡️ 核心黃金原則 (Golden Rules & Invariants)

在為本專案新增或修改任何程式碼時，**請嚴格遵守以下準則**：

1. **嚴禁引入任何 npm 執行期套件或打包工具**：
   - ❌ 禁止 `npm install` 任何前端框架 (React/Vue)、日期工具 (moment/dayjs)、或 CSS 函式庫。
   - ✅ 一律使用原生現代 Web API、CSS 原生變數與標準 ES Modules (`import`/`export`)。
2. **100% 本機端隱私，零雲端同步**：
   - ❌ 嚴禁使用 Cookie、遠端後端 API 或追蹤分析腳本。
   - ✅ 使用者偏好設定一律僅儲存於 `localStorage`。
3. **純當下爽感，不製造儲存負擔 (Zero Storage Burden)**：
   - ❌ 嚴禁過度設計（如加班累積紀錄、歷史摸魚統計資料庫）。
   - ✅ 暫時性操作（如「帶薪摸魚碼錶」、「發薪慶祝特效」）一律採**純記憶體暫存 (RAM volatile state)**，分頁關閉即自然重設。
4. **零外部音訊檔案，純 Web Audio 合成**：
   - ❌ 嚴禁載入任何 `.mp3`、`.wav` 或 `.ogg` 音訊檔。
   - ✅ 一律使用 Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) 純程式碼頻率合成。
   - ⚠️ 音效預設必須保持**靜音 (`soundEnabled: false`)**；防窺狀態下嚴格禁止發聲；必須支援 `stopAllSounds()` 瞬間斷音急煞。
5. **標準協作與分支合併流程**：
   - ❌ 嚴禁在本地直接 merge 並 push 到 `main` 分支。
   - ✅ 必須透過 GitHub 線上 Pull Request 機制進行審查與合併 (`gh pr merge`)。
6. **測試驅動與 100% 通過保證**：
   - 任何程式碼改動後，**必須執行 `npm test`（或 `node test/engine.test.mjs`）**，且所有 236+ 項單元與整合測試必須 100% 通過。

---

## 🗺️ 程式碼目錄對照表 (Codebase Map)

| 檔案路徑 | 模組類別 | 關鍵職責 |
| :--- | :--- | :--- |
| [`index.html`](file:///home/antigravity/carbeso/salary-clock/index.html) | View / UI | 語義化 HTML5 標籤、設定抽屜、PiP 樣板、摸魚戰報與發薪慶祝彈窗 |
| [`src/core/engine.js`](file:///home/antigravity/carbeso/salary-clock/src/core/engine.js) | Core Logic | 計算主入口 `calculateSalary`、工作日模式、連續制模式、發薪日倒數 |
| [`src/core/time-service.js`](file:///home/antigravity/carbeso/salary-clock/src/core/time-service.js) | Core Logic | 平閏年計算、跨月首週工作天換算（防縮水邏輯）、淨工時折算 |
| [`src/core/storage.js`](file:///home/antigravity/carbeso/salary-clock/src/core/storage.js) | Storage | `loadConfig()`, `saveConfig()`, `DEFAULT_CONFIG`（零 Cookie） |
| [`src/utils/formatters.js`](file:///home/antigravity/carbeso/salary-clock/src/utils/formatters.js) | Utilities | 貨幣金額、碼錶格式、中文時間字串、百分比轉換 |
| [`src/utils/sound.js`](file:///home/antigravity/carbeso/salary-clock/src/utils/sound.js) | Utilities | Web Audio 純代碼金幣聲 (`playKaChingSound`)、發薪樂音 (`playPaydayFanfare`)、斷音 (`stopAllSounds`) |
| [`src/ui/boss-key.js`](file:///home/antigravity/carbeso/salary-clock/src/ui/boss-key.js) | UI Controller | 老闆鍵控制器：支援星號遮罩 (`mask`) 與數位時鐘 (`clock`) |
| [`src/ui/pip-controller.js`](file:///home/antigravity/carbeso/salary-clock/src/ui/pip-controller.js) | UI Controller | Document Picture-in-Picture API 桌面懸浮控制器與 HUD 樣式同步 |
| [`src/ui/app.js`](file:///home/antigravity/carbeso/salary-clock/src/ui/app.js) | Main App | 主控制器：事件協調、老虎機滾輪、摸魚碼錶、發薪慶祝、設定抽屜、焦點陷阱 |
| [`src/ui/styles.css`](file:///home/antigravity/carbeso/salary-clock/src/ui/styles.css) | Styles | CSS 變數系統、毛玻璃效果、按鈕樣式、摸魚列與發薪橫幅 |
| [`manifest.webmanifest`](file:///home/antigravity/carbeso/salary-clock/manifest.webmanifest) | PWA | PWA 規格檔，設定 `display: standalone` 與圖示 |
| [`sw.js`](file:///home/antigravity/carbeso/salary-clock/sw.js) | PWA | Service Worker 離線快取（Cache-first 靜態檔案） |
| [`test/engine.test.mjs`](file:///home/antigravity/carbeso/salary-clock/test/engine.test.mjs) | Testing | 純原生 Node.js 測試套件（236+ 項測試，斷言覆蓋演算法、DOM、音效、PWA） |

---

## ⚙️ 設定規格 (Config Schema)

所有設定均在 [`src/core/storage.js`](file:///home/antigravity/carbeso/salary-clock/src/core/storage.js) 透過 `DEFAULT_CONFIG` 定義：

```javascript
{
    salaryMode: 'workday',         // 'workday' (工作日模式) 或 'continuous' (全月連續制)
    monthlySalary: 40000,          // 月薪金額
    workStart: '09:00',            // 上班時間 (HH:mm)
    workEnd: '18:00',              // 下班時間 (HH:mm)
    breakEnabled: true,            // 是否扣除午休
    breakStart: '12:00',           // 午休開始 (HH:mm)
    breakEnd: '13:00',             // 午休結束 (HH:mm)
    payday: 5,                     // 每月發薪日 (1 ~ 31，邊界月份安全夾取)
    currencySymbol: 'NT$',         // 幣別符號
    decimalDigits: 2,              // 小數點位數 (2: 秒跳，4: 微秒老虎機滾輪)
    showThousandSeparator: true,   // 是否顯示千分位
    soundEnabled: false,           // 音效開關 (預設 false，尊重辦公室安靜)
    rewardType: 'latte',           // 激勵指標 ('latte', 'bigmac', 'etf0050', 'tsmc', 'bubbletea', 'custom')
    bossKeyDisguise: 'mask'        // 老闆鍵模式 ('mask': 星號遮罩, 'clock': 數位時鐘)
}
```

---

## 🧪 如何執行測試與驗證 (Testing)

專案測試完全不依賴任何外部套件，直接透過 Node.js 內建指令秒級執行：

```bash
# 執行完整測試套件
npm test

# 或直接以 node 執行
node test/engine.test.mjs
```

預期結果：
```
🎉 全部 236/236 項單元測試成功通過！核心運算、防窺隱私、效能快取與無障礙體驗驗證精確無誤。
```

### 新增功能的測試規範：
當你在專案中新增任何核心功能時，**必須在 [`test/engine.test.mjs`](file:///home/antigravity/carbeso/salary-clock/test/engine.test.mjs) 中補上相應的斷言測試章節**，確保：
1. 演算法正確性（數值精準無誤差）。
2. 極端邊界條件（例如跨年、跨月、平閏年 2 月、睡眠喚醒防漂移）。
3. DOM 結構綁定與 ARIA 無障礙標籤。
4. 防窺狀態下之隱私遮蔽與音效靜音。

---

## ⌨️ 常用快速鍵與無障礙設計 (a11y)

- **`B` 鍵**：一鍵切換老闆鍵防窺模式（金額遮蔽 / 數位時鐘）。
- **`Esc` 鍵**：
  - 若在發薪慶祝金幣雨中 ➔ **立即急煞中斷動畫與音效**。
  - 若在摸魚戰報彈窗中 ➔ **關閉戰報彈窗**。
  - 若在設定抽屜中 ➔ **關閉抽屜**（焦點安全還原至設定按鈕）。
  - 若在橫向全螢幕時鐘中 ➔ **退出時鐘模式**。
  - 其他狀態 ➔ **觸發老闆鍵防窺**。
- **`Space` / `Enter`**：在今日 / 本週 / 本月維度卡片上切換檢視。
- **`Tab` / `Shift+Tab`**：在設定抽屜開啟時啟動焦點陷阱 (Focus Trap)，防止焦點逸出抽屜。
