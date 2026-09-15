/**
 * 薪資時鐘 - 老闆鍵防窺控制模組 (Boss Key)
 * 負責在辦公室場合防止同事或主管窺探薪資數字
 * 支援一鍵遮蔽 (Mask) 與偽裝成系統數位時鐘 (Clock Disguise)
 * 包含動態切換分頁標題 (Document Title)、更換 Favicon 為時鐘圖示，以及支援抽屜開啟時暫停快捷鍵功能
 */

export class BossKeyController {
    /**
     * @param {Object} options - 初始化選項
     * @param {Function} options.onStateChange - 狀態變更回呼函式 (isDisguised, mode)
     * @param {string} [options.disguisedTitle] - 偽裝時的網頁標題
     * @param {string} [options.clockFavicon] - 偽裝時的時鐘 Favicon (Data URI 或圖示路徑)
     */
    constructor(options = {}) {
        this.isDisguised = false; // 是否處於防窺遮蔽狀態
        this.isPaused = false;    // 是否暫停快捷鍵響應（例如設定抽屜開啟時防止 Escape 衝突）
        this.mode = 'mask';       // 'mask' (遮罩) 或 'clock' (數位時鐘偽裝)
        this.onStateChange = options.onStateChange || (() => {});

        // 記錄與設定分頁標題（原始標題 vs 偽裝專案標題）
        this.disguisedTitle = options.disguisedTitle || '專案管理時程 - 待辦事項進度';
        this.originalTitle = (typeof document !== 'undefined' && document.title)
            ? document.title
            : '薪資時鐘 (Salary Clock) - 將每一秒轉化為看得見的價值';

        // 記錄與設定分頁 Favicon（原始金錢圖示 vs 偽裝時鐘圖示）
        this.clockFavicon = options.clockFavicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🕒</text></svg>';
        this.originalFavicon = this.getFaviconHref() || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💰</text></svg>';

        this.initKeyboardListener();
    }

    /**
     * 取得目前網頁的 Favicon 連結網址
     * @returns {string}
     */
    getFaviconHref() {
        if (typeof document === 'undefined') return '';
        const link = document.querySelector("link[rel*='icon']");
        return link ? (link.getAttribute('href') || '') : '';
    }

    /**
     * 動態設定目前網頁的 Favicon
     * 在現代 Chromium / WebKit 瀏覽器中，僅變更 href 可能因快取而無法即時更新分頁圖示，
     * 因此採更新屬性並在支援的情形下進行節點替換以強制觸發重繪。
     * @param {string} href - 圖示 Data URI 或檔案網址
     */
    setFavicon(href) {
        if (typeof document === 'undefined' || !href) return;
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', 'icon');
            if (document.head) {
                document.head.appendChild(link);
            }
        }
        link.setAttribute('href', href);
        link.href = href;

        // 若具備父節點（如真實瀏覽器 head），透過 clone 與替換節點強制瀏覽器刷新快取
        if (link.parentNode && typeof link.parentNode.replaceChild === 'function' && typeof link.cloneNode === 'function') {
            const newLink = link.cloneNode(true);
            newLink.setAttribute('href', href);
            newLink.href = href;
            link.parentNode.replaceChild(newLink, link);
        }
    }

    /**
     * 依據防窺狀態同步切換 document.title 與 Favicon
     * @param {boolean} disguised - 是否進入防窺偽裝狀態
     */
    updateTitleAndFavicon(disguised) {
        if (typeof document === 'undefined') return;

        if (disguised) {
            // 切換為偽裝工作進度標題與時鐘圖示，即使主管走過看分頁標籤也完全看不出薪資
            document.title = this.disguisedTitle;
            this.setFavicon(this.clockFavicon);
        } else {
            // 恢復原本的時鐘標題與金錢符號
            document.title = this.originalTitle;
            this.setFavicon(this.originalFavicon);
        }
    }

    /**
     * 暫停老闆鍵快捷鍵響應（例如偏好設定抽屜開啟期間，避免使用者按下 Escape 時觸發防窺衝突）
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * 恢復老闆鍵快捷鍵響應
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * 綁定鍵盤快捷鍵 (預設按 'b' 鍵或 'B' 鍵快速切換，亦支援 Escape 快速避難)
     * 防範機制：
     * 1. 若處於暫停狀態 (isPaused) 則不響應
     * 2. 忽略任何含有 Ctrl / Alt / Meta 組合鍵的按鍵，防範瀏覽器預設快捷鍵衝突 (如 Chrome 的 Ctrl+Shift+B 開關書籤列)
     * 3. 忽略使用者正在輸入表單 (input/textarea/select) 的情境
     */
    initKeyboardListener() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            // 若目前處於暫停狀態（例如設定抽屜開啟中），則不響應快捷鍵
            if (this.isPaused) {
                return;
            }

            // 忽略包含 Ctrl, Alt, Meta (Cmd) 組合鍵，避免干擾系統或瀏覽器快捷鍵 (如 Chrome 的 Ctrl+Shift+B)
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return;
            }

            // 若使用者正在輸入表單元素 (input/textarea/select)，則不觸發老闆鍵
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
                return;
            }

            // 若目前處於全螢幕展示狀態，使用者按 Escape 優先由瀏覽器退出全螢幕，不誤觸老闆鍵
            if (typeof document !== 'undefined' && document.fullscreenElement && e.key === 'Escape') {
                return;
            }

            if (e.key === 'b' || e.key === 'B' || e.key === 'Escape') {
                this.toggle();
            }
        });
    }

    /**
     * 切換防窺狀態
     * @param {boolean} [forcedState] - 強制設定為指定狀態
     */
    toggle(forcedState) {
        if (typeof forcedState === 'boolean') {
            this.isDisguised = forcedState;
        } else {
            this.isDisguised = !this.isDisguised;
        }

        // 動態切換標題與 Favicon
        this.updateTitleAndFavicon(this.isDisguised);

        // 觸發外部狀態變更回呼
        this.onStateChange(this.isDisguised, this.mode);
    }

    /**
     * 設定防窺偽裝類型
     * @param {'mask'|'clock'} newMode - 偽裝模式
     */
    setMode(newMode) {
        this.mode = newMode;
        if (this.isDisguised) {
            this.updateTitleAndFavicon(this.isDisguised);
            this.onStateChange(this.isDisguised, this.mode);
        }
    }

    /**
     * 取得當前防窺狀態
     * @returns {boolean}
     */
    isActive() {
        return this.isDisguised;
    }
}
