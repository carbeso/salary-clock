/**
 * 薪資時鐘 - 老闆鍵防窺控制模組 (Boss Key)
 * 負責在辦公室場合防止同事或主管窺探薪資數字
 * 支援一鍵遮蔽 (Mask) 與偽裝成系統數位時鐘 (Clock Disguise)
 */

export class BossKeyController {
    /**
     * @param {Object} options - 初始化選項
     * @param {Function} options.onStateChange - 狀態變更回呼函式
     */
    constructor(options = {}) {
        this.isDisguised = false; // 是否處於防窺遮蔽狀態
        this.mode = 'mask';       // 'mask' (遮罩) 或 'clock' (數位時鐘偽裝)
        this.onStateChange = options.onStateChange || (() => {});

        this.initKeyboardListener();
    }

    /**
     * 綁定鍵盤快捷鍵 (預設按 'b' 鍵或 'B' 鍵快速切換)
     */
    initKeyboardListener() {
        window.addEventListener('keydown', (e) => {
            // 若使用者正在輸入表單元素 (input/textarea/select)，則不觸發老闆鍵
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
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

        this.onStateChange(this.isDisguised, this.mode);
    }

    /**
     * 設定防窺偽裝類型
     * @param {'mask'|'clock'} newMode - 偽裝模式
     */
    setMode(newMode) {
        this.mode = newMode;
        if (this.isDisguised) {
            this.onStateChange(this.isDisguised, this.mode);
        }
    }

    /**
     * 取得當前防窺狀態
     */
    isActive() {
        return this.isDisguised;
    }
}
