const ALERT_TAG = 'jammacus-rest';
const SCHEDULED_TAG = 'jammacus-rest-scheduled';
const ALERT_TITLE = 'Rest complete';
const VIBRATE = [200, 100, 200, 100, 400];

let generation = 0;
let activeId = 0;
let pendingTimer = 0;
let resolvePending = function () {};
const doneIds = new Set();

function cancelPending() {
  generation += 1;
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = 0;
  }
  resolvePending();
  resolvePending = function () {};
}

function alertOptions(tag) {
  return {
    body: 'Time for your next set',
    tag: tag,
    silent: false,
    renotify: false,
    requireInteraction: true,
    vibrate: VIBRATE,
  };
}

async function closeTag(tag) {
  const existing = await self.registration.getNotifications({ tag: tag });
  for (const notification of existing) notification.close();
}

function isCurrent(id) {
  return id === activeId && !doneIds.has(id);
}

async function showAlert(id) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some(function (client) { return client.visibilityState === 'visible'; })) {
    for (const client of windows) client.postMessage({ type: 'rest-chime', id: id });
    return;
  }
  await self.registration.showNotification(ALERT_TITLE, alertOptions(ALERT_TAG));
}

function keepAlive(event, task) {
  if (event && typeof event.waitUntil === 'function') event.waitUntil(task);
}

self.addEventListener('message', function (event) {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  const id = Number(data.id) || 0;

  if (data.type === 'cancel-rest-alert' || data.type === 'cancel-scheduled') {
    doneIds.add(id);
    if (id !== activeId) return;
    cancelPending();
    const tags = data.type === 'cancel-rest-alert'
      ? [closeTag(ALERT_TAG), closeTag(SCHEDULED_TAG)]
      : [closeTag(SCHEDULED_TAG)];
    keepAlive(event, Promise.all(tags));
    return;
  }

  if (data.type === 'fire-rest-alert') {
    if (!isCurrent(id)) return;
    doneIds.add(id);
    cancelPending();
    keepAlive(event, (async function () {
      await closeTag(SCHEDULED_TAG);
      try {
        await showAlert(id);
      } catch {
        // Permission missing or notifications unsupported
      }
    })());
    return;
  }

  if (data.type !== 'schedule-rest-alert') return;

  const endsAt = Number(data.endsAt);
  if (!Number.isFinite(endsAt) || doneIds.has(id) || (activeId && id < activeId)) return;

  activeId = id;
  cancelPending();
  const gen = generation;
  const Trigger = self.TimestampTrigger || globalThis.TimestampTrigger;

  if (typeof Trigger === 'function') {
    keepAlive(event, (async function () {
      try {
        await closeTag(SCHEDULED_TAG);
        if (gen !== generation || !isCurrent(id)) return;
        // Slightly late so a visible page can cancel it and play the mixable chime instead.
        await self.registration.showNotification(ALERT_TITLE, Object.assign(alertOptions(SCHEDULED_TAG), {
          showTrigger: new Trigger(endsAt + 1200),
        }));
      } catch {
        // TimestampTrigger or notifications unavailable
      }
    })());
    return;
  }

  const delay = Math.max(0, endsAt - Date.now());
  const task = new Promise(function (resolve) {
    resolvePending = resolve;
    // A short grace period lets a visible page cancel this and play the mixable chime.
    pendingTimer = setTimeout(function () {
      pendingTimer = 0;
      if (gen !== generation || !isCurrent(id)) {
        resolve();
        return;
      }
      showAlert(id).then(resolve, resolve);
    }, delay + 400);
  });
  keepAlive(event, task);
});

self.addEventListener('notificationclick', function (event) {
  const tag = event.notification.tag;
  if (tag !== ALERT_TAG && tag !== SCHEDULED_TAG) return;
  event.notification.close();
  event.waitUntil((async function () {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(self.registration.scope);
    }
  })());
});
