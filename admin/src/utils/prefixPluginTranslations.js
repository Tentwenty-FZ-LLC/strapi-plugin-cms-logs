const prefixPluginTranslations = (trad, pluginId) => {
  if (!trad || typeof trad !== 'object') return {};
  return Object.fromEntries(
    Object.entries(trad).map(([key, value]) => [`${pluginId}.${key}`, value])
  );
};

export default prefixPluginTranslations;
