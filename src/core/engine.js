/**
 * 薪資時鐘 - 核心計算引擎 (SalaryEngine)
 * 純邏輯計算，不依賴任何瀏覽器 DOM 或平台 API
 * 負責全月連續制、工作日工時制、自由接案碼錶制三種模式之薪資、進度與狀態推導
 */

import {
    getDaysInMonth,
    getWorkDaysInMonth,
    getDailyEffectiveWorkSeconds,
    calculateTodayWorkProgress,
    getWeekWorkDaysInfo,
    isWorkDay,
    parseTimeString
} from './time-service.js';

import { REWARD_PRESETS } from './storage.js';

/**
 * 日期層級快取儲存空間 (Day-level Memoization Cache)
 * 用於工作日模式與連續制模式。
 * 只要在同一個曆法日 (以 YYYY-MM-DD 判定) 且設定相同，
 * 當月總工作天數、每日有效秒數、過去累積工作天數等靜態資訊僅計算一次，
 * 消除每 33ms 產生 84 個 Date 物件與垃圾回收 (GC Pause) 延遲。
 */
let workdayMemoCache = null;
let continuousMemoCache = null;

/**
 * 快取統計指標（供測試覆蓋率與效能驗證使用）
 */
const cacheStats = {
    workdayHits: 0,
    workdayMisses: 0,
    continuousHits: 0,
    continuousMisses: 0
};

/**
 * 清除計算引擎日期層級快取
 * 用於設定變更或單元測試重設狀態
 */
export function clearEngineCache() {
    workdayMemoCache = null;
    continuousMemoCache = null;
    cacheStats.workdayHits = 0;
    cacheStats.workdayMisses = 0;
    cacheStats.continuousHits = 0;
    cacheStats.continuousMisses = 0;
}

/**
 * 取得快取命中與未命中統計數據
 * @returns {{ workdayHits: number, workdayMisses: number, continuousHits: number, continuousMisses: number }}
 */
export function getEngineCacheStats() {
    return { ...cacheStats };
}

/**
 * 產生工作日模式專屬的快取鍵值
 * 結合曆法日 (YYYY-MM-DD) 與會影響一日靜態換算的組態參數
 * @param {Object} config - 使用者薪資與排程設定
 * @param {Date} now - 當前時間
 * @returns {string} 快取鍵值
 */
function getWorkdayCacheKey(config, now) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    const workDaysKey = Array.isArray(config.workDays) ? config.workDays.join(',') : '1,2,3,4,5';
    // 預設為啟用午休 (true)，故當 config.breakEnabled 為 undefined 時必須解析為 true，防範快取鍵誤判
    const breakEnabled = config.breakEnabled !== false;
    return `${dateKey}|${config.monthlySalary ?? 40000}|${workDaysKey}|${config.workStart ?? '09:00'}|${config.workEnd ?? '18:00'}|${breakEnabled}|${config.breakStart ?? '12:00'}|${config.breakEnd ?? '13:00'}`;
}

/**
 * 產生連續制模式專屬的快取鍵值
 * @param {Object} config - 使用者薪資設定
 * @param {Date} now - 當前時間
 * @returns {string} 快取鍵值
 */
function getContinuousCacheKey(config, now) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return `${dateKey}|${config.monthlySalary ?? 40000}`;
}

/**
 * 解析使用者選定的趣味指標資訊
 * @param {Object} config - 設定物件
 * @returns {{ name: string, icon: string, price: number, unit: string }}
 */
export function getRewardTargetInfo(config) {
    const type = config.rewardType || 'latte';
    if (type === 'custom') {
        return {
            name: config.rewardCustomName || '自訂目標',
            icon: config.rewardCustomIcon || '🎯',
            price: Math.max(1, Number(config.rewardCustomPrice) || 100),
            unit: config.rewardCustomUnit || '個'
        };
    }
    const preset = REWARD_PRESETS[type] || REWARD_PRESETS.latte;
    return { ...preset };
}

/**
 * 模式 A：全月連續制計算（含日期層級快取）
 * @param {Object} config - 薪資設定
 * @param {Date} now - 當前時間
 * @returns {Object} 計算結果
 */
export function calculateContinuousMode(config, now = new Date()) {
    const key = getContinuousCacheKey(config, now);

    let cached = continuousMemoCache;
    if (!cached || cached.key !== key) {
        // 快取未命中：在該曆法日僅執行一次靜態邊界計算
        cacheStats.continuousMisses++;
        const { monthlySalary = 40000 } = config;
        const year = now.getFullYear();
        const month = now.getMonth();

        // 取得當月起點 (1日 00:00:00) 與終點 (下月1日 00:00:00) 毫秒戳記
        const startOfMonthMs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const endOfMonthMs = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();

        const totalMs = endOfMonthMs - startOfMonthMs;
        const totalSeconds = totalMs / 1000;
        const ratePerSecond = totalSeconds > 0 ? monthlySalary / totalSeconds : 0;

        // 今日起算時間 (今日 00:00:00)
        const startOfDayMs = new Date(year, month, now.getDate(), 0, 0, 0, 0).getTime();

        // 本週起算時間 (週一 00:00:00)
        const dayOfWeek = now.getDay();
        const diffToMonday = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const startOfWeekMs = new Date(year, month, diffToMonday, 0, 0, 0, 0).getTime();

        cached = {
            key,
            startOfMonthMs,
            endOfMonthMs,
            totalMs,
            totalSeconds,
            ratePerSecond,
            startOfDayMs,
            startOfWeekMs
        };
        continuousMemoCache = cached;
    } else {
        // 快取命中：直接複用當日靜態毫秒戳記與每秒單價
        cacheStats.continuousHits++;
    }

    const nowMs = now.getTime();
    const elapsedMs = Math.min(Math.max(nowMs - cached.startOfMonthMs, 0), cached.totalMs);
    const elapsedSeconds = elapsedMs / 1000;

    // 本月已累積金額與進度 (純算術計算，無額外 Date 物件分配)
    const monthEarned = elapsedSeconds * cached.ratePerSecond;
    const monthProgress = cached.totalMs > 0 ? (elapsedMs / cached.totalMs) * 100 : 0;

    // 今日數據
    const todayElapsedSeconds = Math.max(0, (nowMs - cached.startOfDayMs) / 1000);
    const todayEarned = todayElapsedSeconds * cached.ratePerSecond;
    const todayProgress = (todayElapsedSeconds / 86400) * 100;

    // 本週數據
    const weekElapsedSeconds = Math.max(0, (nowMs - cached.startOfWeekMs) / 1000);
    const totalWeekSeconds = 7 * 86400;
    const weekEarned = weekElapsedSeconds * cached.ratePerSecond;
    const weekProgress = Math.min(100, (weekElapsedSeconds / totalWeekSeconds) * 100);

    // 多元趣味指標
    const reward = getRewardTargetInfo(config);
    const rewardCount = reward.price > 0 ? (todayEarned / reward.price) : 0;
    const rewardProgress = reward.price > 0 ? Math.min(100, ((todayEarned % reward.price) / reward.price) * 100) : 0;

    return {
        mode: 'continuous',
        todayEarned,
        weekEarned,
        monthEarned,
        ratePerSecond: cached.ratePerSecond,
        todayProgress,
        weekProgress,
        monthProgress,
        status: 'CONTINUOUS',
        statusText: '24小時全天跳動中 ⏳',
        rewardInfo: {
            ...reward,
            count: rewardCount,
            progress: rewardProgress
        },
        remainingSecondsToOff: 0
    };
}

/**
 * 模式 B：工作日與工時制計算（扣除例假日與午休，具備高效率日期層級快取）
 * @param {Object} config - 薪資設定與工時排程
 * @param {Date} now - 當前時間
 * @returns {Object} 計算結果
 */
export function calculateWorkdayMode(config, now = new Date()) {
    const key = getWorkdayCacheKey(config, now);

    let cached = workdayMemoCache;
    if (!cached || cached.key !== key) {
        // 快取未命中：在該曆法日僅計算一次全月天數、每日淨工時、過去累積天數與工作時段毫秒戳記
        cacheStats.workdayMisses++;

        const {
            monthlySalary = 40000,
            workDays = [1, 2, 3, 4, 5],
            workStart = '09:00',
            workEnd = '18:00',
            breakEnabled = true,
            breakStart = '12:00',
            breakEnd = '13:00'
        } = config;

        const year = now.getFullYear();
        const month = now.getMonth();
        const todayDate = now.getDate();

        // 1. 計算當月有效工作天數與每日淨工時
        const totalWorkDaysInMonth = getWorkDaysInMonth(year, month, workDays);
        const dailyEffectiveSeconds = getDailyEffectiveWorkSeconds(
            workStart,
            workEnd,
            breakEnabled,
            breakStart,
            breakEnd
        );

        // 當月有效工作總秒數（若為 0 則防除以零例外）
        const totalEffectiveSecondsInMonth = totalWorkDaysInMonth * dailyEffectiveSeconds;
        const ratePerSecond = totalEffectiveSecondsInMonth > 0
            ? monthlySalary / totalEffectiveSecondsInMonth
            : 0;

        // 每日淨工時全額薪資
        const dailyFullSalary = dailyEffectiveSeconds * ratePerSecond;

        // 2. 計算本月在今日之前的「過去已完成工作天數」與底薪累積
        let pastWorkDaysCount = 0;
        for (let day = 1; day < todayDate; day++) {
            const d = new Date(year, month, day);
            if (isWorkDay(d, workDays)) {
                pastWorkDaysCount++;
            }
        }
        const pastWorkDaysSalary = pastWorkDaysCount * dailyFullSalary;

        // 3. 計算本週數據 (週一至今日)
        const { totalWeekWorkDays, pastWeekWorkDays } = getWeekWorkDaysInfo(now, workDays);
        const pastWeekSalary = pastWeekWorkDays * dailyFullSalary;
        const totalWeekSeconds = totalWeekWorkDays * dailyEffectiveSeconds;
        const pastWeekEffectiveSeconds = pastWeekWorkDays * dailyEffectiveSeconds;

        // 4. 今日工作時間邊界戳記 (轉為毫秒純數值，供每幀 O(1) 判定)
        const isTodayWorkDay = isWorkDay(now, workDays);
        const startWorkMs = parseTimeString(now, workStart).getTime();
        const endWorkMs = parseTimeString(now, workEnd).getTime();
        const startBreakMs = parseTimeString(now, breakStart).getTime();
        const endBreakMs = parseTimeString(now, breakEnd).getTime();
        const breakDurationSeconds = Math.max(0, (endBreakMs - startBreakMs) / 1000);

        cached = {
            key,
            totalWorkDaysInMonth,
            dailyEffectiveSeconds,
            totalEffectiveSecondsInMonth,
            ratePerSecond,
            dailyFullSalary,
            pastWorkDaysCount,
            pastWorkDaysSalary,
            totalWeekWorkDays,
            pastWeekWorkDays,
            pastWeekSalary,
            totalWeekSeconds,
            pastWeekEffectiveSeconds,
            isTodayWorkDay,
            startWorkMs,
            endWorkMs,
            startBreakMs,
            endBreakMs,
            breakDurationSeconds,
            monthlySalary,
            breakEnabled
        };
        workdayMemoCache = cached;
    } else {
        // 快取命中：當日所有靜態資訊均已在快取中，完全無須重複走訪月曆與建立 Date 物件
        cacheStats.workdayHits++;
    }

    const nowMs = now.getTime();

    // 5. 進行今日工作進度之純數值 O(1) 判定（零 Date 物件分配）
    let effectiveSecondsToday = 0;
    let status = 'WORKING';
    let statusText = '努力工作中 💼';
    let remainingSecondsToOff = 0;

    if (!cached.isTodayWorkDay) {
        // 今日非工作日
        status = 'DAY_OFF';
        statusText = '今日公休中 🏖️';
        effectiveSecondsToday = 0;
        remainingSecondsToOff = 0;
    } else if (nowMs < cached.startWorkMs) {
        // 尚未到上班時間
        status = 'BEFORE_WORK';
        statusText = '尚未上班 ☕';
        effectiveSecondsToday = 0;
        remainingSecondsToOff = Math.floor((cached.endWorkMs - cached.startWorkMs) / 1000);
    } else if (nowMs >= cached.endWorkMs) {
        // 已經下班
        status = 'OFF_WORK';
        statusText = '下班萬歲 🎉';
        effectiveSecondsToday = cached.dailyEffectiveSeconds;
        remainingSecondsToOff = 0;
    } else {
        // 上班進行中
        remainingSecondsToOff = Math.max(0, Math.floor((cached.endWorkMs - nowMs) / 1000));
        if (cached.breakEnabled && nowMs >= cached.startBreakMs && nowMs < cached.endBreakMs) {
            // 午休中
            status = 'ON_BREAK';
            statusText = '午休充電中 🍱';
            effectiveSecondsToday = (cached.startBreakMs - cached.startWorkMs) / 1000;
        } else if (cached.breakEnabled && nowMs >= cached.endBreakMs) {
            // 午休過後
            const rawElapsedSeconds = (nowMs - cached.startWorkMs) / 1000;
            effectiveSecondsToday = Math.max(0, rawElapsedSeconds - cached.breakDurationSeconds);
        } else {
            // 午休前或未啟用午休
            effectiveSecondsToday = (nowMs - cached.startWorkMs) / 1000;
        }
    }

    // 防禦邊界：有效秒數不得小於 0 亦不得超過一日上限
    effectiveSecondsToday = Math.min(cached.dailyEffectiveSeconds, Math.max(0, effectiveSecondsToday));
    const todayProgress = cached.dailyEffectiveSeconds > 0
        ? (effectiveSecondsToday / cached.dailyEffectiveSeconds) * 100
        : 0;

    // 今日已賺薪資
    const todayEarned = effectiveSecondsToday * cached.ratePerSecond;

    // 本月總累積薪資 = 過去工作天底薪 + 今日已賺薪資 (O(1) 純數值算術)
    const monthEarned = cached.pastWorkDaysSalary + todayEarned;
    const monthProgress = cached.monthlySalary > 0
        ? Math.min(100, (monthEarned / cached.monthlySalary) * 100)
        : 0;

    // 本週數據計算
    const weekEarned = cached.pastWeekSalary + todayEarned;
    const weekEffectiveSeconds = cached.pastWeekEffectiveSeconds + effectiveSecondsToday;
    const weekProgress = cached.totalWeekSeconds > 0
        ? Math.min(100, (weekEffectiveSeconds / cached.totalWeekSeconds) * 100)
        : 0;

    // 多元趣味指標計算
    const reward = getRewardTargetInfo(config);
    const rewardCount = reward.price > 0 ? (todayEarned / reward.price) : 0;
    const rewardProgress = reward.price > 0 ? Math.min(100, ((todayEarned % reward.price) / reward.price) * 100) : 0;

    return {
        mode: 'workday',
        todayEarned,
        weekEarned,
        monthEarned,
        ratePerSecond: cached.ratePerSecond,
        todayProgress,
        weekProgress,
        monthProgress,
        status,
        statusText,
        rewardInfo: {
            ...reward,
            count: rewardCount,
            progress: rewardProgress
        },
        remainingSecondsToOff,
        totalDailySeconds: cached.dailyEffectiveSeconds,
        todayEffectiveSeconds: effectiveSecondsToday,
        totalWorkDaysInMonth: cached.totalWorkDaysInMonth,
        pastWorkDaysCount: cached.pastWorkDaysCount,
        totalWeekWorkDays: cached.totalWeekWorkDays,
        pastWeekWorkDays: cached.pastWeekWorkDays
    };
}

/**
 * 模式 C：自由接案碼錶制計算
 * @param {Object} config - 薪資與接案碼錶設定
 * @param {Date} now - 當前時間
 * @returns {Object} 計算結果
 */
export function calculateFreelanceMode(config, now = new Date()) {
    const {
        hourlyRate = 250,
        freelanceState = {}
    } = config;

    const ratePerSecond = hourlyRate / 3600;

    // 計算當前累計總秒數
    let currentTotalSeconds = freelanceState.accumulatedSeconds || 0;

    // 若碼錶處於進行中狀態，需疊加自上次啟動以來的真實時間差（絕對時間防漂移）
    if (freelanceState.isRunning && freelanceState.lastStartTime) {
        const nowMs = now.getTime();
        const diffSeconds = Math.max(0, (nowMs - freelanceState.lastStartTime) / 1000);
        currentTotalSeconds += diffSeconds;
    }

    const todayEarned = currentTotalSeconds * ratePerSecond;
    const reward = getRewardTargetInfo(config);
    const rewardCount = reward.price > 0 ? (todayEarned / reward.price) : 0;
    const rewardProgress = reward.price > 0 ? Math.min(100, ((todayEarned % reward.price) / reward.price) * 100) : 0;

    return {
        mode: 'freelance',
        todayEarned,
        weekEarned: todayEarned,
        monthEarned: todayEarned, // 碼錶模式以當前專案累計為主
        ratePerSecond,
        todayProgress: 0,        // 碼錶模式無固定進度百分比上限
        weekProgress: 0,
        monthProgress: 0,
        status: freelanceState.isRunning ? 'FREELANCE_RUNNING' : 'FREELANCE_PAUSED',
        statusText: freelanceState.isRunning ? '專注計時中 ⏱️' : '碼錶暫停中 ⏸️',
        rewardInfo: {
            ...reward,
            count: rewardCount,
            progress: rewardProgress
        },
        remainingSecondsToOff: 0,
        accumulatedSeconds: currentTotalSeconds,
        isRunning: !!freelanceState.isRunning
    };
}

/**
 * 核心計薪引擎對外主要進入點
 * 傳入設定與時間，自動指派對應計薪模式並產出標準化資料結構
 * @param {Object} config - 使用者全域設定
 * @param {Date} now - 計算基準時間
 * @returns {Object} 標準化計薪資料物件
 */
export function calculateSalary(config, now = new Date()) {
    const mode = config.salaryMode || 'workday';

    switch (mode) {
        case 'continuous':
            return calculateContinuousMode(config, now);
        case 'freelance':
            return calculateFreelanceMode(config, now);
        case 'workday':
        default:
            return calculateWorkdayMode(config, now);
    }
}
