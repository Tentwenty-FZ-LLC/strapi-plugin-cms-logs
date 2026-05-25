/**
 * parseLogLine
 *
 * Detects and parses multiple log formats into a normalised object:
 *   { timestamp, level, message, raw, format }
 *
 * Supported formats (tried in order):
 *  1. simple-node-logger  – [YYYY-MM-DD HH:mm:ss.SSS] LEVEL  message
 *  2. Pino pretty          – [HH:mm:ss.SSS] LEVEL (pid): message
 *  3. Pino JSON            – {"level":30,"time":…,"msg":"…"}
 *  4. Winston / generic    – YYYY-MM-DD HH:mm:ss [LEVEL]: message
 *  5. Fallback             – keyword-based level detection on raw text
 */

// Pino numeric → string
const PINO_LEVELS = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const LEVELS = 'TRACE|DEBUG|INFO|WARN|ERROR|FATAL';

// 1. simple-node-logger: [YYYY-MM-DD HH:mm:ss.SSS] LEVEL  message
const SNL_RE = new RegExp(
  `^\\[(\\d{4}-\\d{2}-\\d{2}[\\sT]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)\\]\\s+(${LEVELS})\\s*(.*)`,
  'is'
);

// 2. Pino pretty: [HH:mm:ss.SSS] LEVEL (pid): message
const PINO_PRETTY_RE = new RegExp(
  `^\\[(\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)\\]\\s+(${LEVELS})\\s+\\(\\d+\\):\\s*(.*)`,
  'is'
);

// 4. Winston / generic: 2026-05-25 10:23:45 [INFO]: msg  or  2026-05-25T10:23:45 INFO msg
const WINSTON_RE = new RegExp(
  `^(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)\\s+(?:\\[)?(${LEVELS})(?:\\])?\\s*:?\\s*(.*)`,
  'is'
);

const normalise = (lvl) => lvl.toLowerCase();

export const parseLogLine = (raw) => {
  // 1. simple-node-logger
  let m = raw.match(SNL_RE);
  if (m) {
    return { timestamp: m[1], level: normalise(m[2]), message: m[3].trim(), raw, format: 'snl' };
  }

  // 2. Pino pretty
  m = raw.match(PINO_PRETTY_RE);
  if (m) {
    return { timestamp: m[1], level: normalise(m[2]), message: m[3].trim(), raw, format: 'pino-pretty' };
  }

  // 3. Pino JSON
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      const level = PINO_LEVELS[obj.level] ?? 'info';
      const ts    = obj.time
        ? new Date(obj.time).toISOString().slice(0, 23).replace('T', ' ')
        : '';
      const parts = [obj.msg ?? obj.message ?? ''];
      if (obj.err?.message) parts.push(`— ${obj.err.message}`);
      return { timestamp: ts, level, message: parts.join(' '), raw, format: 'pino-json' };
    } catch {}
  }

  // 4. Winston / generic
  m = raw.match(WINSTON_RE);
  if (m) {
    return { timestamp: m[1], level: normalise(m[2]), message: m[3].trim(), raw, format: 'winston' };
  }

  // 5. Fallback — salvage any datetime present in the line, then keyword-scan for level.
  //    This handles continuation lines (stack traces), non-standard wrappers, etc.
  //    Full ISO-ish datetime: 2026-05-25 10:23:45  /  2026-05-25T10:23:45.123Z
  const GENERIC_DT_RE = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:\d{2})?)/;
  //    Bracketed time-only: [10:23:45] or [10:23:45.123]  (Pino-pretty without pid, etc.)
  const GENERIC_TM_RE = /\[(\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\]/;

  const dtMatch = raw.match(GENERIC_DT_RE);
  const tmMatch = dtMatch ? null : raw.match(GENERIC_TM_RE);
  const fallbackTs = dtMatch ? dtMatch[1] : (tmMatch ? tmMatch[1] : '');

  const l = raw.toLowerCase();
  const level =
    l.includes('fatal') ? 'fatal' :
    l.includes('error') ? 'error' :
    l.includes('warn')  ? 'warn'  :
    l.includes('debug') ? 'debug' :
    l.includes('trace') ? 'trace' :
    'info';

  return { timestamp: fallbackTs, level, message: raw, raw, format: 'unknown' };
};

// ── Styling constants shared across the UI ────────────────────────────────────

export const LEVEL_COLORS = {
  fatal: '#e11d48',
  error: '#f87171',
  warn:  '#fbbf24',
  info:  '#d1d5db',
  debug: '#6b7280',
  trace: '#475569',
};

export const LEVEL_BG = {
  fatal: 'rgba(225,29,72,0.12)',
  error: 'rgba(248,113,113,0.08)',
  warn:  'transparent',
  info:  'transparent',
  debug: 'transparent',
  trace: 'transparent',
};

export const LEVEL_BADGE = {
  fatal: { background: '#fecdd3', color: '#9f1239', border: '1px solid #fda4af' },
  error: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  warn:  { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  info:  { background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' },
  debug: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },
  trace: { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' },
};
