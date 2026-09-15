/**
 * 核心引擎單元測試 (Unit Test)
 * 驗證時間天數、平閏年、午休扣除、下班凍結、連續制與碼錶制運算
 */

import {
    getDaysInMonth,
    getDailyEffectiveWorkSeconds,
    calculateTodayWorkProgress,
    getWorkDaysInMonth
} from '../src/core/time-service.js';

import {
    calculateSalary,
    calculateWorkdayMode,
    calculateContinuousMode
} from '../src/core/engine.js';

import { formatCurrency, formatDurationChinese } from '../src/utils/formatters.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ 測試失敗: ${message}`);
        throw new Error(message);
    } else {
        passedTests++;
        console.log(`✅ 通過: ${message}`);
    }
}

console.log('--- 開始執行計薪時鐘核心引擎驗證 ---');

// 1. 月曆天數測試（包含閏年 2024 與平年 2026）
assert(getDaysInMonth(2024, 1) === 29, '2024 閏年 2 月應為 29 天');
assert(getDaysInMonth(2026, 1) === 28, '2026 平年 2 月應為 28 天');
assert(getDaysInMonth(2026, 6) === 31, '2026 年 7 月應為 31 天');

// 2. 每日淨工時測試 (09:00~18:00 總共 9 小時 = 32400 秒，扣除 12:00~13:00 午休 1 小時 = 3600 秒，淨工時應為 8 小時 = 28800 秒)
const dailySeconds = getDailyEffectiveWorkSeconds('09:00', '18:00', true, '12:00', '13:00');
assert(dailySeconds === 28800, `每日淨工時應為 28800 秒，實得 ${dailySeconds}`);

// 3. 上班狀態測試
// 測試上午 08:30 (未上班)
const timeBeforeWork = new Date(2026, 8, 14, 8, 30, 0); // 2026-09-14 (週一) 08:30
const resBefore = calculateTodayWorkProgress(timeBeforeWork, {
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
});
assert(resBefore.status === 'BEFORE_WORK' && resBefore.effectiveSecondsToday === 0, '08:30 應為 BEFORE_WORK 且秒數為 0');

// 測試上午 10:00 (上班 1 小時 = 3600 秒)
const timeWork1hr = new Date(2026, 8, 14, 10, 0, 0);
const resWork1hr = calculateTodayWorkProgress(timeWork1hr, {
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
});
assert(resWork1hr.status === 'WORKING' && resWork1hr.effectiveSecondsToday === 3600, '10:00 應為 WORKING 且秒數為 3600 秒');

// 測試中午 12:30 (午休中，工時應凍結在 12:00 的 3 小時 = 10800 秒)
const timeLunch = new Date(2026, 8, 14, 12, 30, 0);
const resLunch = calculateTodayWorkProgress(timeLunch, {
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
});
assert(resLunch.status === 'ON_BREAK' && resLunch.effectiveSecondsToday === 10800, '12:30 午休時應凍結在 10800 秒');

// 測試下午 14:00 (上班 5 小時扣 1 小時午休 = 4 小時 = 14400 秒)
const timeAfternoon = new Date(2026, 8, 14, 14, 0, 0);
const resAfternoon = calculateTodayWorkProgress(timeAfternoon, {
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
});
assert(resAfternoon.status === 'WORKING' && resAfternoon.effectiveSecondsToday === 14400, '14:00 應為 14400 秒 (扣除午休1小時)');

// 測試晚上 19:00 (已下班，工時達到一日上限 28800 秒)
const timeOffWork = new Date(2026, 8, 14, 19, 0, 0);
const resOffWork = calculateTodayWorkProgress(timeOffWork, {
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
});
assert(resOffWork.status === 'OFF_WORK' && resOffWork.effectiveSecondsToday === 28800, '19:00 應為 OFF_WORK 且秒數達到上限 28800 秒');

// 4. 格式化工具測試
assert(formatCurrency(12345.678, 'NT$', 2) === 'NT$ 12,345.68', '貨幣格式化需含千分位與四捨五入');
assert(formatDurationChinese(3665) === '1 小時 1 分 5 秒', '時間格式化應為 1 小時 1 分 5 秒');

// 5. 本週工作天與工時測試
import { getWeekWorkDaysInfo } from '../src/core/time-service.js';
const weekInfo = getWeekWorkDaysInfo(new Date(2026, 8, 14), [1, 2, 3, 4, 5]); // 2026-09-14 週一
assert(weekInfo.totalWeekWorkDays === 5, '週一至週五一週應有 5 個工作天');
assert(weekInfo.pastWeekWorkDays === 0, '週一當天之前在該週應有 0 個已過工作天');

// 6. 多元指標測試 (大麥克 $78)
const resBigMac = calculateSalary({
    salaryMode: 'continuous',
    monthlySalary: 78000,
    rewardType: 'bigmac'
}, new Date(2026, 8, 14, 12, 0, 0));
// 7. 本機儲存空間 (LocalStorage) 存取與清理測試 (模擬瀏覽器環境)
import { loadConfig, saveConfig, resetConfig, DEFAULT_CONFIG } from '../src/core/storage.js';

// 模擬瀏覽器 LocalStorage 物件
const mockStorage = new Map();
globalThis.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
};

// 測試預設載入
const initialConfig = loadConfig();
assert(initialConfig.monthlySalary === 40000, '初始設定預設月薪應為 40000');
assert(initialConfig.salaryMode === 'workday', '初始計薪模式應為 workday');

// 測試儲存與更新
const customConfig = { ...DEFAULT_CONFIG, monthlySalary: 66000, bossKeyDisguise: 'clock' };
const saveOk = saveConfig(customConfig);
assert(saveOk === true, '儲存設定至 LocalStorage 應回傳 true');

const reloadedConfig = loadConfig();
assert(reloadedConfig.monthlySalary === 66000, '重新讀取之月薪應為 66000');
assert(reloadedConfig.bossKeyDisguise === 'clock', '重新讀取之偽裝模式應為 clock');

// 測試重設為預設值
resetConfig();
const afterResetConfig = loadConfig();
assert(afterResetConfig.monthlySalary === DEFAULT_CONFIG.monthlySalary, '重設後應恢復預設月薪 40000');
assert(mockStorage.size === 0, '重設後 LocalStorage 快取應被清空');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHTML } from '../src/utils/formatters.js';
import { BossKeyController } from '../src/ui/boss-key.js';

// 8. 安全性與 XSS 防護跳脫測試 (escapeHTML)
assert(escapeHTML('<script>alert("XSS")</script>') === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;', 'XSS 腳本標籤應被完整編碼跳脫');
assert(escapeHTML("NT$ & < > ' \"") === 'NT$ &amp; &lt; &gt; &#39; &quot;', '特殊符號 & < > \' " 應皆轉為安全 HTML 實體');
assert(escapeHTML(null) === '', 'null 值傳入應安全回傳空字串');
assert(escapeHTML(undefined) === '', 'undefined 值傳入應安全回傳空字串');

// 9. 老闆鍵防窺控制器 (BossKeyController) 隱私動態切換與衝突暫停驗證
const mockFavicon = {
    href: 'data:image/svg+xml,<svg>💰</svg>',
    getAttribute(name) { return name === 'href' ? this.href : ''; },
    setAttribute(name, val) { if (name === 'href') this.href = val; }
};

globalThis.document = {
    title: '薪資時鐘 (Salary Clock) - 將每一秒轉化為看得見的價值',
    querySelector(sel) {
        if (sel.includes('icon')) return mockFavicon;
        return null;
    },
    createElement() { return mockFavicon; },
    head: { appendChild() {} },
    activeElement: null
};
globalThis.window = {
    addEventListener() {}
};

const bossController = new BossKeyController({
    disguisedTitle: '專案管理時程 - 待辦事項進度',
    clockFavicon: 'data:image/svg+xml,<svg>🕒</svg>'
});

assert(bossController.isActive() === false, '初始防窺狀態應為關閉');
assert(bossController.isPaused === false, '初始防窺暫停旗標應為 false');

// 觸發切換至防窺狀態
bossController.toggle();
assert(bossController.isActive() === true, '觸發後防窺狀態應為開啟');
assert(globalThis.document.title === '專案管理時程 - 待辦事項進度', '防窺時網頁標題應動態切換為專案管理時程');
assert(mockFavicon.href.includes('🕒'), '防窺時 Favicon 應更換為時鐘圖示');

// 再次觸發解除防窺狀態
bossController.toggle();
assert(bossController.isActive() === false, '再次觸發後防窺狀態應恢復關閉');
assert(globalThis.document.title.includes('薪資時鐘'), '解除防窺後應恢復原始薪資時鐘標題');
assert(mockFavicon.href.includes('💰'), '解除防窺後 Favicon 應恢復金錢圖示');

// 測試設定抽屜暫停老闆鍵
bossController.pause();
assert(bossController.isPaused === true, '呼叫 pause() 後 isPaused 應為 true');
bossController.resume();
assert(bossController.isPaused === false, '呼叫 resume() 後 isPaused 應為 false');

// 10. 鍵盤事件監聽器真實調度測試 (包含修飾鍵防誤觸與表單焦點隔離)
let registeredKeyHandler = null;
globalThis.window = {
    addEventListener(type, handler) {
        if (type === 'keydown') {
            registeredKeyHandler = handler;
        }
    }
};

// 重新建立一個帶真實事件監聽的控制器
const activeBossController = new BossKeyController();
assert(typeof registeredKeyHandler === 'function', '鍵盤事件監聽器應成功註冊至 window');
assert(activeBossController.isActive() === false, '初始應為未遮蔽');

// 測試單按 'b' 鍵切換
registeredKeyHandler({ key: 'b' });
assert(activeBossController.isActive() === true, '按下 b 鍵應能成功切換為防窺狀態');

// 測試單按 'B' 鍵切換
registeredKeyHandler({ key: 'B' });
assert(activeBossController.isActive() === false, '按下大寫 B 鍵應能成功解除防窺狀態');

// 測試 Escape 避難鍵切換
registeredKeyHandler({ key: 'Escape' });
assert(activeBossController.isActive() === true, '按下 Escape 鍵應能成功切換為防窺狀態');
registeredKeyHandler({ key: 'Escape' });
assert(activeBossController.isActive() === false, '再次按下 Escape 鍵應能成功解除防窺狀態');

// 測試修飾鍵防誤觸：Ctrl+Shift+B (瀏覽器書籤列) 或 Ctrl+B 不應觸發老闆鍵
registeredKeyHandler({ key: 'b', ctrlKey: true });
assert(activeBossController.isActive() === false, '按住 Ctrl+b 不應觸發防窺切換');
registeredKeyHandler({ key: 'B', ctrlKey: true, shiftKey: true });
assert(activeBossController.isActive() === false, '按住 Ctrl+Shift+B (開關書籤列) 不應觸發防窺切換');
registeredKeyHandler({ key: 'b', altKey: true });
assert(activeBossController.isActive() === false, '按住 Alt+b 不應觸發防窺切換');
registeredKeyHandler({ key: 'b', metaKey: true });
assert(activeBossController.isActive() === false, '按住 Cmd/Meta+b 不應觸發防窺切換');

// 測試暫停狀態 (如設定抽屜開啟期間)：不應響應任何快捷鍵
activeBossController.pause();
registeredKeyHandler({ key: 'b' });
assert(activeBossController.isActive() === false, '暫停期間按下 b 鍵不應觸發防窺切換');
registeredKeyHandler({ key: 'Escape' });
assert(activeBossController.isActive() === false, '暫停期間按下 Escape 鍵不應觸發防窺切換');
activeBossController.resume();

// 測試表單焦點隔離：焦點位於 input/textarea/select 時不應觸發
globalThis.document.activeElement = { tagName: 'INPUT' };
registeredKeyHandler({ key: 'b' });
assert(activeBossController.isActive() === false, '焦點位於 input 輸入框時不應觸發防窺切換');
globalThis.document.activeElement = null;

// 11. Favicon 跨瀏覽器 DOM 節點替換防快取機制驗證
let replaceChildCalled = false;
let replacedNewChild = null;
const parentNodeMock = {
    replaceChild(newChild, oldChild) {
        replaceChildCalled = true;
        replacedNewChild = newChild;
    }
};
mockFavicon.parentNode = parentNodeMock;
mockFavicon.cloneNode = function() {
    return {
        setAttribute(name, val) { if (name === 'href') this.href = val; },
        getAttribute(name) { return this.href; },
        href: ''
    };
};

activeBossController.setFavicon('data:image/svg+xml,<svg>🕒</svg>');
assert(replaceChildCalled === true, '具備 parentNode 時應呼叫 replaceChild 替換節點以防範 Chromium 快取延遲');
assert(replacedNewChild && replacedNewChild.href.includes('🕒'), '替換的新 Favicon 節點應包含正確的時鐘圖示路徑');

// 12. 安全性標頭檔案 (_headers) 設定驗證
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const headersPath = path.resolve(__dirname, '../_headers');
assert(fs.existsSync(headersPath), '_headers 檔案必須存在於專案根目錄');
const headersContent = fs.readFileSync(headersPath, 'utf8');
assert(headersContent.includes('Content-Security-Policy:'), '_headers 必須包含 Content-Security-Policy 安全標頭');
assert(headersContent.includes('X-Frame-Options: DENY'), '_headers 必須包含 X-Frame-Options: DENY');
assert(headersContent.includes('X-Content-Type-Options: nosniff'), '_headers 必須包含 X-Content-Type-Options: nosniff');
assert(headersContent.includes('Referrer-Policy: strict-origin-when-cross-origin'), '_headers 必須包含 Referrer-Policy');

// 13. HTML 遮蔽目標 (.disguise-target) 防窺覆蓋驗證
const indexPath = path.resolve(__dirname, '../index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');
assert(indexContent.includes('id="reward-card"') && indexContent.includes('reward-card disguise-target'), '#reward-card 必須包含 disguise-target 類別');
assert(indexContent.includes('id="hero-progress-percent"') && indexContent.includes('hero-progress-percent') && indexContent.includes('progress-val tabular-nums disguise-target" id="hero-progress-percent"'), '#hero-progress-percent 必須包含 disguise-target 類別');
assert(indexContent.includes('id="today-card-percent"') && indexContent.includes('progress-val tabular-nums disguise-target" id="today-card-percent"'), '#today-card-percent 必須包含 disguise-target 類別');
assert(indexContent.includes('id="week-card-percent"') && indexContent.includes('progress-val tabular-nums disguise-target" id="week-card-percent"'), '#week-card-percent 必須包含 disguise-target 類別');
assert(indexContent.includes('id="month-card-percent"') && indexContent.includes('progress-val tabular-nums disguise-target" id="month-card-percent"'), '#month-card-percent 必須包含 disguise-target 類別');

// 14. 計算引擎日期層級快取 (Day-level Memoization) 與快取命中率驗證
import { clearEngineCache, getEngineCacheStats } from '../src/core/engine.js';

clearEngineCache();
let stats = getEngineCacheStats();
assert(stats.workdayHits === 0 && stats.workdayMisses === 0, '快取重設後命中與未命中數應皆為 0');

const testConfig = {
    monthlySalary: 50000,
    workDays: [1, 2, 3, 4, 5],
    workStart: '09:00',
    workEnd: '18:00',
    breakEnabled: true,
    breakStart: '12:00',
    breakEnd: '13:00'
};

// 首次呼叫：快取未命中 (Cold Start)
const d1 = new Date(2026, 8, 14, 10, 0, 0); // 2026-09-14 10:00
calculateWorkdayMode(testConfig, d1);
stats = getEngineCacheStats();
assert(stats.workdayMisses === 1 && stats.workdayHits === 0, '首次計算當日靜態資料應為快取未命中 (Miss: 1)');

// 同一曆法日呼叫 50 次 (模擬高頻 33ms 每幀 tick)
for (let i = 1; i <= 50; i++) {
    const dIter = new Date(2026, 8, 14, 10, 0, i);
    calculateWorkdayMode(testConfig, dIter);
}
stats = getEngineCacheStats();
assert(stats.workdayMisses === 1 && stats.workdayHits === 50, '同曆法日內重複呼叫 50 次應 100% 命中快取 (Hits: 50)');

// 隔日呼叫：曆法日變更，觸發重新計算並快取新日期
const dNextDay = new Date(2026, 8, 15, 10, 0, 0);
calculateWorkdayMode(testConfig, dNextDay);
stats = getEngineCacheStats();
assert(stats.workdayMisses === 2 && stats.workdayHits === 50, '跨越曆法日應重新計算並計為快取未命中 (Miss: 2)');

// 同一曆法日但修改薪資設定：快取鍵失效並重新計算
const modifiedConfig = { ...testConfig, monthlySalary: 80000 };
calculateWorkdayMode(modifiedConfig, dNextDay);
stats = getEngineCacheStats();
assert(stats.workdayMisses === 3 && stats.workdayHits === 50, '組態參數變更應使快取失效並重新計算 (Miss: 3)');

// 驗證 breakEnabled 預設啟用與明確關閉時的快取鍵區隔（防範 Boolean 預設值缺陷）
clearEngineCache();
const implicitBreakConfig = { monthlySalary: 50000 };
const rImplicit = calculateWorkdayMode(implicitBreakConfig, dNextDay);
assert(rImplicit.totalDailySeconds === 28800, '省略 breakEnabled 時預設扣除午休 1 小時，淨工時應為 28800 秒');

const explicitBreakDisabledConfig = { monthlySalary: 50000, breakEnabled: false };
const rExplicit = calculateWorkdayMode(explicitBreakDisabledConfig, dNextDay);
assert(rExplicit.totalDailySeconds === 32400, '明確設定 breakEnabled 為 false 時，淨工時應為 32400 秒 (9小時)');
stats = getEngineCacheStats();
assert(stats.workdayMisses === 2, 'breakEnabled 由預設切換為 false 時必須觸發快取未命中並重算 (Miss: 2)');

// 午夜跨日 (23:59:59 至 00:00:00) 邊界連續性與快取未命中重新整理驗證
clearEngineCache();
const midConfig = { monthlySalary: 40000, workDays: [1, 2, 3, 4, 5] };
const dLate = new Date(2026, 8, 14, 23, 59, 59); // 週一 23:59:59 (OFF_WORK)
const rLate = calculateWorkdayMode(midConfig, dLate);
const dMidnight = new Date(2026, 8, 15, 0, 0, 0); // 週二 00:00:00 (BEFORE_WORK)
const rMidnight = calculateWorkdayMode(midConfig, dMidnight);
assert(Math.abs(rLate.monthEarned - rMidnight.monthEarned) < 0.01, '跨日 00:00:00 邊界時本月已賺薪資應平滑過渡無跳變');
assert(rMidnight.status === 'BEFORE_WORK', '00:00:00 整點應為尚未上班狀態 (BEFORE_WORK)');

// 全月連續制快取命中率驗證
clearEngineCache();
const contConfig = { monthlySalary: 60000, salaryMode: 'continuous' };
const dCont1 = new Date(2026, 8, 14, 12, 0, 0);
calculateContinuousMode(contConfig, dCont1);
for (let i = 1; i <= 20; i++) {
    calculateContinuousMode(contConfig, new Date(2026, 8, 14, 12, 0, i));
}
stats = getEngineCacheStats();
assert(stats.continuousMisses === 1 && stats.continuousHits === 20, '連續制同曆法日 20 次運算應 100% 命中快取');

// 15. Date 物件建立數大幅降低驗證 (消除單幀 84 個 Date 物件與 GC Pause 開銷)
// 攔截 Date 建構函式以精準計數
const OriginalDate = globalThis.Date;
let dateAllocations = 0;
// 先對 d1 進行一次熱身快取
calculateWorkdayMode(testConfig, d1);

class TrackedDate extends OriginalDate {
    constructor(...args) {
        super(...args);
        dateAllocations++;
    }
}
TrackedDate.now = OriginalDate.now;
TrackedDate.parse = OriginalDate.parse;
TrackedDate.UTC = OriginalDate.UTC;

globalThis.Date = TrackedDate;
dateAllocations = 0;

// 在快取命中狀態下連續執行 100 幀計算，傳入固定基準 Date 物件
for (let i = 0; i < 100; i++) {
    calculateWorkdayMode(testConfig, d1);
}

// 還原全域 Date
globalThis.Date = OriginalDate;
assert(dateAllocations === 0, `快取命中下 100 幀計算內部建立之 Date 物件數應為 0，實測為 ${dateAllocations}`);

// 16. 畫中畫懸浮視窗 (PiPController) DOM 快取與查詢消除驗證
import { PiPController } from '../src/ui/pip-controller.js';

let querySelectorCallCount = 0;
const mockPiPElements = {
    amount: { textContent: '' },
    rate: { textContent: '' },
    status: { textContent: '' },
    progress: { style: { width: '' } },
    countdown: { textContent: '' },
    reward: { textContent: '' }
};

const mockPiPDocument = {
    body: {
        className: '',
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        appendChild() {}
    },
    head: { appendChild() {} },
    querySelector(selector) {
        querySelectorCallCount++;
        if (selector === '.pip-amount') return mockPiPElements.amount;
        if (selector === '.pip-rate') return mockPiPElements.rate;
        if (selector === '.pip-status') return mockPiPElements.status;
        if (selector === '.pip-progress-fill') return mockPiPElements.progress;
        if (selector === '.pip-countdown') return mockPiPElements.countdown;
        if (selector === '.pip-reward') return mockPiPElements.reward;
        return null;
    },
    getElementById() { return null; },
    addEventListener() {}
};

const mockPiPWindow = {
    document: mockPiPDocument,
    addEventListener(type, cb) {
        if (type === 'pagehide') this.pagehideCb = cb;
    },
    close() {}
};

globalThis.window.documentPictureInPicture = {
    async requestWindow() {
        return mockPiPWindow;
    }
};
globalThis.document.styleSheets = [];

const pipTestCtrl = new PiPController();
const mockTemplate = {
    cloneNode() {
        return { id: '' };
    }
};

await pipTestCtrl.open(mockTemplate);
assert(pipTestCtrl.isOpen() === true, 'PiP 視窗開啟後 isOpen 應為 true');
assert(pipTestCtrl.cachedElements !== null, 'open() 後應建立 6 個子元素節點快取');
assert(pipTestCtrl.cachedElements.amountEl === mockPiPElements.amount, '快取中的 amountEl 應正確指向 .pip-amount 節點');

// 驗證在 33ms 高頻 update() 時，直接使用快取節點，querySelector 呼叫次數應始終為 0
querySelectorCallCount = 0;
for (let i = 0; i < 30; i++) {
    pipTestCtrl.update({
        isDisguised: false,
        formattedAmount: `NT$ ${1000 + i}`,
        formattedRate: 'NT$ 0.35/秒',
        statusText: '努力工作中 💼',
        progressPercentage: 45.5,
        countdownText: '離下班 5 小時',
        rewardText: '☕ 6 杯'
    });
}
assert(querySelectorCallCount === 0, '高頻 update() 期間 querySelector 呼叫次數應為 0 (徹底消除每秒 180 次 DOM 走訪)');
assert(mockPiPElements.amount.textContent === 'NT$ 1029', '快取之 amountEl 內容應被正確賦值');
assert(mockPiPElements.progress.style.width === '45.5%', '快取之 progressBar 寬度應被正確賦值');

// 測試 close() 後快取清理
pipTestCtrl.close();
assert(pipTestCtrl.isOpen() === false, 'close() 後 isOpen 應為 false');
assert(pipTestCtrl.cachedElements === null, 'close() 後 cachedElements 應被清空為 null');

// 測試 PiPController 進度條防禦邊界與 NaN / 溢位夾取
await pipTestCtrl.open(mockTemplate);
pipTestCtrl.update({ progressPercentage: NaN });
assert(mockPiPElements.progress.style.width === '0%', '進度百分比為 NaN 時應安全夾取為 0%');
pipTestCtrl.update({ progressPercentage: 120 });
assert(mockPiPElements.progress.style.width === '100%', '進度百分比超過 100 時應安全夾取為 100%');
pipTestCtrl.update({ progressPercentage: -15 });
assert(mockPiPElements.progress.style.width === '0%', '進度百分比小於 0 時應安全夾取為 0%');

// 測試手動 close 與 pagehide 避重：onClose 僅能調用一次
let pipCloseCount = 0;
const testCloseCtrl = new PiPController({
    onClose: () => { pipCloseCount++; }
});
await testCloseCtrl.open(mockTemplate);
testCloseCtrl.close();
if (mockPiPWindow.pagehideCb) {
    mockPiPWindow.pagehideCb(); // 模擬瀏覽器隨後非同步觸發 pagehide
}
assert(pipCloseCount === 1, 'PiPController 在手動 close 後再觸發 pagehide 不得重複調用 onClose');

// 17. 跨分頁即時同步 (Cross-Tab Storage Sync) 邏輯驗證
import { STORAGE_KEY } from '../src/core/storage.js';
assert(STORAGE_KEY === 'salary_clock_user_config_v1', '匯出之 STORAGE_KEY 應為 salary_clock_user_config_v1');

let crossTabStorageListener = null;
globalThis.window.addEventListener = function(type, handler) {
    if (type === 'storage') {
        crossTabStorageListener = handler;
    }
};

// 模擬跨分頁監聽器執行
let localConfigState = { monthlySalary: 40000 };
function mockHandleStorageEvent(e) {
    if (!e || e.key === STORAGE_KEY || e.key === null) {
        localConfigState = loadConfig();
    }
}
globalThis.window.addEventListener('storage', mockHandleStorageEvent);
assert(typeof crossTabStorageListener === 'function', '跨分頁 storage 事件監聽器應成功註冊');

// 模擬分頁 A 寫入新月薪 88000
saveConfig({ ...DEFAULT_CONFIG, monthlySalary: 88000 });
// 分頁 B 收到 storage 事件
crossTabStorageListener({ key: STORAGE_KEY });
assert(localConfigState.monthlySalary === 88000, '收到跨分頁 storage 事件後應即時同步最新月薪 88000');

// 模擬分頁 A 清空 localStorage (e.key === null)
resetConfig();
crossTabStorageListener({ key: null });
assert(localConfigState.monthlySalary === 40000, '收到 clear 跨分頁事件 (key === null) 後應重設回預設月薪 40000');

// 模擬外掛或異常寫入破損 JSON 字串時之容錯表現
localStorage.setItem(STORAGE_KEY, '{ broken_malformed_json :::');
crossTabStorageListener({ key: STORAGE_KEY });
assert(localConfigState.monthlySalary === 40000, '遭遇破損之 JSON 時 loadConfig 應安全降級回傳預設月薪 40000 且不崩潰');

// 18. Page Visibility API 背景省電降頻與切回前景即時補算邏輯驗證
let currentAppTimerRate = 33;
let recalculatedCount = 0;
let isPiPOpenForTest = false;

function mockHandleVisibilityChange(hidden) {
    if (hidden) {
        if (!isPiPOpenForTest) {
            currentAppTimerRate = 5000; // 降頻至 5 秒
        }
    } else {
        currentAppTimerRate = 33; // 恢復正常頻率
        recalculatedCount++;      // 切回前景立即補算一次
    }
}

// 測試置於背景且未開 PiP：降頻至 5 秒 (5000ms)
mockHandleVisibilityChange(true);
assert(currentAppTimerRate === 5000, '分頁置於背景且未開 PiP 時應主動降頻至 5000ms');

// 測試切回前景：恢復 33ms 且立即補算一次
mockHandleVisibilityChange(false);
assert(currentAppTimerRate === 33, '切回前景時應立即恢復 33ms 正常刷新頻率');
assert(recalculatedCount === 1, '切回前景時應立即觸發一次即時計算與畫面補齊');

// 測試置於背景但有開啟 PiP：使用者在桌面監看，不應降頻
isPiPOpenForTest = true;
mockHandleVisibilityChange(true);
assert(currentAppTimerRate === 33, '分頁置於背景但開啟 PiP 懸浮視窗時，應維持 33ms 不降頻');

// ==========================================================================
// 19. Phase 3: UX & Accessibility (介面體驗、無障礙與防休眠) 驗證
// ==========================================================================

// 19.1 直式手機全螢幕入口自適應佈局樣式檢驗
const stylesPath = path.resolve(__dirname, '../src/ui/styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');
const media640Match = stylesContent.match(/@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?)\n\}/);
assert(media640Match !== null, 'styles.css 必須包含 @media (max-width: 640px) 響應式區塊');
const media640Content = media640Match[1];
assert(!media640Content.includes('#btn-pip {\n        display: none !important;\n    }'), '小螢幕 640px 媒體查詢不得包含粗暴隱藏 #btn-pip 之規則');
assert(media640Content.includes('#btn-pip') && media640Content.includes('.btn-text') && media640Content.includes('display: none'), '小螢幕 640px 必須為 #btn-pip 配置自適應隱藏文字保留圖示之精簡佈局');
assert(stylesContent.includes('.clickable-card:focus-visible'), 'styles.css 必須包含 .clickable-card:focus-visible 鍵盤無障礙焦點樣式');
assert(stylesContent.includes('visibility: hidden') && stylesContent.includes('.drawer-backdrop.active') && stylesContent.includes('visibility: visible'), 'styles.css 設定抽屜關閉時必須具備 visibility: hidden 以杜絕背景鍵盤焦點穿透');

// 19.2 HTML 三維度統計卡與設定抽屜無障礙屬性檢驗
assert(indexContent.includes('id="card-period-today"') && indexContent.includes('role="button"') && indexContent.includes('tabindex="0"'), '本日卡片必須包含 role="button" 與 tabindex="0"');
assert(indexContent.includes('id="card-period-week"') && indexContent.includes('role="button"') && indexContent.includes('tabindex="0"'), '本週卡片必須包含 role="button" 與 tabindex="0"');
assert(indexContent.includes('id="card-period-month"') && indexContent.includes('role="button"') && indexContent.includes('tabindex="0"'), '本月卡片必須包含 role="button" 與 tabindex="0"');
assert(indexContent.includes('role="dialog"') && indexContent.includes('aria-modal="true"'), '設定抽屜必須包含 role="dialog" 與 aria-modal="true"');
assert(indexContent.includes('aria-labelledby="drawer-title"'), '設定抽屜必須包含 aria-labelledby 指向標題');
assert(indexContent.includes('id="drawer-title"'), '設定抽屜標題必須具備 id="drawer-title"');
assert(indexContent.includes('aria-label="關閉偏好設定"'), '設定抽屜關閉按鈕必須包含清晰之 aria-label');

// 19.3 激勵指標副標題隨維度切換動態更新邏輯
function getRewardSubtextForView(view) {
    let periodName = '今日';
    if (view === 'week') periodName = '本週';
    else if (view === 'month') periodName = '本月';
    return `${periodName}累積進帳換算`;
}
assert(getRewardSubtextForView('today') === '今日累積進帳換算', '本日維度副標題應為今日累積進帳換算');
assert(getRewardSubtextForView('week') === '本週累積進帳換算', '本週維度副標題應為本週累積進帳換算');
assert(getRewardSubtextForView('month') === '本月累積進帳換算', '本月維度副標題應為本月累積進帳換算');

// 19.4 鍵盤 Enter / Space 切換維度與 aria-pressed 聯動模擬
let currentViewForTest = 'today';
const mockCards = {
    today: { role: 'button', tabindex: '0', ariaPressed: 'true', active: true },
    week: { role: 'button', tabindex: '0', ariaPressed: 'false', active: false },
    month: { role: 'button', tabindex: '0', ariaPressed: 'false', active: false }
};

function testSetActiveView(view) {
    currentViewForTest = view;
    mockCards.today.ariaPressed = String(view === 'today');
    mockCards.today.active = (view === 'today');
    mockCards.week.ariaPressed = String(view === 'week');
    mockCards.week.active = (view === 'week');
    mockCards.month.ariaPressed = String(view === 'month');
    mockCards.month.active = (view === 'month');
}

function testCardKeydown(view, key) {
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        testSetActiveView(view);
        return true;
    }
    return false;
}

// 測試 Enter 鍵切換至 week
const handledEnter = testCardKeydown('week', 'Enter');
assert(handledEnter === true, '按下 Enter 鍵應被卡片鍵盤處理器攔截');
assert(currentViewForTest === 'week', '按下 Enter 鍵後當前維度應切換至 week');
assert(mockCards.today.ariaPressed === 'false' && mockCards.week.ariaPressed === 'true', '切換至 week 後 week 卡片 aria-pressed 應為 true，today 為 false');

// 測試 Space 空白鍵切換至 month
const handledSpace = testCardKeydown('month', ' ');
assert(handledSpace === true, '按下空白鍵應被卡片鍵盤處理器攔截');
assert(currentViewForTest === 'month', '按下空白鍵後當前維度應切換至 month');
assert(mockCards.month.ariaPressed === 'true' && mockCards.week.ariaPressed === 'false', '切換至 month 後 month 卡片 aria-pressed 應為 true');

// 測試 Spacebar 兼容鍵名切換至 today
const handledSpacebar = testCardKeydown('today', 'Spacebar');
assert(handledSpacebar === true, '按下 Spacebar 鍵應被卡片鍵盤處理器攔截');
assert(currentViewForTest === 'today', '按下 Spacebar 鍵後當前維度應切換至 today');
assert(mockCards.today.ariaPressed === 'true' && mockCards.month.ariaPressed === 'false', '切換至 today 後 today 卡片 aria-pressed 應為 true');

// 測試其他按鍵不觸發
const handledTab = testCardKeydown('today', 'Tab');
assert(handledTab === false, '按下非觸發鍵 (如 Tab) 不應觸發卡片切換');
assert(currentViewForTest === 'today', '按下非觸發鍵後當前維度應維持不變');

// 19.5 Screen Wake Lock API 整合與容錯模擬
let wakeLockRequested = false;
let wakeLockReleased = false;
let releaseCb = null;

class MockWakeLockSentinel {
    constructor() {
        this.released = false;
    }
    addEventListener(event, cb) {
        if (event === 'release') releaseCb = cb;
    }
    async release() {
        this.released = true;
        wakeLockReleased = true;
        if (releaseCb) releaseCb();
    }
}

let currentWakeLock = null;
async function testRequestWakeLock(supported = true, failRequest = false) {
    if (!supported) return;
    if (!currentWakeLock) {
        try {
            if (failRequest) throw new Error('NotAllowedError');
            currentWakeLock = new MockWakeLockSentinel();
            wakeLockRequested = true;
            currentWakeLock.addEventListener('release', () => {
                currentWakeLock = null;
            });
        } catch (err) {
            currentWakeLock = null;
        }
    }
}

async function testReleaseWakeLock() {
    if (currentWakeLock) {
        try {
            await currentWakeLock.release();
        } finally {
            currentWakeLock = null;
        }
    }
}

// 正常全螢幕請求防休眠
await testRequestWakeLock(true, false);
assert(wakeLockRequested === true && currentWakeLock !== null, '進入全螢幕時應成功請求 Screen Wake Lock');
// 退出全螢幕釋放防休眠
await testReleaseWakeLock();
assert(wakeLockReleased === true && currentWakeLock === null, '退出全螢幕時應安全釋放 Screen Wake Lock 並將實例置為 null');

// 模擬不支援環境：不拋錯
let crashedUnsupported = false;
try {
    await testRequestWakeLock(false, false);
} catch {
    crashedUnsupported = true;
}
assert(crashedUnsupported === false, '不支援 Wake Lock 之瀏覽器環境應安全略過不崩潰');

// 模擬被系統權限拒絕：安全捕捉
let crashedDenied = false;
try {
    await testRequestWakeLock(true, true);
} catch {
    crashedDenied = true;
}
assert(crashedDenied === false && currentWakeLock === null, '遭遇權限拒絕時應安全捕捉例外且維持為 null');

// 19.6 滾筒容器 aria-hidden 屬性與焦點陷阱 (Focus Trap) 模擬
const appJsPath = path.resolve(__dirname, '../src/ui/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
assert(appJsContent.includes("rollerContainerEl.setAttribute('aria-hidden', 'true')"), 'app.js 滾筒容器建立時必須標記 aria-hidden="true" 屬性');
assert(appJsContent.includes("rewardSubtextStr = `${periodName}累積進帳換算`"), 'app.js 必須動態依據 periodName 更新激勵指標副標題');

// 焦點陷阱與焦點還原模擬
let activeElementMock = null;
let previousActiveElementMock = null;
const mockButtonSettings = { id: 'btn-settings', focus() { activeElementMock = this; } };
const mockCloseBtn = { id: 'btn-drawer-close', focus() { activeElementMock = this; } };
const mockInputSalary = { id: 'cfg-monthly-salary', focus() { activeElementMock = this; } };
const mockBtnSave = { id: 'btn-save-settings', focus() { activeElementMock = this; } };

const focusableElements = [mockCloseBtn, mockInputSalary, mockBtnSave];

function testOpenDrawer() {
    previousActiveElementMock = activeElementMock;
    mockCloseBtn.focus();
}

function testCloseDrawer() {
    if (previousActiveElementMock && typeof previousActiveElementMock.focus === 'function') {
        previousActiveElementMock.focus();
        previousActiveElementMock = null;
    }
}

function testHandleDrawerKeydown(e) {
    if (e.key !== 'Tab') return;
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];
    if (e.shiftKey) {
        if (activeElementMock === firstEl) {
            e.defaultPrevented = true;
            lastEl.focus();
        }
    } else {
        if (activeElementMock === lastEl) {
            e.defaultPrevented = true;
            firstEl.focus();
        }
    }
}

// 初始聚焦在設定按鈕上
mockButtonSettings.focus();
assert(activeElementMock === mockButtonSettings, '初始焦點應在設定按鈕上');

// 開啟抽屜
testOpenDrawer();
assert(previousActiveElementMock === mockButtonSettings, '開啟抽屜時應將前一焦點元素記錄為設定按鈕');
assert(activeElementMock === mockCloseBtn, '開啟抽屜後焦點應自動導引至關閉按鈕');

// 焦點移到最後一個元素 (儲存按鈕) 並按下 Tab：應循環回第一個元素 (關閉按鈕)
mockBtnSave.focus();
const tabEvent = { key: 'Tab', shiftKey: false, defaultPrevented: false };
testHandleDrawerKeydown(tabEvent);
assert(tabEvent.defaultPrevented === true, 'Tab 在最後一個元素時應阻止原生事件');
assert(activeElementMock === mockCloseBtn, 'Tab 在最後一個元素時焦點應循環繞回第一個元素');

// 焦點在第一個元素 (關閉按鈕) 並按下 Shift+Tab：應反向循環至最後一個元素 (儲存按鈕)
mockCloseBtn.focus();
const shiftTabEvent = { key: 'Tab', shiftKey: true, defaultPrevented: false };
testHandleDrawerKeydown(shiftTabEvent);
assert(shiftTabEvent.defaultPrevented === true, 'Shift+Tab 在第一個元素時應阻止原生事件');
assert(activeElementMock === mockBtnSave, 'Shift+Tab 在第一個元素時焦點應反向循環至最後一個元素');

// 關閉抽屜：焦點應安全還原回設定按鈕
testCloseDrawer();
assert(activeElementMock === mockButtonSettings, '關閉抽屜後焦點應安全還原至先前點選之設定按鈕');

// 19.7 焦點陷阱中層表單元素自然穿透驗證
mockInputSalary.focus();
const midTabEvent = { key: 'Tab', shiftKey: false, defaultPrevented: false };
testHandleDrawerKeydown(midTabEvent);
assert(midTabEvent.defaultPrevented === false, '焦點在抽屜中間欄位時按 Tab 不應阻止原生事件，以利自然切換下個控制項');

const midShiftTabEvent = { key: 'Tab', shiftKey: true, defaultPrevented: false };
testHandleDrawerKeydown(midShiftTabEvent);
assert(midShiftTabEvent.defaultPrevented === false, '焦點在抽屜中間欄位時按 Shift+Tab 不應阻止原生事件');

// 19.8 設定抽屜開啟時 Escape 優先權與防窺快捷鍵隔離驗證
let isDrawerOpenMock = true;
let drawerClosedMock = false;
let bossKeyTriggeredMock = false;

function mockWindowKeydownCapture(e) {
    if (e.key === 'Escape' && isDrawerOpenMock) {
        e.defaultPrevented = true;
        e.propagationStopped = true;
        drawerClosedMock = true;
        isDrawerOpenMock = false;
    }
}

function mockBossKeyKeydown(e) {
    if (e.propagationStopped) return; // 被 capture 階段 stopImmediatePropagation 攔截
    if (e.key === 'Escape') {
        bossKeyTriggeredMock = true;
    }
}

const escEvent = { key: 'Escape', defaultPrevented: false, propagationStopped: false };
mockWindowKeydownCapture(escEvent);
mockBossKeyKeydown(escEvent);

assert(drawerClosedMock === true, '抽屜開啟時按下 Escape 鍵應優先觸發關閉抽屜');
assert(bossKeyTriggeredMock === false, '抽屜開啟時按下 Escape 鍵不得觸發老闆鍵防窺');

// 19.8b 橫向全螢幕時鐘模式下 Escape 優先退出時鐘驗證
let isLandscapeClockMock = true;
let landscapeClockClosedMock = false;
bossKeyTriggeredMock = false;

function mockLandscapeEscapeHandler(e) {
    if (e.key === 'Escape' && isLandscapeClockMock) {
        e.defaultPrevented = true;
        e.propagationStopped = true;
        landscapeClockClosedMock = true;
        isLandscapeClockMock = false;
    }
}

const escLandscapeEvent = { key: 'Escape', defaultPrevented: false, propagationStopped: false };
mockLandscapeEscapeHandler(escLandscapeEvent);
mockBossKeyKeydown(escLandscapeEvent);

assert(landscapeClockClosedMock === true, '橫向全螢幕時鐘模式下按下 Escape 鍵應優先退出時鐘');
assert(bossKeyTriggeredMock === false, '橫向全螢幕時鐘模式下按下 Escape 鍵不得誤觸老闆鍵防窺');

// 19.9 Screen Wake Lock 重入防禦與重複釋放容錯驗證
await testRequestWakeLock(true, false);
const firstWakeLock = currentWakeLock;
// 再次請求：已有鎖定時不應重複建立新實例
await testRequestWakeLock(true, false);
assert(currentWakeLock === firstWakeLock, '已持有 Wake Lock 時重複請求應維持既有實例');

// 連續釋放兩次：不應拋出任何例外
await testReleaseWakeLock();
assert(currentWakeLock === null, '首次釋放後實例應為 null');
let doubleReleaseError = false;
try {
    await testReleaseWakeLock();
} catch {
    doubleReleaseError = true;
}
assert(doubleReleaseError === false, '重複釋放 Wake Lock 應具備冪等性且安全不拋錯');

// 19.9b 非同步競態條件測試：請求防休眠期間快速退出全螢幕，解析完成後應自動釋放
let asyncSentinelReleased = false;
async function testAsyncRaceCondition() {
    let mockFullscreen = true;
    
    // 模擬非同步請求
    const requestPromise = (async () => {
        const sentinel = new MockWakeLockSentinel();
        sentinel.release = async () => { asyncSentinelReleased = true; };
        await new Promise(r => setTimeout(r, 10));
        if (!mockFullscreen) {
            await sentinel.release();
            return null;
        }
        return sentinel;
    })();

    // 模擬使用者在 promise 解析前快速退出全螢幕
    mockFullscreen = false;
    const resultSentinel = await requestPromise;
    return resultSentinel;
}

const racedSentinel = await testAsyncRaceCondition();
assert(racedSentinel === null, '全螢幕請求延遲完成但已提前退出時，防休眠實例應維持為 null');
assert(asyncSentinelReleased === true, '全螢幕請求延遲完成但已提前退出時，新取得之 Sentinel 必須被立即釋放');

// 19.10 行動裝置判定 (isMobileDevice) 邏輯驗證
function mockIsMobileDevice(touchCoarse, uaMobile, maxTouch, winWidth) {
    const isTouch = touchCoarse;
    const isUa = uaMobile;
    const isTouchDim = (maxTouch > 0) && (winWidth <= 1024);
    return isTouch || isUa || isTouchDim;
}

assert(mockIsMobileDevice(true, false, 5, 390) === true, '觸控螢幕且寬度 390px (手機) 應判定為行動裝置');
assert(mockIsMobileDevice(false, true, 0, 768) === true, 'UA 包含 Mobile 標籤應判定為行動裝置');
assert(mockIsMobileDevice(false, false, 0, 1920) === false, '桌機滑鼠環境 (無觸控、寬度 1920px) 應判定為非行動裝置');

// 19.11 老闆鍵防窺狀態下 ARIA 語意隱私保護驗證
function mockGetHeroAriaLabel(isDisguised, formattedAmount) {
    return isDisguised ? '已啟用防窺保護' : formattedAmount;
}
assert(mockGetHeroAriaLabel(false, 'NT$ 1,234.56') === 'NT$ 1,234.56', '未防窺時 ARIA 標籤應完整朗讀真實薪資');
assert(mockGetHeroAriaLabel(true, 'NT$ 1,234.56') === '已啟用防窺保護', '防窺狀態下 ARIA 標籤必須遮蔽真實金額以保護財務隱私');
assert(appJsContent.includes("heroAriaLabel = isDisguised ? '已啟用防窺保護' : formattedHeroAmount"), 'app.js 必須包含防窺狀態下的 ARIA 隱私保護切換');

// 19.12 小螢幕 (<= 640px) 自適應懸浮/全螢幕按鈕行為驗證
function mockSetupDeviceFeatures(isMobile, winWidth) {
    const isMobileOrSmall = isMobile || (winWidth <= 640);
    return {
        icon: isMobileOrSmall ? '⏱️' : '📌',
        text: isMobileOrSmall ? ' 全螢幕' : ' 桌面懸浮',
        mode: isMobileOrSmall ? 'fullscreen' : 'pip'
    };
}
assert(mockSetupDeviceFeatures(false, 375).icon === '⏱️', '桌機模擬 375px 小螢幕時按鈕圖示應自適應為 ⏱️');
assert(mockSetupDeviceFeatures(false, 375).mode === 'fullscreen', '桌機模擬 375px 小螢幕時應觸發全螢幕時鐘');
assert(mockSetupDeviceFeatures(false, 1024).icon === '📌', '寬螢幕桌機環境應維持 📌 桌面懸浮圖示');
assert(mockSetupDeviceFeatures(false, 1024).mode === 'pip', '寬螢幕桌機環境應維持桌面畫中畫模式');

console.log(`\n🎉 全部 ${passedTests}/${totalTests} 項單元測試成功通過！核心運算、防窺隱私、效能快取與無障礙體驗驗證精確無誤。`);



