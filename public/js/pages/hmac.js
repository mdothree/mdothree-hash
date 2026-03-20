// js/pages/hmac.js — HMAC Generator page logic
import { generateHMAC, generateHMACBase64 } from '../services/hmacGenerator.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { copyToClipboard, showToast }        from '../utils/cryptoUtils.js';
import { initSubscription }                  from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }               from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

// Gate entire page behind Pro
(async () => {
  const allowed = await proGate('hash.hmac');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'hash.hmac', 'HMAC Generator');
    return;
  }
  initPage();
})();

function initPage() {
  let currentAlgo = 'SHA-256';

  document.querySelectorAll('.algo-btn[data-algo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.algo-btn[data-algo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAlgo = btn.dataset.algo;
    });
  });

  document.getElementById('genHMAC').addEventListener('click', async () => {
    const msg    = document.getElementById('hmacMessage').value;
    const secret = document.getElementById('hmacSecret').value;
    if (!msg || !secret) { showToast('Enter message and secret'); return; }
    try {
      const hex = await generateHMAC(msg, secret, currentAlgo);
      const b64 = await generateHMACBase64(msg, secret, currentAlgo);
      document.getElementById('hmacHex').textContent = hex;
      document.getElementById('hmacB64').textContent = b64;
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  });

  document.getElementById('copyHMACHex').addEventListener('click', async () => {
    await copyToClipboard(document.getElementById('hmacHex').textContent);
    showToast('Hex copied!');
  });

  document.getElementById('copyHMACB64').addEventListener('click', async () => {
    await copyToClipboard(document.getElementById('hmacB64').textContent);
    showToast('Base64 copied!');
  });
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
