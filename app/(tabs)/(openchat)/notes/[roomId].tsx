import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { ChatNote } from '@/types/chat';
import { getNotes, createNote, deleteNote } from '@/services/api/noteService';
import { NoteCard } from '@/components/chat/NoteCard';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { CreateNoteModal } from '@/components/chat/CreateNoteModal';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotesScreen() {
  const colors = useThemeColors();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user, userProfile } = useAuth();
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const data = await getNotes(roomId);
    setNotes(data);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (title: string, content: string) => {
    if (!roomId || !user || !userProfile) return;
    await createNote(roomId, user.uid, userProfile, title, content);
    await load();
  };

  const handleDelete = (noteId: string) => {
    Alert.alert('ノートを削除', 'このノートを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          if (!roomId) return;
          await deleteNote(roomId, noteId);
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
        data={notes}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            canDelete={item.authorUid === user?.uid}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="ノートはまだありません"
            description="ノートを作成してメンバーと共有しましょう"
          />
        }
      />
      <FloatingActionButton
        icon="create-outline"
        onPress={() => setShowModal(true)}
      />
      <CreateNoteModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
      />
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
});
