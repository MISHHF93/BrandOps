const ROOT_ID = 'brandops-linkedin-overlay';
const STORAGE_KEY = 'brandops:data';

interface OverlayData {
  followUps?: { reason: string; dueAt: string; completed: boolean }[];
  publishingQueue?: { title: string; status: string }[];
}

function renderOverlay(data: OverlayData) {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement('aside');
  root.id = ROOT_ID;
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '16px';
  root.style.width = '320px';
  root.style.zIndex = '999999';
  root.style.background = 'rgba(7,10,17,0.95)';
  root.style.border = '1px solid rgba(100,116,139,0.45)';
  root.style.borderRadius = '14px';
  root.style.padding = '14px';
  root.style.color = '#E2E8F0';
  root.style.fontFamily = 'Inter, system-ui, sans-serif';

  const overdue =
    data.followUps?.filter((item) => !item.completed && new Date(item.dueAt).getTime() < Date.now()) ?? [];
  const nextPost = data.publishingQueue?.find((item) => item.status === 'ready' || item.status === 'scheduled');

  root.innerHTML = `
    <div style="font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#94A3B8;">BrandOps Companion</div>
    <div style="margin-top:6px; font-size:14px; font-weight:600;">LinkedIn execution checklist</div>
    <ul style="margin:10px 0 0; padding-left:16px; font-size:12px; color:#CBD5E1;">
      <li>Overdue follow-ups: <strong>${overdue.length}</strong></li>
      <li>Next publishing item: <strong>${nextPost?.title ?? 'No ready drafts'}</strong></li>
      <li>Reminder: keep outreach manual and intentional.</li>
    </ul>
    <button id="brandops-close" style="margin-top:12px; width:100%; border:none; border-radius:8px; padding:8px; font-size:12px; font-weight:600; background:#1D4ED8; color:white; cursor:pointer;">Hide overlay</button>
  `;

  document.body.appendChild(root);

  root.querySelector<HTMLButtonElement>('#brandops-close')?.addEventListener('click', () => {
    root.remove();
  });
}

async function initOverlay() {
  if (!location.hostname.includes('linkedin.com')) return;

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  renderOverlay(stored[STORAGE_KEY] as OverlayData);
}

void initOverlay();
