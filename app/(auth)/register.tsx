import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { signUp } from '@/services/firebase/auth';
import { createUserProfile } from '@/services/api/userService';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
} from '@/utils/validation';
import { getAuthErrorMessage } from '@/utils/errorHandler';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function RegisterScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const fieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      displayName: validateDisplayName(displayName),
      username: validateUsername(username),
    };
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some((e) => e !== null)) return;

    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await signUp(email, password);
      await createUserProfile(firebaseUser.uid, email, displayName, username);
      router.replace('/');
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleClose}
          hitSlop={12}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.primary }]}>huuwa</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            アカウントを作成
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
            placeholder="表示名を入力"
          />

          <TextInput
            label="ユーザー名"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
            placeholder="ユーザー名を入力"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="メールアドレスを入力"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            label="パスワード"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="パスワードを入力"
            secureTextEntry
          />

          <Button title="登録する" onPress={handleRegister} loading={loading} />

          <Button
            title="アカウントをお持ちの方はログイン"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.linkButton}
          />

          <SocialAuthButtons />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
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
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
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
  linkButton: {
    marginTop: Spacing.md,
  },
  header: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  backButton: {
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
});
