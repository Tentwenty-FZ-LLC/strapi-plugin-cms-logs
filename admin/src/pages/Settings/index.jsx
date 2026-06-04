import { useState, useEffect } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import pluginId from '../../pluginId';

// ── Dark-mode detection (mirrors App/index.jsx) ───────────────────────────────
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
    window.addEventListener('storage', (e) => { if (e.key === 'STRAPI_THEME') update(); });

    const pollId = window.setInterval(() => {
      const t = window.localStorage.getItem('STRAPI_THEME') || 'system';
      if (t !== lastTheme) { lastTheme = t; update(); }
    }, 500);

    return () => {
      mq.removeEventListener('change', update);
      window.clearInterval(pollId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return isDark;
};

// ── Theme tokens ──────────────────────────────────────────────────────────────
const uiTokens = (isDark) => isDark ? {
  cardBg:             '#1e293b',
  cardBorder:         '1px solid #334155',
  labelColor:         '#f1f5f9',
  hintColor:          '#94a3b8',
  inputBg:            '#0f172a',
  inputBorder:        '#334155',
  inputColor:         '#e2e8f0',
  divider:            '#334155',
  sourceLabelColor:   '#64748b',
  sourceValueColor:   '#cbd5e1',
  resetBtnBg:         '#0f172a',
  resetBtnBorder:     '1px solid #334155',
  resetBtnColor:      '#94a3b8',
  errorText:          '#f87171',
  successText:        '#4ade80',
  failText:           '#f87171',
  loadingColor:       '#64748b',
  fetchErrorBg:       'rgba(153,27,27,0.20)',
  fetchErrorBorder:   '1px solid #7f1d1d',
  fetchErrorColor:    '#fecaca',
} : {
  cardBg:             '#ffffff',
  cardBorder:         '1px solid #e2e8f0',
  labelColor:         '#1e293b',
  hintColor:          '#64748b',
  inputBg:            '#ffffff',
  inputBorder:        '#e2e8f0',
  inputColor:         '#1e293b',
  divider:            '#f1f5f9',
  sourceLabelColor:   '#94a3b8',
  sourceValueColor:   '#334155',
  resetBtnBg:         '#ffffff',
  resetBtnBorder:     '1px solid #e2e8f0',
  resetBtnColor:      '#64748b',
  errorText:          '#f87171',
  successText:        '#16a34a',
  failText:           '#dc2626',
  loadingColor:       '#94a3b8',
  fetchErrorBg:       '#fff3f3',
  fetchErrorBorder:   '1px solid #fecaca',
  fetchErrorColor:    '#991b1b',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SourceBadge = ({ source }) => {
  const styles = {
    db:      { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    default: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
  };
  const labels = { db: 'DB override', default: 'Default' };

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

const Field = ({ label, hint, ui, children }) => (
  <div style={{ marginBottom: '28px', maxWidth: '520px' }}>
    <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: ui.labelColor, marginBottom: '4px' }}>
      {label}
    </label>
    {hint && (
      <p style={{ fontSize: '12px', color: ui.hintColor, margin: '0 0 8px' }}>{hint}</p>
    )}
    {children}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const Settings = () => {
  const isDark = useDarkMode();
  const ui     = uiTokens(isDark);
  const { get, put } = useFetchClient();

  const [settings,   setSettings]   = useState(null);
  const [maxLines,   setMaxLines]   = useState('');
  const [monthsBack, setMonthsBack] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error' | null
  const [fetchError, setFetchError] = useState(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const apply = (s) => {
    setSettings(s);
    setMaxLines(s.maxLines   ? String(s.maxLines)   : '');
    setMonthsBack(s.monthsBack ? String(s.monthsBack) : '');
  };

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

  useEffect(() => { loadSettings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await put(`/${pluginId}/settings`, {
        maxLines:   maxLines   ? parseInt(maxLines,   10) : null,
        monthsBack: monthsBack ? parseInt(monthsBack, 10) : null,
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

  const resetField = async (field) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        maxLines:   settings?.maxLines   ?? null,
        monthsBack: settings?.monthsBack ?? null,
      };
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

  const maxLinesNum     = parseInt(maxLines,   10);
  const monthsBackNum   = parseInt(monthsBack, 10);
  const maxLinesValid   = !maxLines   || (!isNaN(maxLinesNum)   && maxLinesNum   >= 100 && maxLinesNum   <= 10000);
  const monthsBackValid = !monthsBack || (!isNaN(monthsBackNum) && monthsBackNum >= 1   && monthsBackNum <= 12);
  const canSave         = !saving && maxLinesValid && monthsBackValid;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const inputStyle = (invalid) => ({
    border: `1px solid ${invalid ? '#f87171' : ui.inputBorder}`,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: ui.inputColor,
    background: ui.inputBg,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  });

  const resetBtnStyle = {
    border: ui.resetBtnBorder,
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    background: ui.resetBtnBg,
    color: ui.resetBtnColor,
    whiteSpace: 'nowrap',
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ color: ui.loadingColor, fontSize: '13px' }}>Loading settings…</div>;
  }

  if (fetchError) {
    return (
      <div style={{
        background: ui.fetchErrorBg, border: ui.fetchErrorBorder,
        borderRadius: '8px', padding: '20px', fontSize: '13px', color: ui.fetchErrorColor,
      }}>
        {fetchError}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: ui.labelColor, margin: '0 0 4px' }}>
          CMS Logs
        </h1>
        <p style={{ fontSize: '13px', color: ui.hintColor, margin: 0 }}>
          Configure the CMS Logs viewer behaviour.
        </p>
      </div>

      <div style={{
        background: ui.cardBg,
        border: ui.cardBorder,
        borderRadius: '8px',
        padding: '28px 32px',
      }}>

        {/* ── Months back in viewer ───────────────────────────────────────── */}
        <Field label="Months Available in Date Picker" hint="How many past months are selectable in the log viewer calendar (1–12)." ui={ui}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number" min={1} max={12}
              value={monthsBack}
              onChange={(e) => setMonthsBack(e.target.value)}
              placeholder="3"
              style={{ ...inputStyle(!monthsBackValid), width: '120px' }}
            />
            {settings?.sources?.monthsBack === 'db' && (
              <button onClick={() => resetField('monthsBack')} disabled={saving} title="Revert to default (3)" style={resetBtnStyle}>
                ✕ Reset
              </button>
            )}
          </div>
          {!monthsBackValid && (
            <p style={{ fontSize: '12px', color: ui.errorText, margin: '4px 0 0' }}>Must be between 1 and 12.</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: ui.sourceLabelColor }}>Currently using:</span>
            <span style={{ fontSize: '12px', color: ui.sourceValueColor, fontFamily: 'monospace' }}>
              {settings?.effectiveMonthsBack}
            </span>
            <SourceBadge source={settings?.sources?.monthsBack} />
          </div>
        </Field>

        <div style={{ borderTop: `1px solid ${ui.divider}`, margin: '0 0 24px' }} />

        {/* ── Max lines in viewer ─────────────────────────────────────────── */}
        <Field label="Max Lines in Viewer" hint="Maximum log lines displayed per day (100–10 000). The full file is always available via Download." ui={ui}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number" min={100} max={10000}
              value={maxLines}
              onChange={(e) => setMaxLines(e.target.value)}
              placeholder="1000"
              style={{ ...inputStyle(!maxLinesValid), width: '160px' }}
            />
            {settings?.sources?.maxLines === 'db' && (
              <button onClick={() => resetField('maxLines')} disabled={saving} title="Revert to default (1000)" style={resetBtnStyle}>
                ✕ Reset
              </button>
            )}
          </div>
          {!maxLinesValid && (
            <p style={{ fontSize: '12px', color: ui.errorText, margin: '4px 0 0' }}>Must be between 100 and 10 000.</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: ui.sourceLabelColor }}>Currently using:</span>
            <span style={{ fontSize: '12px', color: ui.sourceValueColor, fontFamily: 'monospace' }}>
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
              background: canSave ? '#4945ff' : (isDark ? '#3730a3' : '#a5b4fc'),
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
            <span style={{ fontSize: '13px', color: ui.successText }}>✓ Settings saved</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: '13px', color: ui.failText }}>✗ Save failed — please try again</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
