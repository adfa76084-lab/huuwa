import {
  signInWithEmailAndPassword,
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
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './config';

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
  username: string;
}): Promise<FirebaseUser> {
  const callable = httpsCallable<
    typeof input,
    { ok: boolean; customToken: string; uid: string }
  >(functions, 'verifySignupAndCreate');
  const res = await callable(input);
  const signInRes = await signInWithCustomToken(auth, res.data.customToken);
  return signInRes.user;
}

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
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
  return res.user;
}

export async function signInWithAppleIdentityToken(
  identityToken: string,
  nonce: string,
): Promise<FirebaseUser> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const res = await signInWithCredential(auth, credential);
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
  return signInRes.user;
}

export function subscribeToAuthChanges(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
