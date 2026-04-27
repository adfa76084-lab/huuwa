import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type OnlineStatusVisibility = 'everyone' | 'friends' | 'off';

const VISIBILITY_OPTIONS: {
  value: OnlineStatusVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: 'everyone',
    label: '公開',
    description:
      'すべてのユーザーに、あなたのアクティビティステータスが表示されます。',
  },
  {
    value: 'friends',
    label: '友達',
    description:
      'あなたのアクティビティステータスは、相互フォロワーに表示されます。他のユーザーのアクティビティステータスを確認できるのは、あなたと相手の両方が「公開」または「友達」に設定している場合のみです。',
  },
  {
    value: 'off',
    label: 'オフ',
    description:
      'あなたのアクティビティステータスは誰にも表示されませんが、あなたはアクティビティステータスを公開しているユーザーのステータスを見ることができます。',
  },
];

const SHEET_HEIGHT = 600;
const STATUS_AVATAR_SIZE = 72;

function ActivityStatusSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const user = useAuthStore((s) => s.user);
  const onlineStatusVisibility = useUiStore(
    (s) => s.privacyPrefs.onlineStatusVisibility ?? 'friends',
  );
  const setPrivacyPref = useUiStore((s) => s.setPrivacyPref);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  React.useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      overlayAnim.setValue(0);
    }
  }, [visible, animateIn, slideAnim, overlayAnim]);

  const handleSelect = useCallback(
    (value: OnlineStatusVisibility) => {
      setPrivacyPref('onlineStatusVisibility', value);
      setPrivacyPref('showOnlineStatus', value !== 'off');
    },
    [setPrivacyPref],
  );

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.sheetCloseButton}
            onPress={animateClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Avatar with status dot */}
          <View style={styles.sheetAvatarContainer}>
            <Avatar
              uri={user?.avatarUrl ?? null}
              size={STATUS_AVATAR_SIZE}
              isOnline={onlineStatusVisibility !== 'off'}
            />
          </View>

          {/* Title */}
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            あなたがアクティブであることを公{'\n'}開するユーザーを選択してください
          </Text>

          {/* Options */}
          <View style={[styles.optionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = onlineStatusVisibility === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionRow,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected ? colors.primary : colors.textTertiary,
                      },
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
        </Animated.View>
      </View>
    </Modal>
  );
}

// TikTok-style tab header
function ChatTabHeader({
  selectedTab,
  onSelectTab,
  onPressDot,
}: {
  selectedTab: number;
  onSelectTab: (index: number) => void;
  onPressDot: () => void;
}) {
  const colors = useThemeColors();
  const onlineStatusVisibility = useUiStore(
    (s) => s.privacyPrefs.onlineStatusVisibility ?? 'friends',
  );
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const tabs = ['メッセージ', 'アクティビティ'];

  return (
    <View style={styles.tabHeaderContainer}>
      <View style={styles.tabRow}>
        {tabs.map((tab, index) => {
          const isActive = selectedTab === index;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onSelectTab(index)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.text : colors.textTertiary,
                    fontWeight: isActive ? '800' : '500',
                  },
                ]}
              >
                {tab}
              </Text>
              {/* Unread badge on activity tab */}
              {index === 1 && unreadCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#FF3B30' }]}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
              {/* Active indicator line */}
              {isActive && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.text }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Online status pill - only on messages tab */}
      {selectedTab === 0 && (
        <TouchableOpacity
          style={[styles.statusPill, { backgroundColor: colors.surface }]}
          onPress={onPressDot}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.statusPillDot,
              { backgroundColor: onlineStatusVisibility !== 'off' ? '#34C759' : colors.textTertiary },
            ]}
          />
          <Ionicons name="caret-down" size={12} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ChatLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const selectedTab = useUiStore((s) => s.chatSelectedTab ?? 0);
  const setChatSelectedTab = useUiStore((s) => s.setChatSelectedTab);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerTitle: () => (
              <ChatTabHeader
                selectedTab={selectedTab}
                onSelectTab={setChatSelectedTab}
                onPressDot={() => setSheetVisible(true)}
              />
            ),
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.push('/create-group')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 8 }}
              >
                <Ionicons name="people-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push('/create-chat')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="search-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen name="[roomId]" options={{ title: 'チャット' }} />
        <Stack.Screen name="message-requests" options={{ title: 'メッセージリクエスト' }} />
        <Stack.Screen name="profile/[userId]" options={{ title: 'プロフィール' }} />
      </Stack>

      <ActivityStatusSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Tab header
  tabHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tabItem: {
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: FontSize.lg,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    alignSelf: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -16,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Bottom sheet
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: Spacing.xxxl + 16,
  },
  sheetCloseButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
  },
  sheetAvatarContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl + 8,
  },
  sheetTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    lineHeight: 19,
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
