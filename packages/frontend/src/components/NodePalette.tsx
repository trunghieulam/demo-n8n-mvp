import { useState } from 'react';
import { useNodeTypesStore } from '../stores/nodeTypesStore';

interface NodePaletteProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const { nodeTypes, isLoading } = useNodeTypesStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodeTypes = nodeTypes.filter((nt) =>
    nt.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-gray-100 border-r p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Node Palette</h2>
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
      />
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {filteredNodeTypes.map((nodeType) => (
            <div
              key={nodeType.name}
              draggable
              onDragStart={(e) => handleDragStart(e, nodeType.name)}
              className="p-3 bg-white border rounded cursor-move hover:bg-gray-50"
            >
              <div className="font-semibold">{nodeType.displayName}</div>
              <div className="text-sm text-gray-600">{nodeType.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
