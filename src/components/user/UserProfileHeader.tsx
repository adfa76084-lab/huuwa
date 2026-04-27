import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { User } from '@/types/user';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { formatCount } from '@/utils/text';

function formatLinkLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function openExternalLink(url: string) {
  Alert.alert(
    '外部リンクを開きます',
    `このリンクは外部のWebサイトに移動します。\n安全なリンクか確認してから開いてください。\n\n${url}`,
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '開く',
        onPress: () => Linking.openURL(url).catch(() => {
          Alert.alert('エラー', 'リンクを開けませんでした');
        }),
      },
    ],
  );
}

interface UserProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followRequested?: boolean;
  onFollow?: () => void;
  onEditProfile?: () => void;
  onFollowers?: () => void;
  onFollowing?: () => void;
  onMessage?: () => void;
}

export function UserProfileHeader({
  user,
  isOwnProfile = false,
  isFollowing = false,
  followRequested = false,
  onFollow,
  onEditProfile,
  onFollowers,
  onFollowing,
  onMessage,
}: UserProfileHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Cover image area */}
      <View style={[styles.coverArea, { backgroundColor: colors.surfaceVariant }]}>
        {user.headerImageUrl ? (
          <Image
            source={{ uri: user.headerImageUrl }}
            style={styles.coverImage}
          />
        ) : (
          <View
            style={[
              styles.coverImage,
              { backgroundColor: user.headerColor ?? (colors.primaryLight + '40') },
            ]}
          />
        )}
      </View>

      {/* Avatar + action buttons row */}
      <View style={styles.avatarActionRow}>
        <View
          style={[
            styles.avatarBorder,
            { backgroundColor: colors.card },
          ]}
        >
          <Avatar uri={user.avatarUrl} size={80} />
        </View>

        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <Button
              title="プロフィールを編集"
              onPress={onEditProfile ?? (() => {})}
              variant="outline"
              size="sm"
            />
          ) : (
            <>
              {onMessage && (
                <TouchableOpacity
                  style={[
                    styles.iconAction,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={onMessage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.text} />
                </TouchableOpacity>
              )}
              <Button
                title={isFollowing ? 'フォロー中' : followRequested ? 'リクエスト中' : 'フォロー'}
                onPress={onFollow ?? (() => {})}
                variant={isFollowing || followRequested ? 'outline' : 'primary'}
                size="sm"
              />
            </>
          )}
        </View>
      </View>

      {/* User info section */}
      <View style={styles.infoSection}>
        <Text style={[styles.displayName, { color: colors.text }]}>
          {user.displayName}
        </Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>
          @{user.username}
        </Text>

        {/* Bio */}
        {user.bio ? (
          <Text style={[styles.bio, { color: colors.text }]}>
            {user.bio}
          </Text>
        ) : null}

        {/* Website link */}
        {user.websiteUrl ? (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openExternalLink(user.websiteUrl as string)}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={16} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
              {formatLinkLabel(user.websiteUrl)}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem} onPress={onFollowers} activeOpacity={0.7}>
            <Text style={[styles.statCount, { color: colors.text }]}>
              {formatCount(user.followersCount)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Followers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statItem} onPress={onFollowing} activeOpacity={0.7}>
            <Text style={[styles.statCount, { color: colors.text }]}>
              {formatCount(user.followingCount)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Following
            </Text>
          </TouchableOpacity>

          <View style={styles.statItem}>
            <Text style={[styles.statCount, { color: colors.text }]}>
              {formatCount(user.tweetsCount)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Posts
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  coverArea: {
    height: 140,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    marginTop: -40,
  },
  avatarBorder: {
    borderRadius: 44,
    padding: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  username: {
    fontSize: FontSize.md,
    marginTop: 2,
  },
  bio: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginTop: Spacing.sm + 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  linkText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    flexShrink: 1,
  },
  hobbies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xxl,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statCount: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
