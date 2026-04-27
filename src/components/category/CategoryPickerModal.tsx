import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Shadows, Spacing } from '@/constants/theme';
import { Category } from '@/types/category';

interface SingleSelectProps {
  visible: boolean;
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  multiple?: false;
  selectedIds?: never;
  onToggle?: never;
}

interface MultiSelectProps {
  visible: boolean;
  categories: Category[];
  multiple: true;
  selectedIds: string[];
  onToggle: (categoryId: string) => void;
  onClose: () => void;
  selectedId?: never;
  onSelect?: never;
}

type CategoryPickerModalProps = SingleSelectProps | MultiSelectProps;

export function CategoryPickerModal(props: CategoryPickerModalProps) {
  const { visible, categories, onClose } = props;
  const isMulti = props.multiple === true;
  const colors = useThemeColors();

  const isSelected = (id: string) => {
    if (isMulti) return props.selectedIds.includes(id);
    return props.selectedId === id;
  };

  const handlePress = (id: string) => {
    if (isMulti) {
      props.onToggle(id);
    } else {
      props.onSelect(id);
      onClose();
    }
  };

  const renderItem = ({ item }: { item: Category }) => {
    const selected = isSelected(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: colors.card,
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          },
          Shadows.sm,
        ]}
        onPress={() => handlePress(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBadge, { backgroundColor: item.color + '14' }]}>
          <Ionicons name={item.icon as any} size={22} color={item.color} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isMulti ? 'カテゴリーを選択' : 'カテゴリーを選択'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isMulti ? (
              <Text style={[styles.doneText, { color: colors.primary }]}>完了</Text>
            ) : (
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <FlatList
          data={categories}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  doneText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.md,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  item: {
    flex: 1,
    padding: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: FontSize.xs,
    lineHeight: 15,
  },
});
