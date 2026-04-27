import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

// Production ad unit IDs
// NOTE: interstitial + appOpen IDs are placeholders — replace with real values once created in AdMob
const PROD = {
  banner: Platform.select({
    ios: 'ca-app-pub-6043508972278040/9914951444',
    android: 'ca-app-pub-6043508972278040/8428291561',
    default: '',
  }),
  native: Platform.select({
    ios: 'ca-app-pub-6043508972278040/1955428738',
    android: 'ca-app-pub-6043508972278040/9794390309',
    default: '',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-6043508972278040/1825009751',
    android: 'ca-app-pub-6043508972278040/4610955198',
    default: '',
  }),
  appOpen: Platform.select({
    ios: 'ca-app-pub-6043508972278040/1416461979',
    android: 'ca-app-pub-6043508972278040/1190584935',
    default: '',
  }),
};

// In development, always use Google's test ad unit IDs to avoid policy violations.
// Switch to PROD automatically when building for release (EAS production profile).
export const AdUnitIds = {
  banner: IS_DEV ? TestIds.BANNER : PROD.banner,
  native: IS_DEV ? TestIds.NATIVE : PROD.native,
  interstitial: IS_DEV || !PROD.interstitial ? TestIds.INTERSTITIAL : PROD.interstitial,
  appOpen: IS_DEV || !PROD.appOpen ? TestIds.APP_OPEN : PROD.appOpen,
};

/** How often to insert a native ad in the home feed (every N posts). */
export const FEED_AD_INTERVAL = 4;

/** Minimum time between interstitial ads (ms) — prevents ad fatigue */
export const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;

/** Minimum time between app-open ads (ms) */
export const APP_OPEN_COOLDOWN_MS = 12 * 60 * 60 * 1000;
