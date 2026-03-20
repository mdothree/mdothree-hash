// js/pages/batch.js — Batch Hash page logic
import { generateHash }                from '../services/hashGenerator.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { copyToClipboard, showToast }  from '../utils/cryptoUtils.js';
import { initSubscription }            from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }         from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

// Gate entire page behind Pro
(async () => {
  const allowed = await proGate('hash.batch');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'hash.batch', 'Batch Hashing');
    return;
  }
  initPage();
})();

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initPage() {
  let currentAlgo = 'SHA256';
  let results     = [];

  document.querySelectorAll('.algo-btn[data-algo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.algo-btn[data-algo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAlgo = btn.dataset.algo;
    });
  });

  document.getElementById('batchBtn').addEventListener('click', withLoading(document.getElementById('batchBtn'), 'Hashing…', async () => {
    const MAX_LINES = 1000;
    const MAX_LINE_LENGTH = 10000;

    const lines = document.getElementById('batchInput').value
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (!lines.length) return;

    if (lines.length > MAX_LINES) {
      uiToast(`Too many lines — maximum ${MAX_LINES}. Got ${lines.length}.`, 'error');
      return;
    }

    const tooLong = lines.find(l => l.length > MAX_LINE_LENGTH);
    if (tooLong) {
      uiToast(`Line too long — max ${MAX_LINE_LENGTH.toLocaleString()} chars per line.`, 'error');
      return;
    }

    const tbody = document.querySelector('#batchTable tbody');
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--text-secondary)">Processing ${lines.length} items…</td></tr>`;
    document.getElementById('batchResults').style.display = 'block';

    results = [];
    for (const line of lines) {
      const hash = await generateHash(line, currentAlgo);
      results.push({ input: line, hash });
    }

    tbody.innerHTML = '';
    results.forEach(({ input, hash }, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="batch-index">${i + 1}</td>
        <td class="batch-input">${escHtml(input)}</td>
        <td class="batch-hash" title="Click to copy">${hash}</td>
      `;
      tr.querySelector('.batch-hash').addEventListener('click', async () => {
        await copyToClipboard(hash);
        showToast('Hash copied!');
      });
      tbody.appendChild(tr);
    });
  });

  document.getElementById('copyCSVBtn').addEventListener('click', async () => {
    if (!results.length) return;
    const csv = 'input,hash\n' + results.map(r => `"${r.input}","${r.hash}"`).join('\n');
    await copyToClipboard(csv);
    showToast('CSV copied!');
  });

  document.getElementById('clearBatchBtn').addEventListener('click', () => {
    document.getElementById('batchInput').value = '';
    document.getElementById('batchResults').style.display = 'none';
    results = [];
  });
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
