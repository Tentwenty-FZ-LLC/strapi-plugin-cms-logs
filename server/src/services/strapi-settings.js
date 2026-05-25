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

    const envLogDir   = process.env.LOG_DIR || null;
    const defaultDir  = 'public/logs';
    const defaultMax  = 1000;

    return {
      // Raw DB values — null means not overridden in DB
      logDir:   db.logDir   ?? null,
      maxLines: db.maxLines ?? null,

      // What the system actually uses right now (DB → env → default)
      effectiveLogDir:   db.logDir   || envLogDir || defaultDir,
      effectiveMaxLines: db.maxLines || defaultMax,

      // For display: where each value comes from
      sources: {
        logDir:   db.logDir   ? 'db'  : (envLogDir ? 'env' : 'default'),
        maxLines: db.maxLines ? 'db'  : 'default',
      },

      // Pass the env value through so the UI can show it
      envLogDir,
    };
  },

  async saveSettings({ logDir, maxLines }) {
    const store = getStore(strapi);
    let existing = {};
    try {
      existing = (await store.get({ key: STORE_KEY })) || {};
    } catch {}

    const updated = { ...existing };

    // null / empty string means "remove override, fall back to env/default"
    if (logDir !== undefined) {
      updated.logDir = logDir?.trim() || null;
    }
    if (maxLines !== undefined) {
      const n = parseInt(maxLines, 10);
      updated.maxLines = !isNaN(n) && n >= 100 && n <= 10000 ? n : null;
    }

    await store.set({ key: STORE_KEY, value: updated });
    return this.getSettings();
  },

  // Convenience helpers used by strapi-logs service
  async getLogDir() {
    let db = {};
    try {
      db = (await getStore(strapi).get({ key: STORE_KEY })) || {};
    } catch {}
    return db.logDir || process.env.LOG_DIR || 'public/logs';
  },

  async getMaxLines() {
    let db = {};
    try {
      db = (await getStore(strapi).get({ key: STORE_KEY })) || {};
    } catch {}
    return db.maxLines || 1000;
  },
});
