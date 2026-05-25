import pluginPkg from '../../package.json';

// Handles all naming conventions:
//   strapi-plugin-cms-logs          → cms-logs
//   @scope/plugin-cms-logs          → cms-logs
//   @scope/strapi-plugin-cms-logs   → cms-logs  (this package)
const pluginId = pluginPkg.name.replace(/^(?:@[^/]+\/)?(?:strapi-)?plugin-/i, '');

export default pluginId;
