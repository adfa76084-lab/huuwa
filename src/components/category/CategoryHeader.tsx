import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Category } from '@/types/category';
import { Button } from '@/components/ui/Button';
import { formatCount } from '@/utils/text';

interface CategoryHeaderProps {
  category: Category;
  isMember?: boolean;
  onJoin?: () => void;
}

export function CategoryHeader({
  category,
  isMember = false,
  onJoin,
}: CategoryHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Cover image or gradient area */}
      <View
        style={[
          styles.coverArea,
          { backgroundColor: category.color + '18' },
        ]}
      >
        {category.imageUrl && (
          <Image
            source={{ uri: category.imageUrl }}
            style={styles.coverImage}
          />
        )}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.card,
              ...Shadows.md,
            },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: category.color + '14' },
            ]}
          >
            <Ionicons
              name={category.icon as any}
              size={32}
              color={category.color}
            />
          </View>
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        <Text style={[styles.name, { color: colors.text }]}>
          {category.name}
        </Text>

        {category.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {category.description}
          </Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color={colors.textTertiary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatCount(category.membersCount)}
              </Text>
              {' members'}
            </Text>
          </View>
        </View>

        {/* Join button */}
        {onJoin && (
          <Button
            title={isMember ? '参加中' : 'コミュニティに参加'}
            onPress={onJoin}
            variant={isMember ? 'outline' : 'primary'}
            size="md"
            style={styles.joinButton}
          />
        )}
      </View>

      {/* Bottom divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  coverArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
    opacity: 0.3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -36,
  },
  iconInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    alignItems: 'center',
    paddingTop: 42,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontWeight: '700',
  },
  statText: {
    fontSize: FontSize.sm,
  },
  joinButton: {
    marginTop: Spacing.lg,
    minWidth: 160,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
