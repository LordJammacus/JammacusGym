type AudioContextCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;
let chimeEl: HTMLAudioElement | null = null;
let chimeUrl: string | null = null;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

function getContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function createChimeWavUrl(): string {
  const sampleRate = 22050;
  const notes: { freq: number; start: number; duration: number }[] = [
    { freq: 880, start: 0, duration: 0.16 },
    { freq: 1175, start: 0.2, duration: 0.16 },
    { freq: 1568, start: 0.4, duration: 0.32 },
  ];
  const totalDuration = 0.75;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      const local = t - note.start;
      if (local < 0 || local > note.duration) continue;
      const attack = 0.012;
      const release = 0.04;
      let env = 1;
      if (local < attack) env = local / attack;
      else if (local > note.duration - release) env = Math.max(0, (note.duration - local) / release);
      sample += Math.sin(2 * Math.PI * note.freq * local) * env * 0.45;
    }
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clipped * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function getChimeElement(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!chimeUrl) {
    try {
      chimeUrl = createChimeWavUrl();
    } catch {
      return null;
    }
  }
  if (!chimeEl) {
    chimeEl = new Audio(chimeUrl);
    chimeEl.preload = 'auto';
  }
  return chimeEl;
}

function playSilentBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

/** Call from a user gesture (e.g. logging a set) so later rest-complete playback is allowed. */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    try {
      playSilentBuffer(ctx);
    } catch {
      // Unlock not supported
    }
  }

  const el = getChimeElement();
  if (!el) return;
  el.volume = 0.001;
  el.currentTime = 0;
  const playPromise = el.play();
  if (playPromise) {
    void playPromise
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = 1;
      })
      .catch(() => {
        el.volume = 1;
      });
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peakGain = 0.35,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const attack = 0.02;
  const end = start + duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.start(start);
  osc.stop(end + 0.02);
}

function scheduleRestChime(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 880, t, 0.16);
  playTone(ctx, 1175, t + 0.2, 0.16);
  playTone(ctx, 1568, t + 0.4, 0.32, 0.4);
}

function playHtmlChime() {
  const el = getChimeElement();
  if (!el) return;
  el.volume = 1;
  el.currentTime = 0;
  void el.play().catch(() => undefined);
}

export function playRestCompleteChime(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'running') {
    try {
      scheduleRestChime(ctx);
      return;
    } catch {
      // Fall through to HTML audio
    }
  }

  if (ctx?.state === 'suspended') {
    void ctx.resume()
      .then(() => {
        if (ctx.state === 'running') {
          scheduleRestChime(ctx);
          return;
        }
        playHtmlChime();
      })
      .catch(() => playHtmlChime());
    return;
  }

  playHtmlChime();
}
