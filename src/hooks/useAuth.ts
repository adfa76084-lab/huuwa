import { useAuthStore } from '@/stores/authStore';
import { UserProfile } from '@/types/user';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  const userProfile: UserProfile | null = user
    ? {
        uid: user.uid,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      }
    : null;

  return {
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user,
  };
}
