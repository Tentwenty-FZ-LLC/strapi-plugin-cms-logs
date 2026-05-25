const perm = (action) => ({
  name: 'plugin::cms-logs.hasPermission',
  config: { action },
});

module.exports = {
  type: 'admin',
  routes: [
    // ── Log viewer ────────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/logs',
      handler: 'strapi-logs.getLogs',
      config: { policies: [perm('plugin::cms-logs.read')] },
    },
    {
      method: 'GET',
      path: '/logs/download',
      handler: 'strapi-logs.downloadLog',
      config: { policies: [perm('plugin::cms-logs.download')] },
    },

    // ── Settings ──────────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/settings',
      handler: 'strapi-settings.getSettings',
      config: { policies: [perm('plugin::cms-logs.configure')] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'strapi-settings.saveSettings',
      config: { policies: [perm('plugin::cms-logs.configure')] },
    },
  ],
};
