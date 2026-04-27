import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { updateNotificationPref, NotificationPrefKey } from '@/services/api/userService';
import { Spacing, FontSize } from '@/constants/theme';

interface NotificationToggle {
  key: 'likes' | 'replies' | 'follows' | 'threadReplies' | 'chatMessages';
  label: string;
  description: string;
}

const interactionToggles: NotificationToggle[] = [
  { key: 'likes', label: 'いいね', description: '投稿にいいねされたとき' },
  { key: 'replies', label: 'リプライ', description: '投稿にリプライされたとき' },
  { key: 'follows', label: 'フォロー', description: '新しいフォロワーがいるとき' },
];

const contentToggles: NotificationToggle[] = [
  { key: 'threadReplies', label: 'スレッド返信', description: 'スレッドに返信があったとき' },
  { key: 'chatMessages', label: 'メッセージ', description: '新しいチャットメッセージが届いたとき' },
];

export default function NotificationSettingsScreen() {
  const colors = useThemeColors();
  const notificationPrefs = useUiStore((s) => s.notificationPrefs);
  const setNotificationPref = useUiStore((s) => s.setNotificationPref);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const getValue = (key: NotificationPrefKey): boolean => {
    return user?.notificationPrefs?.[key] ?? notificationPrefs[key];
  };

  const handleToggle = async (key: NotificationPrefKey, value: boolean) => {
    setNotificationPref(key, value);
    if (user) {
      const prevPrefs = user.notificationPrefs ?? {};
      updateUser({ notificationPrefs: { ...prevPrefs, [key]: value } });
      try {
        await updateNotificationPref(user.uid, key, value);
      } catch {
        setNotificationPref(key, !value);
        updateUser({ notificationPrefs: prevPrefs });
      }
    }
  };

  const renderSection = (title: string, toggles: NotificationToggle[]) => (
    <>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        {toggles.map((toggle, index) => (
          <View
            key={toggle.key}
            style={[
              styles.row,
              index < toggles.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.rowTextContainer}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {toggle.label}
              </Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                {toggle.description}
              </Text>
            </View>
            <Switch
              value={getValue(toggle.key)}
              onValueChange={(value) => handleToggle(toggle.key, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>
    </>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {renderSection('リアクション', interactionToggles)}
      {renderSection('コンテンツ', contentToggles)}
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
  },
});
