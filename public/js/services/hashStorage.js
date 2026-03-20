// services/hashStorage.js — mdothree-hash
// Persists hash generation history and favourite hashes to Firestore.

import {
  getDB, ensureAnonymousUser, getFirebaseAuth,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, deleteDoc, doc,
} from '../config/config.js';

const HISTORY_COL   = 'hash_history';
const FAVOURITE_COL = 'hash_favourites';
const MAX_HISTORY   = 100;

// In-memory fallback (used when Firebase unavailable)
let _memHistory = [];
let _memFavs    = [];

// ---- Hash History ----

/**
 * Save a hash operation to history.
 * @param {{ input, algo, hash, inputLength }} entry
 */
export async function saveHashToHistory(entry) {
  const user = await ensureAnonymousUser();
  if (!user) {
    _memHistory.unshift({ id: Date.now().toString(), ...entry, createdAt: new Date() });
    if (_memHistory.length > MAX_HISTORY) _memHistory.pop();
    return;
  }
  try {
    const db = getDB();
    await addDoc(collection(db, HISTORY_COL), {
      uid:         user.uid,
      input:       entry.input.slice(0, 500), // truncate for storage
      algo:        entry.algo,
      hash:        entry.hash,
      inputLength: entry.inputLength ?? entry.input.length,
      createdAt:   serverTimestamp(),
    });
  } catch (e) {
    console.warn('[hashStorage] save history failed:', e.message);
  }
}

/**
 * Load hash history for current user.
 * @param {number} [count=20]
 */
export async function loadHashHistory(count = 20) {
  const user = getFirebaseAuth().currentUser;
  if (!user) return _memHistory.slice(0, count);
  try {
    const db = getDB();
    const q  = query(
      collection(db, HISTORY_COL),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(count),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id:          d.id,
      input:       d.data().input,
      algo:        d.data().algo,
      hash:        d.data().hash,
      inputLength: d.data().inputLength,
      createdAt:   d.data().createdAt?.toDate?.() ?? new Date(),
    }));
  } catch (e) {
    console.warn('[hashStorage] load history failed:', e.message);
    return _memHistory.slice(0, count);
  }
}

/**
 * Delete a history entry by doc ID.
 */
export async function deleteHashHistoryEntry(docId) {
  const user = getFirebaseAuth().currentUser;
  if (!user) { _memHistory = _memHistory.filter(h => h.id !== docId); return; }
  try { await deleteDoc(doc(getDB(), HISTORY_COL, docId)); }
  catch (e) { console.warn('[hashStorage] delete failed:', e.message); }
}

// ---- Favourites ----

/**
 * Save a hash to favourites (starred results).
 * @param {{ label, algo, hash }} fav
 */
export async function saveHashFavourite(fav) {
  const user = await ensureAnonymousUser();
  if (!user) {
    _memFavs.unshift({ id: Date.now().toString(), ...fav, createdAt: new Date() });
    return;
  }
  try {
    const db = getDB();
    await addDoc(collection(db, FAVOURITE_COL), {
      uid:       user.uid,
      label:     fav.label || '',
      algo:      fav.algo,
      hash:      fav.hash,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[hashStorage] save favourite failed:', e.message);
  }
}

/**
 * Load favourites for current user.
 */
export async function loadHashFavourites() {
  const user = getFirebaseAuth().currentUser;
  if (!user) return _memFavs;
  try {
    const db = getDB();
    const q  = query(
      collection(db, FAVOURITE_COL),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id:        d.id,
      label:     d.data().label,
      algo:      d.data().algo,
      hash:      d.data().hash,
      createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    }));
  } catch (e) {
    console.warn('[hashStorage] load favourites failed:', e.message);
    return _memFavs;
  }
}

/**
 * Delete a favourite by doc ID.
 */
export async function deleteHashFavourite(docId) {
  const user = getFirebaseAuth().currentUser;
  if (!user) { _memFavs = _memFavs.filter(f => f.id !== docId); return; }
  try { await deleteDoc(doc(getDB(), FAVOURITE_COL, docId)); }
  catch (e) { console.warn('[hashStorage] delete fav failed:', e.message); }
}
