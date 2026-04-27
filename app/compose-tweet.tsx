import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
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
import { getUserCategories } from '@/services/api/categoryService';
import { useCategoryStore } from '@/stores/categoryStore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';
import { ComposeTweetForm } from '@/types/tweet';
import { PollCreatorModal } from '@/components/thread/PollCreatorModal';

const MAX_IMAGES = 4;

type PostStatus = 'idle' | 'uploading' | 'done' | 'error';

export default function ComposeTweetScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { categoryId: presetCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { user, userProfile } = useAuth();
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    presetCategoryId ? [presetCategoryId] : []
  );
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pollCreatorVisible, setPollCreatorVisible] = useState(false);
  const [pollId, setPollId] = useState<string | null>(null);

  // Progress state
  const [postStatus, setPostStatus] = useState<PostStatus>('idle');
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
  const allCategories = [...defaultCategories, ...userCategories];
  // Homeで選択中のカテゴリーのみ表示（未選択なら全カテゴリー）
  const categories = selectedCategoryIds.length > 0
    ? allCategories.filter((c) => selectedCategoryIds.includes(c.id))
    : allCategories;

  useEffect(() => {
    getUserCategories()
      .then(setUserCategories)
      .catch(() => {});
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

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const handlePost = async (form?: ComposeTweetForm) => {
    if (!content.trim()) {
      Alert.alert('エラー', '投稿する内容を入力してください。');
      return;
    }
    if (categoryIds.length === 0) {
      Alert.alert('エラー', 'カテゴリーを1つ以上選択してください。');
      return;
    }
    if (!user || !userProfile) return;

    setLoading(true);
    setPostStatus('uploading');
    setProgress(0);

    // テキストのみの場合は即座に進捗を表示
    if (images.length === 0) {
      setProgress(50);
    }

    try {
      await createTweet(user.uid, {
        content,
        images,
        categoryIds,
        parentTweetId: null,
        pollId,
        mentions: form?.mentions,
      }, userProfile, (p) => {
        setProgress(p);
      });

      setProgress(100);
      setPostStatus('done');

      // Checkmark animation
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Auto-close after showing success
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (e) {
      setPostStatus('error');
      const message = e instanceof Error ? e.message : '投稿の作成に失敗しました。';
      Alert.alert('エラー', message, [
        { text: 'OK', onPress: () => { setPostStatus('idle'); setLoading(false); } },
      ]);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const statusLabel = postStatus === 'uploading'
    ? images.length > 0
      ? `画像をアップロード中... ${progress}%`
      : `投稿中... ${progress}%`
    : '投稿完了！';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="投稿する"
        onClose={() => router.back()}
        onAction={handlePost}
        actionLabel="投稿"
        actionLoading={loading}
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
          onSubmit={async (form) => {
            await handlePost(form);
          }}
          loading={loading}
          pollId={pollId}
          onCreatePoll={() => setPollCreatorVisible(true)}
          onRemovePoll={() => setPollId(null)}
        />
      </View>

      {/* Progress overlay */}
      {postStatus !== 'idle' && (
        <View style={styles.overlay}>
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            {postStatus === 'uploading' ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Animated.View style={[styles.checkmarkCircle, { backgroundColor: colors.success, transform: [{ scale: checkmarkScale }] }]}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </Animated.View>
            )}

            <Text style={[styles.progressLabel, { color: colors.text }]}>
              {statusLabel}
            </Text>

            {/* Progress bar */}
            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: postStatus === 'done' ? colors.success : colors.primary,
                    width: progressWidth,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}

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
  // Progress overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  progressCard: {
    width: 260,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
  },
  checkmarkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
