/**
 * 薪資時鐘 - 本機設定與狀態儲存模組 (Storage)
 * 使用瀏覽器本機儲存空間 (LocalStorage) 進行設定儲存
 * 
 * 優勢特點：
 * 1. 極致安全：純前端本機沙箱儲存，不會像 Cookie 一樣隨每一次 HTTP 請求往返伺服器
 * 2. 隱私優先：完全在使用者瀏覽器內部運行，零網路連線、零上傳
 * 3. 容量充沛：LocalStorage 提供充足空間保存各項客製化薪資與工時組態
 */

export const STORAGE_KEY = 'salary_clock_user_config_v1';
const LEGACY_COOKIE_KEY = 'salary_clock_user_config_v1';

/**
 * 清除歷史殘留之 Cookie（維護乾淨的本機儲存環境）
 */
function cleanupLegacyCookie() {
    if (typeof document !== 'undefined') {
        try {
            document.cookie = `${LEGACY_COOKIE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
        } catch (_) {}
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
 * 載入使用者設定（若無或損毀則自動回傳預設值）
 * 完全從本機 LocalStorage 讀取，乾淨且安全
 * @returns {Object} 使用者設定物件
 */
export function loadConfig() {
    // 順便清除若曾寫入的歷史 Cookie，維持純粹本地儲存
    cleanupLegacyCookie();

    if (typeof localStorage === 'undefined') {
        return { ...DEFAULT_CONFIG };
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_CONFIG };
        }
        const parsed = JSON.parse(raw);
        // 採用物件展開補齊新欄位，確保資料結構向前相容
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
            freelanceState: {
                ...DEFAULT_CONFIG.freelanceState,
                ...(parsed.freelanceState || {})
            }
        };
    } catch (e) {
        console.warn('載入本機設定失敗，已重設為預設值：', e);
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * 儲存使用者設定至本機 LocalStorage
 * @param {Object} newConfig - 新設定物件
 * @returns {boolean} 儲存是否成功
 */
export function saveConfig(newConfig) {
    if (typeof localStorage === 'undefined') {
        return false;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        return true;
    } catch (e) {
        console.error('儲存設定至 LocalStorage 失敗：', e);
        return false;
    }
}

/**
 * 重設所有設定至系統初始預設值
 * @returns {Object} 預設設定物件
 */
export function resetConfig() {
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('清除本機設定快取失敗：', e);
        }
    }

    cleanupLegacyCookie();
    return { ...DEFAULT_CONFIG };
}
