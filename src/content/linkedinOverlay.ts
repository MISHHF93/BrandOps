const ROOT_ID = 'brandops-linkedin-overlay';

function buildOverlay() {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '16px';
  root.style.width = '280px';
  root.style.zIndex = '999999';
  root.style.background = 'rgba(9,13,19,0.95)';
  root.style.border = '1px solid rgba(148,163,184,0.25)';
  root.style.borderRadius = '12px';
  root.style.padding = '12px';
  root.style.boxShadow = '0 14px 40px rgba(59,130,246,0.2)';
  root.style.fontFamily = 'Inter, system-ui, sans-serif';
  root.style.color = '#E2E8F0';

  const name = (document.querySelector('h1')?.textContent ?? 'this profile').trim();

  root.innerHTML = `
    <div style="font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#94A3B8;">BrandOps Overlay</div>
    <div style="margin-top:6px; font-size:14px; font-weight:600;">AI context for ${name}</div>
    <p style="margin:8px 0; font-size:12px; color:#CBD5E1;">Potential angle: discuss how agentic workflows improve time-to-value.</p>
    <button id="brandops-copy" style="width:100%; border:none; border-radius:8px; padding:8px; font-size:12px; font-weight:600; background:#2563EB; color:white; cursor:pointer;">Copy outreach opener</button>
  `;

  document.body.appendChild(root);

  root.querySelector<HTMLButtonElement>('#brandops-copy')?.addEventListener('click', async () => {
    const text = `Hi ${name}, I build end-to-end AI systems and wanted to share a quick idea relevant to your work.`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be blocked in some pages.
    }
  });
}

if (location.hostname.includes('linkedin.com')) {
  buildOverlay();
}
