'use strict';

module.exports = async ({ strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section:     'plugins',
      displayName: 'Read Logs',
      uid:         'read',
      pluginName:  'cms-logs',
    },
    {
      section:     'plugins',
      displayName: 'Download Logs',
      uid:         'download',
      pluginName:  'cms-logs',
    },
    {
      section:     'plugins',
      displayName: 'Configure Log Viewer',
      uid:         'configure',
      pluginName:  'cms-logs',
    },
  ]);
};
