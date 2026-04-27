import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUiStore } from '@/stores/uiStore';
import { Spacing, FontSize } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const themeOptions: ThemeOption[] = [
  {
    mode: 'light',
    label: 'ライト',
    description: '常にライトモードで表示',
    icon: 'sunny-outline',
  },
  {
    mode: 'dark',
    label: 'ダーク',
    description: '常にダークモードで表示',
    icon: 'moon-outline',
  },
  {
    mode: 'system',
    label: 'デバイスの設定を使う',
    description: 'デバイスのシステム設定に従います',
    icon: 'phone-portrait-outline',
  },
];

export default function ThemeSettingsScreen() {
  const colors = useThemeColors();
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        テーマ
      </Text>
      <View style={[styles.section, { borderColor: colors.border }]}>
        {themeOptions.map((option, index) => {
          const isSelected = themeMode === option.mode;
          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.row,
                index < themeOptions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => setThemeMode(option.mode)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={colors.textSecondary}
                style={styles.rowIcon}
              />
              <View style={styles.rowTextContainer}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: isSelected ? colors.primary : colors.textTertiary },
                ]}
              >
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    marginRight: Spacing.md,
    width: 24,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  rowDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
