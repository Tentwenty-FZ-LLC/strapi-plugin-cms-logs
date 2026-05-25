'use strict';

const fs   = require('fs');
const path = require('path');

module.exports = ({ strapi }) => {
  const settings = () => strapi.service('plugin::cms-logs.strapi-settings');

  return {
    async getLogs({ date }) {
      const [logBase, maxLines] = await Promise.all([
        settings().getLogDir(),
        settings().getMaxLines(),
      ]);

      const year    = date.split('.')[0];
      const logDir  = path.join(process.cwd(), logBase, `strapi_${year}`);
      const logFile = path.join(logDir, `strapi_log_${date}.log`);

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

    async downloadLog({ date }) {
      const logBase = await settings().getLogDir();

      const year    = date.split('.')[0];
      const logDir  = path.join(process.cwd(), logBase, `strapi_${year}`);
      const logFile = path.join(logDir, `strapi_log_${date}.log`);

      if (!fs.existsSync(logFile)) {
        return { content: null, exists: false, filename: null };
      }

      const content = fs.readFileSync(logFile, 'utf8');
      return { content, exists: true, filename: `strapi_log_${date}.log` };
    },
  };
};
