import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TweetComposer } from '@/components/tweet/TweetComposer';
import { CategoryPickerModal } from '@/components/category/CategoryPickerModal';
import { createTweet } from '@/services/api/tweetService';
import { createPoll } from '@/services/api/pollService';
import { showInterstitial } from '@/services/ads/interstitialManager';
import { subscribeToUserCategories } from '@/services/api/categoryService';
import { extractHashtags } from '@/services/api/hashtagService';
import { useFeedStore } from '@/stores/feedStore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';
import { ComposeTweetForm, Tweet } from '@/types/tweet';
import { PollCreatorModal } from '@/components/thread/PollCreatorModal';

const MAX_IMAGES = 4;

export default function ComposeTweetScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { categoryId: presetCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { user, userProfile } = useAuth();
  const addOptimisticTweet = useFeedStore((s) => s.addOptimisticTweet);
  const removeOptimisticTweet = useFeedStore((s) => s.removeOptimisticTweet);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    presetCategoryId ? [presetCategoryId] : []
  );
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pollCreatorVisible, setPollCreatorVisible] = useState(false);
  const [pollId, setPollId] = useState<string | null>(null);

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
  const allCategories = [...defaultCategories, ...userCategories];
  // Always show every category (defaults + all user-created) in the composer
  // so users can post to categories they made, even if they haven't joined
  // them as feed filters on Home.
  const categories = allCategories;

  useEffect(() => {
    const unsub = subscribeToUserCategories(setUserCategories);
    return unsub;
  }, []);

  const selectedCategories = useMemo(
    () => allCategories.filter((c) => categoryIds.includes(c.id)),
    [allCategories, categoryIds]
  );

  const handleToggleCategory = useCallback((id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }, []);

  const handleRemoveCategory = useCallback((id: string) => {
    setCategoryIds((prev) => prev.filter((cid) => cid !== id));
  }, []);

  const handleAddImage = useCallback(async () => {
    if (images.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    }
  }, [images.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = (form?: ComposeTweetForm) => {
    if (!content.trim()) {
      Alert.alert('エラー', '投稿する内容を入力してください。');
      return;
    }
    if (categoryIds.length === 0) {
      Alert.alert('エラー', 'カテゴリーを1つ以上選択してください。');
      return;
    }
    if (!user || !userProfile) return;

    // Build optimistic tweet so it appears at the top of the feed instantly.
    // Local image URIs render fine in <Image> until the real upload completes.
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mentions = form?.mentions ?? [];
    const hashtags = extractHashtags(content);
    const now = Timestamp.now();
    const optimisticTweet: Tweet = {
      id: tempId,
      author: userProfile,
      authorUid: user.uid,
      content,
      imageUrls: images,
      categoryId: categoryIds[0] ?? null,
      categoryIds,
      parentTweetId: null,
      pollId: pollId ?? null,
      hashtags,
      mentions,
      likesCount: 0,
      repliesCount: 0,
      bookmarksCount: 0,
      viewsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    addOptimisticTweet(optimisticTweet);

    // Close the composer immediately — network call runs in the background.
    router.back();
    showInterstitial().catch(() => {});

    createTweet(user.uid, {
      content,
      images,
      categoryIds,
      parentTweetId: null,
      pollId,
      mentions: form?.mentions,
    }, userProfile).catch((e) => {
      removeOptimisticTweet(tempId);
      const message = e instanceof Error ? e.message : '投稿の作成に失敗しました。';
      Alert.alert('投稿に失敗しました', message);
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="投稿する"
        onClose={() => router.back()}
        onAction={handlePost}
        actionLabel="投稿"
        actionDisabled={!content.trim() || categoryIds.length === 0}
      />
      {/* Category selector — pinned right below header */}
      <View style={[styles.categoryBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categorySelectorRow}
        >
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.categorySelectorText, { color: colors.primary }]}>
              カテゴリー
            </Text>
          </TouchableOpacity>

          {selectedCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, { backgroundColor: cat.color + '18' }]}
              onPress={() => handleRemoveCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Ionicons name={cat.icon as any} size={14} color={cat.color} />
              <Text style={[styles.categoryChipText, { color: cat.color }]}>
                {cat.name}
              </Text>
              <Ionicons name="close-circle" size={14} color={cat.color + '80'} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Composer — fills remaining space */}
      <View style={styles.content}>
        <TweetComposer
          value={content}
          onChangeText={setContent}
          images={images}
          onAddImage={handleAddImage}
          onRemoveImage={handleRemoveImage}
          onSubmit={(form) => {
            handlePost(form);
          }}
          pollId={pollId}
          onCreatePoll={() => setPollCreatorVisible(true)}
          onRemovePoll={() => setPollId(null)}
        />
      </View>

      <CategoryPickerModal
        visible={pickerVisible}
        categories={categories}
        multiple
        selectedIds={categoryIds}
        onToggle={handleToggleCategory}
        onClose={() => setPickerVisible(false)}
      />
      <PollCreatorModal
        visible={pollCreatorVisible}
        onClose={() => setPollCreatorVisible(false)}
        onCreate={async (question, options) => {
          if (!user) return;
          try {
            const poll = await createPoll(user.uid, question, options);
            setPollId(poll.id);
          } catch {
            Alert.alert('エラー', 'アンケートの作成に失敗しました');
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categorySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  categorySelectorText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
