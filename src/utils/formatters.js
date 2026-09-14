/**
 * 薪資時鐘 - 格式化工具模組 (Formatters)
 * 負責數值千分位、幣別、百分比以及時間長度的格式化展示
 */

/**
 * 格式化貨幣金額
 * @param {number} amount - 待格式化的數值金額
 * @param {string} currencySymbol - 幣別符號（例如 "NT$", "$", "¥"）
 * @param {number} decimalDigits - 欲保留的小數點位數（預設 2 位）
 * @param {boolean} showThousandSeparator - 是否包含千分位逗號（預設 true）
 * @returns {string} 格式化後的貨幣字串，例如 "NT$ 12,345.67"
 */
export function formatCurrency(amount, currencySymbol = 'NT$', decimalDigits = 2, showThousandSeparator = true) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
    }

    // 依據指定小數點位數四捨五入
    const fixedStr = amount.toFixed(decimalDigits);
    const [integerPart, decimalPart] = fixedStr.split('.');

    // 是否套用千分位正規表示式
    const formattedInteger = showThousandSeparator
        ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        : integerPart;

    const resultAmount = decimalPart !== undefined
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;

    return `${currencySymbol} ${resultAmount}`;
}

/**
 * 將秒數轉換為繁體中文的人類易讀時間長度（例如 "2 小時 15 分 30 秒"）
 * @param {number} totalSeconds - 總秒數
 * @returns {string} 人類易讀時間字串
 */
export function formatDurationChinese(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} 小時`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes} 分`);
    parts.push(`${seconds} 秒`);

    return parts.join(' ');
}

/**
 * 將秒數轉換為標準計時碼錶格式（例如 "08:15:30"）
 * @param {number} totalSeconds - 總秒數
 * @returns {string} HH:mm:ss 格式字串
 */
export function formatStopwatch(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化百分比進度
 * @param {number} percentage - 0 到 100 之間的百分比數值
 * @param {number} decimals - 保留小數點位數（預設 1 位）
 * @returns {string} 例如 "65.4%"
 */
export function formatPercentage(percentage, decimals = 1) {
    const clamped = Math.min(100, Math.max(0, Number(percentage) || 0));
    return `${clamped.toFixed(decimals)}%`;
}
