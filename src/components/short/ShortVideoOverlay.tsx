import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShortVideo } from '@/types/short';
import { Avatar } from '@/components/ui/Avatar';
import { FontSize, Spacing } from '@/constants/theme';
import { formatCount } from '@/utils/text';

interface ShortVideoOverlayProps {
  short: ShortVideo;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onProfile?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

function CaptionText({ caption }: { caption: string }) {
  if (!caption) return null;

  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!expanded && e.nativeEvent.lines.length > 2) {
        setIsTruncated(true);
      }
    },
    [expanded],
  );

  // Split caption into parts: hashtags (blue) and normal text
  const parts = caption.split(/(#\S+)/g);

  return (
    <View>
      <Text
        style={styles.caption}
        numberOfLines={expanded ? undefined : 2}
        onTextLayout={onTextLayout}
      >
        {parts.map((part, i) =>
          part.startsWith('#') ? (
            <Text key={i} style={styles.hashtag}>
              {part}
            </Text>
          ) : (
            <Text key={i}>{part}</Text>
          ),
        )}
      </Text>
      {isTruncated && !expanded && (
        <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <Text style={styles.seeMore}>もっと見る</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ShortVideoOverlay({
  short,
  onLike,
  onComment,
  onBookmark,
  onProfile,
  onShare,
  isLiked = false,
  isBookmarked = false,
}: ShortVideoOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Right-side gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rightGradient}
        pointerEvents="none"
      />

      {/* Right-side action buttons */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 16 }]}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? '#FF4458' : '#FFFFFF'}
          />
          <Text style={styles.actionCount}>
            {formatCount(short.likesCount)}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onComment}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionCount}>
            {formatCount(short.commentsCount)}
          </Text>
        </TouchableOpacity>

        {/* Bookmark / Save */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onBookmark}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={isBookmarked ? '#FFD700' : '#FFFFFF'}
          />
          <Text style={styles.actionCount}>保存</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionCount}>シェア</Text>
        </TouchableOpacity>

        {/* Profile avatar (right-bottom) */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onProfile}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Avatar uri={short.author.avatarUrl} size={44} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom info area */}
      <View
        style={[styles.bottomInfo, { paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={onProfile}
          activeOpacity={0.7}
          style={styles.authorRow}
        >
          <Text style={styles.authorName}>
            {short.author.displayName || short.author.username}
          </Text>
        </TouchableOpacity>

        <CaptionText caption={short.caption} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
  },
  rightGradient: {
    position: 'absolute',
    top: '40%',
    right: 0,
    bottom: 0,
    width: 80,
  },
  rightActions: {
    position: 'absolute',
    right: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 24,
  },
  bottomInfo: {
    position: 'absolute',
    left: 0,
    right: 80,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hashtag: {
    color: '#5EA0EF',
    fontWeight: '600',
  },
  seeMore: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
