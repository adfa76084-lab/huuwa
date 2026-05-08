import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { auth, db } from '@/services/firebase/config';

export default function TwoFactorScreen() {
  const colors = useThemeColors();
  const user = auth.currentUser;
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'userPrivate', user.uid));
        setEnabled(snap.exists() && snap.data()?.email2FA === true);
      } catch (e) {
        console.warn('[two-factor] failed to load state:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const persist = useCallback(
    async (next: boolean) => {
      if (!user) return;
      setUpdating(true);
      const prev = enabled;
      setEnabled(next);
      try {
        await setDoc(
          doc(db, 'userPrivate', user.uid),
          { email2FA: next, updatedAt: serverTimestamp() },
          { merge: true },
        );
      } catch (e: any) {
        // Roll back UI on failure
        setEnabled(prev);
        Alert.alert('エラー', e?.message ?? '設定の更新に失敗しました');
      } finally {
        setUpdating(false);
      }
    },
    [user, enabled],
  );

  const handleToggle = useCallback(
    (next: boolean) => {
      if (next) {
        Alert.alert(
          '2段階認証を有効にする',
          '今後ログインする際、メールアドレスに送信される6桁の認証コードの入力が必要になります。\n\n認証コードはお使いのメールアドレスに届きますので、メールを受信できる状態にしておいてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '有効にする', onPress: () => persist(true) },
          ],
        );
      } else {
        Alert.alert(
          '2段階認証を無効にする',
          '無効にすると、メールアドレスとパスワードのみでログインできるようになります。アカウントの安全性が低下します。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '無効にする', style: 'destructive', onPress: () => persist(false) },
          ],
        );
      }
    },
    [persist],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name={enabled ? 'shield-checkmark' : 'shield-outline'}
          size={40}
          color={enabled ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {enabled ? '2段階認証は有効です' : '2段階認証は無効です'}
        </Text>
        <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
          {enabled
            ? 'ログイン時に、メールアドレスに送信される6桁の認証コードが必要になります。'
            : 'メールアドレスへ送信される6桁の認証コードによる、ログイン時の追加認証を設定できます。'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => handleToggle(!enabled)}
        disabled={updating}
      >
        <View style={styles.toggleTextWrap}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>
            メールで2段階認証
          </Text>
          <Text style={[styles.toggleSubLabel, { color: colors.textSecondary }]}>
            {auth.currentUser?.email ?? '未設定'}
          </Text>
        </View>
        {updating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={updating}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        )}
      </TouchableOpacity>

      <View style={styles.descSection}>
        <Text style={[styles.descTitle, { color: colors.text }]}>仕組み</Text>
        <DescItem
          icon="mail-outline"
          title="メールで認証コードを受信"
          desc="ログイン時に、登録したメールアドレスへ6桁の認証コードが送信されます。"
          colors={colors}
        />
        <DescItem
          icon="key-outline"
          title="コードを入力してログイン"
          desc="メアド+パスワード認証のあとに、メールに届いた6桁のコードを入力します。"
          colors={colors}
        />
        <DescItem
          icon="warning-outline"
          title="メールが受信できない場合"
          desc="迷惑メールフォルダもご確認ください。設定しているメールアドレスに届かない場合は、先にメールアドレスを変更してから有効化してください。"
          colors={colors}
        />
      </View>
    </ScrollView>
  );
}

function DescItem({
  icon,
  title,
  desc,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.descItem}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.descItemIcon} />
      <View style={styles.descItemBody}>
        <Text style={[styles.descItemTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.descItemText, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  statusTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xxl,
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: { fontSize: FontSize.md, fontWeight: '600' },
  toggleSubLabel: { fontSize: FontSize.sm, marginTop: 2 },
  descSection: { marginBottom: Spacing.xxl },
  descTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  descItem: { flexDirection: 'row', marginBottom: Spacing.lg },
  descItemIcon: { marginTop: 2, marginRight: Spacing.md },
  descItemBody: { flex: 1 },
  descItemTitle: { fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 },
  descItemText: { fontSize: FontSize.sm, lineHeight: 18 },
});
