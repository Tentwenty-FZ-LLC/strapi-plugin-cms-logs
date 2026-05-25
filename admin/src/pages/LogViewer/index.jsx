import { useState, useEffect, useCallback, useRef } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import pluginId from '../../pluginId';
import { parseLogLine, LEVEL_COLORS, LEVEL_BG, LEVEL_BADGE } from '../../utils/parseLogLine';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toDateStr = (d) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

// ── CompactDatePicker ─────────────────────────────────────────────────────────

const CompactDatePicker = ({ selectedDate, onSelect, today }) => {
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const wrapRef = useRef(null);

  // Sync calendar view to the selected date's month whenever the dropdown opens
  useEffect(() => {
    if (open) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on any click outside this component
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Navigation bounds: allow up to 2 months back (3 months total incl. current)
  const minMonth   = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const canPrev    = new Date(viewYear, viewMonth - 1, 1) >= minMonth;
  const canNext    = new Date(viewYear, viewMonth + 1, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay    = new Date(viewYear, viewMonth, 1).getDay();

  const navigate = (dir) => {
    const d = new Date(viewYear, viewMonth + dir, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleDayClick = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d > today) return;
    onSelect(d);
    setOpen(false);
  };

  const isSelected = (day) =>
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth()    === viewMonth &&
    selectedDate.getDate()     === day;

  const isToday = (day) =>
    today.getFullYear() === viewYear &&
    today.getMonth()    === viewMonth &&
    today.getDate()     === day;

  const isFuture = (day) => new Date(viewYear, viewMonth, day) > today;

  const triggerLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const navBtnStyle = (enabled) => ({
    border: 'none', background: 'none', padding: '2px 8px',
    cursor: enabled ? 'pointer' : 'default',
    color: enabled ? '#475569' : '#cbd5e1',
    fontSize: '18px', lineHeight: 1, borderRadius: '4px',
  });

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          border: '1px solid #e2e8f0', borderRadius: '6px',
          padding: '6px 12px', background: '#fff', cursor: 'pointer',
          fontSize: '13px', color: '#1e293b', fontWeight: '500',
          whiteSpace: 'nowrap', lineHeight: '1.4',
        }}
      >
        {triggerLabel}
        <span style={{ fontSize: '9px', color: '#94a3b8', marginLeft: '2px' }}>▾</span>
      </button>

      {/* ── Dropdown calendar ──────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.10)', padding: '12px',
          zIndex: 200, width: '240px',
        }}>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button style={navBtnStyle(canPrev)} disabled={!canPrev} onClick={() => navigate(-1)} aria-label="Previous month">&#8249;</button>
            <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button style={navBtnStyle(canNext)} disabled={!canNext} onClick={() => navigate(1)} aria-label="Next month">&#8250;</button>
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '10px' }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '10px', color: '#94a3b8',
                padding: '3px 0', fontWeight: '600', letterSpacing: '0.02em',
              }}>
                {d}
              </div>
            ))}

            {/* Leading empty cells */}
            {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}

            {/* Day buttons */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const future  = isFuture(day);
              const sel     = isSelected(day);
              const tod     = isToday(day);
              return (
                <button
                  key={day}
                  disabled={future}
                  onClick={() => handleDayClick(day)}
                  style={{
                    border: 'none', borderRadius: '4px', padding: '5px 0',
                    textAlign: 'center', fontSize: '12px',
                    cursor: future ? 'default' : 'pointer',
                    background: sel ? '#4945ff' : (tod && !sel) ? '#eef2ff' : 'transparent',
                    color: sel ? '#fff' : future ? '#cbd5e1' : tod ? '#4945ff' : '#334155',
                    fontWeight: (sel || tod) ? '600' : 'normal',
                    outline: 'none', transition: 'background 0.1s',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #f1f5f9', paddingTop: '10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Showing last 3 months</span>
            <button
              onClick={() => { onSelect(new Date(today)); setOpen(false); }}
              style={{
                border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 10px',
                background: '#f8fafc', cursor: 'pointer', fontSize: '11px',
                color: '#475569', fontWeight: '500',
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── LogViewer ─────────────────────────────────────────────────────────────────

const LogViewer = ({ canDownload }) => {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(today);
  const [logs,         setLogs]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [hasFile,      setHasFile]      = useState(true);
  const [totalLines,   setTotalLines]   = useState(0);
  const [truncated,    setTruncated]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  const logAreaRef = useRef(null);
  const { get }    = useFetchClient();

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchLogs = useCallback(
    async (date) => {
      setLoading(true);
      try {
        const res = await get(`/${pluginId}/logs?date=${toDateStr(date)}`);
        setLogs(res.data.lines       || []);
        setHasFile(res.data.exists);
        setTotalLines(res.data.totalLines || 0);
        setTruncated(res.data.truncated   || false);
      } catch {
        setLogs([]);
        setHasFile(false);
      } finally {
        setLoading(false);
      }
    },
    [get]
  );

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate, fetchLogs]);

  // Auto-scroll to newest entry on load
  useEffect(() => {
    if (!loading && logAreaRef.current && logs.length > 0) {
      logAreaRef.current.scrollTop = logAreaRef.current.scrollHeight;
    }
  }, [loading, logs]);

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await get(`/${pluginId}/logs/download?date=${toDateStr(selectedDate)}`);
      if (!res.data.exists || !res.data.content) return;

      const blob = new Blob([res.data.content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = res.data.filename || `strapi_log_${toDateStr(selectedDate)}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent — user can retry
    } finally {
      setDownloading(false);
    }
  };

  // ── Search filter ────────────────────────────────────────────────────────

  const trimmedQuery  = searchQuery.trim().toLowerCase();
  const filteredLogs  = trimmedQuery ? logs.filter((raw) => raw.toLowerCase().includes(trimmedQuery)) : logs;
  const isSearching   = trimmedQuery.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Horizontal filter bar ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '12px', flexWrap: 'wrap',
      }}>

        {/* Date picker */}
        <CompactDatePicker
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          today={today}
        />

        {/* Search box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs…"
            style={{
              border: '1px solid #e2e8f0', borderRadius: '6px',
              padding: '6px 28px 6px 12px', fontSize: '13px',
              color: '#1e293b', background: '#fff', outline: 'none',
              width: '220px', fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title="Clear search"
              style={{
                position: 'absolute', right: '8px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '16px', color: '#94a3b8', lineHeight: 1, padding: '0',
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Line count badge */}
        {!loading && hasFile && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {isSearching
              ? (filteredLogs.length.toLocaleString() + ' of ' + logs.length.toLocaleString() + ' lines')
              : truncated
                ? ('showing last ' + logs.length.toLocaleString() + ' of ' + totalLines.toLocaleString() + ' lines')
                : (logs.length.toLocaleString() + ' line' + (logs.length !== 1 ? 's' : ''))}
          </span>
        )}

        {/* Level legend — pushed to right, before action buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['fatal', 'error', 'warn', 'info', 'debug', 'trace'].map((lvl) => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: LEVEL_COLORS[lvl], display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lvl}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '18px', background: '#e2e8f0' }} />

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(selectedDate)}
            disabled={loading}
            style={{
              border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 14px',
              cursor: loading ? 'default' : 'pointer', fontSize: '13px',
              background: '#fff', color: '#475569', opacity: loading ? 0.6 : 1,
            }}
          >
            &#8635; Refresh
          </button>

          {/* Download */}
          {canDownload ? (
            <button
              onClick={handleDownload}
              disabled={downloading || !hasFile || loading}
              style={{
                border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 14px',
                cursor: (downloading || !hasFile || loading) ? 'default' : 'pointer',
                fontSize: '13px',
                background: (!hasFile || loading) ? '#f8fafc' : '#fff',
                color: '#475569',
                opacity: (!hasFile || loading) ? 0.5 : 1,
              }}
            >
              {downloading ? '…' : '↓ Download'}
            </button>
          ) : (
            <button
              disabled
              title="You don't have permission to download log files"
              style={{
                border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 14px',
                cursor: 'not-allowed', fontSize: '13px',
                background: '#f8fafc', color: '#94a3b8',
              }}
            >
              Download
            </button>
          )}
        </div>
      </div>

      {/* ── Log area ─────────────────────────────────────────────────────── */}
      <div
        ref={logAreaRef}
        style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '12px 16px',
          height: 'calc(100vh - 240px)',
          minHeight: '400px',
          overflowY: 'auto',
          fontFamily: '"SFMono-Regular","Consolas","Liberation Mono","Menlo",monospace',
          fontSize: '12px',
          lineHeight: '1.7',
        }}
      >
        {/* Truncation notice — sticky top of log area */}
        {!loading && truncated && (
          <div style={{
            color: '#fbbf24', fontSize: '11px', marginBottom: '10px',
            paddingBottom: '10px', borderBottom: '1px solid #1e293b',
          }}>
            File too large — showing the last {logs.length.toLocaleString()} of {totalLines.toLocaleString()} lines.
            Use Download for the full file.
          </div>
        )}

        {loading && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>Loading logs…</div>
        )}

        {!loading && !hasFile && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>
            No log file found for {toDateStr(selectedDate)}
          </div>
        )}

        {!loading && hasFile && logs.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>
            Log file is empty
          </div>
        )}

        {!loading && hasFile && logs.length > 0 && filteredLogs.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>
            No entries match &ldquo;{searchQuery}&rdquo;
          </div>
        )}

        {/* Structured log lines */}
        {!loading && filteredLogs.map((raw, i) => {
          const { timestamp, level, message } = parseLogLine(raw);
          const hasError = level === 'error' || level === 'fatal';

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '1px 0',
                paddingLeft: hasError ? '8px' : '0',
                borderLeft: hasError
                  ? `2px solid ${LEVEL_COLORS[level]}`
                  : '2px solid transparent',
                background: LEVEL_BG[level],
              }}
            >
              {/* Timestamp */}
              <span style={{
                color: '#475569', fontSize: '11px', flexShrink: 0,
                minWidth: '152px', paddingTop: '1px', userSelect: 'none',
              }}>
                {timestamp || '—'}
              </span>

              {/* Level badge */}
              <span style={{
                ...LEVEL_BADGE[level],
                fontSize: '10px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '3px',
                flexShrink: 0,
                alignSelf: 'flex-start',
                marginTop: '1px',
                minWidth: '38px',
                textAlign: 'center',
              }}>
                {level}
              </span>

              {/* Message */}
              <span style={{
                color: LEVEL_COLORS[level],
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}>
                {message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogViewer;
