type AudioContextCtor = typeof AudioContext;

interface AudioSessionLike {
  type: string;
}

let audioCtx: AudioContext | null = null;
let chimeEl: HTMLAudioElement | null = null;
let chimeUrl: string | null = null;
let chimeToken = 0;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
}

function audioSession(): AudioSessionLike | null {
  if (typeof navigator === 'undefined') return null;
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  return session ?? null;
}

/** Mix with other apps. A playback session pauses music; ambient does not. */
export function setAmbientAudioSession(): boolean {
  const session = audioSession();
  if (!session) return false;
  try {
    session.type = 'ambient';
    return session.type === 'ambient';
  } catch {
    return false;
  }
}

function getContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    setAmbientAudioSession();
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
      sample += Math.sin(2 * Math.PI * note.freq * local) * env * 0.55;
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

function primeHtmlChime() {
  // Media elements default to a playback session and pause other apps.
  // Only prime one after the session is pinned to ambient.
  if (!setAmbientAudioSession()) return;
  const el = getChimeElement();
  if (!el) return;
  const token = ++chimeToken;
  el.volume = 0.001;
  try {
    el.currentTime = 0;
  } catch {
    // Element not seekable yet
  }
  const playPromise = el.play();
  if (!playPromise) return;
  void playPromise
    .then(() => {
      if (token !== chimeToken) return;
      el.pause();
      el.currentTime = 0;
      el.volume = 1;
    })
    .catch(() => {
      if (token === chimeToken) el.volume = 1;
    });
}

/** Call from a user gesture (e.g. logging a set) so later rest-complete playback is allowed. */
export function unlockAudio(): void {
  setAmbientAudioSession();
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
  primeHtmlChime();
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peakGain = 0.45,
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
  const start = ctx.currentTime;
  const cycle = 0.9;
  for (let i = 0; i < 2; i++) {
    const t = start + i * cycle;
    playTone(ctx, 880, t, 0.16);
    playTone(ctx, 1175, t + 0.2, 0.16);
    playTone(ctx, 1568, t + 0.4, 0.32, 0.55);
  }
}

async function playHtmlChime(): Promise<boolean> {
  if (!setAmbientAudioSession()) return false;
  const el = getChimeElement();
  if (!el) return false;
  const token = ++chimeToken;
  el.volume = 1;
  try {
    el.currentTime = 0;
    await el.play();
    return token === chimeToken;
  } catch {
    return false;
  }
}

/** Plays the rest chime without taking exclusive audio focus. Returns false if nothing could start. */
export async function playRestCompleteChime(): Promise<boolean> {
  setAmbientAudioSession();
  const ctx = getContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (ctx.state === 'running') {
        scheduleRestChime(ctx);
        return true;
      }
    } catch {
      // Fall through to the mixable media element
    }
  }
  return playHtmlChime();
}
