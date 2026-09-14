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
    isWorkDay
} from './time-service.js';

import { REWARD_PRESETS } from './storage.js';

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
 * 模式 A：全月連續制計算（比照原版 Python 之演算法）
 * @param {Object} config - 薪資設定
 * @param {Date} now - 當前時間
 * @returns {Object} 計算結果
 */
export function calculateContinuousMode(config, now = new Date()) {
    const { monthlySalary = 40000 } = config;
    const year = now.getFullYear();
    const month = now.getMonth();

    // 取得當月起點 (1日 00:00:00) 與終點 (下月1日 00:00:00)
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);

    const totalMs = endOfMonth.getTime() - startOfMonth.getTime();
    const elapsedMs = Math.min(Math.max(now.getTime() - startOfMonth.getTime(), 0), totalMs);

    const totalSeconds = totalMs / 1000;
    const elapsedSeconds = elapsedMs / 1000;

    // 每秒薪資 rate
    const ratePerSecond = monthlySalary / totalSeconds;
    // 本月已累積金額
    const monthEarned = elapsedSeconds * ratePerSecond;
    // 當月進度百分比
    const monthProgress = (elapsedMs / totalMs) * 100;

    // 今日起算時間 (今日 00:00:00)
    const startOfDay = new Date(year, month, now.getDate(), 0, 0, 0, 0);
    const todayElapsedSeconds = Math.max(0, (now.getTime() - startOfDay.getTime()) / 1000);
    const todayEarned = todayElapsedSeconds * ratePerSecond;
    const todayProgress = (todayElapsedSeconds / 86400) * 100;

    // 本週起算時間 (週一 00:00:00)
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startOfWeek = new Date(year, month, diffToMonday, 0, 0, 0, 0);
    const weekElapsedSeconds = Math.max(0, (now.getTime() - startOfWeek.getTime()) / 1000);
    const totalWeekSeconds = 7 * 86400;
    const weekEarned = weekElapsedSeconds * ratePerSecond;
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
        ratePerSecond,
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
        remainingSecondsToOff: 0 // 連續制無固定上下班
    };
}

/**
 * 模式 B：工作日與工時制計算（真實上班族模式，扣除例假日與午休）
 * @param {Object} config - 薪資設定與工時排程
 * @param {Date} now - 當前時間
 * @returns {Object} 計算結果
 */
export function calculateWorkdayMode(config, now = new Date()) {
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

    // 每日淨薪資 (一日工時全額)
    const dailyFullSalary = dailyEffectiveSeconds * ratePerSecond;

    // 2. 計算今日工作進度
    const todayProgressResult = calculateTodayWorkProgress(now, {
        workStart,
        workEnd,
        breakEnabled,
        breakStart,
        breakEnd,
        workDays
    });

    // 今日已賺薪資
    const todayEarned = todayProgressResult.effectiveSecondsToday * ratePerSecond;

    // 3. 計算本月在今日之前的「過去已完成工作天數」
    let pastWorkDaysCount = 0;
    for (let day = 1; day < todayDate; day++) {
        const d = new Date(year, month, day);
        if (isWorkDay(d, workDays)) {
            pastWorkDaysCount++;
        }
    }

    // 本月總累積薪資 = 過去工作天全額薪資 + 今日已賺薪資
    const monthEarned = (pastWorkDaysCount * dailyFullSalary) + todayEarned;

    // 本月進度百分比
    const monthProgress = monthlySalary > 0
        ? Math.min(100, (monthEarned / monthlySalary) * 100)
        : 0;

    // 4. 計算本週數據 (週一至今日)
    const { totalWeekWorkDays, pastWeekWorkDays } = getWeekWorkDaysInfo(now, workDays);
    const weekEarned = (pastWeekWorkDays * dailyFullSalary) + todayEarned;
    const totalWeekSeconds = totalWeekWorkDays * dailyEffectiveSeconds;
    const weekEffectiveSeconds = (pastWeekWorkDays * dailyEffectiveSeconds) + todayProgressResult.effectiveSecondsToday;
    const weekProgress = totalWeekSeconds > 0
        ? Math.min(100, (weekEffectiveSeconds / totalWeekSeconds) * 100)
        : 0;

    // 5. 多元趣味激勵指標計算
    const reward = getRewardTargetInfo(config);
    const rewardCount = reward.price > 0 ? (todayEarned / reward.price) : 0;
    const rewardProgress = reward.price > 0 ? Math.min(100, ((todayEarned % reward.price) / reward.price) * 100) : 0;

    return {
        mode: 'workday',
        todayEarned,
        weekEarned,
        monthEarned,
        ratePerSecond,
        todayProgress: todayProgressResult.progressPercentage,
        weekProgress,
        monthProgress,
        status: todayProgressResult.status,
        statusText: todayProgressResult.statusText,
        rewardInfo: {
            ...reward,
            count: rewardCount,
            progress: rewardProgress
        },
        remainingSecondsToOff: todayProgressResult.remainingSecondsToOff,
        totalDailySeconds: dailyEffectiveSeconds,
        todayEffectiveSeconds: todayProgressResult.effectiveSecondsToday,
        totalWorkDaysInMonth,
        pastWorkDaysCount,
        totalWeekWorkDays,
        pastWeekWorkDays
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
