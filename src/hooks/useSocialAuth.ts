import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  signInWithGoogleIdToken,
  signInWithAppleIdentityToken,
} from '@/services/firebase/auth';
import { createUserProfile, getUserProfile } from '@/services/api/userService';
import { useAuthStore } from '@/stores/authStore';

const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function deriveUsername(email: string | null | undefined, uid: string): string {
  if (!email) return `user_${uid.slice(0, 8)}`;
  const local = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  return local.length >= 3 ? local.slice(0, 20) : `user_${uid.slice(0, 8)}`;
}

async function ensureProfile(
  uid: string,
  email: string | null,
  displayName: string | null,
): Promise<void> {
  const existing = await getUserProfile(uid);
  if (existing) return;
  await createUserProfile(
    uid,
    email ?? '',
    displayName ?? 'ユーザー',
    deriveUsername(email, uid),
  );
}

/**
 * Push the freshly-loaded profile into the auth store. Required because
 * SessionContext's auth-change listener fires the moment Firebase signs us in
 * — often before `createUserProfile` has finished — so it sets user=null and
 * never refetches. Calling this after profile creation ensures the rest of
 * the app sees the authenticated user immediately.
 */
async function syncProfileToStore(uid: string): Promise<void> {
  const profile = await getUserProfile(uid);
  if (profile) {
    useAuthStore.getState().setUser(profile);
  }
}

export function useSocialAuth() {
  const [, , promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_EXPO_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  const signInWithGoogle = useCallback(async () => {
    const result = await promptAsync();
    if (result?.type !== 'success') {
      throw new Error('Googleログインがキャンセルされました');
    }
    const idToken = result.authentication?.idToken;
    if (!idToken) throw new Error('Googleログインに失敗しました');
    const user = await signInWithGoogleIdToken(idToken);
    await ensureProfile(user.uid, user.email, user.displayName);
    await syncProfileToStore(user.uid);
    return user;
  }, [promptAsync]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple サインインはiOSでのみ利用可能です');
    }
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Appleログインに失敗しました');
    }

    const user = await signInWithAppleIdentityToken(credential.identityToken, rawNonce);
    const displayName =
      credential.fullName?.givenName || credential.fullName?.familyName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : user.displayName ?? 'ユーザー';
    await ensureProfile(user.uid, user.email ?? credential.email ?? null, displayName);
    await syncProfileToStore(user.uid);
    return user;
  }, []);

  return { signInWithGoogle, signInWithApple };
}
