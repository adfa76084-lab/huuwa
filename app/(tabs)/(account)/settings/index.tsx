import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { SearchBar } from '@/components/ui/SearchBar';
import { IconButton } from '@/components/ui/IconButton';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { signOut } from '@/services/firebase/auth';

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  route?: string;
  onPress?: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = () => {
    Alert.alert('サインアウト', 'サインアウトしてもよろしいですか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'サインアウト',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(tabs)/(account)');
        },
      },
    ]);
  };

  const settingsItems: SettingsItem[] = [
    {
      icon: 'person-outline',
      label: 'アカウント',
      description: 'アカウント情報やパスワードの管理',
      route: '/(tabs)/(account)/settings/account',
    },
    {
      icon: 'lock-closed-outline',
      label: 'プライバシーと安全',
      description: '表示・共有する情報の管理',
      route: '/(tabs)/(account)/settings/privacy',
    },
    {
      icon: 'notifications-outline',
      label: '通知',
      description: '通知の種類やフィルターを選択',
      route: '/(tabs)/(account)/settings/notifications',
    },
    {
      icon: 'color-palette-outline',
      label: 'テーマと表示',
      description: 'ダークモードやテーマの設定',
      route: '/(tabs)/(account)/settings/theme',
    },
    {
      icon: 'bookmark-outline',
      label: 'ブックマーク',
      description: '保存した投稿を確認',
      route: '/(tabs)/(account)/bookmarks',
    },
    {
      icon: 'person-add-outline',
      label: 'フォローリクエスト',
      description: '承認待ちのリクエストを確認',
      route: '/(tabs)/(account)/follow-requests',
    },
    {
      icon: 'help-circle-outline',
      label: 'ヘルプセンター',
      description: 'よくある質問やお問い合わせ',
    },
    {
      icon: 'document-text-outline',
      label: '利用規約とプライバシーポリシー',
      description: 'サービスの利用条件を確認',
      route: '/(tabs)/(account)/settings/terms',
    },
  ];

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return settingsItems;
    const q = searchQuery.toLowerCase();
    return settingsItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [searchQuery, settingsItems]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton
              name="chevron-back"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/(home)');
              }}
            />
          ),
        }}
      />

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="設定を検索"
        />
      </View>

      {/* User info header */}
      {!searchQuery && (
        <View style={[styles.userHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.displayName}
          </Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
            @{user?.username}
          </Text>
        </View>
      )}

      {/* Settings items */}
      {filteredItems.map((item, index) => (
        <TouchableOpacity
          key={item.label}
          style={[
            styles.settingsRow,
            { borderBottomColor: colors.border },
            index === filteredItems.length - 1 && styles.lastRow,
          ]}
          onPress={() => {
            if (item.route) {
              router.push(item.route as any);
            }
            item.onPress?.();
          }}
          activeOpacity={0.6}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={colors.textSecondary}
            style={styles.settingsIcon}
          />
          <View style={styles.settingsTextContainer}>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>
              {item.label}
            </Text>
            <Text style={[styles.settingsDescription, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}

      {/* Sign out */}
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.signOutRow, { borderTopColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.6}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>サインアウト</Text>
          <Text style={[styles.signOutHandle, { color: colors.error }]}>
            @{user?.username}
          </Text>
        </TouchableOpacity>
      )}
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  // User header
  userHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  userHandle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  // Settings rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingsIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  settingsTextContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  settingsLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  settingsDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  // Sign out
  signOutRow: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  signOutHandle: {
    fontSize: FontSize.sm,
    marginTop: 2,
    opacity: 0.7,
  },
});
