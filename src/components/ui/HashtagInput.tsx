import React from 'react';
import { TextInput as RNTextInput, View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface HashtagInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  numberOfLines?: number;
}

const HASHTAG_RE = /(#[^\s#,、]*)/g;

/**
 * TikTok-style live hashtag input.
 * When the user types `#word`, the `#word` portion is rendered in the primary color.
 * The actual editable value is plain text — store/parse it on submit via parseHashtags().
 */
export function HashtagInput({ label, value, onChangeText, placeholder, numberOfLines = 1 }: HashtagInputProps) {
  const colors = useThemeColors();

  const parts = value.length > 0 ? value.split(HASHTAG_RE).filter(Boolean) : [];

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            minHeight: numberOfLines > 1 ? 24 * numberOfLines + 24 : 48,
          },
        ]}
      >
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline={numberOfLines > 1}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: colors.text }]}
        >
          {parts.length > 0 ? (
            <Text>
              {parts.map((part, i) =>
                part.startsWith('#') && part.length > 1 ? (
                  <Text key={i} style={{ color: colors.primary, fontWeight: '600' }}>
                    {part}
                  </Text>
                ) : (
                  <Text key={i} style={{ color: colors.text }}>
                    {part}
                  </Text>
                ),
              )}
            </Text>
          ) : null}
        </RNTextInput>
      </View>
    </View>
  );
}

/** Extract hashtag tokens (without leading #) from a free-text string. */
export function parseHashtags(input: string): string[] {
  const matches = input.match(HASHTAG_RE) ?? [];
  const tags = matches
    .map((m) => m.replace(/^#+/, '').trim())
    .filter((t) => t.length > 0);
  // Dedupe + cap at 10
  return Array.from(new Set(tags)).slice(0, 10);
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    justifyContent: 'center',
  },
  input: {
    fontSize: FontSize.md,
    padding: 0,
  },
});
