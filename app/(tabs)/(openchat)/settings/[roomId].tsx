import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing } from '@/constants/theme';
import { OPEN_CHAT_NAME_MAX_LENGTH, OPEN_CHAT_DESC_MAX_LENGTH } from '@/constants/limits';
import { ChatRoom } from '@/types/chat';
import { getChatRoom, updateChatRoom } from '@/services/api/chatService';
import { uploadImage, getStoragePath } from '@/services/firebase/storage';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

export default function ChatSettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const chatRoom = await getChatRoom(roomId);
      if (chatRoom) {
        setRoom(chatRoom);
        setName(chatRoom.name ?? '');
        setDescription(chatRoom.description ?? '');
        setImageUrl(chatRoom.imageUrl);
      }
      setLoading(false);
    })();
  }, [roomId]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    if (!user || !roomId) return;
    const path = getStoragePath('chatRoomImages', roomId, 'avatar.jpg');
    const url = await uploadImage(path, result.assets[0].uri);
    setImageUrl(url);
  };

  const handleSave = async () => {
    if (!roomId || !name.trim()) {
      Alert.alert('エラー', 'グループ名を入力してください');
      return;
    }
    setSaving(true);
    try {
      await updateChatRoom(roomId, {
        name: name.trim(),
        description: description.trim() || null,
        imageUrl,
      });
      Alert.alert('保存完了', '設定を更新しました');
      router.back();
    } catch {
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !room) {
    return <LoadingIndicator fullScreen />;
  }

  // Only admin can access
  if (room.createdBy !== user?.uid) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarSection}>
        <Avatar uri={imageUrl} size={96} onPress={handlePickImage} />
        <Button
          title="画像を変更"
          onPress={handlePickImage}
          variant="outline"
          size="sm"
        />
      </View>

      <TextInput
        label="グループ名"
        value={name}
        onChangeText={setName}
        placeholder="グループ名を入力"
        maxLength={OPEN_CHAT_NAME_MAX_LENGTH}
      />

      <TextInput
        label="説明"
        value={description}
        onChangeText={setDescription}
        placeholder="グループの説明（任意）"
        multiline
        numberOfLines={4}
        maxLength={OPEN_CHAT_DESC_MAX_LENGTH}
      />

      <Button
        title="保存"
        onPress={handleSave}
        loading={saving}
        disabled={!name.trim()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
});
