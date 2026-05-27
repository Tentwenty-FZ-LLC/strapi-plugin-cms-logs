'use strict';

const fs   = require('fs');
const path = require('path');

// Matches pod-prefixed log files: <pod>_strapi_log_YYYY.MM.DD.log
// Lazy (.+?) is intentional — pod names can themselves contain underscores,
// and the literal `_strapi_log_` separator is always present and distinctive.
const POD_FILE_RE = /^(.+?)_strapi_log_(\d{4}\.\d{2}\.\d{2})\.log$/;

module.exports = ({ strapi }) => {
  const settings = () => strapi.service('plugin::cms-logs.strapi-settings');

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Resolve the log filename for a given date + optional pod prefix.
   *   pod = null → strapi_log_YYYY.MM.DD.log   (single-pod / classic)
   *   pod = "pod-1" → pod-1_strapi_log_YYYY.MM.DD.log
   */
  const logFilename = (date, pod) =>
    pod ? `${pod}_strapi_log_${date}.log` : `strapi_log_${date}.log`;

  /**
   * Scan the log root for year-subdirectories and extract unique pod prefixes
   * from filenames that match the pod-file pattern.
   *
   * When `date` is provided only the matching year directory is scanned, and
   * only files for that date are considered (fast path for the UI).
   * When `date` is omitted all strapi_YYYY directories are scanned.
   */
  const scanPods = (logBase, date) => {
    const root = path.join(process.cwd(), logBase);
    if (!fs.existsSync(root)) return [];

    const dirsToScan = [];

    if (date) {
      const year = date.split('.')[0];
      dirsToScan.push(path.join(root, `strapi_${year}`));
    } else {
      try {
        fs.readdirSync(root).forEach((entry) => {
          if (/^strapi_\d{4}$/.test(entry)) {
            dirsToScan.push(path.join(root, entry));
          }
        });
      } catch {
        /* ignore — root not readable */
      }
    }

    const pods = new Set();

    for (const dir of dirsToScan) {
      if (!fs.existsSync(dir)) continue;
      try {
        fs.readdirSync(dir).forEach((file) => {
          const m = POD_FILE_RE.exec(file);
          if (!m) return;
          // When filtering by date, only include files for that exact date
          if (date && m[2] !== date) return;
          pods.add(m[1]);
        });
      } catch {
        /* ignore — dir not readable */
      }
    }

    return [...pods].sort();
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    /**
     * Returns:
     *   { pods: string[], currentPod: string | null }
     *
     * `pods` — sorted list of pod names that have at least one log file on the
     *   requested date (or ever, when no date is given).
     * `currentPod` — value of the POD_NAME env var on this process (null when
     *   not running in a multi-pod setup).
     */
    async getPods({ date } = {}) {
      const logBase = await settings().getLogDir();
      const pods    = scanPods(logBase, date || null);
      return {
        pods,
        currentPod: process.env.POD_NAME || null,
      };
    },

    /**
     * Read log lines for a given date, optionally scoped to a pod.
     * Returns up to `maxLines` lines (tail-truncated when the file is larger).
     */
    async getLogs({ date, pod }) {
      const [logBase, maxLines] = await Promise.all([
        settings().getLogDir(),
        settings().getMaxLines(),
      ]);

      const year    = date.split('.')[0];
      const logDir  = path.join(process.cwd(), logBase, `strapi_${year}`);
      const logFile = path.join(logDir, logFilename(date, pod));

      if (!fs.existsSync(logFile)) {
        return { lines: [], exists: false, totalLines: 0, truncated: false };
      }

      const content  = fs.readFileSync(logFile, 'utf8');
      const allLines = content.split('\n').filter((l) => l.trim() !== '');
      const truncated = allLines.length > maxLines;

      return {
        lines:      truncated ? allLines.slice(-maxLines) : allLines,
        exists:     true,
        totalLines: allLines.length,
        truncated,
      };
    },

    /**
     * Return the raw file content for download, optionally scoped to a pod.
     * The returned `filename` reflects the exact on-disk name so the browser
     * saves the file with the correct name.
     */
    async downloadLog({ date, pod }) {
      const logBase  = await settings().getLogDir();

      const year     = date.split('.')[0];
      const logDir   = path.join(process.cwd(), logBase, `strapi_${year}`);
      const filename = logFilename(date, pod);
      const logFile  = path.join(logDir, filename);

      if (!fs.existsSync(logFile)) {
        return { content: null, exists: false, filename: null };
      }

      const content = fs.readFileSync(logFile, 'utf8');
      return { content, exists: true, filename };
    },
  };
};
