import { create } from 'zustand';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

interface CanvasState {
  selectedNodeId: string | null;
  panOffset: { x: number; y: number };
  zoom: number;
  selectNode: (nodeId: string | null) => void;
  panCanvas: (dx: number, dy: number) => void;
  zoomCanvas: (factor: number) => void;
  fitToScreen: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  selectedNodeId: null,
  panOffset: { x: 0, y: 0 },
  zoom: 1,

  selectNode: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  panCanvas: (dx: number, dy: number) => {
    set((state) => ({
      panOffset: {
        x: state.panOffset.x + dx,
        y: state.panOffset.y + dy,
      },
    }));
  },

  zoomCanvas: (factor: number) => {
    set((state) => ({
      zoom: Math.max(0.5, Math.min(2, state.zoom * factor)),
    }));
  },

  fitToScreen: () => {
    set({ zoom: 1, panOffset: { x: 0, y: 0 } });
  },
}));
