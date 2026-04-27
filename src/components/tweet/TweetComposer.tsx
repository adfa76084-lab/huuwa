import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ComposeTweetForm } from '@/types/tweet';
import { Mention } from '@/types/mention';
import { HashtagBadgeList } from '@/components/hashtag/HashtagBadgeList';
import { HashtagSuggest } from '@/components/hashtag/HashtagSuggest';
import { MentionSuggest } from '@/components/mention/MentionSuggest';
import { MentionBadgeList } from '@/components/mention/MentionBadgeList';
import { MAX_HASHTAGS_PER_TWEET, MAX_MENTIONS_PER_POST } from '@/constants/limits';

const MAX_CHARS = 280;
const MAX_IMAGES = 4;

interface TweetComposerProps {
  value?: string;
  onChangeText?: (text: string) => void;
  images?: string[];
  onAddImage?: () => void;
  onRemoveImage?: (index: number) => void;
  maxLength?: number;
  placeholder?: string;
  onSubmit?: (form: ComposeTweetForm) => void;
  loading?: boolean;
  parentTweetId?: string | null;
  categoryIds?: string[];
  pollId?: string | null;
  onCreatePoll?: () => void;
  onRemovePoll?: () => void;
}

/**
 * Detect if user is currently typing a hashtag.
 * Returns the partial tag text (after #) or null.
 */
function getActiveHashtagQuery(text: string, cursorPosition: number): string | null {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const match = textBeforeCursor.match(/#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]*)$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Detect if user is currently typing a mention.
 * Returns the partial username text (after @) or null.
 * Allows Japanese characters so displayName search works while composing.
 */
function getActiveMentionQuery(text: string, cursorPosition: number): string | null {
  const textBeforeCursor = text.slice(0, cursorPosition);
  const match = textBeforeCursor.match(/@([a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯_]*)$/);
  if (match) {
    return match[1];
  }
  return null;
}

export function TweetComposer({
  value,
  onChangeText,
  images: externalImages,
  onAddImage,
  onRemoveImage,
  maxLength = MAX_CHARS,
  placeholder,
  onSubmit,
  loading = false,
  parentTweetId = null,
  categoryIds = [],
  pollId = null,
  onCreatePoll,
  onRemovePoll,
}: TweetComposerProps) {
  const colors = useThemeColors();
  const { user } = useAuth();

  // Internal state for when not controlled externally
  const [internalContent, setInternalContent] = useState('');
  const [internalImages, setInternalImages] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const handleInsertHashtag = useCallback(() => {
    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    // Insert a leading space if needed so the # starts a fresh tag
    const needsSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const insert = (needsSpace ? ' ' : '') + '#';
    const next = before + insert + after;
    if (onChangeText) onChangeText(next);
    else setInternalContent(next);
    setCursorPosition(before.length + insert.length);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [content, cursorPosition, onChangeText]);

  const handleInsertMention = useCallback(() => {
    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    const needsSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const insert = (needsSpace ? ' ' : '') + '@';
    const next = before + insert + after;
    if (onChangeText) onChangeText(next);
    else setInternalContent(next);
    setCursorPosition(before.length + insert.length);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [content, cursorPosition, onChangeText]);

  const content = value ?? internalContent;
  const images = externalImages ?? internalImages;

  const handleChangeText = useCallback(
    (text: string) => {
      if (onChangeText) {
        onChangeText(text);
      } else {
        setInternalContent(text);
      }

      // Auto-detect hashtag confirmation on space or newline
      const lastChar = text.slice(-1);
      if (lastChar === ' ' || lastChar === '\n') {
        const regex = /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF_]+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const tag = match[1];
          if (tag && !hashtags.includes(tag) && hashtags.length < MAX_HASHTAGS_PER_TWEET) {
            setHashtags((prev) => {
              if (prev.includes(tag)) return prev;
              return [...prev, tag];
            });
          }
        }
      }
    },
    [onChangeText, hashtags]
  );

  // Active hashtag query for suggest
  const hashtagQuery = useMemo(
    () => getActiveHashtagQuery(content, cursorPosition),
    [content, cursorPosition]
  );
  const showHashtagSuggest = hashtagQuery !== null && hashtagQuery.length > 0;

  // Active mention query for suggest
  const mentionQuery = useMemo(
    () => getActiveMentionQuery(content, cursorPosition),
    [content, cursorPosition]
  );
  const showMentionSuggest = !showHashtagSuggest && mentionQuery !== null;

  // Anchor the suggest popup just below the line where '@' was typed.
  // Matches the input style: paddingTop = Spacing.sm, lineHeight = 26.
  const mentionAnchorTop = useMemo(() => {
    if (!showMentionSuggest) return undefined;
    const atIndex = content.slice(0, cursorPosition).lastIndexOf('@');
    if (atIndex < 0) return undefined;
    const linesBefore = (content.slice(0, atIndex).match(/\n/g) || []).length;
    const INPUT_LINE_HEIGHT = 26;
    return Spacing.sm + (linesBefore + 1) * INPUT_LINE_HEIGHT;
  }, [showMentionSuggest, content, cursorPosition]);

  const handleSelectSuggest = useCallback(
    (tag: string) => {
      if (hashtags.includes(tag) || hashtags.length >= MAX_HASHTAGS_PER_TWEET) return;

      setHashtags((prev) => [...prev, tag]);

      // Replace the partial #query in content with #tag + space
      const textBeforeCursor = content.slice(0, cursorPosition);
      const hashIndex = textBeforeCursor.lastIndexOf('#');
      const before = content.slice(0, hashIndex);
      const after = content.slice(cursorPosition);
      const newContent = before + `#${tag} ` + after;

      if (onChangeText) {
        onChangeText(newContent);
      } else {
        setInternalContent(newContent);
      }
    },
    [hashtags, content, cursorPosition, onChangeText]
  );

  const handleSelectMention = useCallback(
    (user: { uid: string; username: string; displayName: string; avatarUrl: string | null }) => {
      if (mentions.some((m) => m.uid === user.uid) || mentions.length >= MAX_MENTIONS_PER_POST) return;

      setMentions((prev) => [...prev, { uid: user.uid, username: user.username }]);

      // Replace the partial @query in content with @username + space
      const textBeforeCursor = content.slice(0, cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      const before = content.slice(0, atIndex);
      const after = content.slice(cursorPosition);
      const newContent = before + `@${user.username} ` + after;

      if (onChangeText) {
        onChangeText(newContent);
      } else {
        setInternalContent(newContent);
      }
    },
    [mentions, content, cursorPosition, onChangeText]
  );

  const handleRemoveHashtag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleRemoveMention = useCallback((uid: string) => {
    setMentions((prev) => prev.filter((m) => m.uid !== uid));
  }, []);

  const charsRemaining = maxLength - content.length;
  const isOverLimit = charsRemaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !loading;

  const handlePickImage = useCallback(async () => {
    if (images.length >= MAX_IMAGES) return;

    if (onAddImage) {
      onAddImage();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setInternalImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  }, [images.length, onAddImage]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      if (onRemoveImage) {
        onRemoveImage(index);
      } else {
        setInternalImages((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [onRemoveImage]
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !onSubmit) return;
    onSubmit({
      content: content.trim(),
      images,
      categoryIds,
      parentTweetId,
      pollId,
      hashtags,
      mentions,
    });
  }, [canSubmit, content, images, categoryIds, parentTweetId, pollId, hashtags, mentions, onSubmit]);

  const defaultPlaceholder = parentTweetId
    ? '返信を入力...'
    : 'いまどうしてる？';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder ?? defaultPlaceholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={maxLength + 20}
        value={content}
        onChangeText={handleChangeText}
        onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.end)}
        autoFocus
      />

      {/* Hashtag suggest overlay */}
      <HashtagSuggest
        query={hashtagQuery ?? ''}
        visible={showHashtagSuggest}
        onSelect={handleSelectSuggest}
      />

      {/* Mention suggest overlay */}
      <MentionSuggest
        query={mentionQuery ?? ''}
        visible={showMentionSuggest}
        onSelect={handleSelectMention}
        currentUid={user?.uid ?? null}
        anchorTop={mentionAnchorTop}
      />

      {/* Hashtag badges */}
      <HashtagBadgeList hashtags={hashtags} onRemove={handleRemoveHashtag} />

      {/* Mention badges */}
      <MentionBadgeList mentions={mentions} onRemove={handleRemoveMention} />

      {/* Image preview strip */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageStrip}
          contentContainerStyle={styles.imageStripContent}
        >
          {images.map((uri, index) => (
            <View key={index} style={styles.imageThumb}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: colors.overlay }]}
                onPress={() => handleRemoveImage(index)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Poll indicator */}
      {pollId && (
        <View style={[styles.pollIndicator, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
          <Text style={[styles.pollIndicatorText, { color: colors.primary }]}>
            アンケート付き
          </Text>
          {onRemovePoll && (
            <TouchableOpacity onPress={onRemovePoll} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Toolbar */}
      <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={images.length >= MAX_IMAGES}
            activeOpacity={0.6}
            style={{ opacity: images.length >= MAX_IMAGES ? 0.35 : 1 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="image-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          {onCreatePoll && (
            <TouchableOpacity
              onPress={onCreatePoll}
              disabled={!!pollId}
              activeOpacity={0.6}
              style={{ opacity: pollId ? 0.35 : 1 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleInsertHashtag}
            disabled={hashtags.length >= MAX_HASHTAGS_PER_TWEET}
            activeOpacity={0.6}
            style={{ opacity: hashtags.length >= MAX_HASHTAGS_PER_TWEET ? 0.35 : 1 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary, lineHeight: 24 }}>#</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleInsertMention}
            disabled={mentions.length >= MAX_MENTIONS_PER_POST}
            activeOpacity={0.6}
            style={{ opacity: mentions.length >= MAX_MENTIONS_PER_POST ? 0.35 : 1 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#3498DB', lineHeight: 24 }}>@</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbarRight}>
          {mentions.length > 0 && (
            <Text style={[styles.mentionCount, { color: '#3498DB' }]}>
              @{mentions.length}
            </Text>
          )}
          {hashtags.length > 0 && (
            <Text style={[styles.hashtagCount, { color: colors.primary }]}>
              #{hashtags.length}
            </Text>
          )}
          <Text
            style={[
              styles.charCount,
              {
                color: isOverLimit
                  ? colors.error
                  : charsRemaining <= 20
                  ? colors.warning
                  : colors.textTertiary,
              },
            ]}
          >
            {charsRemaining}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: FontSize.lg,
    lineHeight: 26,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  imageStrip: {
    maxHeight: 90,
  },
  imageStripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  imageThumb: {
    position: 'relative',
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  pollIndicatorText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mentionCount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  hashtagCount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  charCount: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
