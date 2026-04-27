import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from '@/constants/theme';
import { useUiStore } from '@/stores/uiStore';

export function useThemeColors(): ThemeColors {
  const systemScheme = useColorScheme();
  const themeMode = useUiStore((s) => s.themeMode);

  const scheme =
    themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  return Colors[scheme];
}
