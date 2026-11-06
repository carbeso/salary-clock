/**
 * 薪資時鐘 - 純 Web Audio API 程式碼合成音效模組 (Sound)
 * 完全零外部音訊檔案依賴、零網路流量，以正弦波與三角波合成清脆優雅之金幣「Ka-ching 叮～」音效
 */

let audioCtx = null;

/**
 * 播放清脆的收銀機/金幣里程碑音效
 */
export function playKaChingSound() {
    if (typeof window === 'undefined') return;

    try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtxClass) return;

        if (!audioCtx) {
            audioCtx = new AudioCtxClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // 音調 1：短促清亮引導音 (B5: 987.77 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now);
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        // 音調 2：清脆金屬質感尾韻 (E6: 1318.51 Hz 漸變至 A6: 1760 Hz)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.51, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.32);
        gain2.gain.setValueAtTime(0.12, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.35);
    } catch (_) {
        // 在不支援音效或政策受限之環境下靜默忽略，保證主程式穩定
    }
}
