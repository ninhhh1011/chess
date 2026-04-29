let audioContext;
let backgroundMusic;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playToneSequence(tones) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === 'suspended') {
    context.resume();
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
    { frequency: 392, duration: 0.09, type: 'triangle', gain: 0.05 },
    { frequency: 523.25, start: 0.08, duration: 0.12, type: 'triangle', gain: 0.055 },
    { frequency: 659.25, start: 0.17, duration: 0.16, type: 'triangle', gain: 0.045 },
  ]);
}

export function playMoveSound() {
  playToneSequence([
    { frequency: 520, duration: 0.075, type: 'sine', gain: 0.12 },
    { frequency: 390, start: 0.055, duration: 0.08, type: 'triangle', gain: 0.09 },
  ]);
}

export function playCaptureSound() {
  playToneSequence([
    { frequency: 260, duration: 0.09, type: 'square', gain: 0.115 },
    { frequency: 174.61, start: 0.06, duration: 0.14, type: 'triangle', gain: 0.13 },
    { frequency: 110, start: 0.02, duration: 0.11, type: 'sawtooth', gain: 0.045 },
  ]);
}

export function startBackgroundMusic() {
  const context = getAudioContext();
  if (!context || backgroundMusic) return;

  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.018, context.currentTime);
  masterGain.connect(context.destination);

  const bass = context.createOscillator();
  const melody = context.createOscillator();
  const shimmer = context.createOscillator();
  const filter = context.createBiquadFilter();

  bass.type = 'sine';
  melody.type = 'triangle';
  shimmer.type = 'sine';
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(950, context.currentTime);

  bass.connect(filter);
  melody.connect(filter);
  shimmer.connect(filter);
  filter.connect(masterGain);

  const notes = [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];
  const bassNotes = [130.81, 164.81, 196, 146.83];
  let step = 0;

  function scheduleNextBar() {
    if (!backgroundMusic) return;

    const now = context.currentTime;
    const note = notes[step % notes.length];
    const bassNote = bassNotes[Math.floor(step / 2) % bassNotes.length];

    melody.frequency.setTargetAtTime(note, now, 0.04);
    shimmer.frequency.setTargetAtTime(note * 2, now, 0.06);
    bass.frequency.setTargetAtTime(bassNote, now, 0.08);

    step += 1;
  }

  bass.start();
  melody.start();
  shimmer.start();
  scheduleNextBar();

  const intervalId = window.setInterval(scheduleNextBar, 700);
  backgroundMusic = { bass, melody, shimmer, masterGain, intervalId };
}

export function stopBackgroundMusic() {
  if (!backgroundMusic) return;

  const { bass, melody, shimmer, masterGain, intervalId } = backgroundMusic;
  window.clearInterval(intervalId);
  const stopAt = audioContext.currentTime + 0.08;
  masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  bass.stop(stopAt);
  melody.stop(stopAt);
  shimmer.stop(stopAt);
  backgroundMusic = null;
}

export function toggleBackgroundMusic(shouldPlay) {
  if (shouldPlay) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }
}
