import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Text, Image as RNImage } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TextInput } from '@/components/ui/TextInput';
import { CategoryPickerModal } from '@/components/category/CategoryPickerModal';
import { MentionSuggest } from '@/components/mention/MentionSuggest';
import { MentionBadgeList } from '@/components/mention/MentionBadgeList';
import { createThread } from '@/services/api/threadService';
import { uploadImage } from '@/services/firebase/storage';
import { getUserCategories } from '@/services/api/categoryService';
import { useCategoryStore } from '@/stores/categoryStore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';
import { Mention } from '@/types/mention';
import { MAX_MENTIONS_PER_POST } from '@/constants/limits';

export default function CreateThreadScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { categoryId: presetCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { user, userProfile } = useAuth();
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(presetCategoryId ?? null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
  const allCategories = [...defaultCategories, ...userCategories];
  const categories = selectedCategoryIds.length > 0
    ? allCategories.filter((c) => selectedCategoryIds.includes(c.id))
    : allCategories;

  useEffect(() => {
    getUserCategories()
      .then(setUserCategories)
      .catch(() => {});
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Mention detection — allow Japanese chars so displayName search works.
  const mentionQuery = useMemo(() => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯_]*)$/);
    return match ? match[1] : null;
  }, [content, cursorPosition]);
  const showMentionSuggest = mentionQuery !== null;

  // Anchor the suggest popup just below the line where '@' was typed.
  // The wrapping <View> contains the labeled TextInput; account for label
  // height + the input's vertical padding before the first text line.
  const mentionAnchorTop = useMemo(() => {
    if (!showMentionSuggest) return undefined;
    const atIndex = content.slice(0, cursorPosition).lastIndexOf('@');
    if (atIndex < 0) return undefined;
    const linesBefore = (content.slice(0, atIndex).match(/\n/g) || []).length;
    const LABEL_BLOCK = 26; // label fontSize.sm (~14) + marginBottom Spacing.sm (8) + a little
    const INPUT_PADDING_TOP = Spacing.md;
    const LINE_HEIGHT = 22;
    return LABEL_BLOCK + INPUT_PADDING_TOP + (linesBefore + 1) * LINE_HEIGHT;
  }, [showMentionSuggest, content, cursorPosition]);

  const handleSelectMention = useCallback(
    (user: { uid: string; username: string; displayName: string; avatarUrl: string | null }) => {
      if (mentions.some((m) => m.uid === user.uid) || mentions.length >= MAX_MENTIONS_PER_POST) return;
      setMentions((prev) => [...prev, { uid: user.uid, username: user.username }]);
      const textBeforeCursor = content.slice(0, cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      const before = content.slice(0, atIndex);
      const after = content.slice(cursorPosition);
      setContent(before + `@${user.username} ` + after);
    },
    [mentions, content, cursorPosition]
  );

  const handleRemoveMention = useCallback((uid: string) => {
    setMentions((prev) => prev.filter((m) => m.uid !== uid));
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'スレッドのタイトルを入力してください。');
      return;
    }
    if (!content.trim()) {
      Alert.alert('エラー', '最初の投稿内容を入力してください。');
      return;
    }
    if (!categoryId) {
      Alert.alert('エラー', 'カテゴリーを選択してください。');
      return;
    }
    if (!user || !userProfile) return;

    setLoading(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (imageUri) {
        uploadedImageUrl = await uploadImage(`thread-images/${user.uid}/${Date.now()}.jpg`, imageUri);
      }

      await createThread(user.uid, {
        title,
        content,
        categoryId,
        imageUrl: uploadedImageUrl,
        mentions,
      }, userProfile);
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'スレッドの作成に失敗しました。';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="新規スレッド"
        onClose={() => router.back()}
        onAction={handleCreate}
        actionLabel="作成"
        actionLoading={loading}
        actionDisabled={!title.trim() || !content.trim() || !categoryId}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category selector */}
        <TouchableOpacity
          style={[styles.categorySelector, { backgroundColor: colors.surfaceVariant }]}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          {selectedCategory ? (
            <>
              <Ionicons name={selectedCategory.icon as any} size={16} color={selectedCategory.color} />
              <Text style={[styles.categorySelectorText, { color: colors.text }]}>
                {selectedCategory.name}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="grid-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.categorySelectorText, { color: colors.textTertiary }]}>
                カテゴリーを選択
              </Text>
            </>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TextInput
          label="タイトル"
          value={title}
          onChangeText={setTitle}
          placeholder="スレッドのタイトル"
        />

        {/* Image picker */}
        <Text style={[styles.imageLabel, { color: colors.textSecondary }]}>画像（任意）</Text>
        {imageUri ? (
          <View style={styles.imagePreviewWrapper}>
            <RNImage source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={[styles.imageRemoveButton, { backgroundColor: colors.error }]}
              onPress={() => setImageUri(null)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.imagePickerButton, { borderColor: colors.border }]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
            <Text style={[styles.imagePickerText, { color: colors.textTertiary }]}>
              画像を追加
            </Text>
          </TouchableOpacity>
        )}

        <View>
          <TextInput
            label="内容"
            value={content}
            onChangeText={setContent}
            placeholder="最初の投稿を書く..."
            multiline
            numberOfLines={5}
            style={styles.contentInput}
            onSelectionChange={(e: any) => setCursorPosition(e.nativeEvent.selection.end)}
          />
          <MentionSuggest
            query={mentionQuery ?? ''}
            visible={showMentionSuggest}
            onSelect={handleSelectMention}
            currentUid={user?.uid ?? null}
            anchorTop={mentionAnchorTop}
          />
        </View>
        <MentionBadgeList mentions={mentions} onRemove={handleRemoveMention} />
      </ScrollView>

      <CategoryPickerModal
        visible={pickerVisible}
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  categorySelectorText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  imageLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  imagePreviewWrapper: {
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
