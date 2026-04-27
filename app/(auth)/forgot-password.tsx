import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import {
  requestPasswordResetCode,
  confirmPasswordResetCode,
} from '@/services/firebase/auth';
import { validateEmail, validatePassword } from '@/utils/validation';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<RNTextInput>(null);

  const handleSendCode = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    setLoading(true);
    setError(null);
    try {
      await requestPasswordResetCode(email.trim());
      setStep('code');
    } catch (e: any) {
      setError(e?.message ?? 'コードの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('6桁のコードを入力してください');
      return;
    }
    const pwErr = validatePassword(newPassword);
    setPasswordError(pwErr);
    if (pwErr) return;
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordResetCode(email.trim(), code, newPassword);
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e?.message ?? '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPasswordResetCode(email.trim());
    } catch (e: any) {
      setError(e?.message ?? '再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(account)/settings');
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
      <View style={styles.content}>
        <Text style={[styles.heading, { color: colors.text }]}>パスワードをリセット</Text>

        {step === 'email' ? (
          <>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              登録時のメールアドレスを入力すると、6桁の認証コードを送信します。
            </Text>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

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

            <Button title="コードを送信" onPress={handleSendCode} loading={loading} />
          </>
        ) : (
          <>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {email} に送信した6桁のコードと、新しいパスワードを入力してください。
            </Text>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            <View style={[styles.codeWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

            <TextInput
              label="新しいパスワード"
              value={newPassword}
              onChangeText={setNewPassword}
              error={passwordError}
              placeholder="6文字以上"
              secureTextEntry
            />

            <Button title="パスワードを変更" onPress={handleConfirm} loading={loading} />

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
                setStep('email');
                setCode('');
                setNewPassword('');
                setError(null);
              }}
              variant="secondary"
              style={styles.linkButton}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.xxl,
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
  backButton: {
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
});
