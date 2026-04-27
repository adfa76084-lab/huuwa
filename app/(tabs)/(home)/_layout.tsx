import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function HomeLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'ホーム' }} />
      <Stack.Screen name="search" options={{ title: '検索', headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: '通知' }} />
      <Stack.Screen name="tweet/[tweetId]" options={{ title: '投稿' }} />
      <Stack.Screen name="thread/[threadId]" options={{ title: 'スレッド' }} />
      <Stack.Screen name="profile/[userId]" options={{ title: 'プロフィール' }} />
      <Stack.Screen name="hashtag/[tag]" options={{ title: 'ハッシュタグ' }} />
    </Stack>
  );
}
