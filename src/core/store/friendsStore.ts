import { create } from 'zustand';
import {
  searchUsers as apiSearchUsers,
  sendFriendRequest as apiSendRequest,
  respondToFriendRequest as apiRespondRequest,
  getFriendRequests as apiGetRequests,
  getFriends as apiGetFriends,
  removeFriend as apiRemoveFriend,
  type UserSearchResult,
  type FriendRequest,
  type Friend,
} from '../api/friendsApi';

export interface GameInvite {
  inviteId: string;
  from: { userId: string; username: string; elo: number };
  timeCategory: string;
  timeInitial: number;
  timeIncrement: number;
}

interface FriendsState {
  // Data
  friends: Friend[];
  pendingRequests: FriendRequest[];
  searchResults: UserSearchResult[];
  onlineUserIds: Set<string>;
  gameInvites: GameInvite[];

  // UI state
  isPanelOpen: boolean;
  isLoading: boolean;
  searchQuery: string;

  // Actions
  setPanelOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string }>;
  respondToRequest: (requestId: string, accept: boolean, senderId?: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;

  // Online presence
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;

  // Game invites
  addGameInvite: (invite: GameInvite) => void;
  removeGameInvite: (inviteId: string) => void;

  // Friend request notifications
  addFriendRequest: (request: FriendRequest) => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  searchResults: [],
  onlineUserIds: new Set(),
  gameInvites: [],
  isPanelOpen: false,
  isLoading: false,
  searchQuery: '',

  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchFriends: async () => {
    const friends = await apiGetFriends();
    // Update online status from our tracking
    const { onlineUserIds } = get();
    const enriched = friends.map(f => ({
      ...f,
      isOnline: onlineUserIds.has(f.id),
    }));
    set({ friends: enriched });
  },

  fetchRequests: async () => {
    const requests = await apiGetRequests();
    set({ pendingRequests: requests });
  },

  searchUsers: async (query: string) => {
    if (query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true });
    const results = await apiSearchUsers(query);
    set({ searchResults: results, isLoading: false });
  },

  sendRequest: async (userId: string) => {
    const result = await apiSendRequest(userId);
    if (result.success) {
      // Update search results to show pending
      set(state => ({
        searchResults: state.searchResults.map(u =>
          u.id === userId ? { ...u, requestPending: true } : u
        ),
      }));
    }
    return result;
  },

  respondToRequest: async (requestId: string, accept: boolean, _senderId?: string) => {
    await apiRespondRequest(requestId, accept);
    // Remove from pending
    set(state => ({
      pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
    }));
    // If accepted, refresh friends list
    if (accept) {
      get().fetchFriends();
    }
  },

  removeFriend: async (friendshipId: string) => {
    await apiRemoveFriend(friendshipId);
    set(state => ({
      friends: state.friends.filter(f => f.friendshipId !== friendshipId),
    }));
  },

  setOnlineUsers: (userIds: string[]) => {
    const newSet = new Set(userIds);
    set(state => ({
      onlineUserIds: newSet,
      friends: state.friends.map(f => ({
        ...f,
        isOnline: newSet.has(f.id),
      })),
    }));
  },

  addOnlineUser: (userId: string) => {
    set(state => {
      const newSet = new Set(state.onlineUserIds);
      newSet.add(userId);
      return {
        onlineUserIds: newSet,
        friends: state.friends.map(f =>
          f.id === userId ? { ...f, isOnline: true } : f
        ),
      };
    });
  },

  removeOnlineUser: (userId: string) => {
    set(state => {
      const newSet = new Set(state.onlineUserIds);
      newSet.delete(userId);
      return {
        onlineUserIds: newSet,
        friends: state.friends.map(f =>
          f.id === userId ? { ...f, isOnline: false } : f
        ),
      };
    });
  },

  addGameInvite: (invite: GameInvite) => {
    set(state => ({
      gameInvites: [...state.gameInvites, invite],
    }));
  },

  removeGameInvite: (inviteId: string) => {
    set(state => ({
      gameInvites: state.gameInvites.filter(i => i.inviteId !== inviteId),
    }));
  },

  addFriendRequest: (request: FriendRequest) => {
    set(state => ({
      pendingRequests: [request, ...state.pendingRequests],
    }));
  },
}));
