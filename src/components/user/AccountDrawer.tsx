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
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 360);

interface AccountDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function AccountDrawer({ visible, onClose }: AccountDrawerProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(DRAWER_WIDTH);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, overlayAnim, onClose]);

  const navigateTo = (path: string) => {
    animateClose();
    setTimeout(() => router.push(path as any), 200);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={animateClose}>
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom']}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={animateClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="chevron-forward" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.listSpacer} />

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/(tabs)/(account)/likes')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="heart-outline"
                size={22}
                color={colors.text}
                style={styles.rowIcon}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                いいねした投稿、スレッド
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/(tabs)/(account)/bookmarks')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="bookmark-outline"
                size={22}
                color={colors.text}
                style={styles.rowIcon}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                保存した投稿
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/(tabs)/(account)/settings')}
              activeOpacity={0.6}
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={colors.text}
                style={styles.rowIcon}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                設定とプライバシー
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
  },
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  listSpacer: {
    height: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
