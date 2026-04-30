import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds from 'react-native-google-mobile-ads';
import { setAudioModeAsync } from 'expo-audio';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { SessionProvider } from '@/contexts/SessionContext';
import { useUiStore } from '@/stores/uiStore';
import { Colors } from '@/constants/theme';
import { seedCategories } from '@/services/api/categoryService';
import { preloadAds, showAppOpenAd } from '@/services/ads/interstitialManager';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useUiStore((s) => s.themeMode);
  const scheme = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;
  const colors = Colors[scheme];

  useEffect(() => {
    // Allow voice playback even when the device is on silent mode (iOS).
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    seedCategories().catch(() => {});

    (async () => {
      // iOS 14.5+: request App Tracking Transparency before initializing ads
      // so AdMob can serve personalized ads when the user opts in.
      if (Platform.OS === 'ios') {
        try {
          await requestTrackingPermissionsAsync();
        } catch (e) {
          console.warn('[ATT] requestTrackingPermissions failed', e);
        }
      }

      try {
        await mobileAds().initialize();
        preloadAds();
        // Show app-open ad once per cold start (silent if cooldown or unloaded)
        setTimeout(() => {
          showAppOpenAd().catch(() => {});
        }, 1500);
      } catch (e) {
        console.warn('[AdMob] initialize failed', e);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="compose-tweet"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="create-thread"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="create-chat"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="create-group"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="create-openchat"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="create-short"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="image-viewer"
          options={{ presentation: 'modal', headerShown: false }}
        />
        </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
