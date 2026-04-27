import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, Shadows, Spacing } from '@/constants/theme';
import { ModalHeader } from './ModalHeader';

type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
type TargetType = 'tweet' | 'thread' | 'user' | 'message';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description: string) => void;
  targetType: TargetType;
}

const REPORT_REASONS: { value: ReportReason; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'spam', label: 'スパム', icon: 'mail-unread-outline' },
  { value: 'harassment', label: 'ハラスメント', icon: 'warning-outline' },
  { value: 'inappropriate', label: '不適切なコンテンツ', icon: 'eye-off-outline' },
  { value: 'other', label: 'その他', icon: 'ellipsis-horizontal-outline' },
];

export function ReportModal({
  visible,
  onClose,
  onSubmit,
  targetType,
}: ReportModalProps) {
  const colors = useThemeColors();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedReason, description);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ModalHeader
          title={`${targetType}を報告`}
          onClose={handleClose}
          onAction={handleSubmit}
          actionLabel="送信"
          actionLoading={submitting}
          actionDisabled={!selectedReason}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            この{targetType}を報告する理由を選択してください
          </Text>

          {REPORT_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.value;
            return (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  {
                    backgroundColor: colors.card,
                  },
                  isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                  },
                  !isSelected && {
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                  Shadows.sm,
                ]}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.reasonIconWrap,
                    {
                      backgroundColor: isSelected ? colors.primaryLight + '20' : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Ionicons
                    name={reason.icon}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                >
                  {reason.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.xxl }]}>
            Additional details (optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="詳細を入力してください..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  reasonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    minHeight: 100,
  },
});
