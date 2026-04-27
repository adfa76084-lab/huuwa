import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function CategoriesLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'カテゴリー' }} />
      <Stack.Screen name="[categoryId]/index" options={{ title: 'カテゴリー' }} />
      <Stack.Screen name="[categoryId]/tweet/[tweetId]" options={{ title: '投稿' }} />
      <Stack.Screen name="[categoryId]/thread/[threadId]" options={{ title: 'スレッド' }} />
      <Stack.Screen name="[categoryId]/profile/[userId]" options={{ title: 'プロフィール' }} />
    </Stack>
  );
}
