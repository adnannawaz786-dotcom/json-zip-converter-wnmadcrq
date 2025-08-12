import React, { useState, useCallback } from 'react';
import { Upload, Download, FileText, FolderOpen, File, X, CheckCircle, AlertCircle } from 'lucide-react';

const FileConverter = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [fileTree, setFileTree] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parseJsonToFileTree = useCallback((jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      const createFileStructure = (obj, path = '') => {
        const structure = [];
        
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}/${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // It's a folder
            structure.push({
              type: 'folder',
              name: key,
              path: currentPath,
              children: createFileStructure(value, currentPath)
            });
          } else {
            // It's a file
            const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            structure.push({
              type: 'file',
              name: key,
              path: currentPath,
              content: content,
              size: new Blob([content]).size
            });
          }
        }
        
        return structure;
      };
      
      return createFileStructure(data);
    } catch (err) {
      throw new Error('Invalid JSON format');
    }
  }, []);

  const handleJsonChange = (e) => {
    const value = e.target.value;
    setJsonInput(value);
    setError('');
    setSuccess('');
    
    if (value.trim()) {
      try {
        const tree = parseJsonToFileTree(value);
        setFileTree(tree);
      } catch (err) {
        setFileTree(null);
        setError(err.message);
      }
    } else {
      setFileTree(null);
    }
  };

  const createZipFromFileTree = async (fileStructure) => {
    // Dynamic import for JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    const addToZip = (items, zipFolder = zip) => {
      items.forEach(item => {
        if (item.type === 'folder') {
          const folder = zipFolder.folder(item.name);
          addToZip(item.children, folder);
        } else {
          zipFolder.file(item.name, item.content);
        }
      });
    };
    
    addToZip(fileStructure);
    return await zip.generateAsync({ type: 'blob' });
  };

  const handleDownloadZip = async () => {
    if (!fileTree || fileTree.length === 0) {
      setError('No file structure to convert');
      return;
    }
    
    setIsConverting(true);
    setError('');
    
    try {
      const zipBlob = await createZipFromFileTree(fileTree);
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted-files.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('ZIP file downloaded successfully!');
    } catch (err) {
      setError('Failed to create ZIP file: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const renderFileTree = (items, depth = 0) => {
    return items.map((item, index) => (
      <div key={index} className="select-none">
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm ${
            depth > 0 ? `ml-${depth * 4}` : ''
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          {item.type === 'folder' ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <File className="w-4 h-4 text-gray-500" />
          )}
          <span className="flex-1 truncate">{item.name}</span>
          {item.type === 'file' && (
            <span className="text-xs text-gray-400">
              {item.size < 1024 ? `${item.size}B` : `${Math.round(item.size / 1024)}KB`}
            </span>
          )}
        </div>
        {item.type === 'folder' && item.children && item.children.length > 0 && (
          <div>{renderFileTree(item.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const clearAll = () => {
    setJsonInput('');
    setFileTree(null);
    setError('');
    setSuccess('');
  };

  const getFileCount = (items) => {
    return items.reduce((count, item) => {
      if (item.type === 'file') {
        return count + 1;
      } else if (item.type === 'folder' && item.children) {
        return count + getFileCount(item.children);
      }
      return count;
    }, 0);
  };

  const getFolderCount = (items) => {
    return items.reduce((count, item) => {
      if (item.type === 'folder') {
        return count + 1 + (item.children ? getFolderCount(item.children) : 0);
      }
      return count;
    }, 0);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">JSON to ZIP Converter</h1>
        <p className="text-gray-600">Convert your JSON structure into a downloadable ZIP file with proper folder hierarchy</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JSON Input Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              JSON Input
            </h2>
            {jsonInput && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              value={jsonInput}
              onChange={handleJsonChange}
              placeholder='Enter your JSON here, e.g.:
{
  "src": {
    "components": {
      "Button.jsx": "export default function Button() { return <button>Click me</button>; }",
      "Header.jsx": "export default function Header() { return <header>My App</header>; }"
    },
    "utils": {
      "helpers.js": "export const formatDate = (date) => date.toLocaleDateString();"
    }
  },
  "README.md": "# My Project\n\nThis is a sample project."
}'
              className="w-full h-80 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {fileTree && fileTree.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-4 text-sm text-blue-700">
                <span>{getFileCount(fileTree)} files</span>
                <span>{getFolderCount(fileTree)} folders</span>
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={isConverting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                {isConverting ? 'Creating ZIP...' : 'Download ZIP'}
              </button>
            </div>
          )}
        </div>

        {/* File Tree Preview Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Tree Preview
          </h2>

          <div className="border border-gray-300 rounded-lg bg-white min-h-80">
            {fileTree && fileTree.length > 0 ? (
              <div className="p-4">
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {renderFileTree(fileTree)}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <div className="text-center space-y-2">
                  <FolderOpen className="w-12 h-12 mx-auto opacity-50" />
                  <p>Enter valid JSON to see the file tree preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How to use:</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Paste your JSON structure in the input area</li>
          <li>Objects will become folders, and properties will become files</li>
          <li>String values will be used as file content</li>
          <li>Preview the file structure in the tree view</li>
          <li>Click "Download ZIP" to get your files as a ZIP archive</li>
        </ol>
      </div>
    </div>
  );
};

export default FileConverter;