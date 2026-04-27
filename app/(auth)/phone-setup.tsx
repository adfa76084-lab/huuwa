import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import {
  createUserProfile,
  isUsernameTaken,
  getUserProfile,
} from '@/services/api/userService';
import { auth } from '@/services/firebase/config';
import { validateUsername, validateDisplayName } from '@/utils/validation';

export default function PhoneSetupScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      setError('セッションが切れました。最初からやり直してください。');
      return;
    }

    const fieldErrors = {
      displayName: validateDisplayName(displayName),
      username: validateUsername(username),
    };
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some((e) => e !== null)) return;

    setLoading(true);
    setError(null);
    try {
      // Check username uniqueness
      if (await isUsernameTaken(username.trim(), fbUser.uid)) {
        setErrors({ ...fieldErrors, username: 'このユーザー名は既に使われています' });
        setLoading(false);
        return;
      }

      await createUserProfile(
        fbUser.uid,
        fbUser.email ?? '',
        displayName.trim(),
        username.trim(),
      );

      // Hydrate the Zustand store so the app tree re-renders as logged-in
      const profile = await getUserProfile(fbUser.uid);
      if (profile) setUser(profile);

      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? '設定の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.primary }]}>huuwa</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            プロフィールを設定
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            表示名とユーザー名を設定して始めましょう。後で変更できます。
          </Text>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          <TextInput
            label="表示名"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
            placeholder="例: 田中 太郎"
          />

          <TextInput
            label="ユーザー名"
            value={username}
            onChangeText={(t) => setUsername(t.replace(/\s+/g, ''))}
            error={errors.username}
            placeholder="例: tanaka_taro"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title="始める"
            onPress={handleSubmit}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
