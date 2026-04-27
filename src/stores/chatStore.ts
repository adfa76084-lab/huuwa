import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatRoom, ChatMessage } from '@/types/chat';

interface ChatState {
  rooms: ChatRoom[];
  currentMessages: ChatMessage[];
  isLoading: boolean;
  favoriteOpenChatIds: string[];
  pinnedChatIds: string[];

  setRooms: (rooms: ChatRoom[]) => void;
  setCurrentMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  toggleFavoriteOpenChat: (roomId: string) => void;
  isFavoriteOpenChat: (roomId: string) => boolean;
  togglePinChat: (roomId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: [],
      currentMessages: [],
      isLoading: false,
      favoriteOpenChatIds: [],
      pinnedChatIds: [],

      setRooms: (rooms) => set({ rooms }),
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
      reset: () => set({ rooms: [], currentMessages: [], isLoading: false }),
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favoriteOpenChatIds: state.favoriteOpenChatIds,
        pinnedChatIds: state.pinnedChatIds,
      }),
    },
  ),
);
