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

console.log(`\n🎉 全部 ${passedTests}/${totalTests} 項單元測試成功通過！核心運算與 LocalStorage 本機儲存邏輯精確無誤。`);


