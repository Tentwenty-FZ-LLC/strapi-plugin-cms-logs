import { useRBAC } from '@strapi/strapi/admin';
import LogViewer from '../LogViewer/index.jsx';

// ── Permission definitions ────────────────────────────────────────────────────
const RBAC_ACTIONS = {
  read:     [{ action: 'plugin::cms-logs.read',     subject: null }],
  download: [{ action: 'plugin::cms-logs.download', subject: null }],
};

// ── Component ─────────────────────────────────────────────────────────────────
const App = () => {
  const { isLoading: rbacLoading, allowedActions } = useRBAC(RBAC_ACTIONS);
  const canRead     = allowedActions?.canRead     ?? false;
  const canDownload = allowedActions?.canDownload ?? false;

  // ── Permission gates ────────────────────────────────────────────────────────

  if (rbacLoading) {
    return (
      <div style={{ padding: '32px', color: '#94a3b8', fontSize: '13px' }}>
        Checking permissions…
      </div>
    );
  }

  if (!canRead) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{
          background: '#fff3f3', border: '1px solid #fecaca', borderRadius: '8px',
          padding: '24px', display: 'flex', gap: '14px', alignItems: 'flex-start', maxWidth: '480px',
        }}>
          <span style={{ fontSize: '22px', lineHeight: 1 }}>🔒</span>
          <div>
            <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '6px', fontSize: '14px' }}>
              Access denied
            </div>
            <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.6' }}>
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
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
          CMS Log Viewer
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
          Browse and download daily Strapi log files.
        </p>
      </div>

      <LogViewer canDownload={canDownload} />
    </div>
  );
};

export default App;
