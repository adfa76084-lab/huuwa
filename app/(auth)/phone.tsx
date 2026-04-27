import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { requestPhoneCode, confirmPhoneCode } from '@/services/firebase/auth';
import { getUserProfile } from '@/services/api/userService';

type Step = 'phone' | 'code';

export default function PhoneAuthScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [localPhone, setLocalPhone] = useState(''); // digits only, e.g. "07012345678" or "7012345678"
  const [code, setCode] = useState('');

  // Normalize user input to E.164 for Japan: strip non-digits, drop leading 0, prepend +81
  const normalizedPhone = (() => {
    const digits = localPhone.replace(/\D/g, '');
    if (!digits) return '';
    const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits;
    return `+81${withoutLeadingZero}`;
  })();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<RNTextInput>(null);

  const handleSendCode = async () => {
    setError(null);
    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
      setError('有効な電話番号を入力してください');
      return;
    }
    setLoading(true);
    try {
      await requestPhoneCode(normalizedPhone);
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e: any) {
      setError(e?.message ?? 'コードの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError('6桁のコードを入力してください');
      return;
    }
    setLoading(true);
    try {
      const user = await confirmPhoneCode(normalizedPhone, code);
      const existing = await getUserProfile(user.uid);
      if (!existing) {
        // New user — send them through profile setup
        router.replace('/(auth)/phone-setup');
      } else {
        router.replace('/');
      }
    } catch (e: any) {
      setError(e?.message ?? '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await requestPhoneCode(normalizedPhone);
      Alert.alert('再送信しました', '新しいコードを送信しました');
    } catch (e: any) {
      setError(e?.message ?? '再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {step === 'phone' ? '電話番号でログイン' : 'コードを入力'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {step === 'phone'
              ? '電話番号を入力してください。6桁の認証コードをSMSで送信します。'
              : `${normalizedPhone} に送信した6桁のコードを入力してください。`}
          </Text>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {step === 'phone' ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                電話番号
              </Text>
              <View style={[styles.phoneRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={[styles.countryBox, { borderRightColor: colors.border }]}>
                  <Text style={[styles.countryCode, { color: colors.text }]}>🇯🇵 +81</Text>
                </View>
                <RNTextInput
                  style={[styles.phoneInput, { color: colors.text }]}
                  placeholder="90 1234 5678"
                  placeholderTextColor={colors.textTertiary}
                  value={localPhone}
                  onChangeText={(t) => setLocalPhone(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={11}
                  autoFocus
                />
              </View>
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                先頭の0はあってもなくてもOKです
              </Text>
              <Button title="コードを送信" onPress={handleSendCode} loading={loading} />
            </>
          ) : (
            <>
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
              <Button title="ログイン" onPress={handleConfirm} loading={loading} />
              <Button
                title="再度コードを送信"
                onPress={handleResend}
                variant="secondary"
                style={styles.linkButton}
                disabled={loading}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 48, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  backButton: { padding: Spacing.xs, alignSelf: 'flex-start' },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  heading: { fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.sm },
  description: { fontSize: FontSize.md, lineHeight: 22, marginBottom: Spacing.xxl },
  errorBanner: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  errorText: { fontSize: FontSize.sm, textAlign: 'center' },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  countryBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRightWidth: 1,
  },
  countryCode: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  hint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
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
  linkButton: { marginTop: Spacing.md },
});
