import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import {
  updateUserProfile,
  changeUsername,
  getUsernameCooldownRemainingMs,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from '@/services/api/userService';
import { useImageUpload } from '@/hooks/useImageUpload';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@/constants/limits';

const HEADER_COLORS = [
  '#FFB6C1', // pink
  '#FFA07A', // salmon
  '#FFD700', // gold
  '#98FB98', // mint
  '#87CEEB', // sky
  '#B0C4DE', // steel
  '#9370DB', // purple
  '#FFB07A', // peach
  '#2D2D2D', // dark
  '#F5E6D3', // beige
];

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export default function EditProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { images, addImage } = useImageUpload(1);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? '');
  const [headerColor, setHeaderColor] = useState<string | null>(user?.headerColor ?? null);
  const [loading, setLoading] = useState(false);

  const usernameCooldownMs = useMemo(
    () => getUsernameCooldownRemainingMs(user?.usernameUpdatedAt),
    [user?.usernameUpdatedAt],
  );
  const usernameCooldownDays = Math.ceil(usernameCooldownMs / (24 * 60 * 60 * 1000));
  const usernameLocked = usernameCooldownMs > 0;

  const hasChanges =
    displayName !== (user?.displayName ?? '') ||
    username !== (user?.username ?? '') ||
    bio !== (user?.bio ?? '') ||
    websiteUrl !== (user?.websiteUrl ?? '') ||
    headerColor !== (user?.headerColor ?? null) ||
    images.length > 0;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) return;

      e.preventDefault();

      Alert.alert(
        '変更を破棄しますか？',
        '保存されていない変更があります。保存せずに戻りますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '破棄する',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, hasChanges]);

  const validateUsername = (value: string): string | null => {
    if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
      return `ユーザー名は${USERNAME_MIN_LENGTH}〜${USERNAME_MAX_LENGTH}文字で入力してください`;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'ユーザー名は半角英数字とアンダースコアのみ使えます';
    }
    return null;
  };

  const validateUrl = (value: string): string | null => {
    if (value.trim().length === 0) return null;
    if (!URL_REGEX.test(value.trim())) {
      return 'URLは https:// または http:// で始まる必要があります';
    }
    return null;
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名は必須です。');
      return;
    }

    if (!user) return;

    const trimmedUsername = username.trim();
    const trimmedUrl = websiteUrl.trim();

    const usernameChanged = trimmedUsername !== user.username;
    if (usernameChanged) {
      const usernameError = validateUsername(trimmedUsername);
      if (usernameError) {
        Alert.alert('エラー', usernameError);
        return;
      }
      if (usernameLocked) {
        Alert.alert(
          'ユーザー名の変更',
          `次の変更まであと${usernameCooldownDays}日です`,
        );
        return;
      }
    }

    const urlError = validateUrl(trimmedUrl);
    if (urlError) {
      Alert.alert('エラー', urlError);
      return;
    }

    setLoading(true);
    try {
      if (usernameChanged) {
        await changeUsername(user.uid, trimmedUsername);
      }

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        headerColor,
        websiteUrl: trimmedUrl.length > 0 ? trimmedUrl : null,
      });

      updateUser({
        displayName: displayName.trim(),
        username: usernameChanged ? trimmedUsername : user.username,
        bio: bio.trim(),
        headerColor,
        websiteUrl: trimmedUrl.length > 0 ? trimmedUrl : null,
      });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'プロフィールの更新に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner preview */}
        <View
          style={[
            styles.bannerPreview,
            { backgroundColor: headerColor ?? (colors.primaryLight + '40') },
          ]}
        />
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          バナーの色
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatchRow}
        >
          <TouchableOpacity
            style={[
              styles.swatch,
              styles.swatchDefault,
              { borderColor: headerColor === null ? colors.primary : colors.border },
            ]}
            onPress={() => setHeaderColor(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {HEADER_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c, borderColor: headerColor === c ? colors.primary : 'transparent', borderWidth: headerColor === c ? 3 : 0 },
              ]}
              onPress={() => setHeaderColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.avatarContainer} onPress={addImage}>
          {images.length > 0 || user?.avatarUrl ? (
            <Image
              source={{ uri: images[0] ?? user?.avatarUrl ?? '' }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="camera" size={32} color={colors.textTertiary} />
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          label="表示名"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="表示名を入力"
        />

        <TextInput
          label={`ユーザー名${usernameLocked ? `（あと${usernameCooldownDays}日変更不可）` : ''}`}
          value={username}
          onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="例: huuwa_taro"
          editable={!usernameLocked}
          maxLength={USERNAME_MAX_LENGTH}
        />
        <Text style={[styles.helperText, { color: colors.textTertiary }]}>
          半角英数字とアンダースコアのみ。変更すると{USERNAME_CHANGE_COOLDOWN_DAYS}日間ロックされます。
        </Text>

        <TextInput
          label="自己紹介"
          value={bio}
          onChangeText={setBio}
          placeholder="自己紹介を入力"
          multiline
          numberOfLines={3}
        />

        <TextInput
          label="リンク"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://example.com"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={[styles.helperText, { color: colors.textTertiary }]}>
          プロフィールに表示される外部リンク（ブログ、SNS等）
        </Text>

        <Button title="変更を保存" onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xxl,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: Spacing.xxl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPreview: {
    height: 100,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  swatchRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 2,
    marginBottom: Spacing.xl,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  swatchDefault: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  helperText: {
    fontSize: FontSize.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
});
