import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase/config';

export async function sendOtp(
  email: string,
  mode: 'register' | 'login'
): Promise<void> {
  const callable = httpsCallable(functions, 'sendOTP');
  await callable({ email, mode });
}

export async function verifyOtp(
  email: string,
  code: string,
  mode: 'register' | 'login'
): Promise<void> {
  const callable = httpsCallable(functions, 'verifyOTP');
  await callable({ email, code, mode });
}
