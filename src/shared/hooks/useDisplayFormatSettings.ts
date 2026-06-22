import { useEffect, useState } from 'react';
import {
  DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT,
  STORAGE_PREFIX,
  type DisplayFormatSettings,
  getDisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';

function isDisplayFormatStorageKey(key: string | null): boolean {
  return key === null || key.startsWith(STORAGE_PREFIX);
}

export function useDisplayFormatSettings(): DisplayFormatSettings {
  const [settings, setSettings] = useState<DisplayFormatSettings>(() => (
    getDisplayFormatSettings()
  ));

  useEffect(() => {
    const reloadSettings = () => {
      setSettings(getDisplayFormatSettings());
    };

    const handleStorage = (event: StorageEvent) => {
      if (isDisplayFormatStorageKey(event.key)) {
        reloadSettings();
      }
    };

    window.addEventListener(DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT, reloadSettings);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT, reloadSettings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return settings;
}
