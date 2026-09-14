/**
 * 薪資時鐘 - 本機設定與狀態儲存模組 (Storage)
 * 支援雙重儲存機制：瀏覽器本機 LocalStorage + 本機 Cookie 備份
 * 完全在使用者本機運行，零網路連線、保障個人財務隱私
 */

const STORAGE_KEY = 'salary_clock_user_config_v1';
const COOKIE_KEY = 'salary_clock_user_config_v1';

/**
 * 安全寫入 Cookie 至本機
 * @param {string} name - Cookie 名稱
 * @param {string} value - Cookie 數值
 * @param {number} [days=365] - 保存天數（預設 365 天）
 */
export function setCookie(name, value, days = 365) {
    if (typeof document === 'undefined') return;
    try {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${d.toUTCString()}`;
        // 使用 encodeURIComponent 避免 JSON 特殊字元 (如逗號、分號、空白) 損壞 Cookie 格式
        const encodedVal = encodeURIComponent(value);
        // 設定路徑為根目錄，並採用 SameSite=Lax 防護
        const isSecure = typeof location !== 'undefined' && location.protocol === 'https:';
        document.cookie = `${name}=${encodedVal};${expires};path=/;SameSite=Lax${isSecure ? ';Secure' : ''}`;
    } catch (e) {
        console.warn('寫入 Cookie 失敗：', e);
    }
}

/**
 * 讀取本機 Cookie 數值
 * @param {string} name - Cookie 名稱
 * @returns {string|null} Cookie 數值字串或 null
 */
export function getCookie(name) {
    if (typeof document === 'undefined') return null;
    try {
        const nameEQ = `${name}=`;
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) {
                const encodedVal = c.substring(nameEQ.length, c.length);
                return decodeURIComponent(encodedVal);
            }
        }
        return null;
    } catch (e) {
        console.warn('讀取 Cookie 失敗：', e);
        return null;
    }
}

/**
 * 清除指定的本機 Cookie
 * @param {string} name - Cookie 名稱
 */
export function deleteCookie(name) {
    if (typeof document === 'undefined') return;
    try {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
    } catch (e) {
        console.warn('清除 Cookie 失敗：', e);
    }
}

/**
 * 多元趣味激勵指標預設庫
 */
export const REWARD_PRESETS = {
    latte: { id: 'latte', name: '星巴克拿鐵', icon: '☕', price: 150, unit: '杯' },
    bigmac: { id: 'bigmac', name: '麥當勞大麥克', icon: '🍔', price: 78, unit: '個' },
    etf0050: { id: 'etf0050', name: '0050 零股', icon: '📈', price: 195, unit: '股' },
    tsmc: { id: 'tsmc', name: '台積電零股 (2330)', icon: '💎', price: 1000, unit: '股' },
    bubbletea: { id: 'bubbletea', name: '雞排＋珍奶', icon: '🧋', price: 160, unit: '份' },
    custom: { id: 'custom', name: '自訂目標', icon: '🎯', price: 100, unit: '個' }
};

/**
 * 預設設定值
 */
export const DEFAULT_CONFIG = {
    // 計薪模式：'workday' (工作日工時制), 'continuous' (全月連續制), 'freelance' (自由接案碼錶制)
    salaryMode: 'workday',

    // 薪資設定
    monthlySalary: 40000,          // 月薪 (新台幣)
    hourlyRate: 250,               // 時薪（用於碼錶制或手動換算）

    // 工作日與排程設定
    workDays: [1, 2, 3, 4, 5],      // 週一至週五為工作日 (0=週日, 6=週六)
    workStart: '09:00',            // 上班時間
    workEnd: '18:00',              // 下班時間
    breakEnabled: true,            // 是否扣除午休
    breakStart: '12:00',           // 午休開始
    breakEnd: '13:00',             // 午休結束

    // 顯示與外觀偏好
    currencySymbol: 'NT$',         // 幣別符號
    decimalDigits: 2,              // 小數點位數 (2~4)
    showThousandSeparator: true,   // 是否顯示千分位

    // 多元趣味激勵指標
    rewardType: 'latte',           // 'latte', 'bigmac', 'etf0050', 'tsmc', 'bubbletea', 'custom'
    rewardCustomName: '自訂目標',
    rewardCustomIcon: '🎯',
    rewardCustomPrice: 100,
    rewardCustomUnit: '個',

    // 桌面懸浮型態：'hud' (極簡 HUD), 'card' (卡片小工具), 'through' (穿透抬頭顯示)
    overlayStyle: 'hud',

    // 老闆鍵防窺偏好：'mask' (星號遮罩), 'clock' (偽裝成數位時鐘)
    bossKeyDisguise: 'mask',

    // 自由接案碼錶狀態持久化
    freelanceState: {
        accumulatedSeconds: 0,
        isRunning: false,
        lastStartTime: null
    }
};

/**
 * 載入使用者設定
 * 支援雙軌機制：優先讀取 LocalStorage，若無或損毀則自動退回讀取 Cookie；若兩者皆無則載入預設值
 * @returns {Object} 使用者設定物件
 */
export function loadConfig() {
    let raw = null;

    // 1. 優先從 LocalStorage 讀取
    if (typeof localStorage !== 'undefined') {
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('讀取 LocalStorage 受限，嘗試改由 Cookie 讀取：', e);
        }
    }

    // 2. 若 LocalStorage 無資料，退回讀取本機 Cookie (Fallback)
    if (!raw) {
        const cookieRaw = getCookie(COOKIE_KEY);
        if (cookieRaw) {
            raw = cookieRaw;
            // 回補至 LocalStorage 保持兩者同步
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem(STORAGE_KEY, cookieRaw);
                } catch (_) {}
            }
        }
    }

    // 3. 解析 JSON 資料或回傳預設值
    if (!raw) {
        return { ...DEFAULT_CONFIG };
    }

    try {
        const parsed = JSON.parse(raw);
        // 採用物件擴展，確保新增的欄位能正確補齊預設值
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
            freelanceState: {
                ...DEFAULT_CONFIG.freelanceState,
                ...(parsed.freelanceState || {})
            }
        };
    } catch (e) {
        console.warn('設定資料解析失敗，已重設為預設值：', e);
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * 儲存使用者設定至本機
 * 同步寫入 LocalStorage 與 Cookie，達到雙重持久化保障
 * @param {Object} newConfig - 新設定物件
 * @returns {boolean} 儲存是否成功
 */
export function saveConfig(newConfig) {
    const jsonString = JSON.stringify(newConfig);
    let success = false;

    // 1. 儲存至 LocalStorage
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, jsonString);
            success = true;
        } catch (e) {
            console.warn('儲存設定至 LocalStorage 失敗：', e);
        }
    }

    // 2. 同步寫入本機 Cookie（保存 365 天）
    try {
        setCookie(COOKIE_KEY, jsonString, 365);
        success = true;
    } catch (e) {
        console.warn('儲存設定至 Cookie 失敗：', e);
    }

    return success;
}

/**
 * 重設所有設定至系統初始預設值
 * 同步清除 LocalStorage 與 Cookie 快取
 * @returns {Object} 預設設定物件
 */
export function resetConfig() {
    // 清除 LocalStorage
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('清除 LocalStorage 失敗：', e);
        }
    }

    // 清除 Cookie
    deleteCookie(COOKIE_KEY);

    return { ...DEFAULT_CONFIG };
}
