import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  POLL_MIN_OPTIONS,
  POLL_MAX_OPTIONS,
  POLL_QUESTION_MAX_LENGTH,
  POLL_OPTION_MAX_LENGTH,
} from '@/constants/limits';

interface PollCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (question: string, options: string[]) => void;
}

export function PollCreatorModal({ visible, onClose, onCreate }: PollCreatorModalProps) {
  const colors = useThemeColors();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const canAdd = options.length < POLL_MAX_OPTIONS;
  const canCreate =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= POLL_MIN_OPTIONS;

  const handleAddOption = () => {
    if (canAdd) setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= POLL_MIN_OPTIONS) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleChangeOption = (index: number, text: string) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleCreate = () => {
    const validOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < POLL_MIN_OPTIONS || !question.trim()) return;
    onCreate(question.trim(), validOptions);
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.headerBtn, { color: colors.textSecondary }]}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>アンケート作成</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!canCreate}>
            <Text
              style={[
                styles.headerBtn,
                { color: canCreate ? colors.primary : colors.textTertiary, fontWeight: '600' },
              ]}
            >
              作成
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Question */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>質問</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="質問を入力..."
            placeholderTextColor={colors.textTertiary}
            value={question}
            onChangeText={setQuestion}
            maxLength={POLL_QUESTION_MAX_LENGTH}
            multiline
          />

          {/* Options */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.xl }]}>
            選択肢（{options.length}/{POLL_MAX_OPTIONS}）
          </Text>

          {options.map((opt, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.optionInput,
                  { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                placeholder={`選択肢 ${index + 1}`}
                placeholderTextColor={colors.textTertiary}
                value={opt}
                onChangeText={(t) => handleChangeOption(index, t)}
                maxLength={POLL_OPTION_MAX_LENGTH}
              />
              {options.length > POLL_MIN_OPTIONS && (
                <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {canAdd && (
            <TouchableOpacity
              onPress={handleAddOption}
              style={[styles.addButton, { borderColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addLabel, { color: colors.primary }]}>選択肢を追加</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: FontSize.md,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    minHeight: 44,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  optionInput: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.xs,
  },
  addLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
