import { useState, useEffect } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import pluginId from '../../pluginId';

// ── Sub-components ────────────────────────────────────────────────────────────

const SourceBadge = ({ source }) => {
  const styles = {
    db:      { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    env:     { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
    default: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
  };
  const labels = { db: 'DB override', env: 'Env var', default: 'Default' };

  return (
    <span style={{
      ...styles[source],
      fontSize: '10px',
      fontWeight: '600',
      padding: '1px 7px',
      borderRadius: '9999px',
      letterSpacing: '0.03em',
    }}>
      {labels[source] ?? source}
    </span>
  );
};

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: '28px' }}>
    <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#1e293b', marginBottom: '4px' }}>
      {label}
    </label>
    {hint && (
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>{hint}</p>
    )}
    {children}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const Settings = () => {
  const { get, put } = useFetchClient();

  const [settings,    setSettings]    = useState(null);
  const [logDir,      setLogDir]      = useState('');
  const [maxLines,    setMaxLines]    = useState('');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState(null); // 'ok' | 'error' | null
  const [fetchError,  setFetchError]  = useState(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadSettings = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get(`/${pluginId}/settings`);
      apply(res.data);
    } catch {
      setFetchError('Failed to load settings. Check that you have the Configure permission.');
    } finally {
      setLoading(false);
    }
  };

  const apply = (s) => {
    setSettings(s);
    setLogDir(s.logDir ?? '');
    setMaxLines(s.maxLines ? String(s.maxLines) : '');
  };

  useEffect(() => { loadSettings(); }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await put(`/${pluginId}/settings`, {
        logDir:   logDir.trim()  || null,
        maxLines: maxLines ? parseInt(maxLines, 10) : null,
      });
      apply(res.data);
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Reset a single field to env/default by sending null
  const resetField = async (field) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = { logDir: settings?.logDir ?? null, maxLines: settings?.maxLines ?? null };
      payload[field] = null;
      const res = await put(`/${pluginId}/settings`, payload);
      apply(res.data);
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus(null), 3500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const maxLinesNum    = parseInt(maxLines, 10);
  const maxLinesValid  = !maxLines || (!isNaN(maxLinesNum) && maxLinesNum >= 100 && maxLinesNum <= 10000);
  const canSave        = !saving && maxLinesValid;

  // ── Render ──────────────────────────────────────────────────────────────────

  const inputStyle = (invalid) => ({
    width: '100%',
    border: `1px solid ${invalid ? '#f87171' : '#e2e8f0'}`,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  if (loading) {
    return <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading settings…</div>;
  }

  if (fetchError) {
    return (
      <div style={{
        background: '#fff3f3', border: '1px solid #fecaca', borderRadius: '8px',
        padding: '20px', fontSize: '13px', color: '#991b1b',
      }}>
        {fetchError}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px' }}>

      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '28px 32px',
      }}>

        {/* ── Log Directory ───────────────────────────────────────────────── */}
        <Field
          label="Log Directory Path"
          hint="Base folder where log files are stored. Overrides the LOG_DIR environment variable."
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={logDir}
              onChange={(e) => setLogDir(e.target.value)}
              placeholder={settings?.envLogDir ?? 'public/logs'}
              style={{ ...inputStyle(false), flex: 1 }}
            />
            {settings?.sources?.logDir === 'db' && (
              <button
                onClick={() => resetField('logDir')}
                disabled={saving}
                title="Remove override — revert to env/default"
                style={{
                  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px',
                  cursor: 'pointer', fontSize: '12px', background: '#fff', color: '#64748b',
                  whiteSpace: 'nowrap',
                }}
              >
                &#x2715; Reset
              </button>
            )}
          </div>

          {/* Source row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Currently using:</span>
            <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
              {settings?.effectiveLogDir}
            </span>
            <SourceBadge source={settings?.sources?.logDir} />
          </div>

          {settings?.envLogDir && settings?.sources?.logDir !== 'env' && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              Env variable (LOG_DIR): <code style={{ fontSize: '11px' }}>{settings.envLogDir}</code>
            </div>
          )}
        </Field>

        <div style={{ borderTop: '1px solid #f1f5f9', margin: '0 0 24px' }} />

        {/* ── Max Lines in Viewer ─────────────────────────────────────────── */}
        <Field
          label="Max Lines in Viewer"
          hint="Maximum log lines displayed per day (100–10 000). The full file is always available via Download."
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={100}
              max={10000}
              value={maxLines}
              onChange={(e) => setMaxLines(e.target.value)}
              placeholder="1000"
              style={{ ...inputStyle(!maxLinesValid), width: '160px' }}
            />
            {settings?.sources?.maxLines === 'db' && (
              <button
                onClick={() => resetField('maxLines')}
                disabled={saving}
                title="Remove override — revert to default (1000)"
                style={{
                  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px',
                  cursor: 'pointer', fontSize: '12px', background: '#fff', color: '#64748b',
                }}
              >
                &#x2715; Reset
              </button>
            )}
          </div>

          {!maxLinesValid && (
            <p style={{ fontSize: '12px', color: '#f87171', margin: '4px 0 0' }}>
              Must be between 100 and 10 000.
            </p>
          )}

          {/* Source row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Currently using:</span>
            <span style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
              {settings?.effectiveMaxLines?.toLocaleString()}
            </span>
            <SourceBadge source={settings?.sources?.maxLines} />
          </div>
        </Field>

        {/* ── Save bar ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              background: canSave ? '#4945ff' : '#a5b4fc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>

          {saveStatus === 'ok' && (
            <span style={{ fontSize: '13px', color: '#16a34a' }}>&#10003; Settings saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: '13px', color: '#dc2626' }}>&#10007; Save failed — please try again</span>
          )}
        </div>
      </div>

      {/* Priority legend */}
      <div style={{
        marginTop: '16px', padding: '14px 16px',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
          Setting priority (highest &#8594; lowest)
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
          <SourceBadge source="db" />
          <span>&#8594;</span>
          <SourceBadge source="env" />
          <span>&#8594;</span>
          <SourceBadge source="default" />
        </div>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0' }}>
          Values saved here take precedence over the <code>LOG_DIR</code> env variable. Clear a field and save to fall back to the lower-priority source.
        </p>
      </div>
    </div>
  );
};

export default Settings;
