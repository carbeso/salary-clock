/**
 * 薪資時鐘 - 時間與排程運算服務 (TimeService)
 * 負責處理月曆天數、平閏年換算、工作日判定、午休扣除與防時間漂移之時間戳記計算
 */

/**
 * 取得指定年月的實際天數（自動處理閏年 2 月 28/29 天，大月 31 天，小月 30 天）
 * @param {number} year - 西元年份（例如 2026）
 * @param {number} month - 月份（0 代表 1 月，11 代表 12 月）
 * @returns {number} 當月總天數
 */
export function getDaysInMonth(year, month) {
    // 利用 new Date(year, month + 1, 0) 自動回傳該月最後一天
    return new Date(year, month + 1, 0).getDate();
}

/**
 * 將 "HH:mm" 格式的時間字串轉換為指定日期的 Date 物件
 * @param {Date} baseDate - 基準日期（年月日）
 * @param {string} timeStr - "HH:mm" 格式字串（例如 "09:00"）
 * @returns {Date} 組合後的 Date 物件
 */
export function parseTimeString(baseDate, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
}

/**
 * 檢查指定日期是否為工作日
 * @param {Date} date - 欲檢查的日期
 * @param {number[]} workDays - 工作日陣列，0 代表週日，1~6 代表週一至週六（預設週一至週五 [1, 2, 3, 4, 5]）
 * @returns {boolean} 是否為工作日
 */
export function isWorkDay(date, workDays = [1, 2, 3, 4, 5]) {
    const dayOfWeek = date.getDay();
    return workDays.includes(dayOfWeek);
}

/**
 * 計算指定月份內的所有有效工作天數
 * @param {number} year - 西元年份
 * @param {number} month - 月份 (0~11)
 * @param {number[]} workDays - 工作日設定（例如 [1, 2, 3, 4, 5]）
 * @returns {number} 該月工作日總天數
 */
export function getWorkDaysInMonth(year, month, workDays = [1, 2, 3, 4, 5]) {
    const totalDays = getDaysInMonth(year, month);
    let count = 0;
    for (let day = 1; day <= totalDays; day++) {
        const d = new Date(year, month, day);
        if (isWorkDay(d, workDays)) {
            count++;
        }
    }
    return count;
}

/**
 * 取得指定日期所在週的週一起點 (00:00:00)
 * @param {Date} date - 基準日期
 * @returns {Date} 本週週一的 Date 物件
 */
export function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    // JavaScript 中 0 代表週日，1 代表週一，依此類推。
    // 計算距離週一的天數差 (若為週日 0 則退回 6 天)
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

/**
 * 計算當週的總工作天數以及截至今天之前的本週已過工作天數
 * @param {Date} now - 當前日期
 * @param {number[]} workDays - 工作日設定（預設 [1, 2, 3, 4, 5]）
 * @returns {{ totalWeekWorkDays: number, pastWeekWorkDays: number }}
 */
export function getWeekWorkDaysInfo(now = new Date(), workDays = [1, 2, 3, 4, 5]) {
    const monday = getMondayOfWeek(now);
    let totalWeekWorkDays = 0;
    let pastWeekWorkDays = 0;

    const todayDateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // 遍歷本週 7 天 (週一至週日)
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);

        const isWorking = isWorkDay(currentDay, workDays);
        if (isWorking) {
            totalWeekWorkDays++;
            const currentDayKey = `${currentDay.getFullYear()}-${currentDay.getMonth()}-${currentDay.getDate()}`;
            // 若為今天之前的日期，則計入已完成工作天
            if (currentDay < now && currentDayKey !== todayDateKey) {
                pastWeekWorkDays++;
            }
        }
    }

    return { totalWeekWorkDays, pastWeekWorkDays };
}

/**
 * 計算單一工作日的有效淨工時秒數（總工時扣除午休長度）
 * @param {string} workStart - 上班時間 "HH:mm"（例如 "09:00"）
 * @param {string} workEnd - 下班時間 "HH:mm"（例如 "18:00"）
 * @param {boolean} breakEnabled - 是否啟用午休扣除
 * @param {string} breakStart - 午休開始 "HH:mm"（例如 "12:00"）
 * @param {string} breakEnd - 午休結束 "HH:mm"（例如 "13:00"）
 * @returns {number} 每日有效淨工時秒數
 */
export function getDailyEffectiveWorkSeconds(
    workStart = '09:00',
    workEnd = '18:00',
    breakEnabled = true,
    breakStart = '12:00',
    breakEnd = '13:00'
) {
    const dummyDate = new Date(2026, 0, 1);
    const startMs = parseTimeString(dummyDate, workStart).getTime();
    const endMs = parseTimeString(dummyDate, workEnd).getTime();
    const grossSeconds = Math.max(0, (endMs - startMs) / 1000);

    if (!breakEnabled) {
        return grossSeconds;
    }

    const bStartMs = parseTimeString(dummyDate, breakStart).getTime();
    const bEndMs = parseTimeString(dummyDate, breakEnd).getTime();
    const breakSeconds = Math.max(0, (bEndMs - bStartMs) / 1000);

    return Math.max(0, grossSeconds - breakSeconds);
}

/**
 * 計算今日已進行的「有效淨工時秒數」以及目前上班狀態
 * 採用絕對時間戳記計算，防範作業系統休眠喚醒產生的累計漂移
 * 
 * @param {Date} now - 當前時間 Date 物件
 * @param {Object} schedule - 排程設定物件
 * @returns {Object} 包含今日已過有效秒數、當日淨工時總秒數、下班倒數秒數與當前狀態
 */
export function calculateTodayWorkProgress(now = new Date(), schedule = {}) {
    const {
        workStart = '09:00',
        workEnd = '18:00',
        breakEnabled = true,
        breakStart = '12:00',
        breakEnd = '13:00',
        workDays = [1, 2, 3, 4, 5]
    } = schedule;

    // 1. 判斷今日是否為休假日
    if (!isWorkDay(now, workDays)) {
        return {
            isWorkingDay: false,
            status: 'DAY_OFF', // 今日放假/週末
            statusText: '今日公休中 🏖️',
            effectiveSecondsToday: 0,
            totalDailySeconds: 0,
            remainingSecondsToOff: 0,
            progressPercentage: 0
        };
    }

    // 2. 建立今日關鍵時段時間戳記
    const startOfWork = parseTimeString(now, workStart);
    const endOfWork = parseTimeString(now, workEnd);
    const startOfBreak = parseTimeString(now, breakStart);
    const endOfBreak = parseTimeString(now, breakEnd);

    const nowMs = now.getTime();
    const startWorkMs = startOfWork.getTime();
    const endWorkMs = endOfWork.getTime();
    const startBreakMs = startOfBreak.getTime();
    const endBreakMs = endOfBreak.getTime();

    // 每日有效總工時
    const totalDailySeconds = getDailyEffectiveWorkSeconds(
        workStart,
        workEnd,
        breakEnabled,
        breakStart,
        breakEnd
    );

    let effectiveSecondsToday = 0;
    let status = 'WORKING';
    let statusText = '努力工作中 💼';
    let remainingSecondsToOff = Math.max(0, Math.floor((endWorkMs - nowMs) / 1000));

    // 3. 根據時間軸落點計算有效工時（保留小數浮點數，支援高頻率 4 位滾動刷新）
    if (nowMs < startWorkMs) {
        // 尚未到上班時間
        status = 'BEFORE_WORK';
        statusText = '尚未上班 ☕';
        effectiveSecondsToday = 0;
        remainingSecondsToOff = Math.floor((endWorkMs - startWorkMs) / 1000);
    } else if (nowMs >= endWorkMs) {
        // 已經下班
        status = 'OFF_WORK';
        statusText = '下班萬歲 🎉';
        effectiveSecondsToday = totalDailySeconds;
        remainingSecondsToOff = 0;
    } else {
        // 在上班時間之內：檢查是否在午休時段
        if (breakEnabled && nowMs >= startBreakMs && nowMs < endBreakMs) {
            status = 'ON_BREAK';
            statusText = '午休充電中 🍱';
            // 午休期間工時停留在午休開始點
            effectiveSecondsToday = (startBreakMs - startWorkMs) / 1000;
        } else if (breakEnabled && nowMs >= endBreakMs) {
            // 午休過後：總經過時間扣除完整午休時間（精確到毫秒/浮點秒數）
            const rawElapsedSeconds = (nowMs - startWorkMs) / 1000;
            const breakDurationSeconds = (endBreakMs - startBreakMs) / 1000;
            effectiveSecondsToday = Math.max(0, rawElapsedSeconds - breakDurationSeconds);
        } else {
            // 午休前或未啟用午休：單純計算自上班以來的秒數（精確到毫秒/浮點秒數）
            effectiveSecondsToday = (nowMs - startWorkMs) / 1000;
        }
    }

    // 防禦邊界：有效秒數不得小於 0 亦不得超過一日上限
    effectiveSecondsToday = Math.min(totalDailySeconds, Math.max(0, effectiveSecondsToday));
    const progressPercentage = totalDailySeconds > 0
        ? (effectiveSecondsToday / totalDailySeconds) * 100
        : 0;

    return {
        isWorkingDay: true,
        status,
        statusText,
        effectiveSecondsToday,
        totalDailySeconds,
        remainingSecondsToOff,
        progressPercentage
    };
}
