import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { requestSignupCode, verifySignupAndCreate } from '@/services/firebase/auth';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
} from '@/utils/validation';
import { getAuthErrorMessage } from '@/utils/errorHandler';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

type Step = 'form' | 'code';

export default function RegisterScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<RNTextInput>(null);

  const handleSendCode = async () => {
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
      await requestSignupCode(email.trim());
      setStep('code');
      setCode('');
    } catch (e: any) {
      setError(e?.message ?? 'コードの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('6桁のコードを入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifySignupAndCreate({
        email: email.trim(),
        code,
        password,
        displayName: displayName.trim(),
        username: username.trim(),
      });
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestSignupCode(email.trim());
    } catch (e: any) {
      setError(e?.message ?? '再送信に失敗しました');
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
          onPress={step === 'code' ? () => { setStep('form'); setError(null); } : handleClose}
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
            {step === 'form' ? 'アカウントを作成' : 'メールを確認してください'}
          </Text>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {step === 'form' ? (
            <>
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
                placeholder="6文字以上"
                secureTextEntry
              />

              <Button title="認証コードを送信" onPress={handleSendCode} loading={loading} />

              <Button
                title="アカウントをお持ちの方はログイン"
                onPress={() => router.back()}
                variant="secondary"
                style={styles.linkButton}
              />

              <SocialAuthButtons mode="register" />
            </>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {email} に6桁の認証コードを送信しました。受信メールを確認してコードを入力してください。
              </Text>

              <View style={[styles.codeWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <RNTextInput
                  ref={codeRef}
                  style={[styles.codeInput, { color: colors.text }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <Button title="認証してアカウント作成" onPress={handleVerify} loading={loading} />

              <Button
                title="コードを再送信"
                onPress={handleResend}
                variant="secondary"
                style={styles.linkButton}
                disabled={loading}
              />

              <Button
                title="メールアドレスを変更"
                onPress={() => {
                  setStep('form');
                  setCode('');
                  setError(null);
                }}
                variant="secondary"
                style={styles.linkButton}
              />
            </>
          )}
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
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
  codeWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    fontSize: FontSize.xl,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    padding: 0,
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
