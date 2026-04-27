import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { Spacing } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { UserListItem } from '@/components/user/UserListItem';
import { searchUsers } from '@/services/api/userService';
import { createChatRoom, findExistingDmRoom } from '@/services/api/chatService';
import { isMutualFollow, isFollowing } from '@/services/api/followService';
import { UserProfile, User } from '@/types/user';

export default function CreateChatScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (text.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const users = await searchUsers(text);
        setResults(users.filter((u) => u.uid !== user?.uid));
      } catch {
        // silently fail
      }
    },
    [user],
  );

  const handleSelectUser = useCallback(
    async (selectedUser: User) => {
      if (!user || !userProfile || loading) return;

      const policy = selectedUser.dmPolicy ?? 'everyone';
      if (policy === 'nobody') {
        Alert.alert('メッセージを送信できません', 'このユーザーはメッセージを受け付けていません');
        return;
      }
      if (policy === 'followers') {
        const followsTarget = await isFollowing(user.uid, selectedUser.uid);
        if (!followsTarget) {
          Alert.alert(
            'メッセージを送信できません',
            'このユーザーは自分がフォローしているユーザーからのみメッセージを受け取ります',
          );
          return;
        }
      }

      setLoading(true);
      try {
        // Check for existing DM room
        const existingRoom = await findExistingDmRoom(user.uid, selectedUser.uid);
        if (existingRoom) {
          router.back();
          router.push(`/(tabs)/(chat)/${existingRoom.id}`);
          return;
        }

        // Check mutual follow to determine status
        const mutual = await isMutualFollow(user.uid, selectedUser.uid);

        const memberProfiles: Record<string, UserProfile> = {
          [user.uid]: userProfile,
          [selectedUser.uid]: {
            uid: selectedUser.uid,
            displayName: selectedUser.displayName,
            username: selectedUser.username,
            avatarUrl: selectedUser.avatarUrl,
          },
        };

        const room = await createChatRoom(
          user.uid,
          {
            type: 'dm',
            name: '',
            memberUids: [selectedUser.uid],
          },
          memberProfiles,
          {
            status: mutual ? 'active' : 'pending',
            requestSenderUid: mutual ? null : user.uid,
          },
        );
        router.back();
        router.push(`/(tabs)/(chat)/${room.id}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'チャットの作成に失敗しました';
        Alert.alert('エラー', message);
      } finally {
        setLoading(false);
      }
    },
    [user, userProfile, loading, router],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="ユーザーを検索"
        onClose={() => router.back()}
      />

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={query}
            onChangeText={handleSearch}
            placeholder="ユーザー名で検索..."
          />
        </View>

        <View style={styles.listContainer}>
          <FlashList
            data={results}
            renderItem={({ item }) => (
              <UserListItem
                user={{
                  uid: item.uid,
                  displayName: item.displayName,
                  username: item.username,
                  avatarUrl: item.avatarUrl,
                }}
                onPress={() => handleSelectUser(item)}
              />
            )}
            keyExtractor={(item) => item.uid}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  searchContainer: {
    marginBottom: Spacing.md,
  },
  listContainer: {
    flex: 1,
  },
});
