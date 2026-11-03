// Little "it worked" feedback: a short vibration and a short two-note chime.
// No sound file is needed. The chime is made by the phone itself.

let audio: AudioContext | null = null;

function playChime() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio = audio ?? new Ctor();
    if (audio.state === 'suspended') void audio.resume();

    const start = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = start + i * 0.09;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t0);
      osc.stop(t0 + 0.17);
    });
  } catch {
    // No sound is not a problem.
  }
}

export function successFeedback() {
  try {
    navigator.vibrate?.(40);
  } catch {
    // Vibration is not available on every phone.
  }
  playChime();
}
