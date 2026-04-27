import { create } from 'zustand';
import { Category } from '@/types/category';

interface CategoryState {
  categories: Category[];
  joinedGroups: Category[];
  selectedCategoryIds: string[];
  isLoading: boolean;

  setCategories: (categories: Category[]) => void;
  setJoinedGroups: (groups: Category[]) => void;
  addJoinedGroup: (group: Category) => void;
  removeJoinedGroup: (groupId: string) => void;
  toggleSelectedCategory: (categoryId: string) => void;
  clearSelectedCategories: () => void;
  setLoading: (loading: boolean) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  joinedGroups: [],
  selectedCategoryIds: [],
  isLoading: false,

  setCategories: (categories) => set({ categories }),
  setJoinedGroups: (joinedGroups) => set({ joinedGroups }),
  addJoinedGroup: (group) =>
    set((state) => ({
      joinedGroups: [...state.joinedGroups.filter((g) => g.id !== group.id), group],
    })),
  removeJoinedGroup: (groupId) =>
    set((state) => ({
      joinedGroups: state.joinedGroups.filter((g) => g.id !== groupId),
    })),
  toggleSelectedCategory: (categoryId) =>
    set((state) => ({
      selectedCategoryIds: state.selectedCategoryIds.includes(categoryId)
        ? state.selectedCategoryIds.filter((id) => id !== categoryId)
        : [...state.selectedCategoryIds, categoryId],
    })),
  clearSelectedCategories: () => set({ selectedCategoryIds: [] }),
  setLoading: (isLoading) => set({ isLoading }),
}));
