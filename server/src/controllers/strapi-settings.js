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
    const { maxLines, monthsBack } = ctx.request.body ?? {};

    if (maxLines !== undefined && maxLines !== null) {
      const n = parseInt(maxLines, 10);
      if (isNaN(n) || n < 100 || n > 10000) {
        return ctx.badRequest('maxLines must be an integer between 100 and 10 000');
      }
    }
    if (monthsBack !== undefined && monthsBack !== null) {
      const n = parseInt(monthsBack, 10);
      if (isNaN(n) || n < 1 || n > 12) {
        return ctx.badRequest('monthsBack must be an integer between 1 and 12');
      }
    }

    try {
      return await strapi.service(settingsService).saveSettings({ maxLines, monthsBack });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
});
