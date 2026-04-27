import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, FontSize, Shadows, Spacing } from '@/constants/theme';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TextInput } from '@/components/ui/TextInput';
import { CategoryPickerModal } from '@/components/category/CategoryPickerModal';
import { createChatRoom } from '@/services/api/chatService';
import { uploadImage, getStoragePath } from '@/services/firebase/storage';
import { pickImage } from '@/services/media/imageUploader';
import { getUserCategories } from '@/services/api/categoryService';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';

export default function CreateOpenChatScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
  const allCategories = [...defaultCategories, ...userCategories];

  useEffect(() => {
    getUserCategories()
      .then(setUserCategories)
      .catch(() => {});
  }, []);

  const selectedCategory = useMemo(
    () => allCategories.find((c) => c.id === categoryId) ?? null,
    [allCategories, categoryId]
  );

  const canCreate = name.trim().length > 0 && categoryId !== null;

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  };

  const handleCreate = async () => {
    if (!canCreate || !user || !userProfile) return;

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        const path = getStoragePath('openchat-images', user.uid, 'cover.jpg');
        imageUrl = await uploadImage(path, imageUri);
      }

      const room = await createChatRoom(
        user.uid,
        {
          type: 'open',
          name: name.trim(),
          description: description.trim() || undefined,
          imageUrl,
          categoryId: categoryId!,
          memberUids: [],
        },
        { [user.uid]: userProfile }
      );
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'オープンチャットの作成に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ModalHeader
        title="オープンチャット作成"
        onClose={() => router.back()}
        onAction={handleCreate}
        actionLabel="作成"
        actionLoading={loading}
        actionDisabled={!canCreate}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image picker — hero area */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={[
              styles.imagePicker,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: imageUri ? colors.primary : colors.border,
              },
            ]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            {imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </>
            ) : (
              <Ionicons name="camera" size={32} color={colors.textTertiary} />
            )}
          </TouchableOpacity>

          {imageUri ? (
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setImageUri(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.removeImageText, { color: colors.error }]}>画像を削除</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.imageHint, { color: colors.textTertiary }]}>
              タップして画像を設定
            </Text>
          )}
        </View>

        {/* Form fields */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            label="タイトル"
            placeholder="オープンチャットの名前"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <TextInput
            label="説明"
            placeholder="どんなチャットですか？（任意）"
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            multiline
            numberOfLines={3}
            style={styles.descriptionInput}
          />

          {/* Category */}
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>カテゴリー</Text>
          <TouchableOpacity
            style={[
              styles.categoryPicker,
              {
                backgroundColor: colors.surface,
                borderColor: selectedCategory ? selectedCategory.color + '60' : colors.border,
              },
            ]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            {selectedCategory ? (
              <View style={styles.categorySelected}>
                <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color + '14' }]}>
                  <Ionicons name={selectedCategory.icon as any} size={20} color={selectedCategory.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                  {selectedCategory.description ? (
                    <Text style={[styles.categoryDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                      {selectedCategory.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.categoryPlaceholderRow}>
                <View style={[styles.categoryIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name="grid-outline" size={18} color={colors.textTertiary} />
                </View>
                <Text style={[styles.categoryPlaceholder, { color: colors.textTertiary }]}>
                  カテゴリーを選択
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CategoryPickerModal
        visible={pickerVisible}
        categories={allCategories}
        selectedId={categoryId}
        onSelect={(id) => {
          setCategoryId(id);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: Spacing.xxxl * 2,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  imageHint: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  removeImageText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  formCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.sm,
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  categoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  categorySelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  categoryPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 1,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  categoryDesc: {
    fontSize: FontSize.xs,
  },
  categoryPlaceholder: {
    fontSize: FontSize.md,
  },
});
