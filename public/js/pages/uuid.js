// js/pages/uuid.js — UUID Generator page logic
import { generateUUIDs }                from '../services/uuidGenerator.js';
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

let currentVer = 'v4';

document.querySelectorAll('.algo-btn[data-ver]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-btn[data-ver]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentVer = btn.dataset.ver;
    document.getElementById('v5Options').classList.toggle('hidden', currentVer !== 'v5');
  });
});

async function gen() {
  const count     = Math.min(100, Math.max(1, parseInt(document.getElementById('uuidCount').value) || 1));
  const name      = document.getElementById('v5Name')?.value || '';
  const namespace = document.getElementById('v5Namespace')?.value;
  const grid      = document.getElementById('uuidGrid');

  grid.innerHTML = '<div style="color:var(--text-secondary);font-size:0.85rem;padding:8px">Generating…</div>';

  const uuids = await generateUUIDs(currentVer, count, name, namespace);
  grid.innerHTML = '';
  uuids.forEach(uuid => {
    const item = document.createElement('div');
    item.className = 'uuid-item';
    item.innerHTML = `<span class="uuid-version">${currentVer}</span><span>${uuid}</span>`;
    item.addEventListener('click', async () => {
      await copyToClipboard(uuid);
      showToast('Copied!');
    });
    grid.appendChild(item);
  });
}

document.getElementById('generateUUIDs').addEventListener('click', withLoading(document.getElementById('generateUUIDs'), 'Generating…', gen));

document.getElementById('clearUUIDs').addEventListener('click', () => {
  document.getElementById('uuidGrid').innerHTML = '';
});

document.getElementById('copyAllUUIDs').addEventListener('click', async () => {
  const items = [...document.querySelectorAll('.uuid-item span:last-child')].map(s => s.textContent);
  if (!items.length) return;
  await copyToClipboard(items.join('\n'));
  showToast(`Copied ${items.length} UUIDs!`);
});

// Auto-generate on load
gen();

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
