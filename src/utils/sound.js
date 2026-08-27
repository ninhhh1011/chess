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

export function playVictorySound() {
  playToneSequence([
    { frequency: 523.25, duration: 0.12, type: 'sine', gain: 0.04 },
    { frequency: 659.25, start: 0.1, duration: 0.12, type: 'sine', gain: 0.04 },
    { frequency: 783.99, start: 0.2, duration: 0.15, type: 'sine', gain: 0.04 },
    { frequency: 1046.5, start: 0.32, duration: 0.25, type: 'triangle', gain: 0.035 },
  ]);
}

export function playDefeatSound() {
  playToneSequence([
    { frequency: 392, duration: 0.2, type: 'triangle', gain: 0.04 },
    { frequency: 349.23, start: 0.15, duration: 0.25, type: 'triangle', gain: 0.035 },
    { frequency: 293.66, start: 0.35, duration: 0.3, type: 'triangle', gain: 0.03 },
  ]);
}

export function playDrawSound() {
  playToneSequence([
    { frequency: 440, duration: 0.15, type: 'sine', gain: 0.035 },
    { frequency: 440, start: 0.2, duration: 0.15, type: 'sine', gain: 0.035 },
  ]);
}

export function playCastlingSound() {
  playToneSequence([
    { frequency: 280, duration: 0.06, type: 'triangle', gain: 0.05 },
    { frequency: 350, start: 0.05, duration: 0.08, type: 'triangle', gain: 0.045 },
    { frequency: 420, start: 0.1, duration: 0.06, type: 'sine', gain: 0.035 },
  ]);
}

export function playPromotionSound() {
  playToneSequence([
    { frequency: 523.25, duration: 0.1, type: 'sine', gain: 0.05 },
    { frequency: 659.25, start: 0.08, duration: 0.1, type: 'sine', gain: 0.05 },
    { frequency: 783.99, start: 0.16, duration: 0.12, type: 'sine', gain: 0.045 },
    { frequency: 1046.5, start: 0.22, duration: 0.2, type: 'triangle', gain: 0.04 },
  ]);
}
