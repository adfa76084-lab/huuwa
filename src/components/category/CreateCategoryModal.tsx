import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { TextInput } from '@/components/ui/TextInput';
import { HashtagInput, parseHashtags } from '@/components/ui/HashtagInput';

const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'star', label: 'スター' },
  { name: 'heart', label: 'ハート' },
  { name: 'flash', label: 'フラッシュ' },
  { name: 'rocket', label: 'ロケット' },
  { name: 'trophy', label: 'トロフィー' },
  { name: 'diamond', label: 'ダイヤ' },
  { name: 'bulb', label: '電球' },
  { name: 'compass', label: 'コンパス' },
  { name: 'planet', label: '惑星' },
  { name: 'cafe', label: 'カフェ' },
  { name: 'beer', label: 'ビール' },
  { name: 'pizza', label: 'ピザ' },
  { name: 'paw', label: '肉球' },
  { name: 'musical-note', label: '音符' },
  { name: 'brush', label: 'ブラシ' },
  { name: 'bicycle', label: '自転車' },
];

const COLOR_OPTIONS = [
  '#E74C3C', '#E84393', '#9B59B6', '#6C5CE7',
  '#3498DB', '#0984E3', '#00CEC9', '#00B894',
  '#27AE60', '#F39C12', '#E67E22', '#D35400',
];

interface CreateCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: { name: string; icon: string; color: string; description: string; imageUri: string | null; hashtags: string[] }) => Promise<void>;
}

export function CreateCategoryModal({ visible, onClose, onSubmit }: CreateCategoryModalProps) {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColor, setSelectedColor] = useState('#6C5CE7');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setHashtagsInput('');
    setSelectedIcon('star');
    setSelectedColor('#6C5CE7');
    setImageUri(null);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'カテゴリー名を入力してください');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        description: description.trim(),
        imageUri,
        hashtags: parseHashtags(hashtagsInput),
      });
      reset();
      onClose();
    } catch {
      Alert.alert('エラー', 'カテゴリーの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ModalHeader
          title="新しいカテゴリー"
          onClose={handleClose}
          onAction={handleCreate}
          actionLabel="作成"
          actionLoading={loading}
          actionDisabled={!name.trim()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preview */}
          <View style={styles.previewRow}>
            {imageUri ? (
              <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <View style={[styles.imageEditBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="pencil" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.previewBadge, { backgroundColor: selectedColor + '20' }]}>
                <Ionicons name={selectedIcon as any} size={32} color={selectedColor} />
              </View>
            )}
            <Text style={[styles.previewName, { color: colors.text }]}>
              {name || 'カテゴリー名'}
            </Text>
          </View>

          {/* Image picker */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>画像</Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
              {imageUri ? '画像を変更' : 'アルバムから選択'}
            </Text>
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImageUri(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#E74C3C" />
              <Text style={styles.removeImageText}>画像を削除</Text>
            </TouchableOpacity>
          )}

          <TextInput
            label="名前"
            value={name}
            onChangeText={setName}
            placeholder="カテゴリー名"
          />

          <TextInput
            label="説明"
            value={description}
            onChangeText={setDescription}
            placeholder="どんなカテゴリーですか？"
            multiline
            numberOfLines={3}
          />

          <HashtagInput
            label="ハッシュタグ（任意）"
            value={hashtagsInput}
            onChangeText={setHashtagsInput}
            placeholder="例: #ゲーム #アニメ #音楽"
          />
          <TouchableOpacity
            style={[styles.addHashtagBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}
            onPress={() => {
              setHashtagsInput((prev) => {
                const trimmed = prev.trimEnd();
                if (trimmed.length === 0) return '#';
                return `${trimmed} #`;
              });
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.addHashtagText, { color: colors.primary }]}>
              ハッシュタグを追加
            </Text>
          </TouchableOpacity>

          {/* Icon picker */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }, !!imageUri && styles.disabledSection]}>アイコン</Text>
          <View style={[styles.iconGrid, !!imageUri && styles.disabledSection]} pointerEvents={imageUri ? 'none' : 'auto'}>
            {ICON_OPTIONS.map((opt) => {
              const isSelected = selectedIcon === opt.name;
              return (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.iconItem,
                    {
                      backgroundColor: isSelected ? selectedColor + '20' : colors.surfaceVariant,
                      borderColor: isSelected ? selectedColor : 'transparent',
                      borderWidth: isSelected ? 1.5 : 0,
                    },
                  ]}
                  onPress={() => setSelectedIcon(opt.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.name as any}
                    size={22}
                    color={isSelected ? selectedColor : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color picker */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }, !!imageUri && styles.disabledSection]}>カラー</Text>
          <View style={[styles.colorGrid, !!imageUri && styles.disabledSection]} pointerEvents={imageUri ? 'none' : 'auto'}>
            {COLOR_OPTIONS.map((c) => {
              const isSelected = selectedColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorItem,
                    { backgroundColor: c },
                    isSelected && styles.colorItemSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                  activeOpacity={0.7}
                >
                  {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  previewRow: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadge: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  removeImageText: {
    fontSize: FontSize.sm,
    color: '#E74C3C',
  },
  previewName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconItem: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  disabledSection: {
    opacity: 0.3,
  },
  addHashtagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addHashtagText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
