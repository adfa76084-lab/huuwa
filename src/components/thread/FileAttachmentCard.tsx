import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface FileAttachmentCardProps {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): keyof typeof Ionicons.glyphMap {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive-outline';
  return 'document-outline';
}

export function FileAttachmentCard({ url, name, mimeType, sizeBytes }: FileAttachmentCardProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={getFileIcon(mimeType)} size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.size, { color: colors.textTertiary }]}>
          {formatFileSize(sizeBytes)}
        </Text>
      </View>
      <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  size: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
