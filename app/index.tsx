import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { LoadingIndicator } from '@/components/ui';

export default function Index() {
  const { firebaseUser, isLoading } = useSession();

  if (isLoading) {
    return <LoadingIndicator fullScreen />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
