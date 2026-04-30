import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function OpenChatLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'オープンチャット' }} />
      <Stack.Screen name="[roomId]" options={{ title: 'チャットルーム' }} />
      <Stack.Screen name="search/[roomId]" options={{ title: 'メッセージ検索' }} />
      <Stack.Screen name="info/[roomId]" options={{ title: 'チャット情報' }} />
      <Stack.Screen name="members/[roomId]" options={{ title: 'メンバー' }} />
      <Stack.Screen name="media/[roomId]" options={{ title: '写真・動画' }} />
      <Stack.Screen name="notes/[roomId]" options={{ title: 'ノート' }} />
      <Stack.Screen name="events/[roomId]" options={{ title: 'イベント' }} />
      <Stack.Screen name="links/[roomId]" options={{ title: 'リンク' }} />
      <Stack.Screen name="files/[roomId]" options={{ title: 'ファイル' }} />
      <Stack.Screen name="settings/[roomId]" options={{ title: '設定' }} />
      <Stack.Screen name="invite/[roomId]" options={{ title: 'メンバーを招待' }} />
    </Stack>
  );
}
