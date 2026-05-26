import { useState, useEffect } from 'react';
import { useRBAC } from '@strapi/strapi/admin';
import LogViewer from '../LogViewer/index.jsx';

// ── Permission definitions ────────────────────────────────────────────────────
const RBAC_ACTIONS = {
  read:     [{ action: 'plugin::cms-logs.read',     subject: null }],
  download: [{ action: 'plugin::cms-logs.download', subject: null }],
};

// ── Dark-mode detection — mirrors the jood-dashboard pattern ─────────────────
// Reads STRAPI_THEME from localStorage (set by Strapi's own theme toggle),
// falls back to the OS preference when the value is "system" or absent.
// Polls every 500 ms to catch same-tab theme changes (storage event only fires
// in other tabs).
const useDarkMode = () => {
  const resolve = () => {
    const t = window.localStorage.getItem('STRAPI_THEME') || 'system';
    if (t === 'dark')  return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [isDark, setIsDark] = useState(resolve);

  useEffect(() => {
    const mq      = window.matchMedia('(prefers-color-scheme: dark)');
    const update  = () => setIsDark(resolve());
    let lastTheme = window.localStorage.getItem('STRAPI_THEME') || 'system';

    mq.addEventListener('change', update);

    const onStorage = (e) => { if (e.key === 'STRAPI_THEME') update(); };
    window.addEventListener('storage', onStorage);

    const pollId = window.setInterval(() => {
      const t = window.localStorage.getItem('STRAPI_THEME') || 'system';
      if (t !== lastTheme) { lastTheme = t; update(); }
    }, 500);

    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(pollId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return isDark;
};

// ── Theme tokens ──────────────────────────────────────────────────────────────
const tokens = (isDark) => isDark ? {
  textPrimary:  '#f1f5f9',
  textMuted:    '#94a3b8',
  textLoading:  '#64748b',
  errorBg:      'rgba(153,27,27,0.18)',
  errorBorder:  '1px solid #7f1d1d',
  errorTitle:   '#fca5a5',
  errorBody:    '#fecaca',
} : {
  textPrimary:  '#1e293b',
  textMuted:    '#64748b',
  textLoading:  '#94a3b8',
  errorBg:      '#fff3f3',
  errorBorder:  '1px solid #fecaca',
  errorTitle:   '#991b1b',
  errorBody:    '#7f1d1d',
};

// ── Component ─────────────────────────────────────────────────────────────────
const App = () => {
  const isDark = useDarkMode();
  const t = tokens(isDark);

  const { isLoading: rbacLoading, allowedActions } = useRBAC(RBAC_ACTIONS);
  const canRead     = allowedActions?.canRead     ?? false;
  const canDownload = allowedActions?.canDownload ?? false;

  // ── Permission gates ────────────────────────────────────────────────────────

  if (rbacLoading) {
    return (
      <div style={{ padding: '32px', color: t.textLoading, fontSize: '13px' }}>
        Checking permissions…
      </div>
    );
  }

  if (!canRead) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{
          background: t.errorBg, border: t.errorBorder, borderRadius: '8px',
          padding: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start', maxWidth: '480px',
        }}>
          <span style={{ fontSize: '22px', lineHeight: 1 }}>🔒</span>
          <div>
            <div style={{ fontWeight: '600', color: t.errorTitle, marginBottom: '6px', fontSize: '14px' }}>
              Access denied
            </div>
            <div style={{ fontSize: '13px', color: t.errorBody, lineHeight: '1.6' }}>
              You don't have permission to access the CMS Logs viewer. Ask a super admin to grant
              permissions under <em>Settings → Roles → [role] → Plugins → CMS Logs</em>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '32px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: t.textPrimary, margin: 0 }}>
          CMS Log Viewer
        </h1>
        <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0' }}>
          Browse and download daily Strapi log files.
        </p>
      </div>

      <LogViewer canDownload={canDownload} isDark={isDark} />
    </div>
  );
};

export default App;
