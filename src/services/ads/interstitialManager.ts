import {
  InterstitialAd,
  AppOpenAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdUnitIds, INTERSTITIAL_COOLDOWN_MS, APP_OPEN_COOLDOWN_MS } from '@/constants/ads';

const APP_OPEN_LAST_SHOWN_KEY = 'huuwa-app-open-last-shown';

let interstitialAd: InterstitialAd | null = null;
let interstitialLoaded = false;
let lastInterstitialShownAt = 0;

let appOpenAd: AppOpenAd | null = null;
let appOpenLoaded = false;
let lastAppOpenShownAt = 0;
let appOpenHydrated = false;

async function hydrateAppOpenTimestamp() {
  if (appOpenHydrated) return;
  try {
    const stored = await AsyncStorage.getItem(APP_OPEN_LAST_SHOWN_KEY);
    if (stored) lastAppOpenShownAt = parseInt(stored, 10) || 0;
  } catch {
    // ignore
  } finally {
    appOpenHydrated = true;
  }
}

async function persistAppOpenTimestamp() {
  try {
    await AsyncStorage.setItem(APP_OPEN_LAST_SHOWN_KEY, String(lastAppOpenShownAt));
  } catch {
    // ignore
  }
}

function createInterstitial() {
  const ad = InterstitialAd.createForAdRequest(AdUnitIds.interstitial, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialLoaded = false;
    // Preload the next one
    createInterstitial();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });
  ad.load();
  interstitialAd = ad;
}

function createAppOpen() {
  const ad = AppOpenAd.createForAdRequest(AdUnitIds.appOpen, {
    requestNonPersonalizedAdsOnly: false,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    appOpenLoaded = true;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    appOpenLoaded = false;
    createAppOpen();
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    appOpenLoaded = false;
  });
  ad.load();
  appOpenAd = ad;
}

/** Initialize ad preloading — call once on app startup */
export function preloadAds(): void {
  if (!interstitialAd) createInterstitial();
  if (!appOpenAd) createAppOpen();
}

/**
 * Show an interstitial ad if ready and cooldown elapsed.
 * Returns a promise that resolves when the ad is closed (or immediately if not shown).
 * Fail-open: if the ad isn't ready, resolve immediately so the user's action isn't blocked.
 */
export function showInterstitial(): Promise<void> {
  return new Promise((resolve) => {
    if (!interstitialAd || !interstitialLoaded) {
      // Preload for next time
      if (!interstitialAd) createInterstitial();
      resolve();
      return;
    }
    if (Date.now() - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) {
      resolve();
      return;
    }

    const onClosed = () => {
      lastInterstitialShownAt = Date.now();
      resolve();
    };

    const unsubClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClosed();
      onClosed();
    });
    try {
      interstitialAd.show();
    } catch {
      unsubClosed();
      resolve();
    }
  });
}

/** Show an app-open ad if ready and cooldown elapsed (persisted). Fail-open. */
export async function showAppOpenAd(): Promise<void> {
  await hydrateAppOpenTimestamp();
  return new Promise((resolve) => {
    if (Date.now() - lastAppOpenShownAt < APP_OPEN_COOLDOWN_MS) {
      resolve();
      return;
    }
    if (!appOpenAd || !appOpenLoaded) {
      if (!appOpenAd) createAppOpen();
      resolve();
      return;
    }

    const unsubClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClosed();
      lastAppOpenShownAt = Date.now();
      persistAppOpenTimestamp();
      resolve();
    });
    try {
      appOpenAd.show();
    } catch {
      unsubClosed();
      resolve();
    }
  });
}
