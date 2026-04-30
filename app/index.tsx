import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { useAuthStore } from '@/stores/authStore';
import { LoadingIndicator } from '@/components/ui';

export default function Index() {
  const { firebaseUser, isLoading } = useSession();
  const profile = useAuthStore((s) => s.user);

  if (isLoading) {
    return <LoadingIndicator fullScreen />;
  }

  // Authenticated with Firebase but no Firestore profile yet — happens when
  // the user closes the app mid-way through social or phone signup. Send
  // them back to the profile-setup screen so they can finish.
  if (firebaseUser && !profile) {
    return <Redirect href="/(auth)/phone-setup" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
