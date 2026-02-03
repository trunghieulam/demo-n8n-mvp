import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface NodeType {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  inputs: string[];
  outputs: string[];
  properties: Array<{
    displayName: string;
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    default?: unknown;
    options?: Array<{ name: string; value: string }>;
  }>;
  credentials?: Array<{
    name: string;
    displayName: string;
    properties: unknown[];
  }>;
}

interface NodeTypesState {
  nodeTypes: NodeType[];
  isLoading: boolean;
  fetchNodeTypes: () => Promise<void>;
  getNodeType: (name: string) => NodeType | undefined;
}

export const useNodeTypesStore = create<NodeTypesState>((set, get) => ({
  nodeTypes: [],
  isLoading: false,

  fetchNodeTypes: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/node-types');
      set({ nodeTypes: response.data.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getNodeType: (name: string) => {
    return get().nodeTypes.find((nt) => nt.name === name);
  },
}));
