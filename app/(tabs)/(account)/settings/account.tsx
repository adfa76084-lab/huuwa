import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Modal,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { auth as firebaseAuth } from '@/services/firebase/config';
import {
  requestEmailChangeCode,
  confirmEmailChangeCode,
  resetPassword,
} from '@/services/firebase/auth';
import { updateDocument } from '@/services/firebase/firestore';
import { Collections } from '@/constants/firestore';
import {
  changeUsername,
  getUsernameCooldownRemainingMs,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  disableAccount,
} from '@/services/api/userService';
import { signOut } from '@/services/firebase/auth';
import { validateUsername } from '@/utils/validation';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const SHEET_HEIGHT = 420;

// ─── Change Email Sheet ───
function ChangeEmailSheet({
  visible,
  currentEmail,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  currentEmail: string;
  onClose: () => void;
  onSuccess: (newEmail: string) => void;
}) {
  const colors = useThemeColors();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password' | 'code'>('email');
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (visible) {
      setNewEmail('');
      setPassword('');
      setCode('');
      setStep('email');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  const handleNext = () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }
    if (newEmail.trim() === currentEmail) {
      Alert.alert('エラー', '現在と同じメールアドレスです');
      return;
    }
    setStep('password');
    setTimeout(() => passwordRef.current?.focus(), 100);
  };

  const handleSendCode = async () => {
    if (!password) {
      Alert.alert('エラー', 'パスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await requestEmailChangeCode(newEmail.trim(), password);
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (e: any) {
      const code = e?.code ?? '';
      const msg = e?.message ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        Alert.alert('エラー', 'パスワードが正しくありません');
      } else if (code === 'auth/requires-recent-login') {
        Alert.alert('エラー', '再ログインが必要です。一度サインアウトして再度ログインしてください');
      } else if (msg) {
        Alert.alert('エラー', msg);
      } else {
        Alert.alert('エラー', 'コードの送信に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('エラー', '6桁のコードを入力してください');
      return;
    }
    setLoading(true);
    try {
      const updatedEmail = await confirmEmailChangeCode(code);
      onSuccess(updatedEmail);
      animateClose();
      Alert.alert('変更完了', 'メールアドレスを変更しました');
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await requestEmailChangeCode(newEmail.trim(), password);
      Alert.alert('再送信しました', '新しいコードを送信しました');
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? '再送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <View style={sheetStyles.modalContainer}>
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[sheetStyles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            sheetStyles.sheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={sheetStyles.handleContainer}>
            <View style={[sheetStyles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <Text style={[sheetStyles.title, { color: colors.text }]}>
            メールアドレスを変更
          </Text>

          {step === 'email' ? (
            <>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                現在: {currentEmail}
              </Text>
              <View style={[sheetStyles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[sheetStyles.input, { color: colors.text }]}
                  placeholder="新しいメールアドレス"
                  placeholderTextColor={colors.textTertiary}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: newEmail.trim() ? colors.primary : colors.textTertiary }]}
                onPress={handleNext}
                activeOpacity={0.8}
                disabled={!newEmail.trim()}
              >
                <Text style={sheetStyles.buttonText}>次へ</Text>
              </TouchableOpacity>
            </>
          ) : step === 'password' ? (
            <>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                確認のため、現在のパスワードを入力してください
              </Text>
              <View style={[sheetStyles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  ref={passwordRef}
                  style={[sheetStyles.input, { color: colors.text }]}
                  placeholder="現在のパスワード"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
                />
              </View>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: password ? colors.primary : colors.textTertiary }]}
                onPress={handleSendCode}
                activeOpacity={0.8}
                disabled={!password || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={sheetStyles.buttonText}>コードを送信</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={sheetStyles.backButton}
                onPress={() => setStep('email')}
                activeOpacity={0.6}
              >
                <Text style={[sheetStyles.backButtonText, { color: colors.textSecondary }]}>
                  戻る
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                {newEmail.trim()} に送信した6桁のコードを入力してください
              </Text>
              <View style={[sheetStyles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  ref={codeRef}
                  style={[sheetStyles.input, sheetStyles.codeInput, { color: colors.text }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                />
              </View>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: code.length === 6 ? colors.primary : colors.textTertiary }]}
                onPress={handleVerifyCode}
                activeOpacity={0.8}
                disabled={code.length !== 6 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={sheetStyles.buttonText}>変更する</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={sheetStyles.backButton}
                onPress={handleResend}
                activeOpacity={0.6}
                disabled={loading}
              >
                <Text style={[sheetStyles.backButtonText, { color: colors.primary }]}>
                  コードを再送信
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: 40,
  },
  handleContainer: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.4 },
  title: { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.sm },
  description: { fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  inputWrapper: {
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  input: { fontSize: FontSize.md, padding: 0 },
  codeInput: { textAlign: 'center', fontSize: FontSize.xl, letterSpacing: 8, fontWeight: '600' },
  button: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' },
  backButton: { alignItems: 'center', marginTop: Spacing.md },
  backButtonText: { fontSize: FontSize.md, fontWeight: '500' },
});

// ─── Change Username Sheet ───
function ChangeUsernameSheet({
  visible,
  currentUsername,
  cooldownRemainingMs,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  currentUsername: string;
  cooldownRemainingMs: number;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}) {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'warning'>('input');
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setNewUsername('');
      setStep('input');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  const cooldownActive = cooldownRemainingMs > 0;
  const cooldownDays = Math.ceil(cooldownRemainingMs / (24 * 60 * 60 * 1000));

  const handleNext = () => {
    const trimmed = newUsername.trim();
    const err = validateUsername(trimmed);
    if (err) {
      Alert.alert('エラー', err);
      return;
    }
    if (trimmed === currentUsername) {
      Alert.alert('エラー', '現在と同じユーザー名です');
      return;
    }
    setStep('warning');
  };

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await changeUsername(user.uid, newUsername.trim());
      onSuccess(newUsername.trim());
      animateClose();
      Alert.alert('変更完了', 'ユーザー名を変更しました');
    } catch (e: any) {
      Alert.alert('エラー', e?.message ?? 'ユーザー名の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <View style={sheetStyles.modalContainer}>
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[sheetStyles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            sheetStyles.sheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={sheetStyles.handleContainer}>
            <View style={[sheetStyles.handle, { backgroundColor: colors.textTertiary }]} />
          </View>

          <Text style={[sheetStyles.title, { color: colors.text }]}>
            ユーザー名を変更
          </Text>

          {cooldownActive ? (
            <>
              <Ionicons
                name="time-outline"
                size={48}
                color={colors.warning ?? '#F59E0B'}
                style={{ alignSelf: 'center', marginBottom: Spacing.md }}
              />
              <Text style={[sheetStyles.description, { color: colors.text, fontWeight: '600' }]}>
                あと{cooldownDays}日間は変更できません
              </Text>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                ユーザー名は{USERNAME_CHANGE_COOLDOWN_DAYS}日に1回のみ変更可能です
              </Text>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: colors.primary }]}
                onPress={animateClose}
                activeOpacity={0.8}
              >
                <Text style={sheetStyles.buttonText}>閉じる</Text>
              </TouchableOpacity>
            </>
          ) : step === 'input' ? (
            <>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                現在: @{currentUsername}
              </Text>
              <View style={[sheetStyles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[sheetStyles.input, { color: colors.text }]}
                  placeholder="新しいユーザー名"
                  placeholderTextColor={colors.textTertiary}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: newUsername.trim() ? colors.primary : colors.textTertiary }]}
                onPress={handleNext}
                activeOpacity={0.8}
                disabled={!newUsername.trim()}
              >
                <Text style={sheetStyles.buttonText}>次へ</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons
                name="warning-outline"
                size={48}
                color={colors.warning ?? '#F59E0B'}
                style={{ alignSelf: 'center', marginBottom: Spacing.md }}
              />
              <Text style={[sheetStyles.description, { color: colors.text, fontWeight: '700' }]}>
                ユーザー名は{USERNAME_CHANGE_COOLDOWN_DAYS}日に1回しか変更できません
              </Text>
              <Text style={[sheetStyles.description, { color: colors.textSecondary }]}>
                @{currentUsername} → @{newUsername.trim()}{'\n'}
                次に変更できるのは{USERNAME_CHANGE_COOLDOWN_DAYS}日後です。本当に変更しますか？
              </Text>
              <TouchableOpacity
                style={[sheetStyles.button, { backgroundColor: colors.error }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={sheetStyles.buttonText}>変更する</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={sheetStyles.backButton}
                onPress={() => setStep('input')}
                activeOpacity={0.6}
              >
                <Text style={[sheetStyles.backButtonText, { color: colors.textSecondary }]}>
                  戻る
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Account Settings Screen ───
interface AccountRow {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export default function AccountSettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);
  const [usernameSheetVisible, setUsernameSheetVisible] = useState(false);
  const cooldownRemainingMs = getUsernameCooldownRemainingMs(user?.usernameUpdatedAt);

  const accountInfoRows: AccountRow[] = [
    {
      label: 'ユーザー名',
      value: `@${user?.username ?? ''}`,
      icon: 'at-outline',
      onPress: () => setUsernameSheetVisible(true),
    },
    {
      label: 'メールアドレス',
      value: firebaseAuth.currentUser?.email ?? '',
      icon: 'mail-outline',
      onPress: () => setEmailSheetVisible(true),
    },
    {
      label: '登録日',
      value: user?.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') ?? 'N/A',
      icon: 'calendar-outline',
    },
  ];

  const securityRows: AccountRow[] = [
    {
      label: 'パスワードを変更',
      icon: 'key-outline',
      onPress: () => router.push('/(auth)/forgot-password'),
    },
  ];

  const dangerRows: AccountRow[] = [
    {
      label: 'アカウントを無効にする',
      icon: 'warning-outline',
      onPress: () => {
        Alert.alert(
          'アカウントの無効化',
          'アカウントを無効にすると、プロフィールが非表示になります。30日以内に再度ログインすれば復元できますが、それ以降はアカウントが完全に削除されます。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '無効にする',
              style: 'destructive',
              onPress: async () => {
                if (!user) return;
                try {
                  await disableAccount(user.uid);
                  await signOut();
                  router.replace('/(tabs)/(account)');
                } catch {
                  Alert.alert('エラー', '無効化に失敗しました');
                }
              },
            },
          ],
        );
      },
    },
  ];

  const handleEmailChanged = useCallback(
    async (newEmail: string) => {
      if (user) {
        updateUser({ email: newEmail });
        try {
          await updateDocument(Collections.USERS, user.uid, { email: newEmail });
        } catch {
          // Firestore update is best-effort; Auth is the source of truth
        }
      }
    },
    [user, updateUser],
  );

  const handleUsernameChanged = useCallback(
    (newUsername: string) => {
      updateUser({ username: newUsername });
    },
    [updateUser],
  );

  const renderRow = (row: AccountRow, isLast: boolean, destructive = false) => (
    <TouchableOpacity
      key={row.label}
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
      onPress={row.onPress}
      activeOpacity={row.onPress ? 0.6 : 1}
      disabled={!row.onPress}
    >
      <Ionicons
        name={row.icon}
        size={20}
        color={destructive ? colors.error : colors.textSecondary}
        style={styles.rowIcon}
      />
      <View style={styles.rowTextContainer}>
        <Text style={[styles.rowLabel, { color: destructive ? colors.error : colors.text }]}>
          {row.label}
        </Text>
        {row.value && (
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            {row.value}
          </Text>
        )}
      </View>
      {row.onPress && (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Account info section */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          アカウント情報
        </Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          {accountInfoRows.map((row, i) =>
            renderRow(row, i === accountInfoRows.length - 1),
          )}
        </View>

        {/* Security section */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          セキュリティ
        </Text>
        <View style={[styles.section, { borderColor: colors.border }]}>
          {securityRows.map((row, i) =>
            renderRow(row, i === securityRows.length - 1),
          )}
        </View>

        {/* Danger zone */}
        <View style={[styles.section, { borderColor: colors.border, marginTop: Spacing.xxxl }]}>
          {dangerRows.map((row, i) =>
            renderRow(row, i === dangerRows.length - 1, true),
          )}
        </View>
      </ScrollView>

      <ChangeEmailSheet
        visible={emailSheetVisible}
        currentEmail={firebaseAuth.currentUser?.email ?? ''}
        onClose={() => setEmailSheetVisible(false)}
        onSuccess={handleEmailChanged}
      />

      <ChangeUsernameSheet
        visible={usernameSheetVisible}
        currentUsername={user?.username ?? ''}
        cooldownRemainingMs={cooldownRemainingMs}
        onClose={() => setUsernameSheetVisible(false)}
        onSuccess={handleUsernameChanged}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
