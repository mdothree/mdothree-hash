// js/pages/checker.js — Hash Checker page logic
import { verifyTextHash, verifyFileHash } from '../services/hashChecker.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { detectHashAlgo }                 from '../utils/cryptoUtils.js';
import { initSubscription }               from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }            from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

// Gate entire page behind Pro
(async () => {
  const allowed = await proGate('hash.file_check');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'hash.file_check', 'File Hash Checker');
    return;
  }
  initPage();
})();

function initPage() {
  let mode         = 'text';
  let selectedFile = null;
  let currentAlgo  = 'SHA256';

  // Mode toggle
  document.getElementById('modeText').addEventListener('click', () => {
    mode = 'text';
    document.getElementById('modeText').classList.add('active');
    document.getElementById('modeFile').classList.remove('active');
    document.getElementById('textPanel').classList.remove('hidden');
    document.getElementById('filePanel').classList.add('hidden');
  });

  document.getElementById('modeFile').addEventListener('click', () => {
    mode = 'file';
    document.getElementById('modeFile').classList.add('active');
    document.getElementById('modeText').classList.remove('active');
    document.getElementById('filePanel').classList.remove('hidden');
    document.getElementById('textPanel').classList.add('hidden');
  });

  // Algo buttons
  document.querySelectorAll('.algo-btn[data-algo]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.algo-btn[data-algo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAlgo = btn.dataset.algo;
    });
  });

  // File drop zone
  const dropzone  = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--emerald)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border)';
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    handleFile(e.dataTransfer.files[0]);
  });

  function handleFile(file) {
    if (!file) return;
    selectedFile = file;
    document.getElementById('fileInfo').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  }

  // Known hash — auto-detect algo
  document.getElementById('knownHash').addEventListener('input', e => {
    const algo = detectHashAlgo(e.target.value);
    document.getElementById('detectedAlgo').textContent = algo !== 'Unknown' ? `Detected: ${algo}` : '';
  });

  // Verify
  document.getElementById('verifyBtn').addEventListener('click', async () => {
    const knownHash = document.getElementById('knownHash').value.trim();
    if (!knownHash) { alert('Please enter a known hash to verify against'); return; }

    const resultPanel   = document.getElementById('resultPanel');
    const verifyResult  = document.getElementById('verifyResult');
    const computedHash  = document.getElementById('computedHash');

    verifyResult.textContent = 'Verifying…';
    resultPanel.style.display = 'block';

    try {
      let result;
      if (mode === 'text') {
        const text = document.getElementById('checkInput').value;
        if (!text) { alert('Please enter text to verify'); return; }
        result = await verifyTextHash(text, knownHash, currentAlgo);
      } else {
        if (!selectedFile) { alert('Please select a file'); return; }
        const algoMap = { SHA256: 'SHA-256', SHA512: 'SHA-512', SHA384: 'SHA-384', SHA1: 'SHA-1' };
        result = await verifyFileHash(selectedFile, knownHash, algoMap[currentAlgo] || 'SHA-256');
      }

      verifyResult.innerHTML = result.match
        ? '<span class="success">✓ Hash matches — file/text is authentic</span>'
        : '<span class="danger">✗ Hash does NOT match — file/text may be corrupted or tampered</span>';
      computedHash.textContent = result.computed;
    } catch (e) {
      verifyResult.innerHTML = `<span class="danger">Error: ${e.message}</span>`;
      computedHash.textContent = '';
    }
  });
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
