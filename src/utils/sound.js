let audioContext;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playToneSequence(tones) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  const startTime = context.currentTime;

  tones.forEach(({ frequency, start = 0, duration = 0.08, type = 'sine', gain = 0.055 }) => {
    const oscillator = context.createOscillator();
    const volume = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime + start);
    volume.gain.setValueAtTime(0.0001, startTime + start);
    volume.gain.exponentialRampToValueAtTime(gain, startTime + start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, startTime + start + duration);

    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(startTime + start);
    oscillator.stop(startTime + start + duration + 0.02);
  });
}

export function playStartSound() {
  playToneSequence([
    { frequency: 392, duration: 0.08, type: 'triangle', gain: 0.035 },
    { frequency: 523.25, start: 0.07, duration: 0.1, type: 'sine', gain: 0.035 },
    { frequency: 659.25, start: 0.15, duration: 0.12, type: 'triangle', gain: 0.028 },
  ]);
}

export function playMoveSound() {
  playToneSequence([
    { frequency: 620, duration: 0.045, type: 'sine', gain: 0.045 },
    { frequency: 820, start: 0.035, duration: 0.05, type: 'triangle', gain: 0.024 },
  ]);
}

export function playCaptureSound() {
  playToneSequence([
    { frequency: 220, duration: 0.07, type: 'triangle', gain: 0.055 },
    { frequency: 130.81, start: 0.045, duration: 0.11, type: 'sine', gain: 0.04 },
    { frequency: 520, start: 0.018, duration: 0.035, type: 'sine', gain: 0.018 },
  ]);
}

export function playCheckSound() {
  playToneSequence([
    { frequency: 880, duration: 0.07, type: 'square', gain: 0.035 },
    { frequency: 740, start: 0.09, duration: 0.08, type: 'triangle', gain: 0.032 },
  ]);
}
