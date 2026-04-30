import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  signInWithGoogleIdToken,
  signInWithAppleIdentityToken,
} from '@/services/firebase/auth';
import { getUserProfile } from '@/services/api/userService';
import { useAuthStore } from '@/stores/authStore';

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/**
 * After social sign-in, hydrate the auth store if a profile already exists.
 * Returns whether this user is brand-new (no profile yet) so the caller can
 * route them to the profile-setup screen.
 */
async function syncOrFlagNew(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  if (profile) {
    useAuthStore.getState().setUser(profile);
    return false;
  }
  return true;
}

export interface SocialSignInResult {
  isNewUser: boolean;
}

export function useSocialAuth() {
  // Configure native Google Sign-In once. webClientId is required so Google
  // returns an idToken that Firebase can verify; iosClientId pins the iOS app.
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['profile', 'email'],
    });
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<SocialSignInResult> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const data: any = (response as any).data ?? response;
      const idToken: string | null = data?.idToken ?? null;
      if (!idToken) {
        throw new Error('Googleの認証トークンが取得できませんでした');
      }
      const user = await signInWithGoogleIdToken({ idToken });
      const isNewUser = await syncOrFlagNew(user.uid);
      return { isNewUser };
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Googleログインがキャンセルされました');
      }
      if (e?.code === statusCodes.IN_PROGRESS) {
        throw new Error('別のGoogleログインが進行中です');
      }
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Servicesが利用できません');
      }
      throw e;
    }
  }, []);

  const signInWithApple = useCallback(async (): Promise<SocialSignInResult> => {
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
    const isNewUser = await syncOrFlagNew(user.uid);
    return { isNewUser };
  }, []);

  return { signInWithGoogle, signInWithApple };
}
