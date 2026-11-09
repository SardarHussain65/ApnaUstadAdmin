/**
 * Sound notification utilities for Admin Web Portal
 * Synthesizes a clean dual-tone harmonic chime using browser Web Audio API.
 * Requires no external audio files or network requests.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('adminSoundEnabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminSoundEnabled', enabled ? 'true' : 'false');
  }
}

export function playNotificationChime(priority: 'normal' | 'urgent' = 'normal', force: boolean = false) {
  if (!force && !isSoundEnabled()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const baseFreq = priority === 'urgent' ? 659.25 : 587.33; // E5 or D5
    const secondFreq = priority === 'urgent' ? 987.77 : 880.0; // B5 or A5

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2 (higher harmonic chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(secondFreq, now + 0.09);
    gain2.gain.setValueAtTime(0.14, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.45);
  } catch {
    // Browsers block autoplay before user gesture — safely ignore
  }
}

