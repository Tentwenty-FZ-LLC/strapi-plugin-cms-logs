import { useEffect } from 'react';
import pluginId from '../../pluginId';

const Initializer = ({ setPlugin }) => {
  useEffect(() => {
    if (typeof setPlugin === 'function') {
      setPlugin(pluginId);
    }
  }, [setPlugin]);

  return null;
};

export default Initializer;
