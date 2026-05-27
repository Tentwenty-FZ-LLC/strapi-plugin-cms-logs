'use strict';

const logsService = 'plugin::cms-logs.strapi-logs';

// Allowed pod name characters: word chars, hyphens, dots.
// Matches the pod prefix written by the logger (process.env.POD_NAME).
const POD_RE = /^[\w.-]+$/;

module.exports = ({ strapi }) => ({
  // ── Pod discovery ───────────────────────────────────────────────────────────
  // GET /pods?date=YYYY.MM.DD
  // Returns the list of pods that have log files for the given date (or all
  // dates when `date` is omitted), plus the name of the current pod from the
  // POD_NAME environment variable.
  async getPods(ctx) {
    const { date } = ctx.query;

    if (date && !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      return ctx.badRequest('Invalid date format. Expected YYYY.MM.DD');
    }

    try {
      return await strapi.service(logsService).getPods({ date });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  // ── Log viewer ──────────────────────────────────────────────────────────────
  // GET /logs?date=YYYY.MM.DD[&pod=<name>]
  async getLogs(ctx) {
    const { date, pod } = ctx.query;

    if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      return ctx.badRequest('Invalid date format. Expected YYYY.MM.DD');
    }
    if (pod && !POD_RE.test(pod)) {
      return ctx.badRequest('Invalid pod name');
    }

    try {
      return await strapi.service(logsService).getLogs({ date, pod: pod || null });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  // ── Download ────────────────────────────────────────────────────────────────
  // GET /logs/download?date=YYYY.MM.DD[&pod=<name>]
  async downloadLog(ctx) {
    const { date, pod } = ctx.query;

    if (!date || !/^\d{4}\.\d{2}\.\d{2}$/.test(date)) {
      return ctx.badRequest('Invalid date format. Expected YYYY.MM.DD');
    }
    if (pod && !POD_RE.test(pod)) {
      return ctx.badRequest('Invalid pod name');
    }

    try {
      return await strapi.service(logsService).downloadLog({ date, pod: pod || null });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
});
