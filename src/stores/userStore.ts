import { create } from 'zustand';
import { User } from '@/types/user';

interface UserState {
  viewedUser: User | null;
  isFollowing: boolean;
  isLoading: boolean;

  setViewedUser: (user: User | null) => void;
  setIsFollowing: (following: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  viewedUser: null,
  isFollowing: false,
  isLoading: false,

  setViewedUser: (viewedUser) => set({ viewedUser }),
  setIsFollowing: (isFollowing) => set({ isFollowing }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ viewedUser: null, isFollowing: false, isLoading: false }),
}));
