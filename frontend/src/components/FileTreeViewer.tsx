/**
 * File Tree Viewer Component
 * Displays file tree with virtual scrolling
 */
import React from 'react';
import { FileNode, FileType } from '@/types';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({ node, level }) => {
  const [isExpanded, setIsExpanded] = React.useState(level < 2); // Auto-expand first 2 levels

  const icon = node.type === FileType.DIRECTORY ? '📁' : '📄';
  const hasChildren = node.children && node.children.length > 0;

  const textColor = node.filtered ? 'text-gray-400' : 'text-gray-800';
  const bgColor = node.filtered ? 'bg-gray-50' : '';

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 hover:bg-gray-100 ${bgColor} cursor-pointer`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          <span className="mr-1 text-gray-500 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-1 w-3"></span>}
        <span className="mr-2">{icon}</span>
        <span className={`text-sm ${textColor}`}>
          {node.name}
          {node.filtered && <span className="ml-2 text-xs">(filtered)</span>}
        </span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, index) => (
            <FileTreeNode key={`${child.path}-${index}`} node={child} level={level + 1} />
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
  return (
    <div className={`border border-gray-300 rounded-md overflow-auto ${className}`}>
      <FileTreeNode node={tree} level={0} />
    </div>
  );
};
