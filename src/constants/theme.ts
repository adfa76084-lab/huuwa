export const Colors = {
  light: {
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    secondary: '#00CEC9',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceVariant: '#F0F0F5',
    text: '#1A1A2E',
    textSecondary: '#6C757D',
    textTertiary: '#ADB5BD',
    border: '#E9ECEF',
    error: '#E74C3C',
    success: '#27AE60',
    warning: '#F39C12',
    like: '#E74C3C',
    overlay: 'rgba(0, 0, 0, 0.5)',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarInactive: '#ADB5BD',
  },
  dark: {
    primary: '#A29BFE',
    primaryLight: '#6C5CE7',
    secondary: '#00CEC9',
    background: '#0D1117',
    surface: '#161B22',
    surfaceVariant: '#21262D',
    text: '#F0F6FC',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    border: '#30363D',
    error: '#F85149',
    success: '#3FB950',
    warning: '#D29922',
    like: '#F85149',
    overlay: 'rgba(0, 0, 0, 0.7)',
    card: '#161B22',
    tabBar: '#161B22',
    tabBarInactive: '#6E7681',
  },
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
