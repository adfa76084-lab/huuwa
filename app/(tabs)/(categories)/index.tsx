import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { getCategories, getUserCategories, createUserCategory, joinGroup, leaveGroup } from '@/services/api/categoryService';
import { uploadImage } from '@/services/firebase/storage';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';
import { CategoryCard } from '@/components/category/CategoryCard';
import { CreateCategoryModal } from '@/components/category/CreateCategoryModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useCategoryStore } from '@/stores/categoryStore';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();

  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const toggleSelectedCategory = useCategoryStore((s) => s.toggleSelectedCategory);
  const clearSelectedCategories = useCategoryStore((s) => s.clearSelectedCategories);

  const [defaultCategories, setDefaultCategories] = useState<Category[]>(
    () => DEFAULT_CATEGORIES.map((c) => ({ ...c, imageUrl: null, membersCount: 0 })),
  );
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<0 | 1>(0); // 0=公式, 1=ユーザー

  const matches = useCallback(
    (cat: Category) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const tagHit = (cat.hashtags ?? []).some((t) => t.toLowerCase().includes(q));
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q) ||
        tagHit
      );
    },
    [search],
  );

  const filteredUserCategories = useMemo(
    () => userCategories.filter(matches),
    [userCategories, matches],
  );
  const filteredDefaultCategories = useMemo(
    () => defaultCategories.filter(matches),
    [defaultCategories, matches],
  );

  useEffect(() => {
    getCategories()
      .then(setDefaultCategories)
      .catch(() => {});
    getUserCategories()
      .then(setUserCategories)
      .catch(() => {});
  }, []);

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      const isSelected = selectedCategoryIds.includes(categoryId);
      toggleSelectedCategory(categoryId);

      // Guest users can still filter by category locally, just skip server sync
      if (!user) return;

      if (isSelected) {
        leaveGroup(categoryId, user.uid).catch(() => {});
        setDefaultCategories((prev) =>
          prev.map((c) => c.id === categoryId ? { ...c, membersCount: Math.max(0, c.membersCount - 1) } : c),
        );
        setUserCategories((prev) =>
          prev.map((c) => c.id === categoryId ? { ...c, membersCount: Math.max(0, c.membersCount - 1) } : c),
        );
      } else {
        joinGroup(categoryId, user.uid).catch(() => {});
        setDefaultCategories((prev) =>
          prev.map((c) => c.id === categoryId ? { ...c, membersCount: c.membersCount + 1 } : c),
        );
        setUserCategories((prev) =>
          prev.map((c) => c.id === categoryId ? { ...c, membersCount: c.membersCount + 1 } : c),
        );
      }
    },
    [user, selectedCategoryIds, toggleSelectedCategory],
  );

  const handleCreateCategory = useCallback(
    async (form: { name: string; icon: string; color: string; description: string; imageUri: string | null }) => {
      if (!user) return;
      let imageUrl: string | null = null;
      if (form.imageUri) {
        imageUrl = await uploadImage(`categories/${Date.now()}.jpg`, form.imageUri);
      }
      const newCat = await createUserCategory(user.uid, { ...form, imageUrl });
      setUserCategories((prev) => [...prev, newCat]);
    },
    [user],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="カテゴリーを検索（タイトル・説明・ハッシュタグ）"
        />
      </View>
      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={['公式', 'ユーザー']}
          selectedIndex={segment}
          onSelect={(i) => setSegment(i as 0 | 1)}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {segment === 0 ? (
          /* Default (official) categories */
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="grid" size={18} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                公式カテゴリー
              </Text>
            </View>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              いずれかのカテゴリーを選択してください
            </Text>

            {/* すべてのカテゴリー */}
            <View style={styles.gridItem}>
              <TouchableOpacity
                style={[
                  styles.allCategoryCard,
                  {
                    backgroundColor: selectedCategoryIds.length === 0 ? colors.primary + '12' : colors.card,
                    borderColor: selectedCategoryIds.length === 0 ? colors.primary : colors.border,
                    borderWidth: selectedCategoryIds.length === 0 ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
                onPress={() => {
                  if (selectedCategoryIds.length > 0) {
                    clearSelectedCategories();
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.allCategoryIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Ionicons name="grid" size={26} color={colors.primary} />
                </View>
                <Text style={[styles.allCategoryName, { color: colors.text }]}>
                  すべてのカテゴリー
                </Text>
                <Text style={[styles.allCategoryDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  すべての投稿・スレッド・オープンチャットが表示されます
                </Text>
                {selectedCategoryIds.length === 0 && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginTop: Spacing.xs }} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {filteredDefaultCategories.map((cat) => (
                <View key={cat.id} style={styles.gridItem}>
                  <CategoryCard
                    category={cat}
                    onPress={() => handleCategorySelect(cat.id)}
                    isSelected={selectedCategoryIds.includes(cat.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* User-created categories */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  みんなの作成したカテゴリー
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createButtonText}>作成</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
              誰でもカテゴリーを作成して、みんなで参加できます
            </Text>

            {filteredUserCategories.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="color-palette-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  まだカテゴリーがありません
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                  最初のカテゴリーを作成してみましょう！
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filteredUserCategories.map((cat) => (
                  <View key={cat.id} style={styles.gridItem}>
                    <CategoryCard
                      category={cat}
                      onPress={() => handleCategorySelect(cat.id)}
                      isSelected={selectedCategoryIds.includes(cat.id)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <CreateCategoryModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  segmentWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.xxxl * 2,
  },
  allCategoryCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs + 2,
  },
  allCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  allCategoryName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  allCategoryDesc: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    padding: Spacing.sm,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
  },
  showMoreText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
