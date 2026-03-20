// config/firebase.js — mdothree-hash
// Firebase v10 modular SDK via CDN esm bundle.
// Actual config values are injected from window.__ENV (set by Vercel env → vercel.json headers)
// or read from meta tags rendered server-side. Fall back to placeholder so the app
// remains functional without Firebase (all features degrade gracefully).

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, deleteDoc, doc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ---------------------------------------------------------------------------
// Config — read from <meta name="firebase-config" content="...JSON..."> or
// window.__FIREBASE_CONFIG injected by the hosting layer.
// ---------------------------------------------------------------------------
function loadConfig() {
  if (typeof window !== 'undefined') {
    if (window.__FIREBASE_CONFIG) return window.__FIREBASE_CONFIG;
    const meta = document.querySelector('meta[name="firebase-config"]');
    if (meta) {
      try { return JSON.parse(meta.content); } catch {}
    }
  }
  // Placeholder — replace with your actual project values.
  return {
    apiKey:            'REPLACE_WITH_API_KEY',
    authDomain:        'REPLACE.firebaseapp.com',
    projectId:         'REPLACE_WITH_PROJECT_ID',
    storageBucket:     'REPLACE.appspot.com',
    messagingSenderId: 'REPLACE',
    appId:             'REPLACE_WITH_APP_ID',
  };
}

// ---------------------------------------------------------------------------
// Singleton initialisation
// ---------------------------------------------------------------------------
let _app, _db, _auth;

export function getFirebaseApp() {
  if (_app) return _app;
  const cfg = loadConfig();
  _app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return _app;
}

export function getDB() {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getFirebaseAuth() {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Sign in anonymously (silent — no UI). Returns the user or null on error. */
export async function ensureAnonymousUser() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn('[Firebase] Anonymous sign-in failed:', e.code);
    return null;
  }
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuthChange(cb) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

export { serverTimestamp, collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, doc };
