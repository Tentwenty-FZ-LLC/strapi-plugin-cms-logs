'use strict';

const logsService = 'plugin::cms-logs.strapi-logs';

module.exports = ({ strapi }) => ({
  async getLogs(ctx) {
    const { date } = ctx.query;

    if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      return ctx.badRequest('Invalid date format. Expected YYYY.MM.DD');
    }

    try {
      return await strapi.service(logsService).getLogs({ date });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  async downloadLog(ctx) {
    const { date } = ctx.query;

    if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      return ctx.badRequest('Invalid date format. Expected YYYY.MM.DD');
    }

    try {
      return await strapi.service(logsService).downloadLog({ date });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
});
