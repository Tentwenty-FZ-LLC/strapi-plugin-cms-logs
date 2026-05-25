'use strict';

/**
 * hasPermission policy
 *
 * Checks that the authenticated admin user holds the required permission action.
 * Attach to a route via its config block:
 *
 *   config: {
 *     policies: [
 *       { name: 'plugin::cms-logs.hasPermission', config: { action: 'plugin::cms-logs.read' } }
 *     ]
 *   }
 *
 * The action string must match one of the UIDs registered in bootstrap.js:
 *   'plugin::cms-logs.read'     — view logs in the browser
 *   'plugin::cms-logs.download' — download the raw log file
 *   'plugin::cms-logs.configure' — manage plugin settings
 */
module.exports = (policyContext, config, { strapi }) => {
  const { userAbility } = policyContext.state;

  if (!userAbility) {
    strapi.log.warn('[cms-logs] hasPermission: no userAbility on context state');
    return false;
  }

  return userAbility.can(config.action);
};
