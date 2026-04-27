import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { ChatFile } from '@/types/chat';
import { getFiles, uploadChatFile, deleteChatFile } from '@/services/api/fileService';
import { pickFile } from '@/services/media/filePicker';
import { Avatar } from '@/components/ui/Avatar';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!roomId) return;
    const data = await getFiles(roomId);
    setFiles(data);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!roomId || !user || !userProfile) return;
    try {
      const file = await pickFile();
      if (!file) return;
      await uploadChatFile(roomId, user.uid, userProfile, file);
      await load();
    } catch (error: any) {
      Alert.alert('エラー', error?.message ?? 'ファイルのアップロードに失敗しました');
    }
  };

  const handleDelete = (fileId: string, fileName: string) => {
    Alert.alert('ファイルを削除', `${fileName}を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          if (!roomId) return;
          await deleteChatFile(roomId, fileId);
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={files}
        renderItem={({ item }) => {
          const dateStr = item.createdAt?.toDate?.()
            ? item.createdAt.toDate().toLocaleDateString('ja-JP')
            : '';
          const canDelete = item.uploaderUid === user?.uid;

          return (
            <TouchableOpacity
              style={[styles.fileItem, { backgroundColor: colors.surface }]}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.fileIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="document" size={22} color={colors.primary} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.fileMeta}>
                  <Text style={[styles.fileSize, { color: colors.textTertiary }]}>
                    {formatSize(item.sizeBytes)}
                  </Text>
                  <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
                  <Text style={[styles.uploaderName, { color: colors.textTertiary }]}>
                    {item.uploader.displayName}
                  </Text>
                  <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
                  <Text style={[styles.date, { color: colors.textTertiary }]}>{dateStr}</Text>
                </View>
              </View>
              {canDelete ? (
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="download-outline" size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="ファイルはまだありません"
            description="ファイルをアップロードしてメンバーと共有しましょう"
          />
        }
      />
      <FloatingActionButton icon="cloud-upload-outline" onPress={handleUpload} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 80,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileSize: {
    fontSize: FontSize.xs,
  },
  dot: {
    fontSize: FontSize.xs,
  },
  uploaderName: {
    fontSize: FontSize.xs,
  },
  date: {
    fontSize: FontSize.xs,
  },
});
