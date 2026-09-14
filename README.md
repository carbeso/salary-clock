# 💰 薪資時鐘 (Salary Clock - NextGen)

> 「將每一秒的時間，轉化為看得見的累積價值。」

本專案源自一套經典的 Windows 桌面 Python 小工具（`salary_clock.pyw`），我們將其核心設計提煉並全面升級為**模組化、跨平台**的現代化薪資時鐘。

---

## 📖 專案背景與演進

原始版本以 Python Tkinter 製作，具備無邊框、置頂懸浮、背景穿透透明與滑鼠隨意拖曳的極佳視覺體驗。

新一代重製版將其概念標準化，解決了硬編碼月薪、單一計薪模式與作業系統鎖定等局限，支援：
- **多種計薪模型**：全月連續無間斷制、上班族工作日時段制（自動扣除午休/假日）、自由接案碼錶制。
- **跨平台架構**：以現代標準 Web 技術實作核心，支援瀏覽器開啟、手機 PWA、以及透過桌面懸浮置頂技術（Web Picture-in-Picture / Tauri 原生視窗）。
- **隱私防窺機制 (Boss Key)**：一鍵模糊或遮蔽薪資金額。
- **個人化設定**：自由調整月薪、時薪、幣別符號、小數點位數與主題配色，本機自動儲存。

---

## 📂 專案目錄結構

```text
salary-clock/
├── .gitignore               # Git 忽略清單（排除暫存檔與相依套件）
├── README.md                # 專案概覽與說明文件（本檔案）
└── docs/
    ├── REQUIREMENTS.md      # 需求規格說明書（含功能需求、場景、非功能性指標）
    └── ARCHITECTURE.md      # 系統架構設計書（含架構圖、跨平台選型評估、核心演算法虛擬碼）
```

---

## 📑 核心文件導覽

- 🔍 **想了解具體需求與功能規劃？**
  請閱讀 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)。
- ⚙️ **想了解核心演算邏輯與跨平台技術評估？**
  請閱讀 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 🚀 後續開發與執行建議

本專案位於 Laragon 網站目錄 `C:\laragon\www\salary-clock`：
1. **開發工作區切換**：後續開發請將 IDE / 編輯器工作區切換至此目錄。
2. **第一階段開發**：建議以純原生 Web 技術（HTML5 / CSS3 / ES Modules）或輕量前端框架（如 Vite + Vue/React/Svelte）實作計算引擎與響應式介面，即可直接透過 Laragon 本機虛擬主機（例如 `http://salary-clock.test` 或 `http://localhost/salary-clock`）預覽測試。
3. **桌面端打包**：Web 端穩定後，可接入 Tauri 打包出極小體積的桌面懸浮小工具，完整重現並超越原生懸浮效果。
