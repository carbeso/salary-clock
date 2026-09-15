/**
 * 薪資時鐘 - Document Picture-in-Picture 桌面置頂懸浮管理器
 * 利用 Chromium 現代標準 Document Picture-in-Picture API
 * 讓免安裝的網頁版在 Windows/macOS 桌面右下角彈出一個永久置頂、隨處拖曳的懸浮時鐘小視窗
 */

export class PiPController {
    /**
     * @param {Object} options - 初始化選項
     * @param {Function} options.onClose - 懸浮視窗關閉時的回呼
     * @param {Function} options.onToggleBossKey - 點擊懸浮視窗防窺觸發時的回呼
     */
    constructor(options = {}) {
        this.pipWindow = null;
        this.cachedElements = null;
        this.onClose = options.onClose || (() => {});
        this.onToggleBossKey = options.onToggleBossKey || (() => {});
    }

    /**
     * 檢查當前瀏覽器環境是否支援 Document Picture-in-Picture
     * @returns {boolean}
     */
    isSupported() {
        return 'documentPictureInPicture' in window;
    }

    /**
     * 檢查當前是否已有開啟中的懸浮視窗
     * @returns {boolean}
     */
    isOpen() {
        return !!this.pipWindow;
    }

    /**
     * 開啟或關閉懸浮小視窗 (Toggle)
     * @param {HTMLElement} contentTemplate - 欲放入懸浮視窗的 DOM 元素
     */
    async toggle(contentTemplate) {
        if (this.isOpen()) {
            this.close();
        } else {
            await this.open(contentTemplate);
        }
    }

    /**
     * 開啟桌面置頂懸浮視窗
     * @param {HTMLElement} contentTemplate - 來源模板元素
     */
    async open(contentTemplate) {
        if (!this.isSupported()) {
            alert('您的瀏覽器目前尚未支援 Document Picture-in-Picture API。\n建議使用最新版 Google Chrome 或 Microsoft Edge 開啟本功能！');
            return;
        }

        try {
            // 請求開啟一個小巧長寬比的置頂視窗 (預設寬 340px，高 140px)
            this.pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 340,
                height: 140
            });

            // 複製本頁的所有樣式表 (CSS) 到置頂小視窗中，維持一致的精美視覺效果
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    this.pipWindow.document.head.appendChild(style);
                } catch (e) {
                    // 若有跨來源外部 stylesheet，改以 link 引入
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.type = styleSheet.type;
                    link.media = styleSheet.media;
                    link.href = styleSheet.href;
                    this.pipWindow.document.head.appendChild(link);
                }
            });

            // 在 PiP 視窗的 body 設定特殊懸浮樣式類別
            this.pipWindow.document.body.className = 'pip-mode-active';

            // 複製傳入的 HUD 內容
            const clone = contentTemplate.cloneNode(true);
            clone.id = 'pip-hud-container';
            this.pipWindow.document.body.appendChild(clone);

            // DOM 快取最佳化：快取 6 個關鍵子元素節點引用，供 33ms 高頻率 update() 直接賦值，
            // 徹底消除每秒 180 次 (6次 × 30fps) 之跨視窗 querySelector 走訪與 DOM 搜尋開銷
            this.cachedElements = {
                amountEl: this.pipWindow.document.querySelector('.pip-amount'),
                rateEl: this.pipWindow.document.querySelector('.pip-rate'),
                statusEl: this.pipWindow.document.querySelector('.pip-status'),
                progressBar: this.pipWindow.document.querySelector('.pip-progress-fill'),
                countdownEl: this.pipWindow.document.querySelector('.pip-countdown'),
                rewardEl: this.pipWindow.document.querySelector('.pip-reward') || this.pipWindow.document.getElementById('pip-reward-text')
            };

            // 監聽 PiP 視窗內任何位置點擊皆可切換防窺隱藏/顯示
            this.pipWindow.document.addEventListener('click', (e) => {
                e.preventDefault();
                this.onToggleBossKey();
            });

            // 監聽視窗關閉事件（確保僅在視窗物件存在時觸發單次清理，防範與手動 close 產生重複回呼）
            this.pipWindow.addEventListener('pagehide', () => {
                if (this.pipWindow) {
                    this.pipWindow = null;
                    this.cachedElements = null;
                    this.onClose();
                }
            });

        } catch (err) {
            console.error('開啟桌面置頂懸浮視窗失敗：', err);
        }
    }

    /**
     * 同步更新 PiP 小視窗內的顯示內容（採用 DOM 快取節點與髒檢查賦值）
     * @param {Object} displayData - 格式化後的文字與狀態資料
     */
    update(displayData) {
        if (!this.isOpen() || !this.pipWindow?.document || !this.cachedElements || !displayData) return;

        const pipDoc = this.pipWindow.document;
        const pipBody = pipDoc.body;

        // 同步 body 的防窺 class（髒檢查：僅在狀態變更時操作 classList）
        if (pipBody) {
            const hasDisguised = pipBody.classList.contains('is-disguised');
            if (displayData.isDisguised && !hasDisguised) {
                pipBody.classList.add('is-disguised');
            } else if (!displayData.isDisguised && hasDisguised) {
                pipBody.classList.remove('is-disguised');
            }
        }

        // 直接透過快取的 6 個元素節點引用進行更新，並搭配髒檢查比對，避免觸發不必要的 DOM 異動
        const { amountEl, rateEl, statusEl, progressBar, countdownEl, rewardEl } = this.cachedElements;

        if (amountEl && amountEl.textContent !== displayData.formattedAmount) {
            amountEl.textContent = displayData.formattedAmount;
        }
        if (rateEl && rateEl.textContent !== displayData.formattedRate) {
            rateEl.textContent = displayData.formattedRate;
        }
        if (statusEl && statusEl.textContent !== displayData.statusText) {
            statusEl.textContent = displayData.statusText;
        }
        if (progressBar) {
            // 防禦性夾取數值區間 0% ~ 100%，消除 NaN 或溢位例外
            const rawPercent = Number(displayData.progressPercentage);
            const clampedPercent = Number.isFinite(rawPercent) ? Math.min(100, Math.max(0, rawPercent)) : 0;
            const targetWidth = `${clampedPercent}%`;
            if (progressBar.style.width !== targetWidth) {
                progressBar.style.width = targetWidth;
            }
        }
        if (countdownEl && countdownEl.textContent !== displayData.countdownText) {
            countdownEl.textContent = displayData.countdownText;
        }
        if (rewardEl && displayData.rewardText !== undefined && rewardEl.textContent !== displayData.rewardText) {
            rewardEl.textContent = displayData.rewardText;
        }
    }

    /**
     * 關閉桌面置頂懸浮視窗
     */
    close() {
        if (this.pipWindow) {
            const win = this.pipWindow;
            // 立即解除引用以防 pagehide 事件重複調用 onClose
            this.pipWindow = null;
            this.cachedElements = null;
            try {
                win.close();
            } catch (_) {}
            this.onClose();
        }
    }
}
