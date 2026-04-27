import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

export function SocialAuthButtons() {
  const colors = useThemeColors();
  const router = useRouter();
  const { signInWithGoogle, signInWithApple } = useSocialAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? 'Googleログインに失敗しました');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    setLoadingProvider('apple');
    try {
      await signInWithApple();
      router.replace('/');
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        setLoadingProvider(null);
        return;
      }
      Alert.alert('エラー', e?.message ?? 'Appleログインに失敗しました');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handlePhone = () => {
    router.push('/(auth)/phone');
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
          または
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync !== undefined && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#000', borderColor: '#000' }]}
          onPress={handleApple}
          activeOpacity={0.8}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Appleでログイン
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleGoogle}
        activeOpacity={0.8}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Googleでログイン
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePhone}
        activeOpacity={0.8}
        disabled={loadingProvider !== null}
      >
        <Ionicons name="call-outline" size={20} color={colors.text} />
        <Text style={[styles.buttonText, { color: colors.text }]}>
          電話番号でログイン
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: FontSize.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
