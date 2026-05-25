'use strict';

const settingsService = 'plugin::cms-logs.strapi-settings';

module.exports = ({ strapi }) => ({
  async getSettings(ctx) {
    try {
      return await strapi.service(settingsService).getSettings();
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  async saveSettings(ctx) {
    const { logDir, maxLines } = ctx.request.body ?? {};

    // Basic server-side validation
    if (logDir !== undefined && logDir !== null && typeof logDir !== 'string') {
      return ctx.badRequest('logDir must be a string');
    }
    if (logDir && (logDir.includes('\0') || logDir.includes('../'))) {
      return ctx.badRequest('logDir contains invalid characters');
    }
    if (maxLines !== undefined && maxLines !== null) {
      const n = parseInt(maxLines, 10);
      if (isNaN(n) || n < 100 || n > 10000) {
        return ctx.badRequest('maxLines must be an integer between 100 and 10000');
      }
    }

    try {
      return await strapi.service(settingsService).saveSettings({ logDir, maxLines });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
});
