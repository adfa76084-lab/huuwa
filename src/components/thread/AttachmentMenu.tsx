import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickFile: () => void;
  onCreatePoll: () => void;
}

const MENU_ITEMS: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  handler: keyof Omit<AttachmentMenuProps, 'visible' | 'onClose'>;
}[] = [
  { key: 'image', icon: 'image-outline', label: '画像', handler: 'onPickImage' },
  { key: 'video', icon: 'videocam-outline', label: '動画', handler: 'onPickVideo' },
  { key: 'file', icon: 'document-outline', label: 'ファイル', handler: 'onPickFile' },
  { key: 'poll', icon: 'bar-chart-outline', label: 'アンケート', handler: 'onCreatePoll' },
];

export function AttachmentMenu(props: AttachmentMenuProps) {
  const colors = useThemeColors();
  const { visible, onClose } = props;

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card },
        ]}
      >
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.gridItem}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                (props[item.handler] as () => void)();
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl + 16,
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Spacing.lg,
  },
  gridItem: {
    alignItems: 'center',
    width: 64,
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
