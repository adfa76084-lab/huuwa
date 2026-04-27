import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/hooks/useAuth';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';
import { SHORT_CAPTION_MAX_LENGTH, MAX_MENTIONS_PER_POST } from '@/constants/limits';
import { CategoryPickerModal } from '@/components/category/CategoryPickerModal';
import { MentionSuggest } from '@/components/mention/MentionSuggest';
import { MentionBadgeList } from '@/components/mention/MentionBadgeList';
import { createShort } from '@/services/api/shortService';
import { sendMentionNotifications } from '@/services/api/mentionService';
import { pickVideo } from '@/services/media/videoUploader';
import { getUserCategories } from '@/services/api/categoryService';
import { useCategoryStore } from '@/stores/categoryStore';
import { useShortStore } from '@/stores/shortStore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/category';
import { Mention } from '@/types/mention';

function PreviewPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
  });
  return (
    <VideoView
      player={player}
      style={styles.previewVideo}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

type Visibility = 'public' | 'friends' | 'private';
type CommentPermission = 'everyone' | 'friends' | 'me' | 'off';

const VISIBILITY_OPTIONS: { key: Visibility; icon: string; label: string; description: string }[] = [
  {
    key: 'public',
    icon: 'globe-outline',
    label: '誰でも',
    description: 'すべてのユーザーがこの投稿を見ることができます',
  },
  {
    key: 'friends',
    icon: 'people-outline',
    label: '友達',
    description: '相互フォロー中のユーザーのみ閲覧できます',
  },
  {
    key: 'private',
    icon: 'lock-closed-outline',
    label: '自分のみ',
    description: '自分だけがこの投稿を見ることができます',
  },
];

const VISIBILITY_SHORT_LABELS: Record<Visibility, string> = {
  public: '誰でもこの投稿を見ることができます',
  friends: '友達のみ閲覧できます',
  private: '自分のみ',
};

const COMMENT_OPTIONS: { key: CommentPermission; icon: string; label: string; description: string }[] = [
  {
    key: 'everyone',
    icon: 'globe-outline',
    label: '誰でも',
    description: 'すべてのユーザーがコメントできます',
  },
  {
    key: 'friends',
    icon: 'people-outline',
    label: '友達のみ',
    description: '相互フォロー中のユーザーのみコメントできます',
  },
  {
    key: 'me',
    icon: 'person-outline',
    label: '自分のみ',
    description: '自分だけがコメントできます',
  },
  {
    key: 'off',
    icon: 'chatbubble-ellipses-off-outline',
    label: 'オフ',
    description: '誰もコメントできません',
  },
];

const COMMENT_SHORT_LABELS: Record<CommentPermission, string> = {
  everyone: '誰でもコメントできます',
  friends: '友達のみコメントできます',
  me: '自分のみコメントできます',
  off: 'コメントオフ',
};

export default function CreateShortScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const selectedCategoryIds = useCategoryStore((s) => s.selectedCategoryIds);
  const prependShort = useShortStore((s) => s.prependShort);
  const captionRef = useRef<TextInput>(null);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagInputVisible, setTagInputVisible] = useState(false);
  const tagInputRef = useRef<TextInput>(null);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [captionCursorPosition, setCaptionCursorPosition] = useState(0);

  // Additional settings
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [commentPermission, setCommentPermission] = useState<CommentPermission>('everyone');
  const [commentOpen, setCommentOpen] = useState(false);

  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
  const allCategories = [...defaultCategories, ...userCategories];
  const categories =
    selectedCategoryIds.length > 0
      ? allCategories.filter((c) => selectedCategoryIds.includes(c.id))
      : allCategories;

  const selectedCategory = categoryId
    ? allCategories.find((c) => c.id === categoryId) ?? null
    : null;

  useEffect(() => {
    getUserCategories()
      .then(setUserCategories)
      .catch(() => {});
  }, []);

  const handlePickVideo = useCallback(async () => {
    const result = await pickVideo();
    if (result) {
      setVideoUri(result.videoUri);
      setVideoDuration(result.duration);
    }
  }, []);

  // Hashtag
  const handleHashtag = useCallback(() => {
    setTagInputVisible((v) => !v);
    setTimeout(() => tagInputRef.current?.focus(), 100);
  }, []);

  const handleTagSubmit = useCallback(() => {
    const trimmed = tagInput.replace(/^#/, '').trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // Mention detection — allow Japanese chars so displayName search works.
  const mentionQuery = useMemo(() => {
    const textBeforeCursor = caption.slice(0, captionCursorPosition);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9぀-ゟ゠-ヿ一-鿿＀-￯_]*)$/);
    return match ? match[1] : null;
  }, [caption, captionCursorPosition]);
  const showMentionSuggest = mentionQuery !== null;

  // Anchor the popup just below the line containing '@'.
  // Caption input has lineHeight: 22, no explicit paddingTop.
  const mentionAnchorTop = useMemo(() => {
    if (!showMentionSuggest) return undefined;
    const atIndex = caption.slice(0, captionCursorPosition).lastIndexOf('@');
    if (atIndex < 0) return undefined;
    const linesBefore = (caption.slice(0, atIndex).match(/\n/g) || []).length;
    const LINE_HEIGHT = 22;
    return (linesBefore + 1) * LINE_HEIGHT;
  }, [showMentionSuggest, caption, captionCursorPosition]);

  const handleSelectMention = useCallback(
    (selectedUser: { uid: string; username: string; displayName: string; avatarUrl: string | null }) => {
      if (mentions.some((m) => m.uid === selectedUser.uid) || mentions.length >= MAX_MENTIONS_PER_POST) return;
      setMentions((prev) => [...prev, { uid: selectedUser.uid, username: selectedUser.username }]);
      const textBeforeCursor = caption.slice(0, captionCursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      const before = caption.slice(0, atIndex);
      const after = caption.slice(captionCursorPosition);
      setCaption(before + `@${selectedUser.username} ` + after);
    },
    [mentions, caption, captionCursorPosition]
  );

  const handleRemoveMention = useCallback((uid: string) => {
    setMentions((prev) => prev.filter((m) => m.uid !== uid));
  }, []);

  // Mention: insert @ into caption and focus
  const handleMention = useCallback(() => {
    setCaption((prev) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n');
      return prev + (needsSpace ? ' @' : '@');
    });
    setTimeout(() => captionRef.current?.focus(), 100);
  }, []);

  // Location
  const handleLocation = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '場所を追加',
        '場所の名前を入力してください',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: location ? '変更' : '追加',
            onPress: (text) => setLocation(text?.trim() ?? ''),
          },
          ...(location
            ? [{ text: '削除', style: 'destructive' as const, onPress: () => setLocation('') }]
            : []),
        ],
        'plain-text',
        location,
      );
    } else {
      Alert.alert('場所を追加', '場所の名前を入力してください');
    }
  }, [location]);

  // Visibility
  const handleSelectVisibility = useCallback((v: Visibility) => {
    setVisibility(v);
    setVisibilityOpen(false);
  }, []);

  // Comment permission
  const handleSelectComment = useCallback((v: CommentPermission) => {
    setCommentPermission(v);
    setCommentOpen(false);
  }, []);

  // Cover edit
  const handleCoverEdit = useCallback(() => {
    if (!videoUri) return;
    handlePickVideo();
  }, [videoUri, handlePickVideo]);

  // Draft
  const handleDraft = useCallback(() => {
    if (!videoUri && !caption) {
      router.back();
      return;
    }
    Alert.alert('下書きを保存', 'この投稿を下書きとして保存しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '破棄',
        style: 'destructive',
        onPress: () => router.back(),
      },
      {
        text: '保存',
        onPress: () => {
          Alert.alert('保存しました', '下書きに保存されました。');
          router.back();
        },
      },
    ]);
  }, [videoUri, caption, router]);

  const handlePost = async () => {
    if (!videoUri) {
      Alert.alert('エラー', '動画を選択してください。');
      return;
    }
    if (!categoryId) {
      Alert.alert('エラー', 'カテゴリーを選択してください。');
      return;
    }
    if (!user || !userProfile) return;

    setLoading(true);
    setProgress(0);
    try {
      const newShort = await createShort(
        user.uid,
        { videoUri, caption, categoryId, duration: videoDuration },
        userProfile,
        (p) => setProgress(p),
      );
      // Immediately update the store so the shorts feed shows it
      if (newShort) {
        prependShort(newShort);
      }
      // Send mention notifications
      if (mentions.length > 0 && newShort?.id) {
        sendMentionNotifications(mentions, userProfile, newShort.id).catch(() => {});
      }
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : '投稿に失敗しました。';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header - back arrow only */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top: Caption + Preview side by side */}
        <View style={styles.topSection}>
          <View style={styles.captionArea}>
            <TextInput
              ref={captionRef}
              style={[styles.captionInput, { color: colors.text }]}
              placeholder="ここに説明"
              placeholderTextColor={colors.textTertiary}
              value={caption}
              onChangeText={setCaption}
              onSelectionChange={(e) => setCaptionCursorPosition(e.nativeEvent.selection.end)}
              maxLength={SHORT_CAPTION_MAX_LENGTH}
              multiline
              textAlignVertical="top"
            />
            <MentionSuggest
              query={mentionQuery ?? ''}
              visible={showMentionSuggest}
              onSelect={handleSelectMention}
              currentUid={user?.uid ?? null}
              anchorTop={mentionAnchorTop}
            />
          </View>
          <TouchableOpacity
            style={[styles.previewBox, { backgroundColor: colors.surfaceVariant }]}
            onPress={handlePickVideo}
            activeOpacity={0.8}
          >
            {videoUri ? (
              <>
                <PreviewPlayer uri={videoUri} />
                <View style={styles.previewLabelContainer}>
                  <Text style={styles.previewLabel}>プレビュー</Text>
                </View>
                <TouchableOpacity
                  style={styles.coverEditContainer}
                  onPress={handleCoverEdit}
                  activeOpacity={0.7}
                >
                  <Text style={styles.coverEditText}>カバーを編集</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="videocam" size={36} color={colors.textTertiary} />
                <Text style={[styles.previewPlaceholderText, { color: colors.textTertiary }]}>
                  動画を選択
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Upload progress */}
        {loading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.primary, width: `${progress}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}

        {/* Tag chips row */}
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              { borderColor: tagInputVisible ? colors.primary : colors.border },
            ]}
            onPress={handleHashtag}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: tagInputVisible ? colors.primary : colors.text }]}>
              # ハッシュタグ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { borderColor: colors.border }]}
            onPress={handleMention}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: colors.text }]}>@ メンション</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, { borderColor: colors.border }]}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            {selectedCategory ? (
              <View style={styles.chipInner}>
                <Ionicons
                  name={selectedCategory.icon as any}
                  size={14}
                  color={selectedCategory.color}
                />
                <Text style={[styles.chipText, { color: selectedCategory.color }]}>
                  {selectedCategory.name}
                </Text>
              </View>
            ) : (
              <View style={styles.chipInner}>
                <Ionicons name="grid-outline" size={14} color={colors.text} />
                <Text style={[styles.chipText, { color: colors.text }]}>カテゴリー</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tag input + tag chips */}
        {tagInputVisible && (
          <View style={styles.tagSection}>
            <View style={[styles.tagInputRow, { borderColor: colors.border }]}>
              <Text style={[styles.tagHash, { color: colors.primary }]}>#</Text>
              <TextInput
                ref={tagInputRef}
                style={[styles.tagInput, { color: colors.text }]}
                placeholder="タグを入力"
                placeholderTextColor={colors.textTertiary}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleTagSubmit}
                returnKeyType="done"
                autoFocus
              />
            </View>
            {tags.length > 0 && (
              <View style={styles.tagChipRow}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: colors.primary + '18' }]}
                    onPress={() => handleRemoveTag(tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagChipText, { color: colors.primary }]}>
                      #{tag}
                    </Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Added tags shown even when input is closed */}
        {!tagInputVisible && tags.length > 0 && (
          <View style={styles.tagSection}>
            <View style={styles.tagChipRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, { backgroundColor: colors.primary + '18' }]}
                  onPress={() => handleRemoveTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagChipText, { color: colors.primary }]}>
                    #{tag}
                  </Text>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Mention badges */}
        {mentions.length > 0 && (
          <View style={styles.tagSection}>
            <MentionBadgeList mentions={mentions} onRemove={handleRemoveMention} />
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Location */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={handleLocation}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="location-outline" size={22} color={colors.text} />
            <Text style={[styles.menuText, { color: colors.text }]}>場所</Text>
            {location ? (
              <View style={[styles.locationChip, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.locationChipText, { color: colors.primary }]} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Visibility */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setVisibilityOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name={VISIBILITY_OPTIONS.find((o) => o.key === visibility)!.icon as any}
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {VISIBILITY_SHORT_LABELS[visibility]}
            </Text>
          </View>
          <Ionicons
            name={visibilityOpen ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {visibilityOpen && (
          <View style={[styles.visibilityPanel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.visibilityTitle, { color: colors.textSecondary }]}>
              公開範囲
            </Text>
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = visibility === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.visibilityOption}
                  onPress={() => handleSelectVisibility(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.visibilityIconBox,
                    { backgroundColor: selected ? colors.primary + '18' : colors.surfaceVariant },
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.visibilityTextArea}>
                    <Text style={[
                      styles.visibilityLabel,
                      { color: selected ? colors.primary : colors.text },
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.visibilityDesc, { color: colors.textTertiary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Comment permission */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setCommentOpen((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="chatbubble-outline"
              size={22}
              color={colors.text}
            />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {COMMENT_SHORT_LABELS[commentPermission]}
            </Text>
          </View>
          <Ionicons
            name={commentOpen ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>

        {commentOpen && (
          <View style={[styles.visibilityPanel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.visibilityTitle, { color: colors.textSecondary }]}>
              コメント許可
            </Text>
            {COMMENT_OPTIONS.map((option) => {
              const selected = commentPermission === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.visibilityOption}
                  onPress={() => handleSelectComment(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.visibilityIconBox,
                    { backgroundColor: selected ? colors.primary + '18' : colors.surfaceVariant },
                  ]}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.visibilityTextArea}>
                    <Text style={[
                      styles.visibilityLabel,
                      { color: selected ? colors.primary : colors.text },
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.visibilityDesc, { color: colors.textTertiary }]}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.draftButton, { borderColor: colors.border }]}
          onPress={handleDraft}
          activeOpacity={0.7}
        >
          <Ionicons name="document-outline" size={18} color={colors.text} />
          <Text style={[styles.draftButtonText, { color: colors.text }]}>下書き</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.postButton,
            (!videoUri || !categoryId || loading) && styles.postButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={!videoUri || !categoryId || loading}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.postButtonText}>
            {loading ? `投稿中 ${Math.round(progress)}%` : '投稿'}
          </Text>
        </TouchableOpacity>
      </View>

      <CategoryPickerModal
        visible={pickerVisible}
        categories={categories}
        selectedId={categoryId}
        onSelect={(id) => setCategoryId(id)}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  captionArea: {
    flex: 1,
    minHeight: 140,
  },
  captionInput: {
    fontSize: FontSize.md,
    lineHeight: 22,
    flex: 1,
    textAlignVertical: 'top',
  },
  previewBox: {
    width: 140,
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  previewLabel: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  coverEditContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  coverEditText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  previewPlaceholderText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  tagSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  tagHash: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginRight: Spacing.xs,
  },
  tagInput: {
    flex: 1,
    fontSize: FontSize.md,
    height: '100%',
  },
  tagChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  tagChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  menuText: {
    fontSize: FontSize.md,
    fontWeight: '400',
  },
  locationChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    maxWidth: 140,
  },
  locationChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  visibilityPanel: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  visibilityTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  visibilityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityTextArea: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  visibilityDesc: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  draftButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  postButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FF2D55',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
