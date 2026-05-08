import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useFeedStore } from '@/stores/feedStore';
import { blockUser } from '@/services/api/userService';
import { reportContent, ReportReason } from '@/services/api/reportService';
import { ReportModal } from '@/components/ui/ReportModal';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export type ThreadMenuTarget =
  | {
      kind: 'thread';
      id: string;
      authorUid: string;
      authorUsername: string;
    }
  | {
      kind: 'reply';
      id: string;
      authorUid: string;
      authorUsername: string;
      onHideLocally?: () => void;
    };

interface ThreadMenuProps {
  target: ThreadMenuTarget;
  visible: boolean;
  onClose: () => void;
}

export function ThreadMenu({ target, visible, onClose }: ThreadMenuProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const hideThread = useFeedStore((s) => s.hideThread);
  const [reportOpen, setReportOpen] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(true);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const isOwn = user?.uid === target.authorUid;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(400);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  const requireLogin = () => {
    if (user) return true;
    animateClose();
    Alert.alert('ログインが必要です', 'この操作にはログインが必要です', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
    ]);
    return false;
  };

  const hideTarget = () => {
    if (target.kind === 'thread') {
      hideThread(target.id);
    } else {
      target.onHideLocally?.();
    }
  };

  const handleNotInterested = () => {
    hideTarget();
    animateClose();
  };

  const handleBlock = () => {
    if (!requireLogin() || !user) return;
    Alert.alert('ブロック', `@${target.authorUsername} をブロックしますか?`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ブロック',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(user.uid, target.authorUid);
            updateUser({ blockedUids: [...(user.blockedUids ?? []), target.authorUid] });
            // Apple Guideline 1.2: blocking must notify the developer.
            // Auto-file a report so the moderation team is aware of the underlying content.
            reportContent(
              user.uid,
              target.kind === 'thread' ? 'thread' : 'message',
              target.id,
              'inappropriate',
              `Auto-report from block action. Blocked user: ${target.authorUid}`,
            ).catch(() => {});
            hideTarget();
          } catch {
            Alert.alert('エラー', 'ブロックに失敗しました');
          }
          animateClose();
        },
      },
    ]);
  };

  const handleReport = () => {
    if (!requireLogin()) return;
    // Dismiss the bottom sheet Modal first to avoid iOS Modal-on-Modal presentation issues
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 150, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setSheetMounted(false);
      // Wait for the native modal dismiss before presenting the report modal
      setTimeout(() => setReportOpen(true), 350);
    });
  };

  const handleReportSubmit = async (reason: ReportReason, description: string) => {
    if (!user) return;
    try {
      const targetType = target.kind === 'thread' ? 'thread' : 'message';
      await reportContent(user.uid, targetType, target.id, reason, description);
      setReportOpen(false);
      Alert.alert(
        '送信完了',
        '報告を受け付けました。24時間以内に確認・対応します。表示を消したい場合はブロックをご利用ください。',
      );
      onClose();
    } catch {
      Alert.alert('エラー', '報告の送信に失敗しました');
    }
  };

  const handleReportClose = () => {
    setReportOpen(false);
    onClose();
  };

  return (
    <>
      <Modal transparent visible={visible && sheetMounted} animationType="none" onRequestClose={animateClose}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={animateClose}>
            <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <SafeAreaView edges={['bottom']}>
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
              </View>

              <MenuRow
                icon="eye-off-outline"
                label="興味がない"
                onPress={handleNotInterested}
                borderColor={colors.border}
              />
              {!isOwn && (
                <>
                  <MenuRow
                    icon="ban-outline"
                    label={`@${target.authorUsername} をブロック`}
                    destructive
                    onPress={handleBlock}
                    borderColor={colors.border}
                  />
                  <MenuRow
                    icon="flag-outline"
                    label="報告する"
                    destructive
                    onPress={handleReport}
                    borderColor={colors.border}
                  />
                </>
              )}
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <ReportModal
        visible={reportOpen}
        onClose={handleReportClose}
        onSubmit={handleReportSubmit}
        targetType={target.kind === 'thread' ? 'thread' : 'message'}
      />
    </>
  );
}

function MenuRow({
  icon,
  label,
  destructive,
  onPress,
  borderColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
  borderColor: string;
}) {
  const colors = useThemeColors();
  const color = destructive ? colors.error : colors.text;
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons name={icon} size={22} color={color} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  handleContainer: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, opacity: 0.4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { marginRight: Spacing.md, width: 24 },
  rowLabel: { fontSize: FontSize.md, fontWeight: '500', flex: 1 },
});
