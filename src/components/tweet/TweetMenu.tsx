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
import { Tweet } from '@/types/tweet';
import { muteUser, blockUser } from '@/services/api/userService';
import { reportContent, ReportReason } from '@/services/api/reportService';
import { deleteTweet } from '@/services/api/tweetService';
import { ReportModal } from '@/components/ui/ReportModal';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface TweetMenuProps {
  tweet: Tweet;
  visible: boolean;
  onClose: () => void;
  onDeleted?: (id: string) => void;
}

export function TweetMenu({ tweet, visible, onClose, onDeleted }: TweetMenuProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const hideTweet = useFeedStore((s) => s.hideTweet);
  const [reportOpen, setReportOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const isOwn = user?.uid === tweet.authorUid;

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

  const handleNotInterested = () => {
    hideTweet(tweet.id);
    animateClose();
  };

  const handleMute = async () => {
    if (!requireLogin() || !user) return;
    try {
      await muteUser(user.uid, tweet.authorUid);
      updateUser({ mutedUids: [...(user.mutedUids ?? []), tweet.authorUid] });
      hideTweet(tweet.id);
    } catch {
      Alert.alert('エラー', 'ミュートに失敗しました');
    }
    animateClose();
  };

  const handleBlock = () => {
    if (!requireLogin() || !user) return;
    Alert.alert('ブロック', `@${tweet.author.username} をブロックしますか?`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ブロック',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(user.uid, tweet.authorUid);
            updateUser({ blockedUids: [...(user.blockedUids ?? []), tweet.authorUid] });
            hideTweet(tweet.id);
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
    setReportOpen(true);
  };

  const handleDelete = () => {
    Alert.alert('投稿を削除', 'この投稿を削除しますか?', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTweet(tweet.id, tweet.authorUid);
            hideTweet(tweet.id);
            onDeleted?.(tweet.id);
          } catch {
            Alert.alert('エラー', '削除に失敗しました');
          }
          animateClose();
        },
      },
    ]);
  };

  const handleReportSubmit = async (reason: ReportReason, description: string) => {
    if (!user) return;
    try {
      await reportContent(user.uid, 'tweet', tweet.id, reason, description);
      setReportOpen(false);
      Alert.alert('送信完了', '報告を受け付けました。ご協力ありがとうございます。');
      hideTweet(tweet.id);
      animateClose();
    } catch {
      Alert.alert('エラー', '報告の送信に失敗しました');
    }
  };

  return (
    <>
      <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
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
              {isOwn ? (
                <MenuRow
                  icon="trash-outline"
                  label="削除"
                  destructive
                  onPress={handleDelete}
                  borderColor={colors.border}
                />
              ) : (
                <>
                  <MenuRow
                    icon="volume-mute-outline"
                    label={`@${tweet.author.username} をミュート`}
                    onPress={handleMute}
                    borderColor={colors.border}
                  />
                  <MenuRow
                    icon="ban-outline"
                    label={`@${tweet.author.username} をブロック`}
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
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportSubmit}
        targetType="tweet"
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
