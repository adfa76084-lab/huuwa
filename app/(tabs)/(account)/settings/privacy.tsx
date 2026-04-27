import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { updatePrivacyPrefs } from '@/services/api/userService';
import { Spacing, FontSize } from '@/constants/theme';

const dmOptions = [
  { value: 'everyone' as const, label: '全員', description: '誰でもメッセージを送信できます' },
  { value: 'followers' as const, label: 'フォロワーのみ', description: 'フォロワーだけがメッセージを送信できます' },
  { value: 'nobody' as const, label: '受け取らない', description: 'メッセージリクエストを受け付けません' },
];

export default function PrivacySettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const privacyPrefs = useUiStore((s) => s.privacyPrefs);
  const setPrivacyPref = useUiStore((s) => s.setPrivacyPref);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const isPrivate = user?.isPrivate ?? false;
  const dmPolicy = user?.dmPolicy ?? 'everyone';

  const togglePrivate = async (next: boolean) => {
    if (!user) return;
    updateUser({ isPrivate: next });
    setPrivacyPref('privateAccount', next);
    try {
      await updatePrivacyPrefs(user.uid, { isPrivate: next });
    } catch {
      updateUser({ isPrivate: !next });
      setPrivacyPref('privateAccount', !next);
    }
  };

  const setDmPolicy = async (value: 'everyone' | 'followers' | 'nobody') => {
    if (!user) return;
    const prev = dmPolicy;
    updateUser({ dmPolicy: value });
    setPrivacyPref('allowDirectMessages', value);
    try {
      await updatePrivacyPrefs(user.uid, { dmPolicy: value });
    } catch {
      updateUser({ dmPolicy: prev });
      setPrivacyPref('allowDirectMessages', prev);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Account privacy */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        オーディエンスとタグ付け
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>非公開アカウント</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              オンにすると、あなたをフォローしているユーザーのみが投稿を閲覧できます
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={togglePrivate}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Online status */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        アクティビティ
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              オンラインステータスを表示
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              アクティブな時に他のユーザーに表示されます。オフにすると他のユーザーのステータスも見えなくなります
            </Text>
          </View>
          <Switch
            value={privacyPrefs.showOnlineStatus}
            onValueChange={(value) => setPrivacyPref('showOnlineStatus', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* DM settings */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        ダイレクトメッセージ
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        {dmOptions.map((option, index) => {
          const isSelected = dmPolicy === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.row,
                index < dmOptions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => setDmPolicy(option.value)}
              activeOpacity={0.6}
            >
              <View style={styles.rowTextContainer}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? colors.primary : colors.textTertiary },
                ]}
              >
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mute & Block */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        ミュートとブロック
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/(tabs)/(account)/settings/mute-block')}
          activeOpacity={0.6}
        >
          <Ionicons
            name="volume-mute-outline"
            size={22}
            color={colors.textSecondary}
            style={styles.rowIcon}
          />
          <View style={styles.rowTextContainer}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              ミュートとブロック
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              ミュートまたはブロックしているアカウントを管理します
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  rowTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
