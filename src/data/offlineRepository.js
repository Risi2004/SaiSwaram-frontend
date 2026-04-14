const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DB_NAME = 'saiswaram-offline-db';
const DB_VERSION = 1;
const LOCAL_PREFIX = 'local-';

const STATUS = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set();
let dbPromise = null;
let initialized = false;
let syncIntervalId = null;

function makeId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('bhajans')) {
        db.createObjectStore('bhajans', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('schedules')) {
        db.createObjectStore('schedules', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('pendingMutations')) {
        const queue = db.createObjectStore('pendingMutations', { keyPath: 'id' });
        queue.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore(storeName, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).getAll());
}

async function getById(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).get(id));
}

async function putItem(storeName, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function deleteItem(storeName, id) {
  return withStore(storeName, 'readwrite', (store) => store.delete(id));
}

async function setMeta(key, value) {
  return putItem('meta', { key, value });
}

async function getMeta(key, fallback = null) {
  const data = await getById('meta', key);
  return data?.value ?? fallback;
}

function emitStatus(partial = {}) {
  Object.assign(STATUS, partial);
  for (const listener of listeners) {
    listener({ ...STATUS });
  }
}

async function updatePendingCount() {
  const pending = await getAll('pendingMutations');
  emitStatus({ pendingCount: pending.length });
}

async function authedFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Missing auth token');
  }

  const headers = {
    ...(options.headers || {}),
    'x-auth-token': token,
  };

  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function enrichWithSyncState(record) {
  return { ...record, _sync: { pending: true, updatedAt: new Date().toISOString() } };
}

async function enqueueMutation(entity, operation, payload) {
  const mutation = {
    id: makeId('mutation'),
    entity,
    operation,
    payload,
    createdAt: Date.now(),
    retries: 0,
    lastError: null,
  };
  await putItem('pendingMutations', mutation);
  await updatePendingCount();
}

async function replaceLocalBhajanId(localId, serverBhajan) {
  const bhajans = await getAll('bhajans');
  const local = bhajans.find((item) => item._id === localId);
  if (local) {
    await deleteItem('bhajans', localId);
  }
  await putItem('bhajans', { ...serverBhajan, _sync: { pending: false } });

  const queue = await getAll('pendingMutations');
  await withStore('pendingMutations', 'readwrite', (store) => {
    for (const item of queue) {
      let changed = false;
      const next = { ...item, payload: { ...item.payload } };
      if (next.payload.id === localId) {
        next.payload.id = serverBhajan._id;
        changed = true;
      }
      if (next.payload.bhajanId === localId) {
        next.payload.bhajanId = serverBhajan._id;
        changed = true;
      }
      if (next.payload.data?.bhajanId === localId) {
        next.payload.data.bhajanId = serverBhajan._id;
        changed = true;
      }
      if (changed) {
        store.put(next);
      }
    }
  });

  const idMap = await getMeta('idMap', {});
  idMap[localId] = serverBhajan._id;
  await setMeta('idMap', idMap);
}

function queuePriority(item) {
  const order = {
    'bhajan:create': 1,
    'bhajan:update': 2,
    'bhajan:delete': 3,
    'schedule:create': 4,
    'schedule:update': 5,
    'schedule:delete': 6,
  };
  return order[`${item.entity}:${item.operation}`] || 100;
}

async function syncMutation(mutation) {
  const idMap = await getMeta('idMap', {});
  const resolveId = (value) => idMap[value] || value;

  if (mutation.entity === 'bhajan' && mutation.operation === 'create') {
    const created = await authedFetch('/api/bhajans', {
      method: 'POST',
      body: JSON.stringify(mutation.payload.data),
    });
    await replaceLocalBhajanId(mutation.payload.localId, created);
    return;
  }

  if (mutation.entity === 'bhajan' && mutation.operation === 'update') {
    const id = resolveId(mutation.payload.id);
    const updated = await authedFetch(`/api/bhajans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mutation.payload.data),
    });
    await putItem('bhajans', { ...updated, _sync: { pending: false } });
    return;
  }

  if (mutation.entity === 'bhajan' && mutation.operation === 'delete') {
    const id = resolveId(mutation.payload.id);
    await authedFetch(`/api/bhajans/${id}`, { method: 'DELETE' });
    await deleteItem('bhajans', id);
    return;
  }

  if (mutation.entity === 'schedule' && mutation.operation === 'create') {
    const resolvedBhajanId = resolveId(mutation.payload.data.bhajanId);
    const created = await authedFetch('/api/schedule', {
      method: 'POST',
      body: JSON.stringify({
        ...mutation.payload.data,
        bhajanId: resolvedBhajanId,
      }),
    });
    await deleteItem('schedules', mutation.payload.localId);
    await putItem('schedules', { ...created.schedule, _sync: { pending: false } });
    return;
  }

  if (mutation.entity === 'schedule' && mutation.operation === 'update') {
    const id = resolveId(mutation.payload.id);
    const updated = await authedFetch(`/api/schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mutation.payload.data),
    });
    await putItem('schedules', { ...updated, _sync: { pending: false } });
    return;
  }

  if (mutation.entity === 'schedule' && mutation.operation === 'delete') {
    const id = resolveId(mutation.payload.id);
    await authedFetch(`/api/schedule/${id}`, { method: 'DELETE' });
    await deleteItem('schedules', id);
  }
}

export async function syncNow() {
  if (!navigator.onLine) {
    emitStatus({ online: false, lastError: 'No network connection' });
    return;
  }

  const queue = await getAll('pendingMutations');
  if (queue.length === 0) {
    emitStatus({ online: true, isSyncing: false, lastError: null });
    await setMeta('lastSyncAt', new Date().toISOString());
    return;
  }

  emitStatus({ isSyncing: true, online: true, lastError: null });
  const ordered = [...queue].sort((a, b) => {
    const diff = queuePriority(a) - queuePriority(b);
    if (diff !== 0) return diff;
    return a.createdAt - b.createdAt;
  });

  for (const mutation of ordered) {
    try {
      await syncMutation(mutation);
      await deleteItem('pendingMutations', mutation.id);
    } catch (error) {
      await putItem('pendingMutations', {
        ...mutation,
        retries: (mutation.retries || 0) + 1,
        lastError: error.message,
      });
      emitStatus({ lastError: error.message });
      break;
    }
  }

  const lastSyncAt = new Date().toISOString();
  await setMeta('lastSyncAt', lastSyncAt);
  await updatePendingCount();
  emitStatus({ isSyncing: false, lastSyncAt });
}

async function refreshBhajans() {
  const bhajans = await authedFetch('/api/bhajans');
  await withStore('bhajans', 'readwrite', (store) => {
    for (const bhajan of bhajans) {
      store.put({ ...bhajan, _sync: { pending: false } });
    }
  });
}

async function refreshSchedules() {
  const schedules = await authedFetch('/api/schedule');
  await withStore('schedules', 'readwrite', (store) => {
    for (const schedule of schedules) {
      store.put({ ...schedule, _sync: { pending: false } });
    }
  });
}

export async function initializeOfflineData() {
  if (initialized) return;
  initialized = true;

  emitStatus({ online: navigator.onLine });
  await updatePendingCount();
  const lastSyncAt = await getMeta('lastSyncAt', null);
  emitStatus({ lastSyncAt });

  window.addEventListener('online', async () => {
    emitStatus({ online: true });
    await syncNow();
    try {
      await Promise.all([refreshBhajans(), refreshSchedules()]);
    } catch {
      // Ignore background refresh errors; queue sync already reports failures.
    }
  });
  window.addEventListener('offline', () => {
    emitStatus({ online: false });
  });

  if (!syncIntervalId) {
    syncIntervalId = window.setInterval(() => {
      if (navigator.onLine) {
        syncNow();
      }
    }, 45000);
  }
}

export function subscribeSyncStatus(listener) {
  listeners.add(listener);
  listener({ ...STATUS });
  return () => listeners.delete(listener);
}

export async function getBhajans(options = {}) {
  const cached = await getAll('bhajans');
  if (navigator.onLine && (options.refresh || cached.length === 0)) {
    try {
      await refreshBhajans();
      return await getAll('bhajans');
    } catch {
      return cached;
    }
  }
  return cached;
}

export async function getBhajanById(id, options = {}) {
  const cached = await getById('bhajans', id);
  if (cached && !options.refresh) return cached;
  if (navigator.onLine && !id.startsWith(LOCAL_PREFIX)) {
    try {
      const bhajan = await authedFetch(`/api/bhajans/${id}`);
      await putItem('bhajans', { ...bhajan, _sync: { pending: false } });
      return bhajan;
    } catch {
      return cached;
    }
  }
  return cached;
}

export async function saveBhajan({ id, data }) {
  if (!id) {
    const localId = makeId('local');
    const localRecord = enrichWithSyncState({ _id: localId, ...data });
    await putItem('bhajans', localRecord);

    if (navigator.onLine) {
      try {
        const created = await authedFetch('/api/bhajans', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        await replaceLocalBhajanId(localId, created);
        await updatePendingCount();
        return created;
      } catch {
        await enqueueMutation('bhajan', 'create', { localId, data });
        return localRecord;
      }
    }

    await enqueueMutation('bhajan', 'create', { localId, data });
    return localRecord;
  }

  const optimistic = enrichWithSyncState({ _id: id, ...data });
  await putItem('bhajans', optimistic);

  if (navigator.onLine && !id.startsWith(LOCAL_PREFIX)) {
    try {
      const updated = await authedFetch(`/api/bhajans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await putItem('bhajans', { ...updated, _sync: { pending: false } });
      await updatePendingCount();
      return updated;
    } catch {
      await enqueueMutation('bhajan', 'update', { id, data });
      return optimistic;
    }
  }

  await enqueueMutation('bhajan', 'update', { id, data });
  return optimistic;
}

export async function deleteBhajan(id) {
  await deleteItem('bhajans', id);
  if (navigator.onLine && !id.startsWith(LOCAL_PREFIX)) {
    try {
      await authedFetch(`/api/bhajans/${id}`, { method: 'DELETE' });
      await updatePendingCount();
      return;
    } catch {
      await enqueueMutation('bhajan', 'delete', { id });
      return;
    }
  }
  await enqueueMutation('bhajan', 'delete', { id });
}

export async function getSchedules(options = {}) {
  const cached = await getAll('schedules');
  if (navigator.onLine && (options.refresh || cached.length === 0)) {
    try {
      await refreshSchedules();
      return await getAll('schedules');
    } catch {
      return cached;
    }
  }
  return cached;
}

export async function createSchedule(data) {
  const localId = makeId('local');
  const optimistic = enrichWithSyncState({
    _id: localId,
    bhajan: data.bhajanId,
    scheduledDate: data.scheduledDate,
    isSent: false,
  });
  await putItem('schedules', optimistic);

  if (navigator.onLine && !String(data.bhajanId).startsWith(LOCAL_PREFIX)) {
    try {
      const created = await authedFetch('/api/schedule', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await deleteItem('schedules', localId);
      await putItem('schedules', { ...created.schedule, _sync: { pending: false } });
      await updatePendingCount();
      return created.schedule;
    } catch {
      await enqueueMutation('schedule', 'create', { localId, data });
      return optimistic;
    }
  }

  await enqueueMutation('schedule', 'create', { localId, data });
  return optimistic;
}

export async function updateSchedule(id, data) {
  const current = (await getById('schedules', id)) || { _id: id };
  const optimistic = enrichWithSyncState({ ...current, ...data });
  await putItem('schedules', optimistic);

  if (navigator.onLine && !id.startsWith(LOCAL_PREFIX)) {
    try {
      const updated = await authedFetch(`/api/schedule/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await putItem('schedules', { ...updated, _sync: { pending: false } });
      await updatePendingCount();
      return updated;
    } catch {
      await enqueueMutation('schedule', 'update', { id, data });
      return optimistic;
    }
  }

  await enqueueMutation('schedule', 'update', { id, data });
  return optimistic;
}

export async function deleteSchedule(id) {
  await deleteItem('schedules', id);
  if (navigator.onLine && !id.startsWith(LOCAL_PREFIX)) {
    try {
      await authedFetch(`/api/schedule/${id}`, { method: 'DELETE' });
      await updatePendingCount();
      return;
    } catch {
      await enqueueMutation('schedule', 'delete', { id });
      return;
    }
  }
  await enqueueMutation('schedule', 'delete', { id });
}

export async function getAnalyticsSnapshot() {
  const schedules = await getSchedules();
  const bhajans = await getBhajans();

  const deityByBhajanId = new Map();
  for (const bhajan of bhajans) {
    deityByBhajanId.set(bhajan._id, bhajan.deity || 'Other');
  }

  const deityCounter = {};
  const monthCounter = {};
  for (const schedule of schedules) {
    const bhajanId = schedule.bhajan?._id || schedule.bhajan;
    const deity = deityByBhajanId.get(bhajanId) || schedule.bhajan?.deity || 'Other';
    deityCounter[deity] = (deityCounter[deity] || 0) + 1;
    const month = new Date(schedule.scheduledDate).toLocaleString('en-US', { month: 'short' });
    monthCounter[month] = (monthCounter[month] || 0) + 1;
  }

  return {
    totalScheduled: schedules.length,
    deityDistribution: Object.entries(deityCounter).map(([name, value]) => ({ name, value })),
    monthlyTrends: Object.entries(monthCounter).map(([name, sessions]) => ({ name, sessions })),
  };
}
