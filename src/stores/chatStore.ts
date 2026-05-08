import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatRoom, ChatMessage } from '@/types/chat';

interface ChatState {
  rooms: ChatRoom[];
  requestCount: number;
  hasFetchedRooms: boolean;
  currentMessages: ChatMessage[];
  isLoading: boolean;
  favoriteOpenChatIds: string[];
  pinnedChatIds: string[];
  optimisticOpenChats: ChatRoom[];

  setRooms: (rooms: ChatRoom[]) => void;
  setRequestCount: (count: number) => void;
  setHasFetchedRooms: (value: boolean) => void;
  setCurrentMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  toggleFavoriteOpenChat: (roomId: string) => void;
  isFavoriteOpenChat: (roomId: string) => boolean;
  togglePinChat: (roomId: string) => void;
  addOptimisticOpenChat: (room: ChatRoom) => void;
  removeOptimisticOpenChat: (id: string) => void;
  clearOptimisticOpenChats: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: [],
      requestCount: 0,
      hasFetchedRooms: false,
      currentMessages: [],
      isLoading: false,
      favoriteOpenChatIds: [],
      pinnedChatIds: [],
      optimisticOpenChats: [],

      setRooms: (rooms) => set({ rooms }),
      setRequestCount: (requestCount) => set({ requestCount }),
      setHasFetchedRooms: (hasFetchedRooms) => set({ hasFetchedRooms }),
      setCurrentMessages: (messages) => set({ currentMessages: messages }),
      addMessage: (message) =>
        set((state) => ({
          currentMessages: [...state.currentMessages, message],
        })),
      setLoading: (isLoading) => set({ isLoading }),
      toggleFavoriteOpenChat: (roomId) =>
        set((state) => ({
          favoriteOpenChatIds: state.favoriteOpenChatIds.includes(roomId)
            ? state.favoriteOpenChatIds.filter((id) => id !== roomId)
            : [...state.favoriteOpenChatIds, roomId],
        })),
      isFavoriteOpenChat: (roomId) => get().favoriteOpenChatIds.includes(roomId),
      togglePinChat: (roomId) =>
        set((state) => ({
          pinnedChatIds: state.pinnedChatIds.includes(roomId)
            ? state.pinnedChatIds.filter((id) => id !== roomId)
            : [...state.pinnedChatIds, roomId],
        })),
      addOptimisticOpenChat: (room) =>
        set((state) => ({
          optimisticOpenChats: [
            room,
            ...state.optimisticOpenChats.filter((r) => r.id !== room.id),
          ],
        })),
      removeOptimisticOpenChat: (id) =>
        set((state) => ({
          optimisticOpenChats: state.optimisticOpenChats.filter((r) => r.id !== id),
        })),
      clearOptimisticOpenChats: () => set({ optimisticOpenChats: [] }),
      reset: () =>
        set({
          rooms: [],
          requestCount: 0,
          hasFetchedRooms: false,
          currentMessages: [],
          isLoading: false,
        }),
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favoriteOpenChatIds: state.favoriteOpenChatIds,
        pinnedChatIds: state.pinnedChatIds,
        rooms: state.rooms,
        requestCount: state.requestCount,
      }),
    },
  ),
);
