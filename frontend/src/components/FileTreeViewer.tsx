/**
 * File Tree Viewer Component
 * Displays file tree with virtual scrolling
 */
import React, { useState } from 'react';
import { FileNode, FileType } from '@/types';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  hideFiltered: boolean;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level, hideFiltered }) => {
  const [isExpanded, setIsExpanded] = React.useState(level < 2); // Auto-expand first 2 levels

  // Hide filtered nodes if hideFiltered is true
  if (hideFiltered && node.filtered) {
    return null;
  }

  const icon = node.type === FileType.DIRECTORY ? '📁' : '📄';

  // Filter children if hideFiltered is true
  const visibleChildren = hideFiltered
    ? node.children?.filter(child => !child.filtered)
    : node.children;

  const hasVisibleChildren = visibleChildren && visibleChildren.length > 0;

  const textColor = node.filtered ? 'text-gray-400' : 'text-gray-800';
  const bgColor = node.filtered ? 'bg-gray-50' : '';

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-gray-100 ${bgColor} cursor-pointer`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasVisibleChildren && setIsExpanded(!isExpanded)}
      >
        {hasVisibleChildren && (
          <span className="mr-1 text-gray-500 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasVisibleChildren && <span className="mr-1 w-3"></span>}
        <span className="mr-2">{icon}</span>
        <span className={`text-sm ${textColor}`}>
          {node.name}
          {node.filtered && <span className="ml-2 text-xs">(filtered)</span>}
        </span>
      </div>

      {isExpanded && hasVisibleChildren && (
        <div>
          {visibleChildren!.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              hideFiltered={hideFiltered}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeViewerProps {
  tree: FileNode;
  className?: string;
}

export const FileTreeViewer: React.FC<FileTreeViewerProps> = ({ tree, className = '' }) => {
  const [hideFiltered, setHideFiltered] = useState(false);

  return (
    <div className={className}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm font-semibold text-gray-700">File Tree Preview</h3>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hideFiltered}
            onChange={(e) => setHideFiltered(e.target.checked)}
            className="mr-2"
          />
          <span className="text-xs text-gray-600">Hide filtered</span>
        </label>
      </div>

      {/* Tree */}
      <div className="border border-gray-300 rounded-md overflow-auto max-h-96">
        <FileTreeNode node={tree} level={0} hideFiltered={hideFiltered} />
      </div>
    </div>
  );
};
