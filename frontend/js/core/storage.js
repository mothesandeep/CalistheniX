/**
 * CalistheniX — Offline-First Storage & Synchronization
 *
 * Handles local queuing of workouts and individual logs into localStorage,
 * with background sync to the Flask API.
 */

// Write a log entry to localStorage immediately.
// Returns the client_uuid so the caller can track it.
function lsWriteLog(entry) {
  const uuid = entry.client_uuid || newUUID();
  const record = { ...entry, client_uuid: uuid, synced: false };
  localStorage.setItem(`${LS_PREFIX}${uuid}`, JSON.stringify(record));
  return uuid;
}

function updateSyncStatus(status) {
  const pills = [
    document.getElementById('sync-status-pill'),
    document.getElementById('sync-status-pill-mobile')
  ].filter(Boolean);
  const txt = document.getElementById('sync-status-text');

  let cls = 'sync-pill-synced';
  let label = 'Synced';
  if (status === 'syncing') {
    cls = 'sync-pill-syncing';
    label = 'Syncing...';
  } else if (status === 'local') {
    cls = 'sync-pill-local';
    label = 'Saved locally';
  } else if (status === 'offline') {
    cls = 'sync-pill-local';
    label = 'Offline';
  }

  pills.forEach(p => {
    p.className = `sync-pill ${cls}`;
  });
  if (txt) txt.textContent = label;
}

// Push all unsynced entries to POST /logs and POST /workout_sessions.
async function lsSyncPending() {
  const sessionKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_SESSION_PREFIX));
  const logKeys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));

  const isOnline = typeof navigator !== 'undefined' ? !!navigator.onLine : true;

  if (sessionKeys.length === 0 && logKeys.length === 0) {
    if (!isOnline) updateSyncStatus('offline');
    else updateSyncStatus('synced');
    return;
  }

  if (!isOnline) {
    updateSyncStatus('local');
    return;
  }

  updateSyncStatus('syncing');

  // 1. Sync pending workout sessions
  for (const key of sessionKeys) {
    let sessionRecord;
    try { sessionRecord = JSON.parse(localStorage.getItem(key)); } catch { continue; }
    try {
      if (typeof API !== 'undefined' && API.createWorkoutSession) {
        await API.createWorkoutSession(sessionRecord);
      }
      localStorage.removeItem(key);
    } catch {
      // Leave in localStorage for next retry
    }
  }

  // 2. Sync pending individual log entries (batch or single)
  const pendingLogs = [];
  const keyMap = [];

  for (const key of logKeys) {
    let record;
    try { record = JSON.parse(localStorage.getItem(key)); } catch { continue; }
    if (record.synced) { localStorage.removeItem(key); continue; }
    // If record is missing exercise_id and cannot be resolved, remove to prevent queue lock
    if (!record.exercise_id && typeof state !== 'undefined' && state.exercises) {
      const matched = state.exercises.find(e => e.name.toLowerCase() === (record.exercise_name || '').toLowerCase());
      if (matched) record.exercise_id = matched.id;
      else { localStorage.removeItem(key); continue; }
    }
    pendingLogs.push(record);
    keyMap.push(key);
  }

  if (pendingLogs.length > 0) {
    if (pendingLogs.length > 1 && typeof API !== 'undefined' && API.createLogsBatch) {
      try {
        await API.createLogsBatch(pendingLogs);
        keyMap.forEach(k => localStorage.removeItem(k));
      } catch (batchErr) {
        // Fallback to sequential sync if batch endpoint failed
        for (let i = 0; i < pendingLogs.length; i++) {
          try {
            if (API.createLog) await API.createLog(pendingLogs[i]);
            localStorage.removeItem(keyMap[i]);
          } catch (singleErr) {
            if (singleErr?.message && (singleErr.message.includes('400') || singleErr.message.includes('404'))) {
              localStorage.removeItem(keyMap[i]);
            }
          }
        }
      }
    } else {
      for (let i = 0; i < pendingLogs.length; i++) {
        try {
          if (typeof API !== 'undefined' && API.createLog) {
            await API.createLog(pendingLogs[i]);
          }
          localStorage.removeItem(keyMap[i]);
        } catch (e) {
          if (e && e.message && (e.message.includes('400') || e.message.includes('404') || e.message.includes('Missing required'))) {
            localStorage.removeItem(keyMap[i]);
          }
        }
      }
    }
  }

  const remainingSessions = Object.keys(localStorage).filter(k => k.startsWith(LS_SESSION_PREFIX));
  const remainingLogs = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
  if (remainingSessions.length > 0 || remainingLogs.length > 0) {
    updateSyncStatus('local');
  } else {
    updateSyncStatus('synced');
  }
}

// Schedule background sync: on load, on tab focus, on reconnect (online), every 30 s.
function startSyncLoop() {
  lsSyncPending();
  window.addEventListener('focus', lsSyncPending);
  window.addEventListener('online', () => {
    showToast('Back online! Syncing workouts...');
    lsSyncPending();
  });
  window.addEventListener('offline', () => {
    updateSyncStatus('offline');
    showToast('Offline mode active. Workouts will save locally.');
  });
  setInterval(lsSyncPending, 30_000);
}

if (typeof window !== 'undefined') {
  window.lsWriteLog = lsWriteLog;
  window.updateSyncStatus = updateSyncStatus;
  window.lsSyncPending = lsSyncPending;
  window.startSyncLoop = startSyncLoop;
}
