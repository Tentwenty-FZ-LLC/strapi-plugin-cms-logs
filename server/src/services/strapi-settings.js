'use strict';

const STORE_KEY = 'settings';

const getStore = (strapi) =>
  strapi.store({ type: 'plugin', name: 'cms-logs' });

module.exports = ({ strapi }) => ({
  async getSettings() {
    let db = {};
    try {
      db = (await getStore(strapi).get({ key: STORE_KEY })) || {};
    } catch {}

    const defaultMax    = 1000;
    const defaultMonths = 3;

    return {
      // Raw DB values — null means not overridden
      maxLines:   db.maxLines   ?? null,
      monthsBack: db.monthsBack ?? null,

      // Effective values the system actually uses (DB → default)
      effectiveMaxLines:   db.maxLines   || defaultMax,
      effectiveMonthsBack: db.monthsBack || defaultMonths,

      // For the UI source badges
      sources: {
        maxLines:   db.maxLines   ? 'db' : 'default',
        monthsBack: db.monthsBack ? 'db' : 'default',
      },
    };
  },

  async saveSettings({ maxLines, monthsBack }) {
    const store = getStore(strapi);
    let existing = {};
    try {
      existing = (await store.get({ key: STORE_KEY })) || {};
    } catch {}

    const updated = { ...existing };

    if (maxLines !== undefined) {
      const n = parseInt(maxLines, 10);
      updated.maxLines = !isNaN(n) && n >= 100 && n <= 10000 ? n : null;
    }
    if (monthsBack !== undefined) {
      const n = parseInt(monthsBack, 10);
      updated.monthsBack = !isNaN(n) && n >= 1 && n <= 12 ? n : null;
    }

    await store.set({ key: STORE_KEY, value: updated });
    return this.getSettings();
  },

  // Used by strapi-logs service — log dir comes from env/default only (no DB override)
  getLogDir() {
    return process.env.LOG_DIR || 'logs';
  },

  async getMaxLines() {
    let db = {};
    try {
      db = (await getStore(strapi).get({ key: STORE_KEY })) || {};
    } catch {}
    return db.maxLines || 1000;
  },
});
