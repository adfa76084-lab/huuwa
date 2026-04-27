import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { MentionSuggest } from '@/components/mention/MentionSuggest';
import { Mention } from '@/types/mention';
import { MAX_MENTIONS_PER_POST } from '@/constants/limits';

interface ChatInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSend?: (content: string, mentions?: Mention[]) => void;
  onAttach?: () => void;
  onTyping?: () => void;
  placeholder?: string;
  attachmentPreview?: React.ReactNode;
  disabled?: boolean;
  enableMentions?: boolean;
  voiceButton?: React.ReactNode;
  sending?: boolean;
}

function getActiveMentionQuery(text: string, cursorPosition: number): string | null {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const match = textBeforeCursor.match(/@([a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯_]*)$/);
  if (match) {
    return match[1];
  }
  return null;
}

export function ChatInput({ value, onChangeText, onSend, onAttach, onTyping, placeholder, attachmentPreview, disabled, enableMentions = false, voiceButton, sending = false }: ChatInputProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [internalText, setInternalText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const text = value ?? internalText;

  const handleChangeText = useCallback(
    (newText: string) => {
      if (onChangeText) {
        onChangeText(newText);
      } else {
        setInternalText(newText);
      }
      onTyping?.();
    },
    [onChangeText]
  );

  // Mention suggest
  const mentionQuery = useMemo(
    () => enableMentions ? getActiveMentionQuery(text, cursorPosition) : null,
    [text, cursorPosition, enableMentions]
  );
  const showMentionSuggest = mentionQuery !== null;

  const handleSelectMention = useCallback(
    (user: { uid: string; username: string; displayName: string; avatarUrl: string | null }) => {
      if (mentions.some((m) => m.uid === user.uid) || mentions.length >= MAX_MENTIONS_PER_POST) return;

      setMentions((prev) => [...prev, { uid: user.uid, username: user.username }]);

      const textBeforeCursor = text.slice(0, cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      const before = text.slice(0, atIndex);
      const after = text.slice(cursorPosition);
      const newText = before + `@${user.username} ` + after;

      if (onChangeText) {
        onChangeText(newText);
      } else {
        setInternalText(newText);
      }
    },
    [mentions, text, cursorPosition, onChangeText]
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0 && !attachmentPreview) return;
    onSend?.(trimmed, enableMentions ? mentions : undefined);
    if (!onChangeText) {
      setInternalText('');
    }
    setMentions([]);
  }, [text, onSend, onChangeText, attachmentPreview, enableMentions, mentions]);

  const canSend = !disabled && (text.trim().length > 0 || !!attachmentPreview);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Mention suggest overlay */}
      {enableMentions && (
        <MentionSuggest
          query={mentionQuery ?? ''}
          visible={showMentionSuggest}
          onSelect={handleSelectMention}
          currentUid={user?.uid ?? null}
        />
      )}

      {/* Attachment preview */}
      {attachmentPreview && (
        <View style={styles.previewRow}>{attachmentPreview}</View>
      )}

      {/* Attach button */}
      {onAttach && (
        <TouchableOpacity
          onPress={onAttach}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.iconButton}
        >
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Text input */}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder ?? "メッセージを入力..."}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={handleChangeText}
          onSelectionChange={enableMentions ? (e) => setCursorPosition(e.nativeEvent.selection.end) : undefined}
          multiline
          maxLength={1000}
          editable={!disabled}
        />
      </View>

      {/* Voice button — always visible when provided (hidden during send) */}
      {voiceButton && !sending && (
        <View style={styles.voiceWrap}>{voiceButton}</View>
      )}

      {/* Send button — appears when there's something to send, or while sending */}
      {(canSend || sending || !voiceButton) && (
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend || sending}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            styles.sendButton,
            {
              backgroundColor: sending
                ? colors.primary
                : canSend
                ? colors.primary
                : colors.surfaceVariant,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSend ? '#FFFFFF' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewRow: {
    width: '100%',
    paddingBottom: Spacing.xs,
  },
  iconButton: {
    paddingBottom: Spacing.xs + 2,
  },
  inputWrap: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md + 2,
    minHeight: 38,
    justifyContent: 'center',
  },
  input: {
    fontSize: FontSize.md,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    lineHeight: 20,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  voiceWrap: {
    marginBottom: 2,
  },
});
