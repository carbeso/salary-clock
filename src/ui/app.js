/**
 * 薪資時鐘 (Salary Clock) - 前端核心應用控制器
 * 整合防窺模式加強、三進度條、多元指標激勵卡片與免橫條設定抽屜
 */

import { loadConfig, saveConfig, resetConfig, REWARD_PRESETS } from '../core/storage.js';
import { calculateSalary } from '../core/engine.js';
import {
    formatCurrency,
    formatDurationChinese,
    formatStopwatch,
    formatPercentage
} from '../utils/formatters.js';
import { BossKeyController } from './boss-key.js';
import { PiPController } from './pip-controller.js';

class SalaryClockApp {
    constructor() {
        // 載入本機設定
        this.config = loadConfig();

        // 核心計時定時器 ID
        this.timerId = null;

        // 快取 DOM 元素
        this.dom = {
            // 頂部動作列
            btnPip: document.getElementById('btn-pip'),
            pipBtnIcon: document.getElementById('pip-btn-icon'),
            pipBtnText: document.getElementById('pip-btn-text'),
            btnBossKey: document.getElementById('btn-boss-key'),
            btnSettings: document.getElementById('btn-settings'),
            bossKeyIcon: document.getElementById('boss-key-icon'),

            // 手機橫向全螢幕時鐘控制項
            landscapeClockControls: document.getElementById('landscape-clock-controls'),
            btnExitFullscreen: document.getElementById('btn-exit-fullscreen'),
            btnLandscapeDisguise: document.getElementById('btn-landscape-disguise'),
            btnLandscapeSettings: document.getElementById('btn-landscape-settings'),

            // 1. 核心英雄卡片
            heroCard: document.getElementById('hero-card'),
            statusBadge: document.getElementById('status-badge'),
            statusText: document.getElementById('status-text'),
            amountLabel: document.getElementById('amount-label'),
            amountWrapper: document.getElementById('amount-wrapper'),
            heroAmount: document.getElementById('hero-amount'),
            disguiseOverlay: document.getElementById('disguise-overlay'),
            countdownWrapper: document.getElementById('countdown-wrapper'),
            countdownText: document.getElementById('countdown-text'),

            // 自由接案碼錶操作
            freelanceControls: document.getElementById('freelance-controls'),
            btnFreelanceToggle: document.getElementById('btn-freelance-toggle'),
            btnFreelanceReset: document.getElementById('btn-freelance-reset'),

            // 2. 英雄卡進度條
            heroProgressSection: document.getElementById('hero-progress-section'),
            heroProgressLabel: document.getElementById('hero-progress-label'),
            heroProgressPercent: document.getElementById('hero-progress-percent'),
            heroProgressFill: document.getElementById('hero-progress-fill'),

            // 3. 多元趣味激勵指標卡片與戰利品圖示牆
            rewardCard: document.getElementById('reward-card'),
            rewardIcon: document.getElementById('reward-icon'),
            rewardName: document.getElementById('reward-name'),
            rewardSubtext: document.getElementById('reward-subtext'),
            rewardCountVal: document.getElementById('reward-count-val'),
            rewardProgressFill: document.getElementById('reward-progress-fill'),
            rewardProgressHint: document.getElementById('reward-progress-hint'),

            // 4. 下方三維度卡片（本日、本週、本月）
            cardPeriodToday: document.getElementById('card-period-today'),
            indToday: document.getElementById('ind-today'),
            todayCardVal: document.getElementById('today-card-val'),
            todayCardPercent: document.getElementById('today-card-percent'),
            todayCardFill: document.getElementById('today-card-fill'),

            cardPeriodWeek: document.getElementById('card-period-week'),
            indWeek: document.getElementById('ind-week'),
            weekCardVal: document.getElementById('week-card-val'),
            weekCardPercent: document.getElementById('week-card-percent'),
            weekCardFill: document.getElementById('week-card-fill'),

            cardPeriodMonth: document.getElementById('card-period-month'),
            indMonth: document.getElementById('ind-month'),
            monthCardVal: document.getElementById('month-card-val'),
            monthCardPercent: document.getElementById('month-card-percent'),
            monthCardFill: document.getElementById('month-card-fill'),

            // 5. 固定薪資換算參考列（秒、分、時、日、週）
            fixedRatesBar: document.getElementById('fixed-rates-bar'),
            rateSecFixed: document.getElementById('rate-sec-fixed'),
            rateMinFixed: document.getElementById('rate-min-fixed'),
            rateHourFixed: document.getElementById('rate-hour-fixed'),
            rateDayFixed: document.getElementById('rate-day-fixed'),
            rateWeekFixed: document.getElementById('rate-week-fixed'),

            // 設定抽屜
            drawerBackdrop: document.getElementById('drawer-backdrop'),
            btnDrawerClose: document.getElementById('btn-drawer-close'),
            btnSaveSettings: document.getElementById('btn-save-settings'),
            btnResetDefaults: document.getElementById('btn-reset-defaults'),

            // 設定表單欄位
            cfgSalaryMode: document.getElementById('cfg-salary-mode'),
            groupMonthlySalary: document.getElementById('group-monthly-salary'),
            cfgMonthlySalary: document.getElementById('cfg-monthly-salary'),
            groupHourlyRate: document.getElementById('group-hourly-rate'),
            cfgHourlyRate: document.getElementById('cfg-hourly-rate'),
            cfgRewardType: document.getElementById('cfg-reward-type'),
            groupRewardCustom: document.getElementById('group-reward-custom'),
            cfgCustomName: document.getElementById('cfg-custom-name'),
            cfgCustomPrice: document.getElementById('cfg-custom-price'),
            cfgCustomUnit: document.getElementById('cfg-custom-unit'),
            groupScheduleSettings: document.getElementById('group-schedule-settings'),
            cfgWorkStart: document.getElementById('cfg-work-start'),
            cfgWorkEnd: document.getElementById('cfg-work-end'),
            cfgBreakEnabled: document.getElementById('cfg-break-enabled'),
            groupBreakTimes: document.getElementById('group-break-times'),
            cfgBreakStart: document.getElementById('cfg-break-start'),
            cfgBreakEnd: document.getElementById('cfg-break-end'),
            cfgCurrencySymbol: document.getElementById('cfg-currency-symbol'),
            cfgDecimalDigits: document.getElementById('cfg-decimal-digits'),
            cfgBossDisguise: document.getElementById('cfg-boss-disguise'),

            // PiP 模板
            pipHudTemplate: document.getElementById('pip-hud-template')
        };

        // 初始化子模組
        this.bossKey = new BossKeyController({
            onStateChange: (isDisguised, mode) => this.handleBossKeyChange(isDisguised, mode)
        });

        this.pipController = new PiPController({
            onClose: () => this.handlePiPClose(),
            onToggleBossKey: () => this.bossKey.toggle()
        });

        // 圖示牆快取與展開狀態 (預設上限 30 個，可點擊展開顯示全部)
        this.badgesExpanded = false;
        this.currentBadgeCount = 0;
        this.currentBadgeIcon = '';
        this.currentBadgeUnit = '';

        // 當前聚焦維度預設為本日 ('today' | 'week' | 'month')
        this.activeView = 'today';

        // 節流快取：記錄下排卡片每秒跳動的時間戳記 (秒數整點刷新)
        this.lastSecondTick = 0;

        this.init();
    }

    /**
     * 啟動初始化流程
     */
    init() {
        this.setupDeviceSpecificFeatures();
        this.bindEvents();
        this.syncSettingsForm();
        this.updateModeUI();
        this.bossKey.setMode(this.config.bossKeyDisguise || 'mask');

        // 檢查初始螢幕方向（若進入時就已是手機橫向則套用時鐘樣式）
        if (this.isLandscapeOrientation()) {
            document.body.classList.add('is-landscape-clock');
        }

        // 啟動每秒 10 次的平滑刷新迴圈 (100ms)
        this.startTickLoop();
    }

    /**
     * 綁定使用者介面所有互動事件
     */
    bindEvents() {
        // 設定抽屜開啟與關閉
        this.dom.btnSettings.addEventListener('click', () => this.openSettings());
        this.dom.btnDrawerClose.addEventListener('click', () => this.closeSettings());
        this.dom.drawerBackdrop.addEventListener('click', (e) => {
            if (e.target === this.dom.drawerBackdrop) {
                this.closeSettings();
            }
        });

        // 儲存與重設設定
        this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettingsFromForm());
        this.dom.btnResetDefaults.addEventListener('click', () => this.resetSettingsToDefault());

        // 表單中計薪模式與自訂指標切換時動態顯示/隱藏相關欄位
        this.dom.cfgSalaryMode.addEventListener('change', () => this.updateFormVisibility());
        this.dom.cfgBreakEnabled.addEventListener('change', () => this.updateFormVisibility());
        this.dom.cfgRewardType.addEventListener('change', () => this.updateFormVisibility());

        // 老闆鍵防窺：點擊按鈕或點擊主金額
        this.dom.btnBossKey.addEventListener('click', () => this.bossKey.toggle());

        let lastToggleTime = 0;
        const triggerBossKey = (e) => {
            const now = Date.now();
            if (now - lastToggleTime < 250) return;
            lastToggleTime = now;
            this.bossKey.toggle();
        };

        this.dom.amountWrapper.addEventListener('click', triggerBossKey);
        this.dom.amountWrapper.addEventListener('pointerdown', triggerBossKey);

        // 桌面懸浮視窗 (PiP) 或 手機全螢幕時鐘按鈕事件
        if (this.dom.btnPip) {
            this.dom.btnPip.addEventListener('click', () => {
                if (this.isMobileDevice() || !this.pipController.isSupported()) {
                    this.toggleFullscreenClock();
                } else {
                    this.togglePiP();
                }
            });
        }

        // 手機橫向全螢幕時鐘專屬之極簡懸浮控制鈕事件
        if (this.dom.btnExitFullscreen) {
            this.dom.btnExitFullscreen.addEventListener('click', () => this.exitFullscreenClock());
        }
        if (this.dom.btnLandscapeDisguise) {
            this.dom.btnLandscapeDisguise.addEventListener('click', () => this.bossKey.toggle());
        }
        if (this.dom.btnLandscapeSettings) {
            this.dom.btnLandscapeSettings.addEventListener('click', () => this.openSettings());
        }

        // 監聽全螢幕狀態切換事件（含使用者按下 Esc 鍵退出）
        document.addEventListener('fullscreenchange', () => {
            const isFull = !!document.fullscreenElement;
            if (isFull) {
                document.body.classList.add('is-landscape-clock');
            } else if (!this.isLandscapeOrientation()) {
                document.body.classList.remove('is-landscape-clock');
            }
        });

        // 監聽手機螢幕轉向與視窗縮放
        const handleOrientationChange = () => {
            if (this.isLandscapeOrientation()) {
                document.body.classList.add('is-landscape-clock');
            } else if (!document.fullscreenElement) {
                document.body.classList.remove('is-landscape-clock');
            }
        };

        window.addEventListener('resize', handleOrientationChange);
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        }

        // 自由接案碼錶按鈕
        this.dom.btnFreelanceToggle.addEventListener('click', () => this.toggleFreelanceTimer());
        this.dom.btnFreelanceReset.addEventListener('click', () => this.resetFreelanceTimer());

        // 點擊切換維度 (本日 / 本週 / 本月)
        if (this.dom.cardPeriodToday) {
            this.dom.cardPeriodToday.addEventListener('click', () => this.setActiveView('today'));
        }
        if (this.dom.cardPeriodWeek) {
            this.dom.cardPeriodWeek.addEventListener('click', () => this.setActiveView('week'));
        }
        if (this.dom.cardPeriodMonth) {
            this.dom.cardPeriodMonth.addEventListener('click', () => this.setActiveView('month'));
        }
    }

    /**
     * 設定當前聚焦的時間維度 ('today' | 'week' | 'month')
     * @param {'today'|'week'|'month'} view 
     */
    setActiveView(view) {
        if (this.activeView === view) return;
        this.activeView = view;

        if (this.dom.cardPeriodToday) this.dom.cardPeriodToday.classList.toggle('active', view === 'today');
        if (this.dom.cardPeriodWeek) this.dom.cardPeriodWeek.classList.toggle('active', view === 'week');
        if (this.dom.cardPeriodMonth) this.dom.cardPeriodMonth.classList.toggle('active', view === 'month');

        if (this.dom.indToday) this.dom.indToday.style.display = view === 'today' ? 'inline-block' : 'none';
        if (this.dom.indWeek) this.dom.indWeek.style.display = view === 'week' ? 'inline-block' : 'none';
        if (this.dom.indMonth) this.dom.indMonth.style.display = view === 'month' ? 'inline-block' : 'none';

        // 優化方案 4：點擊切換時立即觸發一次即時計算與渲染，無需等待下一次計時週期，達到 0 延遲即時反饋
        const now = new Date();
        const result = calculateSalary(this.config, now);
        this.render(result, now);
    }

    /**
     * 核心計時迴圈
     * 依據小數點跳動風格動態切換刷新頻率：
     * - 2 位數：1000ms（按秒穩定跳動一次）
     * - 4 位數：50ms（高頻率刷新，數字平滑滾動轉動增加）
     */
    startTickLoop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        const digits = Number(this.config.decimalDigits) === 4 ? 4 : 2;
        // 4 位數時採用 33ms (~30fps) 極速流暢刷新，呈現微秒老虎機滾筒源源不絕飛轉效果
        const intervalMs = digits === 4 ? 33 : 1000;

        const tick = () => {
            const now = new Date();
            const result = calculateSalary(this.config, now);
            this.render(result, now);
        };

        // 立即執行第一次運算
        tick();
        this.timerId = setInterval(tick, intervalMs);
    }

    /**
     * 渲染儀表板與懸浮視窗
     * @param {Object} result - 核心引擎計算產生的標準化結果
     * @param {Date} now - 當前精確時間
     */
    render(result, now) {
        const symbol = this.config.currencySymbol || 'NT$';
        // 僅允許 2 位（按秒跳動）或 4 位（轉動增加）
        const decimals = Number(this.config.decimalDigits) === 4 ? 4 : 2;
        const thousands = this.config.showThousandSeparator !== false;

        // 1. 根據當前選取的維度 (本日 / 本週 / 本月) 決定英雄卡展示金額與進度
        let targetAmount = result.todayEarned;
        let targetProgress = result.todayProgress;
        let periodName = '今日';

        if (this.activeView === 'week') {
            targetAmount = result.weekEarned;
            targetProgress = result.weekProgress;
            periodName = '本週';
        } else if (this.activeView === 'month') {
            targetAmount = result.monthEarned;
            targetProgress = result.monthProgress;
            periodName = '本月';
        }

        // 英雄卡主金額：分離結構以強化小數點 4 位數高速飛轉視覺效果
        const fixedStr = (typeof targetAmount === 'number' && !isNaN(targetAmount))
            ? targetAmount.toFixed(decimals)
            : (0).toFixed(decimals);
        const [intPart, decPart] = fixedStr.split('.');
        const formattedInt = thousands
            ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            : intPart;

        if (decimals === 4) {
            this.dom.heroAmount.classList.add('is-rolling');

            // 檢查現有結構是否已為 4 位數老虎機滾輪
            let rollerContainer = this.dom.heroAmount.querySelector('.amount-dec-roller');
            let intSpan = this.dom.heroAmount.querySelector('.amount-int');
            let symbolSpan = this.dom.heroAmount.querySelector('.amount-symbol');
            const strips = rollerContainer ? rollerContainer.querySelectorAll('.digit-slot-strip') : null;

            if (!rollerContainer || !intSpan || !strips || strips.length !== 4) {
                // 首次建立老虎機結構 (僅在模式切換或初次載入時執行一次)
                const rollerHtml = decPart.split('').map((digit, idx) => {
                    const targetY = -Number(digit) * 1.15; // 每個數字高度 1.15em
                    const isFast = idx >= 2 ? 'fast-rolling' : '';
                    return `<span class="digit-slot ${isFast}"><span class="digit-slot-strip" style="transform: translateY(${targetY}em);"><span class="digit-slot-num">0</span><span class="digit-slot-num">1</span><span class="digit-slot-num">2</span><span class="digit-slot-num">3</span><span class="digit-slot-num">4</span><span class="digit-slot-num">5</span><span class="digit-slot-num">6</span><span class="digit-slot-num">7</span><span class="digit-slot-num">8</span><span class="digit-slot-num">9</span></span></span>`;
                }).join('');

                this.dom.heroAmount.innerHTML = `<span class="amount-symbol">${symbol}</span><span class="amount-int">${formattedInt}</span><span class="amount-dot">.</span><span class="amount-dec-roller">${rollerHtml}</span>`;
            } else {
                // 核心關鍵優化：節點複用，絕不在 33ms 計時器中頻繁銷毀與重建 DOM 節點！
                // 徹底避免因 innerHTML 重建導致使用者的點擊 (click) 事件在 MouseDown/Up 期間被瀏覽器判定中斷而遺失！
                if (symbolSpan.textContent !== symbol) symbolSpan.textContent = symbol;
                if (intSpan.textContent !== formattedInt) intSpan.textContent = formattedInt;

                const digitsArray = decPart.split('');
                for (let i = 0; i < 4 && i < digitsArray.length; i++) {
                    const targetY = -Number(digitsArray[i]) * 1.15;
                    strips[i].style.transform = `translateY(${targetY}em)`;
                }
            }
        } else {
            this.dom.heroAmount.classList.remove('is-rolling');
            let intSpan = this.dom.heroAmount.querySelector('.amount-int');
            let decSpan = this.dom.heroAmount.querySelector('.amount-dec');
            let symbolSpan = this.dom.heroAmount.querySelector('.amount-symbol');

            if (!decSpan || !intSpan) {
                this.dom.heroAmount.innerHTML = `<span class="amount-symbol">${symbol}</span><span class="amount-int">${formattedInt}</span><span class="amount-dot">.</span><span class="amount-dec">${decPart}</span>`;
            } else {
                if (symbolSpan.textContent !== symbol) symbolSpan.textContent = symbol;
                if (intSpan.textContent !== formattedInt) intSpan.textContent = formattedInt;
                if (decSpan.textContent !== decPart) decSpan.textContent = decPart;
            }
        }

        const formattedHeroAmount = `${symbol} ${formattedInt}.${decPart}`;

        // 英雄卡左上方標籤：帶圖示與「本日累積 / 本週累積 / 本月累積」，與下方卡片完全一致
        let periodIcon = '☀️';
        if (this.activeView === 'week') periodIcon = '📅';
        if (this.activeView === 'month') periodIcon = '🗓️';
        this.dom.amountLabel.innerHTML = `<span>${periodIcon}</span> <span>${periodName}累積</span>`;

        // 2. 狀態徽章
        this.dom.statusText.textContent = result.statusText;
        if (result.status === 'OFF_WORK' || result.status === 'DAY_OFF') {
            this.dom.statusBadge.classList.add('off');
        } else {
            this.dom.statusBadge.classList.remove('off');
        }

        // 3. 下班倒數
        if (result.mode === 'workday') {
            this.dom.countdownWrapper.style.display = 'block';
            if (result.status === 'WORKING' || result.status === 'ON_BREAK') {
                this.dom.countdownText.textContent = formatDurationChinese(result.remainingSecondsToOff);
            } else if (result.status === 'BEFORE_WORK') {
                this.dom.countdownText.textContent = '尚未開始上班';
            } else {
                this.dom.countdownText.textContent = '今日已打卡下班';
            }
        } else if (result.mode === 'continuous') {
            this.dom.countdownWrapper.style.display = 'none';
        } else if (result.mode === 'freelance') {
            this.dom.countdownWrapper.style.display = 'block';
            this.dom.countdownText.textContent = `已累計 ${formatStopwatch(result.accumulatedSeconds)}`;
        }

        // 4. 英雄卡對應累積進度條
        if (result.mode === 'freelance') {
            this.dom.heroProgressSection.style.display = 'none';
        } else {
            this.dom.heroProgressSection.style.display = 'block';
            this.dom.heroProgressLabel.textContent = `${periodName}工時進度`;
            this.dom.heroProgressPercent.textContent = formatPercentage(targetProgress, 1);
            this.dom.heroProgressFill.style.width = `${Math.min(100, Math.max(0, targetProgress))}%`;
        }

        // 5. 趣味激勵指標卡片：戰利品圖示牆（依據聚焦維度計算無條件捨去）
        const reward = result.rewardInfo;
        if (reward) {
            this.dom.rewardIcon.textContent = reward.icon || '☕';
            this.dom.rewardName.textContent = `${reward.name} 指標`;
            // 依據目前聚焦維度的累積金額進行無條件捨去
            const rewardCount = reward.price > 0 ? (targetAmount / reward.price) : 0;
            const completedCount = Math.floor(rewardCount);
            // 目前累進進度百分比 (當前金額相對於下一個目標的已達成進度，如 78.4% 或滿額比例)
            const currentProgress = reward.price > 0 ? Math.min(100, ((targetAmount % reward.price) / reward.price) * 100) : 0;

            this.dom.rewardCountVal.textContent = `${completedCount} ${reward.unit}`;
            this.dom.rewardProgressFill.style.width = `${currentProgress.toFixed(1)}%`;
            this.dom.rewardProgressHint.textContent = `目前累進進度 ${currentProgress.toFixed(1)}%`;
        }

        // 6. 下方三維度卡片（本日、本週、本月）數據更新
        // 依據使用者需求：即使上方英雄卡以 4 位數高速飛轉，下排卡片仍維持標準 2 位數且每秒穩定跳動一次
        const currentSec = Math.floor(now.getTime() / 1000);
        const shouldUpdateLowerCards = (currentSec !== this.lastSecondTick);

        if (shouldUpdateLowerCards) {
            this.lastSecondTick = currentSec;

            if (this.dom.todayCardVal) {
                this.dom.todayCardVal.textContent = formatCurrency(result.todayEarned, symbol, 2, thousands);
                this.dom.todayCardPercent.textContent = formatPercentage(result.todayProgress, 1);
                this.dom.todayCardFill.style.width = `${Math.min(100, Math.max(0, result.todayProgress))}%`;
            }

            if (this.dom.weekCardVal) {
                this.dom.weekCardVal.textContent = formatCurrency(result.weekEarned, symbol, 2, thousands);
                this.dom.weekCardPercent.textContent = formatPercentage(result.weekProgress, 1);
                this.dom.weekCardFill.style.width = `${Math.min(100, Math.max(0, result.weekProgress))}%`;
            }

            if (this.dom.monthCardVal) {
                this.dom.monthCardVal.textContent = formatCurrency(result.monthEarned, symbol, 2, thousands);
                this.dom.monthCardPercent.textContent = formatPercentage(result.monthProgress, 1);
                this.dom.monthCardFill.style.width = `${Math.min(100, Math.max(0, result.monthProgress))}%`;
            }
        }

        // 7. 固定工時換算參考（秒、分、時、日、週）
        const secRate = result.ratePerSecond;
        const minRate = secRate * 60;
        const hourRate = secRate * 3600;
        const dailyRate = result.totalDailySeconds ? (result.totalDailySeconds * secRate) : (hourRate * 8);
        const weeklyRate = dailyRate * (result.totalWeekWorkDays || 5);

        if (this.dom.rateSecFixed) this.dom.rateSecFixed.textContent = `${formatCurrency(secRate, symbol, 4, false)}`;
        if (this.dom.rateMinFixed) this.dom.rateMinFixed.textContent = `${formatCurrency(minRate, symbol, 2)}`;
        if (this.dom.rateHourFixed) this.dom.rateHourFixed.textContent = `${formatCurrency(hourRate, symbol, 0)}`;
        if (this.dom.rateDayFixed) this.dom.rateDayFixed.textContent = `${formatCurrency(dailyRate, symbol, 0)}`;
        if (this.dom.rateWeekFixed) this.dom.rateWeekFixed.textContent = `${formatCurrency(weeklyRate, symbol, 0)}`;

        // 8. 老闆鍵防窺遮罩內容（若啟用）
        if (this.bossKey.isActive()) {
            if (this.bossKey.mode === 'clock') {
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                this.dom.disguiseOverlay.textContent = `${hours}:${minutes}:${seconds}`;
            } else {
                this.dom.disguiseOverlay.textContent = `${symbol} ••••••`;
            }
        }

        // 10. 同步更新 Document Picture-in-Picture 桌面置頂視窗
        if (this.pipController.isOpen()) {
            const isDisguised = this.bossKey.isActive();
            const pipAmount = isDisguised
                ? (this.bossKey.mode === 'clock' ? this.dom.disguiseOverlay.textContent : `${symbol} ••••••`)
                : formattedHeroAmount;
            const pipRate = isDisguised ? '••••••' : `${formatCurrency(result.ratePerSecond, symbol, 2)}/秒`;

            // 浮動視窗累計指標：顯示整數無條件捨去，不帶小數點，與主畫面完全一致
            const pipRewardCount = (reward && reward.price > 0) ? Math.floor(targetAmount / reward.price) : 0;
            const pipRewardText = reward ? `${reward.icon} ${pipRewardCount} ${reward.unit}` : '';

            const pipStatusText = isDisguised
                ? (this.bossKey.mode === 'clock' ? '🕒 數位時鐘' : '🕶️ 防窺模式')
                : result.statusText;

            this.pipController.update({
                isDisguised: isDisguised,
                formattedAmount: pipAmount,
                formattedRate: pipRate,
                statusText: pipStatusText,
                progressPercentage: targetProgress || 0,
                countdownText: result.mode === 'workday'
                    ? (result.remainingSecondsToOff > 0 ? `離下班 ${formatDurationChinese(result.remainingSecondsToOff)}` : '已下班')
                    : '已同步',
                rewardText: pipRewardText
            });
        }
    }

    /**
     * 處理老闆鍵狀態切換事件
     * @param {boolean} isDisguised 
     * @param {string} mode 
     */
    handleBossKeyChange(isDisguised, mode) {
        if (isDisguised) {
            document.body.classList.add('is-disguised');
            this.dom.bossKeyIcon.textContent = '👁️';
            this.dom.btnBossKey.classList.add('btn-primary');
        } else {
            document.body.classList.remove('is-disguised');
            this.dom.bossKeyIcon.textContent = '🕶️';
            this.dom.btnBossKey.classList.remove('btn-primary');
        }
    }

    /**
     * 精準判斷當前執行環境是否為行動裝置（手機 / 平板）
     * 結合觸控特性、User-Agent 與行動螢幕特徵
     * @returns {boolean}
     */
    isMobileDevice() {
        // 1. 觸控粗指標判斷 (手機 / 平板皆無精準滑鼠 hover)
        const isTouchCoarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        // 2. 標準行動裝置 User-Agent 正則表達式檢驗
        const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
        // 3. 觸控點大於 0 且解析度在行動範疇
        const maxTouch = (navigator.maxTouchPoints > 0) && (window.innerWidth <= 1024 || window.innerHeight <= 1024);

        return isTouchCoarse || uaMobile || maxTouch;
    }

    /**
     * 判斷當前是否處於手機橫向擺放狀態 (Landscape 且垂直高度較小)
     * @returns {boolean}
     */
    isLandscapeOrientation() {
        return window.innerWidth > window.innerHeight && window.innerHeight <= 560;
    }

    /**
     * 依據設備種類（桌機 vs 行動裝置）配置專屬功能按鈕
     */
    setupDeviceSpecificFeatures() {
        const isMobile = this.isMobileDevice();
        if (isMobile) {
            // 行動裝置：將原桌面懸浮按鈕無縫升級為「全螢幕時鐘」
            if (this.dom.btnPip) {
                this.dom.btnPip.setAttribute('title', '切換為全螢幕大計時鐘模式 (適合橫放桌面展示)');
                if (this.dom.pipBtnIcon) this.dom.pipBtnIcon.textContent = '⏱️';
                if (this.dom.pipBtnText) this.dom.pipBtnText.textContent = ' 全螢幕';
            }
        } else {
            // 桌機：檢查是否支援 Document PiP，若不支援則降級為全螢幕時鐘
            if (!this.pipController.isSupported() && this.dom.btnPip) {
                this.dom.btnPip.setAttribute('title', '瀏覽器未支援置頂懸浮，改為全螢幕時鐘模式');
                if (this.dom.pipBtnIcon) this.dom.pipBtnIcon.textContent = '⏱️';
                if (this.dom.pipBtnText) this.dom.pipBtnText.textContent = ' 全螢幕';
            }
        }
    }

    /**
     * 切換手機全螢幕大計時鐘模式
     */
    async toggleFullscreenClock() {
        if (!document.fullscreenElement && !document.body.classList.contains('is-landscape-clock')) {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.warn('Fullscreen request blocked or failed:', err);
            }
            document.body.classList.add('is-landscape-clock');
        } else {
            await this.exitFullscreenClock();
        }
    }

    /**
     * 退出全螢幕時鐘模式
     */
    async exitFullscreenClock() {
        document.body.classList.remove('is-landscape-clock');
        if (document.fullscreenElement) {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                console.warn('Exit fullscreen failed:', err);
            }
        }
    }

    /**
     * 開啟或關閉桌面置頂畫中畫 (Document Picture-in-Picture)
     */
    async togglePiP() {
        if (!this.pipController.isSupported()) {
            alert('抱歉，此瀏覽器未支援 Document Picture-in-Picture API。\n請使用 Google Chrome 或 Microsoft Edge (桌機版) 體驗置頂桌面懸浮功能！');
            return;
        }

        const template = this.dom.pipHudTemplate.content.cloneNode(true);
        await this.pipController.toggle(template);

        if (this.pipController.isOpen()) {
            this.dom.btnPip.innerHTML = '<span>✕</span> 關閉懸浮';
        } else {
            this.dom.btnPip.innerHTML = '<span>📌</span> 桌面懸浮';
        }
    }

    handlePiPClose() {
        this.dom.btnPip.innerHTML = '<span>📌</span> 桌面懸浮';
    }

    /**
     * 自由接案碼錶開關
     */
    toggleFreelanceTimer() {
        const state = this.config.freelanceState || { accumulatedSeconds: 0, isRunning: false, lastStartTime: null };
        const nowMs = Date.now();

        if (state.isRunning) {
            if (state.lastStartTime) {
                const diff = (nowMs - state.lastStartTime) / 1000;
                state.accumulatedSeconds = (state.accumulatedSeconds || 0) + diff;
            }
            state.isRunning = false;
            state.lastStartTime = null;
            this.dom.btnFreelanceToggle.textContent = '▶ 繼續計時';
            this.dom.btnFreelanceToggle.classList.remove('btn-primary');
        } else {
            state.isRunning = true;
            state.lastStartTime = nowMs;
            this.dom.btnFreelanceToggle.textContent = '⏸ 暫停計時';
            this.dom.btnFreelanceToggle.classList.add('btn-primary');
        }

        this.config.freelanceState = state;
        saveConfig(this.config);
    }

    /**
     * 重設自由接案碼錶
     */
    resetFreelanceTimer() {
        if (confirm('確定要將接案計時碼錶歸零嗎？')) {
            this.config.freelanceState = {
                accumulatedSeconds: 0,
                isRunning: false,
                lastStartTime: null
            };
            this.dom.btnFreelanceToggle.textContent = '▶ 開始計時';
            this.dom.btnFreelanceToggle.classList.remove('btn-primary');
            saveConfig(this.config);
        }
    }

    /**
     * 依據當前選定的模式切換主畫面外觀
     */
    updateModeUI() {
        const mode = this.config.salaryMode || 'workday';
        if (mode === 'freelance') {
            this.dom.freelanceControls.style.display = 'flex';
            const isRunning = this.config.freelanceState?.isRunning;
            this.dom.btnFreelanceToggle.textContent = isRunning ? '⏸ 暫停計時' : '▶ 開始計時';
        } else {
            this.dom.freelanceControls.style.display = 'none';
        }
    }

    /**
     * 將當前記憶體中的設定同步至設定面板表單
     */
    syncSettingsForm() {
        this.dom.cfgSalaryMode.value = this.config.salaryMode;
        this.dom.cfgMonthlySalary.value = this.config.monthlySalary;
        this.dom.cfgHourlyRate.value = this.config.hourlyRate;
        this.dom.cfgRewardType.value = this.config.rewardType || 'latte';
        this.dom.cfgCustomName.value = this.config.rewardCustomName || '自訂目標';
        this.dom.cfgCustomPrice.value = this.config.rewardCustomPrice || 100;
        this.dom.cfgCustomUnit.value = this.config.rewardCustomUnit || '個';
        this.dom.cfgWorkStart.value = this.config.workStart;
        this.dom.cfgWorkEnd.value = this.config.workEnd;
        this.dom.cfgBreakEnabled.checked = this.config.breakEnabled;
        this.dom.cfgBreakStart.value = this.config.breakStart;
        this.dom.cfgBreakEnd.value = this.config.breakEnd;
        this.dom.cfgCurrencySymbol.value = this.config.currencySymbol;
        this.dom.cfgDecimalDigits.value = this.config.decimalDigits;
        this.dom.cfgBossDisguise.value = this.config.bossKeyDisguise || 'mask';

        this.updateFormVisibility();
    }

    /**
     * 依據所選模式切換表單欄位的顯隱
     */
    updateFormVisibility() {
        const mode = this.dom.cfgSalaryMode.value;
        const breakEnabled = this.dom.cfgBreakEnabled.checked;
        const rewardType = this.dom.cfgRewardType.value;

        // 自訂指標欄位顯隱
        this.dom.groupRewardCustom.style.display = (rewardType === 'custom') ? 'block' : 'none';

        // 模式切換
        if (mode === 'freelance') {
            this.dom.groupMonthlySalary.style.display = 'none';
            this.dom.groupScheduleSettings.style.display = 'none';
            this.dom.groupHourlyRate.style.display = 'flex';
        } else {
            this.dom.groupMonthlySalary.style.display = 'flex';
            this.dom.groupHourlyRate.style.display = 'none';

            if (mode === 'continuous') {
                this.dom.groupScheduleSettings.style.display = 'none';
            } else {
                this.dom.groupScheduleSettings.style.display = 'block';
                this.dom.groupBreakTimes.style.display = breakEnabled ? 'block' : 'none';
            }
        }
    }

    /**
     * 開啟設定抽屜
     */
    openSettings() {
        this.syncSettingsForm();
        this.dom.drawerBackdrop.classList.add('active');
    }

    /**
     * 關閉設定抽屜
     */
    closeSettings() {
        this.dom.drawerBackdrop.classList.remove('active');
    }

    /**
     * 從設定面板讀取使用者輸入並儲存至本機 LocalStorage
     */
    saveSettingsFromForm() {
        this.config.salaryMode = this.dom.cfgSalaryMode.value;
        this.config.monthlySalary = Math.max(0, Number(this.dom.cfgMonthlySalary.value) || 0);
        this.config.hourlyRate = Math.max(0, Number(this.dom.cfgHourlyRate.value) || 0);
        this.config.rewardType = this.dom.cfgRewardType.value;
        this.config.rewardCustomName = this.dom.cfgCustomName.value.trim() || '自訂目標';
        this.config.rewardCustomPrice = Math.max(1, Number(this.dom.cfgCustomPrice.value) || 100);
        this.config.rewardCustomUnit = this.dom.cfgCustomUnit.value.trim() || '個';
        this.config.workStart = this.dom.cfgWorkStart.value || '09:00';
        this.config.workEnd = this.dom.cfgWorkEnd.value || '18:00';
        this.config.breakEnabled = this.dom.cfgBreakEnabled.checked;
        this.config.breakStart = this.dom.cfgBreakStart.value || '12:00';
        this.config.breakEnd = this.dom.cfgBreakEnd.value || '13:00';
        this.config.currencySymbol = this.dom.cfgCurrencySymbol.value.trim() || 'NT$';
        this.config.decimalDigits = Number(this.dom.cfgDecimalDigits.value) || 2;
        this.config.bossKeyDisguise = this.dom.cfgBossDisguise.value;

        // 更新防窺控制器的模式
        this.bossKey.setMode(this.config.bossKeyDisguise);

        // 儲存至本機
        saveConfig(this.config);
        this.updateModeUI();
        this.startTickLoop(); // 即刻根據 2位(秒跳) 或 4位(轉動) 切換計時器刷新頻率
        this.closeSettings();
    }

    /**
     * 還原所有設定至原廠預設值
     */
    resetSettingsToDefault() {
        if (confirm('確定要將所有薪資與時間設定還原為初始預設值嗎？')) {
            this.config = resetConfig();
            this.syncSettingsForm();
            this.updateModeUI();
            this.bossKey.setMode(this.config.bossKeyDisguise);
            this.startTickLoop();
            this.closeSettings();
        }
    }
}

// 當 DOM 載入完畢後自動啟動主應用
window.addEventListener('DOMContentLoaded', () => {
    window.salaryClockApp = new SalaryClockApp();
});
