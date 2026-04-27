import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: 'ログイン', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: '新規登録', headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="phone" options={{ headerShown: false }} />
      <Stack.Screen name="phone-setup" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
