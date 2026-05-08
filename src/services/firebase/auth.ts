import {
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
  onAuthStateChanged,
  User as FirebaseUser,
  ActionCodeSettings,
} from 'firebase/auth';
export type { FirebaseUser };
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './config';
import { getDeviceInfo } from './deviceFingerprint';

/**
 * Notify the backend of a successful login. Records the device fingerprint
 * and emails the user if the device is new. Fire-and-forget — failures
 * (including offline) must never block the login itself.
 */
async function recordLogin(options: { silent?: boolean } = {}): Promise<void> {
  try {
    const { deviceHash, deviceLabel } = await getDeviceInfo();
    const callable = httpsCallable(functions, 'recordLoginAndNotify');
    await callable({ deviceHash, deviceLabel, silent: options.silent === true });
  } catch (e) {
    console.warn('[recordLogin] failed:', e);
  }
}

/** Send a 6-digit code to the email to verify ownership before creating an account. */
export async function requestSignupCode(email: string): Promise<void> {
  const callable = httpsCallable(functions, 'sendSignupCode');
  await callable({ email });
}

/**
 * Verify the signup code and create the account server-side.
 * The Cloud Function returns a custom token; signing in with it
 * establishes the Firebase Auth session.
 */
export async function verifySignupAndCreate(input: {
  email: string;
  code: string;
  password: string;
  displayName: string;
  username?: string;
}): Promise<FirebaseUser> {
  const callable = httpsCallable<
    typeof input,
    { ok: boolean; customToken: string; uid: string }
  >(functions, 'verifySignupAndCreate');
  const res = await callable(input);
  const signInRes = await signInWithCustomToken(auth, res.data.customToken);
  // Initial signup device — record silently so the very first login
  // doesn't trigger a "new device" email on top of the welcome flow.
  recordLogin({ silent: true });
  return signInRes.user;
}

export type SignInResult =
  | { kind: 'success'; user: FirebaseUser }
  | { kind: 'mfa'; uid: string };

/**
 * Server-driven sign-in. Verifies the password via Cloud Function and either
 * returns a Firebase session directly or, if email-2FA is enabled, surfaces
 * an MFA challenge — the caller must then call `confirmLoginCode(uid, code)`.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const callable = httpsCallable<
    { email: string; password: string },
    { ok: boolean; requireMfa: boolean; customToken?: string; uid?: string }
  >(functions, 'initiateEmailLogin');
  const res = await callable({ email, password });

  if (res.data.requireMfa && res.data.uid) {
    return { kind: 'mfa', uid: res.data.uid };
  }
  if (!res.data.customToken) {
    throw new Error('ログインに失敗しました');
  }
  const signInRes = await signInWithCustomToken(auth, res.data.customToken);
  recordLogin();
  return { kind: 'success', user: signInRes.user };
}

/** Complete an email-2FA login by submitting the 6-digit code. */
export async function confirmLoginCode(uid: string, code: string): Promise<FirebaseUser> {
  const callable = httpsCallable<
    { uid: string; code: string },
    { ok: boolean; customToken: string }
  >(functions, 'verifyLoginCode');
  const res = await callable({ uid, code });
  const signInRes = await signInWithCustomToken(auth, res.data.customToken);
  recordLogin();
  return signInRes.user;
}

/**
 * Resend or restart the email-2FA code. Re-runs initiateEmailLogin with the
 * same credentials. Caller already has the password from the original attempt.
 */
export async function resendLoginCode(email: string, password: string): Promise<void> {
  const callable = httpsCallable<
    { email: string; password: string },
    { ok: boolean; requireMfa: boolean }
  >(functions, 'initiateEmailLogin');
  await callable({ email, password });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const actionCodeSettings: ActionCodeSettings = {
    url: `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}`,
    handleCodeInApp: false,
  };
  await sendPasswordResetEmail(auth, email, actionCodeSettings);
}

export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('ログインしていません');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function requestEmailChangeCode(
  newEmail: string,
  password: string,
): Promise<void> {
  await reauthenticate(password);
  const callable = httpsCallable(functions, 'sendEmailChangeCode');
  await callable({ newEmail });
}

export async function confirmEmailChangeCode(code: string): Promise<string> {
  const callable = httpsCallable<{ code: string }, { ok: boolean; email: string }>(
    functions,
    'verifyEmailChangeCode',
  );
  const res = await callable({ code });
  await auth.currentUser?.reload();
  return res.data.email;
}

export async function requestPasswordResetCode(email: string): Promise<void> {
  const callable = httpsCallable(functions, 'sendPasswordResetCode');
  await callable({ email });
}

export async function confirmPasswordResetCode(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const callable = httpsCallable(functions, 'verifyPasswordResetCode');
  await callable({ email, code, newPassword });
}

export async function signInWithGoogleIdToken(
  tokens: { idToken?: string | null; accessToken?: string | null },
): Promise<FirebaseUser> {
  if (!tokens.idToken && !tokens.accessToken) {
    throw new Error('Googleの認証トークンが取得できませんでした');
  }
  const credential = GoogleAuthProvider.credential(
    tokens.idToken ?? null,
    tokens.accessToken ?? null,
  );
  const res = await signInWithCredential(auth, credential);
  // First-time social sign-in still records the device but skips the email,
  // matching Twitter/Instagram behavior — users don't expect a "new device"
  // notification on their very first login via Google/Apple.
  const isFirstTime = res.user.metadata.creationTime === res.user.metadata.lastSignInTime;
  recordLogin({ silent: isFirstTime });
  return res.user;
}

export async function signInWithAppleIdentityToken(
  identityToken: string,
  nonce: string,
): Promise<FirebaseUser> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const res = await signInWithCredential(auth, credential);
  const isFirstTime = res.user.metadata.creationTime === res.user.metadata.lastSignInTime;
  recordLogin({ silent: isFirstTime });
  return res.user;
}

export async function requestPhoneCode(phone: string): Promise<void> {
  const callable = httpsCallable(functions, 'sendPhoneCode');
  await callable({ phone });
}

/** One-time migration helper — moves email from public users doc to userPrivate. Idempotent. */
export async function migrateMyEmailToPrivate(): Promise<void> {
  const callable = httpsCallable(functions, 'migrateMyEmailToPrivate');
  await callable({});
}

export async function confirmPhoneCode(
  phone: string,
  code: string,
): Promise<FirebaseUser> {
  const callable = httpsCallable<
    { phone: string; code: string },
    { ok: boolean; customToken: string; uid: string }
  >(functions, 'verifyPhoneCode');
  const res = await callable({ phone, code });
  const signInRes = await signInWithCustomToken(auth, res.data.customToken);
  const isFirstTime =
    signInRes.user.metadata.creationTime === signInRes.user.metadata.lastSignInTime;
  recordLogin({ silent: isFirstTime });
  return signInRes.user;
}

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
