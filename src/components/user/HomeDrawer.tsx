import React, { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 360);

interface HomeDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function HomeDrawer({ visible, onClose }: HomeDrawerProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(-DRAWER_WIDTH);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  const navigate = (path: string) => {
    // Navigate first so the target screen starts mounting underneath;
    // close the drawer in parallel to avoid a flash of the home tab.
    router.push(path as any);
    animateClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'bottom']}>
            {user ? (
              <TouchableOpacity
                style={styles.profileHeader}
                onPress={() => navigate('/(tabs)/(account)')}
                activeOpacity={0.7}
              >
                <Avatar uri={user.avatarUrl} size={64} />
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{user.username}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={[styles.statText, { color: colors.text }]}>
                    <Text style={styles.statCount}>{user.followingCount ?? 0}</Text>
                    <Text style={{ color: colors.textSecondary }}> フォロー中</Text>
                  </Text>
                  <Text style={[styles.statText, { color: colors.text }]}>
                    <Text style={styles.statCount}>{user.followersCount ?? 0}</Text>
                    <Text style={{ color: colors.textSecondary }}> フォロワー</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.profileHeader}>
                <Text style={[styles.displayName, { color: colors.text }]}>ゲスト</Text>
                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigate('/(auth)/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginBtnText}>ログイン</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DrawerRow
              icon="person-outline"
              label="プロフィール"
              onPress={() => navigate('/(tabs)/(account)')}
              disabled={!user}
            />
            <DrawerRow
              icon="heart-outline"
              label="いいねした投稿、スレッド"
              onPress={() => navigate('/(tabs)/(account)/likes')}
              disabled={!user}
            />
            <DrawerRow
              icon="bookmark-outline"
              label="保存した投稿"
              onPress={() => navigate('/(tabs)/(account)/bookmarks')}
              disabled={!user}
            />
            <DrawerRow
              icon="people-outline"
              label="フォローリクエスト"
              onPress={() => navigate('/(tabs)/(account)/follow-requests')}
              disabled={!user}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <DrawerRow
              icon="settings-outline"
              label="設定とプライバシー"
              onPress={() => navigate('/(tabs)/(account)/settings')}
              disabled={!user}
            />
          </SafeAreaView>
        </Animated.View>

        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

function DrawerRow({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border, opacity: disabled ? 0.4 : 1 }]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
    >
      <Ionicons name={icon} size={22} color={colors.text} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, flexDirection: 'row' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
  },
  safeArea: { flex: 1 },
  profileHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginTop: Spacing.md + 2,
    letterSpacing: 0.2,
  },
  username: {
    fontSize: FontSize.md,
    marginTop: 2,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg + 4,
    marginTop: Spacing.md + 2,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  statCount: {
    fontWeight: '700',
  },
  loginBtn: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  divider: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { marginRight: Spacing.md, width: 24 },
  rowLabel: { fontSize: FontSize.md, fontWeight: '500', flex: 1 },
});
