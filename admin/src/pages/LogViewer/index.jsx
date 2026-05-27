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

// ── UI theme tokens ───────────────────────────────────────────────────────────
// Covers the filter bar, pod tab strip, and card chrome.
// The log area itself stays dark in both modes (terminal aesthetic).

const uiTokens = (isDark) => isDark ? {
  // Buttons & inputs
  btnBorder:        '1px solid #334155',
  btnBg:            '#1e293b',
  btnColor:         '#94a3b8',
  btnBgDisabled:    '#0f172a',
  inputBg:          '#1e293b',
  inputColor:       '#e2e8f0',
  // Calendar dropdown
  dropdownBg:       '#1e293b',
  dropdownBorder:   '1px solid #334155',
  dropdownShadow:   '0 4px 20px rgba(0,0,0,0.40)',
  calMonthColor:    '#e2e8f0',
  calDayHeader:     '#64748b',
  calDayNormal:     '#cbd5e1',
  calDayFuture:     '#334155',
  calTodayBg:       'rgba(73,69,255,0.18)',
  calTodayColor:    '#818cf8',
  calFooterBorder:  '#334155',
  calFooterLabel:   '#64748b',
  calTodayBtnBg:    '#0f172a',
  calTodayBtnColor: '#94a3b8',
  navBtnActive:     '#94a3b8',
  navBtnDisabled:   '#334155',
  // Misc
  divider:          '#334155',
  legendLabel:      '#64748b',
  lineCount:        '#64748b',
  clearBtn:         '#64748b',
  // Card / layout
  cardBorder:       '1px solid #334155',
  cardShadow:       'none',
  filterBarBg:      '#1a2540',
  filterBarBorder:  '1px solid #334155',
  rowBorder:        'rgba(255,255,255,0.05)',
  // Pod tab strip
  tabBarBg:         '#111827',
  tabBarBorder:     '1px solid #334155',
  activeTabBg:      'rgba(73,69,255,0.10)',
  activeTabColor:   '#818cf8',
  tabColor:         '#64748b',
  tabHoverBg:       'rgba(255,255,255,0.04)',
} : {
  // Buttons & inputs
  btnBorder:        '1px solid #e2e8f0',
  btnBg:            '#fff',
  btnColor:         '#475569',
  btnBgDisabled:    '#f8fafc',
  inputBg:          '#fff',
  inputColor:       '#1e293b',
  // Calendar dropdown
  dropdownBg:       '#fff',
  dropdownBorder:   '1px solid #e2e8f0',
  dropdownShadow:   '0 4px 20px rgba(0,0,0,0.10)',
  calMonthColor:    '#1e293b',
  calDayHeader:     '#94a3b8',
  calDayNormal:     '#334155',
  calDayFuture:     '#cbd5e1',
  calTodayBg:       '#eef2ff',
  calTodayColor:    '#4945ff',
  calFooterBorder:  '#f1f5f9',
  calFooterLabel:   '#94a3b8',
  calTodayBtnBg:    '#f8fafc',
  calTodayBtnColor: '#475569',
  navBtnActive:     '#475569',
  navBtnDisabled:   '#cbd5e1',
  // Misc
  divider:          '#e2e8f0',
  legendLabel:      '#64748b',
  lineCount:        '#94a3b8',
  clearBtn:         '#94a3b8',
  // Card / layout
  cardBorder:       '1px solid #e2e8f0',
  cardShadow:       '0 1px 4px rgba(0,0,0,0.06)',
  filterBarBg:      '#f8fafc',
  filterBarBorder:  '1px solid #e2e8f0',
  rowBorder:        'rgba(0,0,0,0.04)',
  // Pod tab strip
  tabBarBg:         '#f1f5f9',
  tabBarBorder:     '1px solid #e2e8f0',
  activeTabBg:      '#fff',
  activeTabColor:   '#4945ff',
  tabColor:         '#64748b',
  tabHoverBg:       'rgba(0,0,0,0.03)',
};

// ── CompactDatePicker ─────────────────────────────────────────────────────────

const CompactDatePicker = ({ selectedDate, onSelect, today, ui }) => {
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
    color: enabled ? ui.navBtnActive : ui.navBtnDisabled,
    fontSize: '18px', lineHeight: 1, borderRadius: '4px',
  });

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          border: ui.btnBorder, borderRadius: '6px',
          padding: '6px 12px', background: ui.btnBg, cursor: 'pointer',
          fontSize: '13px', color: ui.btnColor, fontWeight: '500',
          whiteSpace: 'nowrap', lineHeight: '1.4',
        }}
      >
        {triggerLabel}
        <span style={{ fontSize: '9px', color: ui.clearBtn, marginLeft: '2px' }}>▾</span>
      </button>

      {/* ── Dropdown calendar ──────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: ui.dropdownBg, border: ui.dropdownBorder, borderRadius: '8px',
          boxShadow: ui.dropdownShadow, padding: '12px',
          zIndex: 200, width: '240px',
        }}>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button style={navBtnStyle(canPrev)} disabled={!canPrev} onClick={() => navigate(-1)} aria-label="Previous month">‹</button>
            <span style={{ fontWeight: '600', fontSize: '13px', color: ui.calMonthColor }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button style={navBtnStyle(canNext)} disabled={!canNext} onClick={() => navigate(1)} aria-label="Next month">›</button>
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '10px' }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '10px', color: ui.calDayHeader,
                padding: '3px 0', fontWeight: '600', letterSpacing: '0.02em',
              }}>
                {d}
              </div>
            ))}

            {/* Leading empty cells */}
            {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}

            {/* Day buttons */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day    = i + 1;
              const future = isFuture(day);
              const sel    = isSelected(day);
              const tod    = isToday(day);
              return (
                <button
                  key={day}
                  disabled={future}
                  onClick={() => handleDayClick(day)}
                  style={{
                    border: 'none', borderRadius: '4px', padding: '5px 0',
                    textAlign: 'center', fontSize: '12px',
                    cursor: future ? 'default' : 'pointer',
                    background: sel ? '#4945ff' : (tod && !sel) ? ui.calTodayBg : 'transparent',
                    color: sel ? '#fff' : future ? ui.calDayFuture : tod ? ui.calTodayColor : ui.calDayNormal,
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
            borderTop: `1px solid ${ui.calFooterBorder}`, paddingTop: '10px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '10px', color: ui.calFooterLabel }}>Showing last 3 months</span>
            <button
              onClick={() => { onSelect(new Date(today)); setOpen(false); }}
              style={{
                border: ui.btnBorder, borderRadius: '4px', padding: '3px 10px',
                background: ui.calTodayBtnBg, cursor: 'pointer', fontSize: '11px',
                color: ui.calTodayBtnColor, fontWeight: '500',
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

// ── PodTabs ───────────────────────────────────────────────────────────────────
// Rendered only in multi-pod mode (when pods.length > 0).

const PodTabs = ({ pods, activePod, currentPod, onSelect, ui }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: ui.tabBarBg,
      borderBottom: ui.tabBarBorder,
      overflowX: 'auto',
      // Hide scrollbar but keep scrollability for many pods
      scrollbarWidth: 'none',
    }}>
      {pods.map((pod) => {
        const isActive  = pod === activePod;
        const isCurrent = pod === currentPod;

        return (
          <button
            key={pod}
            onClick={() => onSelect(pod)}
            onMouseEnter={() => setHovered(pod)}
            onMouseLeave={() => setHovered(null)}
            style={{
              border: 'none',
              borderBottom: isActive ? '2px solid #4945ff' : '2px solid transparent',
              background: isActive
                ? ui.activeTabBg
                : hovered === pod ? ui.tabHoverBg : 'transparent',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? ui.activeTabColor : ui.tabColor,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'background 0.1s',
              // Offset the 2px bottom border so active tab doesn't shift layout
              marginBottom: '-1px',
            }}
          >
            {/* Green dot for the pod running on this process */}
            {isCurrent && (
              <span
                title="This pod"
                style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#22c55e', display: 'inline-block', flexShrink: 0,
                }}
              />
            )}
            {pod}
          </button>
        );
      })}
    </div>
  );
};

// ── LogViewer ─────────────────────────────────────────────────────────────────

const LogViewer = ({ canDownload, isDark }) => {
  const ui    = uiTokens(isDark);
  const today = new Date();

  // ── State ─────────────────────────────────────────────────────────────────

  const [selectedDate, setSelectedDate] = useState(today);

  // Pod discovery: keyed by date string so we know when pods are fresh.
  // { date: string | null, pods: string[], currentPod: string | null }
  const [podData,   setPodData]   = useState({ date: null, pods: [], currentPod: null });
  const [activePod, setActivePod] = useState(null);

  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [hasFile,     setHasFile]     = useState(true);
  const [totalLines,  setTotalLines]  = useState(0);
  const [truncated,   setTruncated]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logAreaRef = useRef(null);
  const { get }    = useFetchClient();

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchLogs = useCallback(
    async (date, pod) => {
      setLoading(true);
      try {
        const podParam = pod ? `&pod=${encodeURIComponent(pod)}` : '';
        const res = await get(`/${pluginId}/logs?date=${toDateStr(date)}${podParam}`);
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

  const fetchPods = useCallback(
    async (date) => {
      try {
        const res = await get(`/${pluginId}/pods?date=${toDateStr(date)}`);
        const pods       = res.data.pods       || [];
        const currentPod = res.data.currentPod || null;
        setPodData({ date: toDateStr(date), pods, currentPod });
      } catch {
        setPodData({ date: toDateStr(date), pods: [], currentPod: null });
      }
    },
    [get]
  );

  // When the selected date changes, re-discover pods for that date.
  useEffect(() => {
    fetchPods(selectedDate);
  }, [selectedDate, fetchPods]);

  // When pod data arrives for the current date, resolve the active pod.
  // Keep the previous selection when the pod still exists in the new list;
  // otherwise prefer currentPod → first pod → null (single-pod mode).
  useEffect(() => {
    if (podData.date !== toDateStr(selectedDate)) return; // stale response, ignore

    const { pods, currentPod } = podData;

    if (pods.length === 0) {
      setActivePod(null);
      return;
    }

    setActivePod((prev) => {
      if (prev && pods.includes(prev)) return prev; // keep valid selection
      return (currentPod && pods.includes(currentPod)) ? currentPod : pods[0];
    });
  }, [podData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch logs whenever the resolved state is stable:
  // date matches the pod data's date (pods are fresh) AND activePod is settled.
  useEffect(() => {
    // Guard: don't fetch until pod discovery for this date has completed
    if (podData.date !== toDateStr(selectedDate)) return;
    fetchLogs(selectedDate, activePod);
  }, [selectedDate, activePod, podData.date, fetchLogs]);

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
      const podParam = activePod ? `&pod=${encodeURIComponent(activePod)}` : '';
      const res = await get(
        `/${pluginId}/logs/download?date=${toDateStr(selectedDate)}${podParam}`
      );
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

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredLogs = trimmedQuery ? logs.filter((raw) => raw.toLowerCase().includes(trimmedQuery)) : logs;
  const isSearching  = trimmedQuery.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  const multiPod = podData.pods.length > 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      border: ui.cardBorder, borderRadius: '8px',
      boxShadow: ui.cardShadow, overflow: 'hidden',
    }}>

      {/* ── Pod tabs — only visible in multi-pod deployments ─────────────── */}
      {multiPod && (
        <PodTabs
          pods={podData.pods}
          activePod={activePod}
          currentPod={podData.currentPod}
          onSelect={setActivePod}
          ui={ui}
        />
      )}

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px', flexWrap: 'wrap',
        background: ui.filterBarBg,
        borderBottom: ui.filterBarBorder,
      }}>

        {/* Date picker */}
        <CompactDatePicker
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          today={today}
          ui={ui}
        />

        {/* Search box */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs…"
            style={{
              border: ui.btnBorder, borderRadius: '6px',
              padding: '6px 28px 6px 12px', fontSize: '13px',
              color: ui.inputColor, background: ui.inputBg, outline: 'none',
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
                fontSize: '16px', color: ui.clearBtn, lineHeight: 1, padding: '0',
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Line count */}
        {!loading && hasFile && (
          <span style={{ fontSize: '12px', color: ui.lineCount }}>
            {isSearching
              ? (filteredLogs.length.toLocaleString() + ' of ' + logs.length.toLocaleString() + ' lines')
              : truncated
                ? ('showing last ' + logs.length.toLocaleString() + ' of ' + totalLines.toLocaleString() + ' lines')
                : (logs.length.toLocaleString() + ' line' + (logs.length !== 1 ? 's' : ''))}
          </span>
        )}

        {/* Level legend + action buttons — pushed to right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['fatal', 'error', 'warn', 'info', 'debug', 'trace'].map((lvl) => (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: LEVEL_COLORS[lvl], display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: '10px', color: ui.legendLabel, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {lvl}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '18px', background: ui.divider }} />

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(selectedDate, activePod)}
            disabled={loading}
            style={{
              border: ui.btnBorder, borderRadius: '6px', padding: '5px 14px',
              cursor: loading ? 'default' : 'pointer', fontSize: '13px',
              background: ui.btnBg, color: ui.btnColor, opacity: loading ? 0.6 : 1,
            }}
          >
            ↻ Refresh
          </button>

          {/* Download */}
          {canDownload ? (
            <button
              onClick={handleDownload}
              disabled={downloading || !hasFile || loading}
              style={{
                border: ui.btnBorder, borderRadius: '6px', padding: '5px 14px',
                cursor: (downloading || !hasFile || loading) ? 'default' : 'pointer',
                fontSize: '13px',
                background: (!hasFile || loading) ? ui.btnBgDisabled : ui.btnBg,
                color: ui.btnColor,
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
                border: ui.btnBorder, borderRadius: '6px', padding: '5px 14px',
                cursor: 'not-allowed', fontSize: '13px',
                background: ui.btnBgDisabled, color: ui.clearBtn,
              }}
            >
              🔒 Download
            </button>
          )}
        </div>
      </div>

      {/* ── Log area — intentionally dark in both modes ───────────────────── */}
      <div
        ref={logAreaRef}
        style={{
          background: '#0f172a',
          padding: '12px 16px',
          height: 'calc(100vh - 240px)',
          minHeight: '400px',
          overflowY: 'auto',
          fontFamily: '"SFMono-Regular","Consolas","Liberation Mono","Menlo",monospace',
          fontSize: '12px',
          lineHeight: '1.7',
        }}
      >
        {/* Truncation notice */}
        {!loading && truncated && (
          <div style={{
            color: '#fbbf24', fontSize: '11px', marginBottom: '10px',
            paddingBottom: '10px', borderBottom: '1px solid #1e293b',
          }}>
            ⚠ File too large — showing the last {logs.length.toLocaleString()} of {totalLines.toLocaleString()} lines.
            Use Download for the full file.
          </div>
        )}

        {loading && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>Loading logs…</div>
        )}

        {!loading && !hasFile && (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '80px' }}>
            No log file found for {toDateStr(selectedDate)}{activePod ? ` (${activePod})` : ''}
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
                padding: '3px 0',
                paddingLeft: hasError ? '8px' : '0',
                borderLeft: hasError
                  ? `2px solid ${LEVEL_COLORS[level]}`
                  : '2px solid transparent',
                borderBottom: `1px solid ${ui.rowBorder}`,
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
