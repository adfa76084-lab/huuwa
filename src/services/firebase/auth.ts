import {
  createUserWithEmailAndPassword,
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

export async function signUp(email: string, password: string): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
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

export async function signInWithGoogleIdToken(idToken: string): Promise<FirebaseUser> {
  const credential = GoogleAuthProvider.credential(idToken);
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
