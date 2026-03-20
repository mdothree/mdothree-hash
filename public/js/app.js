// js/app.js — mdothree-hash main entry point (Firebase-integrated)

import { generateHash, generateAllHashes } from './services/hashGenerator.js';
import { copyToClipboard, showToast, randomString } from './utils/cryptoUtils.js';
import {
  saveHashToHistory, loadHashHistory, deleteHashHistoryEntry,
  saveHashFavourite, loadHashFavourites, deleteHashFavourite,
} from './services/hashStorage.js';
import { onAuthChange, ensureAnonymousUser } from './config/config.js';
import { initSubscription, onSubscriptionChange } from './services/subscriptionService.js';
import { proGate, lockElement, openUpgradeModal, handleStripeReturn, proBadge } from './services/paywallUI.js';

// ---- Init subscription ----
initSubscription();
handleStripeReturn();

// Show Pro badge in header when subscribed
onSubscriptionChange(status => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  const existing = nav.querySelector('.pro-badge');
  if (status.isPro && !existing) nav.appendChild(proBadge());
  else if (!status.isPro && existing) existing.remove();
});

// Auth status badge
const authBadge = Object.assign(document.createElement('div'), {
  style: 'position:fixed;bottom:16px;right:16px;font-size:0.72rem;color:var(--text-secondary);font-family:var(--font-mono);z-index:999',
});
document.body.appendChild(authBadge);
onAuthChange(u => { authBadge.textContent = u ? '🔥 syncing' : '☁ offline'; });
ensureAnonymousUser().then(() => loadAndRenderHistory());

// ---- Elements ----
const inputText   = document.getElementById('inputText');
const charCount   = document.getElementById('charCount');
const clearBtn    = document.getElementById('clearBtn');
const sampleBtn   = document.getElementById('sampleBtn');
const generateBtn = document.getElementById('generateBtn');
const showAllBtn  = document.getElementById('showAllBtn');
const hashOutput  = document.getElementById('hashOutput');
const copyBtn     = document.getElementById('copyBtn');
const outputMeta  = document.getElementById('outputMeta');
const allHashes   = document.getElementById('allHashes');
const bcryptOpts  = document.getElementById('bcryptOptions');
const saltSlider  = document.getElementById('saltRounds');
const saltVal     = document.getElementById('saltRoundsVal');
const algoButtons = document.querySelectorAll('.algo-btn');

let currentAlgo = 'SHA256';
let showingAll = false;

// ---- Algo buttons ----
algoButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const algo = btn.dataset.algo;
    // Gate BCRYPT behind Pro
    if (algo === 'BCRYPT') {
      const allowed = await proGate('hash.bcrypt');
      if (!allowed) return;
    }
    algoButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAlgo = algo;
    bcryptOpts?.classList.toggle('hidden', currentAlgo !== 'BCRYPT');
    if (inputText?.value.trim()) runHashWithHistory();
  });
});

// ---- Salt slider ----
saltSlider?.addEventListener('input', () => {
  saltVal.textContent = saltSlider.value;
});

// ---- Input events ----
inputText?.addEventListener('input', () => {
  const len = inputText.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len !== 1 ? 's' : ''}`;
  if (!showingAll) runHash();
});

clearBtn?.addEventListener('click', () => {
  inputText.value = '';
  charCount.textContent = '0 characters';
  hashOutput.textContent = '—';
  outputMeta.textContent = '';
  allHashes.innerHTML = '';
  allHashes.classList.add('hidden');
  showingAll = false;
  showAllBtn.textContent = 'Show All Algorithms';
});

sampleBtn?.addEventListener('click', () => {
  inputText.value = randomString(40);
  charCount.textContent = '40 characters';
  runHash();
});

// ---- Generate ----
generateBtn?.addEventListener('click', runHash);

async function runHash() {
  const text = inputText?.value ?? '';
  if (!text) { hashOutput.textContent = '—'; return; }

  hashOutput.textContent = 'Generating…';
  try {
    const rounds = parseInt(saltSlider?.value ?? '10', 10);
    const hash = await generateHash(text, currentAlgo, rounds);
    hashOutput.textContent = hash;
    outputMeta.textContent = `${hash.length} chars`;
  } catch (e) {
    hashOutput.textContent = 'Error: ' + e.message;
    outputMeta.textContent = '';
  }
}

// ---- Copy ----
copyBtn?.addEventListener('click', async () => {
  const text = hashOutput.textContent;
  if (!text || text === '—') return;
  const ok = await copyToClipboard(text);
  showToast(ok ? 'Copied to clipboard!' : 'Copy failed');
});

// ---- Show All ----
showAllBtn?.addEventListener('click', async () => {
  if (!await proGate('hash.batch')) return;
  const text = inputText?.value ?? '';
  if (!text) { showToast('Enter some text first'); return; }

  if (showingAll) {
    allHashes.classList.add('hidden');
    allHashes.innerHTML = '';
    showingAll = false;
    showAllBtn.textContent = 'Show All Algorithms';
    return;
  }

  showAllBtn.textContent = 'Generating…';
  showAllBtn.disabled = true;

  try {
    const results = await generateAllHashes(text);
    allHashes.innerHTML = '';
    Object.entries(results).forEach(([algo, hash]) => {
      const row = document.createElement('div');
      row.className = 'hash-row';
      row.innerHTML = `
        <span class="hash-row-label">${algo}</span>
        <div class="hash-row-value" title="Click to copy">${hash}</div>
      `;
      row.querySelector('.hash-row-value').addEventListener('click', async () => {
        await copyToClipboard(hash);
        showToast(`${algo} hash copied!`);
      });
      allHashes.appendChild(row);
    });
    allHashes.classList.remove('hidden');
    showingAll = true;
    showAllBtn.textContent = 'Hide All';
  } catch (e) {
    showToast('Error: ' + e.message);
  } finally {
    showAllBtn.disabled = false;
  }
});

// ---- Firebase history panel ----
async function loadAndRenderHistory() {
  const panel = document.getElementById('hashHistoryPanel');
  if (!panel) return;
  const items = await loadHashHistory(15);
  const list  = panel.querySelector('.hash-history-list');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary)">No history yet.</div>';
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'hash-row';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span class="hash-row-label">${item.algo} · ${item.inputLength} chars · ${item.createdAt.toLocaleTimeString()}</span>
        <button data-id="${item.id}" class="del-hist-btn" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:0.75rem" title="Delete">✕</button>
      </div>
      <div class="hash-row-value" title="Click to copy">${item.hash}</div>
    `;
    row.querySelector('.hash-row-value').addEventListener('click', async () => {
      await copyToClipboard(item.hash); showToast('Hash copied!');
    });
    row.querySelector('.del-hist-btn').addEventListener('click', async e => {
      e.stopPropagation();
      await deleteHashHistoryEntry(item.id);
      await loadAndRenderHistory();
    });
    list.appendChild(row);
  });
}

// ---- Save to history after generate ----
const _origRunHash = runHash;
async function runHashWithHistory() {
  const text = document.getElementById('inputText')?.value ?? '';
  if (!text) { document.getElementById('hashOutput').textContent = '—'; return; }
  document.getElementById('hashOutput').textContent = 'Generating…';
  try {
    const rounds = parseInt(document.getElementById('saltRounds')?.value ?? '10', 10);
    const hash   = await generateHash(text, currentAlgo, rounds);
    document.getElementById('hashOutput').textContent = hash;
    document.getElementById('outputMeta').textContent = `${hash.length} chars`;
    // Persist to Firebase
    await saveHashToHistory({ input: text, algo: currentAlgo, hash, inputLength: text.length });
    await loadAndRenderHistory();
  } catch (e) {
    document.getElementById('hashOutput').textContent = 'Error: ' + e.message;
  }
}

// Patch generate button to use Firebase-saving version
document.getElementById('generateBtn')?.addEventListener('click', runHashWithHistory);
document.getElementById('inputText')?.addEventListener('input', () => {
  const text = document.getElementById('inputText')?.value ?? '';
  if (!text || currentAlgo === 'BCRYPT') return;
  runHashWithHistory();
});
