import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import { colorScheme as nativeWindColorScheme } from 'nativewind';
import SecureStorage from '../utils/secureStorage';

export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  isDarkMode: boolean;
  isReady: boolean;
  setDarkModePreference: (enabled: boolean) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  clearUserPreference: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemScheme = (): ColorScheme =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getSystemScheme());
  const [isReady, setIsReady] = useState(false);
  const [hasUserPreference, setHasUserPreference] = useState(false);
  const isMountedRef = useRef(true);

  const applyScheme = useCallback(
    async (scheme: ColorScheme | 'system', options: { persist?: boolean; userDefined?: boolean } = {}) => {
      const nextScheme = scheme === 'system' ? getSystemScheme() : scheme;
      setColorScheme(nextScheme);

      if (options.userDefined !== undefined) {
        setHasUserPreference(options.userDefined);
      }

      try {
        nativeWindColorScheme.set(scheme);
      } catch (error) {
        console.warn('Failed to apply NativeWind color scheme', error);
      }

      if (options.persist) {
        try {
          const current = (await SecureStorage.getUserPreferences()) ?? {};

          if (options.userDefined) {
            await SecureStorage.storeUserPreferences({
              ...current,
              theme: scheme === 'system' ? nextScheme : scheme,
              darkMode: scheme === 'system' ? nextScheme === 'dark' : scheme === 'dark',
            });
          } else {
            delete current.theme;
            delete current.darkMode;
            await SecureStorage.storeUserPreferences(current);
          }
        } catch (error) {
          console.warn('Failed to store theme preference', error);
          throw error;
        }
      }
    },
    []
  );

  // Load stored preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const preferences = await SecureStorage.getUserPreferences();
        if (!isMountedRef.current) {
          return;
        }
        if (preferences?.theme) {
          const theme = preferences.theme === 'dark' ? 'dark' : 'light';
          await applyScheme(theme, { userDefined: true });
        } else if (typeof preferences?.darkMode === 'boolean') {
          const theme = preferences.darkMode ? 'dark' : 'light';
          await applyScheme(theme, { userDefined: true });
        } else {
          await applyScheme('system', { userDefined: false });
        }
      } catch (error) {
        console.warn('Failed to load theme preference', error);
        await applyScheme('system', { userDefined: false });
      } finally {
        if (isMountedRef.current) {
          setIsReady(true);
        }
      }
    };

    loadPreference();

    return () => {
      isMountedRef.current = false;
    };
  }, [applyScheme]);

  // Listen to system theme changes when user hasn't set a preference
  useEffect(() => {
    if (hasUserPreference) {
      return;
    }

    type AppearanceListener = Parameters<typeof Appearance.addChangeListener>[0];
    const listener: AppearanceListener = ({ colorScheme: scheme }) => {
      if (!scheme) {
        return;
      }
      applyScheme(scheme === 'dark' ? 'dark' : 'light', { userDefined: false });
    };

    const subscription = Appearance.addChangeListener(listener);
    return () => subscription.remove();
  }, [applyScheme, hasUserPreference]);

  const setDarkModePreference = useCallback(
    async (enabled: boolean) => {
      await applyScheme(enabled ? 'dark' : 'light', {
        persist: true,
        userDefined: true,
      });
    },
    [applyScheme]
  );

  const toggleDarkMode = useCallback(async () => {
    const nextScheme: ColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
    await setDarkModePreference(nextScheme === 'dark');
  }, [colorScheme, setDarkModePreference]);

  const clearUserPreference = useCallback(async () => {
    await applyScheme('system', { persist: true, userDefined: false });
  }, [applyScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      isDarkMode: colorScheme === 'dark',
      isReady,
      setDarkModePreference,
      toggleDarkMode,
      clearUserPreference,
    }),
    [colorScheme, isReady, setDarkModePreference, toggleDarkMode, clearUserPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
