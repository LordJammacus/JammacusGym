import { playRestCompleteChime, unlockAudio } from '@/utils/audio';

const ALERT_TAG = 'jammacus-rest';
const SCHEDULED_TAG = 'jammacus-rest-scheduled';
const ALERT_TITLE = 'Rest complete';
const REST_VIBRATE = [200, 100, 200, 100, 400];
/** Matches the service worker, which fires a TimestampTrigger slightly late. */
const TRIGGER_GRACE_MS = 1100;

let generation = 0;
let pageTimer = 0;
let backupTimer = 0;
let armedEndsAt = 0;
let deliveredGeneration = -1;
let soundedGeneration = -1;
let hooksReady = false;

function notificationOptions(tag: string): NotificationOptions {
  return {
    body: 'Time for your next set',
    tag,
    silent: false,
    requireInteraction: true,
  };
}

function vibrateRest() {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(REST_VIBRATE);
  } catch {
    // Vibration not supported
  }
}

async function postToSw(data: Record<string, unknown>): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const worker = reg?.active ?? reg?.waiting ?? null;
    if (!worker) return false;
    worker.postMessage(data);
    return true;
  } catch {
    return false;
  }
}

async function notificationsWithTag(tag: string): Promise<Notification[]> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return [];
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return [];
    return await reg.getNotifications({ tag });
  } catch {
    return [];
  }
}

async function alertAlreadySounded(): Promise<boolean> {
  const [alerted, scheduled] = await Promise.all([
    notificationsWithTag(ALERT_TAG),
    notificationsWithTag(SCHEDULED_TAG),
  ]);
  if (alerted.length > 0) return true;
  // A pending trigger uses the scheduled tag before it rings. Only treat it as sounded once it is due.
  return scheduled.length > 0 && Date.now() >= armedEndsAt + TRIGGER_GRACE_MS;
}

async function showFromPage(): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const options = notificationOptions(ALERT_TAG);
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(ALERT_TITLE, {
          ...options,
          vibrate: REST_VIBRATE,
        } as NotificationOptions);
        return true;
      }
    }
    new Notification(ALERT_TITLE, options);
    return true;
  } catch {
    return false;
  }
}

async function chimeOnce(id: number): Promise<void> {
  if (id !== generation || soundedGeneration === id) return;
  soundedGeneration = id;
  vibrateRest();
  const played = await playRestCompleteChime();
  if (id !== generation) return;
  if (!played) await showFromPage();
}

function clearPageTimers() {
  window.clearTimeout(pageTimer);
  window.clearTimeout(backupTimer);
  pageTimer = 0;
  backupTimer = 0;
}

function hookPlatform() {
  if (hooksReady || typeof document === 'undefined') return;
  hooksReady = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (armedEndsAt <= Date.now()) return;
    if (deliveredGeneration === generation) return;
    void postToSw({ type: 'schedule-rest-alert', id: generation, endsAt: armedEndsAt });
  });
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; id?: number } | null;
    if (!data || data.type !== 'rest-chime') return;
    if (data.id !== generation || document.visibilityState !== 'visible') return;
    void chimeOnce(generation);
  });
}

async function deliver(id: number): Promise<void> {
  if (id !== generation || deliveredGeneration === id) return;
  deliveredGeneration = id;

  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    void postToSw({ type: 'cancel-scheduled', id });
    if (id !== generation) return;
    if (await alertAlreadySounded()) {
      if (id !== generation) return;
      soundedGeneration = id;
      void postToSw({ type: 'cancel-rest-alert', id });
      return;
    }
    if (id !== generation) return;
    await chimeOnce(id);
    return;
  }

  const sent = await postToSw({ type: 'fire-rest-alert', id });
  if (id !== generation) return;
  if (!sent) {
    vibrateRest();
    const shown = await showFromPage();
    if (!shown) await chimeOnce(id);
    else soundedGeneration = id;
    return;
  }

  backupTimer = window.setTimeout(() => {
    void (async () => {
      if (id !== generation) return;
      if (await alertAlreadySounded()) return;
      vibrateRest();
      const shown = await showFromPage();
      if (!shown) await chimeOnce(id);
      else soundedGeneration = id;
    })();
  }, 1500);
}

/** Ask for notification permission and unlock mixable audio. Must run in a user gesture. */
export function prepareRestAlerts(): void {
  unlockAudio();
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;
  void Notification.requestPermission().catch(() => undefined);
}

export function scheduleRestAlert(endsAt: number): void {
  if (!Number.isFinite(endsAt)) return;
  hookPlatform();
  clearPageTimers();
  const id = ++generation;
  deliveredGeneration = -1;
  armedEndsAt = endsAt;

  pageTimer = window.setTimeout(() => {
    void deliver(id);
  }, Math.max(0, endsAt - Date.now()));

  void postToSw({ type: 'schedule-rest-alert', id, endsAt });
}

export function cancelRestAlert(): void {
  const id = generation;
  generation += 1;
  deliveredGeneration = generation;
  armedEndsAt = 0;
  clearPageTimers();
  void postToSw({ type: 'cancel-rest-alert', id });
}
