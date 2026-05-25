import prefixPluginTranslations from './utils/prefixPluginTranslations';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import Initializer from './components/Initializer';
import { File } from '@strapi/icons';

const name = pluginPkg.strapi.name;

export default {
  async register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: File,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'CMS Logs',
      },
      // Hides the sidebar link entirely for roles that lack the read permission.
      permissions: [{ action: 'plugin::cms-logs.read', subject: null }],
      Component: async () => {
        const component = await import('./pages/App/index.jsx');
        return component;
      },
    });

    // addSettingsLink is the current v5 API (createSettingSection is deprecated/removed).
    // Passing an object as the first argument creates a dedicated section in the Settings sidebar.
    app.addSettingsLink(
      { id: pluginId, intlLabel: { id: `${pluginId}.plugin.name`, defaultMessage: 'CMS Logs' } },
      {
        intlLabel: { id: `${pluginId}.settings.configuration`, defaultMessage: 'Configuration' },
        id: `${pluginId}.settings`,
        to: pluginId,   // Strapi prepends /settings/ — resolves to /settings/cms-logs
        Component: async () => import('./pages/Settings/index.jsx'),
        permissions: [{ action: 'plugin::cms-logs.configure', subject: null }],
      }
    );

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap() {},

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) =>
        import(`./translations/${locale}.json`)
          .then(({ default: data }) => ({
            data: prefixPluginTranslations(data, pluginId),
            locale,
          }))
          .catch(() => ({ data: {}, locale }))
      )
    );
    return importedTrads;
  },
};
