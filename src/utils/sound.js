/**
 * 薪資時鐘 - 純 Web Audio API 程式碼合成音效模組 (Sound)
 * 完全零外部音訊檔案依賴、零網路流量，以正弦波與三角波合成清脆優雅之金幣「Ka-ching 叮～」與發薪祝賀樂音
 * 具備 stopAllSounds() 瞬間斷音功能，確保在防窺或緊急中止時音效立時中斷
 */

let audioCtx = null;
let activeGainNodes = [];

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!audioCtx) {
        audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * 立即停止當前所有正在發聲的節點（緊急靜音 / 避免尷尬）
 */
export function stopAllSounds() {
    try {
        for (const gain of activeGainNodes) {
            try {
                gain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
            } catch (_) {}
        }
        activeGainNodes = [];
    } catch (_) {}
}

/**
 * 播放清脆的收銀機/金幣里程碑音效
 */
export function playKaChingSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // 音調 1：短促清亮引導音 (B5: 987.77 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now);
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        activeGainNodes.push(gain1);
        osc1.start(now);
        osc1.stop(now + 0.12);

        // 音調 2：清脆金屬質感尾韻 (E6: 1318.51 Hz 漸變至 A6: 1760 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.51, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.32);
        gain2.gain.setValueAtTime(0.12, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        activeGainNodes.push(gain2);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.35);

        setTimeout(() => {
            activeGainNodes = activeGainNodes.filter(g => g !== gain1 && g !== gain2);
        }, 400);
    } catch (_) {
        // 在不支援音效或政策受限環境下靜默忽略
    }
}

/**
 * 播放發薪日專屬慶祝音效 (愉悅明亮的 4 重上行金幣琵音)
 */
export function playPaydayFanfare() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // 上行明亮琵音頻率 (C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.50)
        const notes = [
            { freq: 523.25, start: 0.00, dur: 0.12, gain: 0.08 },
            { freq: 659.25, start: 0.08, dur: 0.12, gain: 0.09 },
            { freq: 783.99, start: 0.16, dur: 0.15, gain: 0.10 },
            { freq: 1046.50, start: 0.24, dur: 0.40, gain: 0.12 }
        ];

        const localGains = [];
        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            gain.gain.setValueAtTime(0.001, now + n.start);
            gain.gain.linearRampToValueAtTime(n.gain, now + n.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            activeGainNodes.push(gain);
            localGains.push(gain);

            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });

        setTimeout(() => {
            activeGainNodes = activeGainNodes.filter(g => !localGains.includes(g));
        }, 800);
    } catch (_) {
        // 在不支援音效環境下安全降級
    }
}
