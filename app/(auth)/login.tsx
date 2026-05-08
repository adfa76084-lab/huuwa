import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { signIn, confirmLoginCode, resendLoginCode } from '@/services/firebase/auth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { getAuthErrorMessage } from '@/utils/errorHandler';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function LoginScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email-2FA challenge state. uid is returned by initiateEmailLogin and
  // identifies which user the entered code belongs to.
  const [mfaUid, setMfaUid] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = async () => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    if (emailErr || passwordErr) return;

    setLoading(true);
    setError(null);
    try {
      const result = await signIn(email.trim(), password);
      if (result.kind === 'mfa') {
        setMfaUid(result.uid);
        setMfaCode('');
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaUid) return;
    if (!/^\d{6}$/.test(mfaCode)) {
      setError('6桁のコードを入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmLoginCode(mfaUid, mfaCode);
      router.replace('/');
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await resendLoginCode(email.trim(), password);
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMfa = () => {
    setMfaUid(null);
    setMfaCode('');
    setError(null);
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(home)');
  };

  const inMfaStep = mfaUid !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={inMfaStep ? handleCancelMfa : handleClose}
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
            {inMfaStep ? 'メールを確認してください' : 'おかえりなさい'}
          </Text>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {inMfaStep ? (
            <>
              <Text style={[styles.mfaHint, { color: colors.textSecondary }]}>
                {email.trim()} に6桁の認証コードを送信しました。
                {'\n'}受信メールを確認してコードを入力してください。
              </Text>
              <View
                style={[
                  styles.codeInputWrap,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <RNTextInput
                  style={[styles.codeInput, { color: colors.text }]}
                  value={mfaCode}
                  onChangeText={(t) => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: mfaCode.length === 6 ? colors.primary : colors.textTertiary },
                ]}
                onPress={handleVerifyMfa}
                disabled={mfaCode.length !== 6 || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>認証してログイン</Text>
                )}
              </TouchableOpacity>
              <Button
                title="コードを再送信"
                onPress={handleResendCode}
                variant="secondary"
                style={styles.linkButton}
                disabled={loading}
              />
              <Button
                title="メールアドレスを変更"
                onPress={handleCancelMfa}
                variant="secondary"
                style={styles.linkButton}
              />
            </>
          ) : (
            <>
              <TextInput
                label="メールアドレス"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                label="パスワード"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                placeholder="パスワードを入力"
                secureTextEntry
              />

              <Button title="ログイン" onPress={handleLogin} loading={loading} />

              <Button
                title="パスワードをお忘れですか？"
                onPress={() => router.push('/(auth)/forgot-password')}
                variant="secondary"
                style={styles.linkButton}
              />

              <Button
                title="アカウントを作成"
                onPress={() => router.push('/(auth)/register')}
                variant="outline"
                style={styles.linkButton}
              />

              <SocialAuthButtons />
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
  mfaHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  codeInputWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    fontSize: FontSize.xxl,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
    padding: 0,
  },
  primaryButton: {
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
