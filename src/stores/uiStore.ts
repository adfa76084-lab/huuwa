import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface NotificationPreferences {
  likes: boolean;
  replies: boolean;
  follows: boolean;
  threadReplies: boolean;
  chatMessages: boolean;
}

type OnlineStatusVisibility = 'everyone' | 'friends' | 'off';

interface PrivacyPreferences {
  privateAccount: boolean;
  showOnlineStatus: boolean;
  onlineStatusVisibility: OnlineStatusVisibility;
  allowDirectMessages: 'everyone' | 'followers' | 'nobody';
}

interface UiState {
  themeMode: ThemeMode;
  notificationPrefs: NotificationPreferences;
  privacyPrefs: PrivacyPreferences;
  chatSelectedTab: number;
  setThemeMode: (mode: ThemeMode) => void;
  setNotificationPref: (key: keyof NotificationPreferences, value: boolean) => void;
  setPrivacyPref: <K extends keyof PrivacyPreferences>(key: K, value: PrivacyPreferences[K]) => void;
  setChatSelectedTab: (tab: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      notificationPrefs: {
        likes: true,
        replies: true,
        follows: true,
        threadReplies: true,
        chatMessages: true,
      },
      privacyPrefs: {
        privateAccount: false,
        showOnlineStatus: true,
        onlineStatusVisibility: 'friends',
        allowDirectMessages: 'everyone',
      },
      chatSelectedTab: 0,
      setThemeMode: (themeMode) => set({ themeMode }),
      setChatSelectedTab: (chatSelectedTab) => set({ chatSelectedTab }),
      setNotificationPref: (key, value) =>
        set((state) => ({
          notificationPrefs: { ...state.notificationPrefs, [key]: value },
        })),
      setPrivacyPref: (key, value) =>
        set((state) => ({
          privacyPrefs: { ...state.privacyPrefs, [key]: value },
        })),
    }),
    {
      name: 'huuwa-ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
