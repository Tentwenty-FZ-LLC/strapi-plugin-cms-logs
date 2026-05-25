'use strict';

// Entry point for the published package (after `npm run build`).
// During plugin development the sdk-plugin resolves source via the
// "source" key in package.json exports — this file is only used by
// Strapi hosts that install the plugin from npm.
module.exports = require('./dist/admin/index.js');
