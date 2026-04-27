import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function AccountLayout() {
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
      <Stack.Screen name="index" options={{ title: 'マイプロフィール' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'プロフィールを編集' }} />
      <Stack.Screen name="followers" options={{ title: 'フォロワー' }} />
      <Stack.Screen name="following" options={{ title: 'フォロー中' }} />
      <Stack.Screen name="bookmarks" options={{ title: '保存した投稿' }} />
      <Stack.Screen name="likes" options={{ title: 'いいねした投稿' }} />
      <Stack.Screen name="follow-requests" options={{ title: 'フォローリクエスト' }} />
      <Stack.Screen name="search" options={{ title: '自分の投稿を検索' }} />
      <Stack.Screen name="settings/index" options={{ title: '設定' }} />
      <Stack.Screen name="settings/account" options={{ title: 'アカウント' }} />
      <Stack.Screen name="settings/notifications" options={{ title: '通知' }} />
      <Stack.Screen name="settings/privacy" options={{ title: 'プライバシーと安全' }} />
      <Stack.Screen name="settings/mute-block" options={{ title: 'ミュートとブロック' }} />
      <Stack.Screen name="settings/theme" options={{ title: 'テーマと表示' }} />
      <Stack.Screen name="settings/terms" options={{ title: '利用規約とプライバシーポリシー' }} />
      <Stack.Screen name="profile/[userId]" options={{ title: 'プロフィール' }} />
    </Stack>
  );
}
