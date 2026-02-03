import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { INode, IConnections, WorkflowSettings } from '@shared/types';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: INode[];
  connections: IConnections;
  isActive: boolean;
  staticData?: Record<string, unknown>;
  settings?: WorkflowSettings;
  tags?: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  isLoading: boolean;
  searchQuery: string;
  selectedTags: string[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  fetchWorkflows: (params?: { tag?: string; search?: string; limit?: number; offset?: number }) => Promise<void>;
  createWorkflow: (name: string, description?: string) => Promise<Workflow>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string, newName: string) => Promise<void>;
  activateWorkflow: (id: string) => Promise<void>;
  deactivateWorkflow: (id: string) => Promise<void>;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflow: null,
  isLoading: false,
  searchQuery: '',
  selectedTags: [],
  pagination: {
    total: 0,
    limit: 20,
    offset: 0,
  },

  fetchWorkflows: async (params = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/workflows', { params });
      set({
        workflows: response.data.data,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createWorkflow: async (name: string, description?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/workflows', { name, description });
      set((state) => ({
        workflows: [response.data, ...state.workflows],
        isLoading: false,
      }));
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateWorkflow: async (id: string, updates: Partial<Workflow>) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.patch(`/workflows/${id}`, updates);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? response.data : w)),
        selectedWorkflow: state.selectedWorkflow?.id === id ? response.data : state.selectedWorkflow,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteWorkflow: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiClient.delete(`/workflows/${id}`);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  duplicateWorkflow: async (id: string, newName: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post(`/workflows/${id}/duplicate`, { name: newName });
      set((state) => ({
        workflows: [response.data, ...state.workflows],
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  activateWorkflow: async (id: string) => {
    try {
      const response = await apiClient.post(`/workflows/${id}/activate`);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? response.data : w)),
        selectedWorkflow: state.selectedWorkflow?.id === id ? response.data : state.selectedWorkflow,
      }));
    } catch (error) {
      throw error;
    }
  },

  deactivateWorkflow: async (id: string) => {
    try {
      const response = await apiClient.post(`/workflows/${id}/deactivate`);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? response.data : w)),
        selectedWorkflow: state.selectedWorkflow?.id === id ? response.data : state.selectedWorkflow,
      }));
    } catch (error) {
      throw error;
    }
  },

  setSelectedWorkflow: (workflow: Workflow | null) => {
    set({ selectedWorkflow: workflow });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedTags: (tags: string[]) => {
    set({ selectedTags: tags });
  },
}));
