import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface Credential {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CredentialState {
  credentials: Credential[];
  isLoading: boolean;
  fetchCredentials: (typeFilter?: string) => Promise<void>;
  createCredential: (name: string, type: string, data: Record<string, unknown>) => Promise<Credential>;
  updateCredential: (id: string, updates: { name?: string; data?: Record<string, unknown> }) => Promise<void>;
  deleteCredential: (id: string) => Promise<void>;
  testCredential: (id: string) => Promise<{ success: boolean; message: string }>;
}

export const useCredentialStore = create<CredentialState>((set) => ({
  credentials: [],
  isLoading: false,

  fetchCredentials: async (typeFilter?: string) => {
    set({ isLoading: true });
    try {
      const params = typeFilter ? { type: typeFilter } : {};
      const response = await apiClient.get('/credentials', { params });
      set({ credentials: response.data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createCredential: async (name: string, type: string, data: Record<string, unknown>) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/credentials', { name, type, data });
      set((state) => ({
        credentials: [response.data, ...state.credentials],
        isLoading: false,
      }));
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateCredential: async (id: string, updates: { name?: string; data?: Record<string, unknown> }) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.patch(`/credentials/${id}`, updates);
      set((state) => ({
        credentials: state.credentials.map((c) => (c.id === id ? response.data : c)),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteCredential: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiClient.delete(`/credentials/${id}`);
      set((state) => ({
        credentials: state.credentials.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  testCredential: async (id: string) => {
    try {
      const response = await apiClient.post(`/credentials/${id}/test`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to test credential',
      };
    }
  },
}));
