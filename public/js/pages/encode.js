// js/pages/encode.js — Encode / Decode page logic
import { transform }                    from '../services/encoder.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { copyToClipboard, showToast }   from '../utils/cryptoUtils.js';
import { initSubscription }             from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }                 from '../config/config.js';

initSubscription();
handleStripeReturn();

onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
});

let currentFmt = 'base64';

document.querySelectorAll('.algo-btn[data-fmt]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-btn[data-fmt]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFmt = btn.dataset.fmt;
  });
});

function run(direction) {
  const input  = document.getElementById('encInput').value;
  const output = document.getElementById('encOutput');
  const meta   = document.getElementById('encMeta');
  if (!input) return;
  try {
    const result = transform(input, direction, currentFmt);
    output.textContent = result;
    meta.textContent   = `${result.length} chars`;
  } catch (e) {
    output.textContent = 'Error: ' + e.message;
    meta.textContent   = '';
  }
}

document.getElementById('encodeBtn').addEventListener('click', () => run('encode'));
document.getElementById('decodeBtn').addEventListener('click', () => run('decode'));

document.getElementById('swapBtn').addEventListener('click', () => {
  const input  = document.getElementById('encInput');
  const output = document.getElementById('encOutput');
  const tmp    = input.value;
  input.value            = output.textContent === '—' ? '' : output.textContent;
  output.textContent     = tmp || '—';
});

document.getElementById('copyEncBtn').addEventListener('click', async () => {
  const text = document.getElementById('encOutput').textContent;
  if (!text || text === '—') return;
  await copyToClipboard(text);
  showToast('Copied!');
});

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
