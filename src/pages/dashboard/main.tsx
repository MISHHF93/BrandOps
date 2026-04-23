import { renderChatbotSurface } from '../chatbotWeb/renderChatbotSurface';
import {
  getRetiredDashboardOverlayTarget,
  shouldRedirectDashboardSectionToMobile
} from './dashboardRedirect';

/**
 * `dashboard.html?section=…` is legacy; the Cockpit workstream deep link lives on `mobile.html`.
 * Redirect so bookmarks and `buildDashboardUrl({ section })` don’t open Chat-only when a section is meant.
 */
if (typeof window !== 'undefined') {
  const retiredOverlayTarget = getRetiredDashboardOverlayTarget(window.location.search);
  if (retiredOverlayTarget) {
    const target = new URL(retiredOverlayTarget, window.location.href);
    window.location.replace(target.toString());
  } else if (shouldRedirectDashboardSectionToMobile(window.location.pathname, window.location.search)) {
    const target = new URL('mobile.html', window.location.href);
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.toString());
  } else {
    mountDashboardSurface();
  }
} else {
  mountDashboardSurface();
}

function mountDashboardSurface() {
  renderChatbotSurface({
    surfaceLabel: 'dashboard',
    initialTab: 'chat'
  });
}
