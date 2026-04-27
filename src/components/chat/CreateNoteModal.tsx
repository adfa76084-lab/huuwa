import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TextInput } from '@/components/ui/TextInput';
import { Spacing } from '@/constants/theme';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}

export function CreateNoteModal({ visible, onClose, onSubmit }: CreateNoteModalProps) {
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (!content.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(title.trim(), content.trim());
      setTitle('');
      setContent('');
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'ノートの作成に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ModalHeader
          title="ノートを作成"
          onClose={onClose}
          onAction={handleSubmit}
          actionLabel="投稿"
          actionLoading={loading}
          actionDisabled={!title.trim() || !content.trim()}
        />
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <TextInput
            label="タイトル"
            value={title}
            onChangeText={setTitle}
            placeholder="ノートのタイトル"
            maxLength={100}
          />
          <TextInput
            label="内容"
            value={content}
            onChangeText={setContent}
            placeholder="ノートの内容を入力..."
            multiline
            numberOfLines={8}
            style={styles.contentInput}
            maxLength={2000}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: Spacing.lg,
  },
  contentInput: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
});
