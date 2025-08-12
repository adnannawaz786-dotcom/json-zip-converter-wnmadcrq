import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';

const FileTreeNode = ({ node, level = 0, onToggle, expandedNodes }) => {
  const isExpanded = expandedNodes.has(node.path);
  const hasChildren = node.children && node.children.length > 0;
  
  const handleToggle = () => {
    if (hasChildren) {
      onToggle(node.path);
    }
  };

  const getIcon = () => {
    if (node.type === 'file') {
      return <File className="w-4 h-4 text-blue-500" />;
    }
    return isExpanded ? 
      <FolderOpen className="w-4 h-4 text-yellow-600" /> : 
      <Folder className="w-4 h-4 text-yellow-500" />;
  };

  const getChevron = () => {
    if (!hasChildren) return <div className="w-4 h-4" />;
    return isExpanded ? 
      <ChevronDown className="w-4 h-4 text-gray-500" /> : 
      <ChevronRight className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleToggle}
      >
        {getChevron()}
        {getIcon()}
        <span className="ml-2 text-sm text-gray-700 truncate">
          {node.name}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ data, className = "" }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const handleToggle = (path) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const getAllPaths = (node) => {
      const paths = [];
      if (node.children && node.children.length > 0) {
        paths.push(node.path);
        node.children.forEach(child => {
          paths.push(...getAllPaths(child));
        });
      }
      return paths;
    };

    const allPaths = new Set();
    if (data && data.children) {
      data.children.forEach(child => {
        getAllPaths(child).forEach(path => allPaths.add(path));
      });
    }
    setExpandedNodes(allPaths);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (!data) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-gray-500 text-sm">No file structure to display</div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      <div className="border-b p-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">File Structure</h3>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        {data.children && data.children.length > 0 ? (
          data.children.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              onToggle={handleToggle}
              expandedNodes={expandedNodes}
            />
          ))
        ) : (
          <div className="text-gray-500 text-sm p-4 text-center">
            No files or folders found
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTree;