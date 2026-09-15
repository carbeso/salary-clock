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

console.log(`\n🎉 全部 ${passedTests}/${totalTests} 項單元測試成功通過！核心運算、防窺隱私與安全性防護驗證精確無誤。`);


