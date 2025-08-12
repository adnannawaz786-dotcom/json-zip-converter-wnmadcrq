import React, { useState, useCallback } from 'react'
import { Upload, Download, FileText, Folder, FolderOpen, File, X, ChevronRight, ChevronDown } from 'lucide-react'

function App() {
  const [jsonInput, setJsonInput] = useState('')
  const [fileStructure, setFileStructure] = useState(null)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(new Set())

  const parseJsonToFileStructure = useCallback((jsonData) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      return data
    } catch (err) {
      throw new Error('Invalid JSON format')
    }
  }, [])

  const handleJsonInput = useCallback((value) => {
    setJsonInput(value)
    setError('')
    
    if (!value.trim()) {
      setFileStructure(null)
      return
    }

    try {
      const structure = parseJsonToFileStructure(value)
      setFileStructure(structure)
    } catch (err) {
      setError(err.message)
      setFileStructure(null)
    }
  }, [parseJsonToFileStructure])

  const toggleFolder = useCallback((path) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  const createFileInZip = useCallback((zip, path, content) => {
    if (typeof content === 'string') {
      zip.file(path, content)
    } else if (typeof content === 'object' && content !== null) {
      zip.file(path, JSON.stringify(content, null, 2))
    } else {
      zip.file(path, String(content))
    }
  }, [])

  const processStructure = useCallback((zip, structure, basePath = '') => {
    Object.entries(structure).forEach(([key, value]) => {
      const currentPath = basePath ? `${basePath}/${key}` : key
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Check if this is a file object with content
        if (value.hasOwnProperty('content')) {
          createFileInZip(zip, currentPath, value.content)
        } else if (value.hasOwnProperty('type') && value.type === 'file' && value.hasOwnProperty('data')) {
          createFileInZip(zip, currentPath, value.data)
        } else {
          // It's a directory, create it and recurse
          zip.folder(currentPath)
          processStructure(zip, value, currentPath)
        }
      } else {
        // It's a file with direct content
        createFileInZip(zip, currentPath, value)
      }
    })
  }, [createFileInZip])

  const generateZip = useCallback(async () => {
    if (!fileStructure) return

    setIsGenerating(true)
    try {
      const zip = new JSZip()
      processStructure(zip, fileStructure)
      
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = 'generated-files.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to generate ZIP file: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [fileStructure, processStructure])

  const renderFileTree = useCallback((structure, basePath = '', level = 0) => {
    if (!structure || typeof structure !== 'object') return null

    return Object.entries(structure).map(([key, value]) => {
      const currentPath = basePath ? `${basePath}/${key}` : key
      const isExpanded = expandedFolders.has(currentPath)
      const isFolder = value && typeof value === 'object' && !Array.isArray(value) && 
                      !value.hasOwnProperty('content') && 
                      !(value.hasOwnProperty('type') && value.type === 'file')

      return (
        <div key={currentPath} className="select-none">
          <div 
            className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded transition-colors ${
              level > 0 ? `ml-${level * 4}` : ''
            }`}
            onClick={() => isFolder && toggleFolder(currentPath)}
            style={{ marginLeft: `${level * 16}px` }}
          >
            {isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 mr-1 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1 text-gray-500" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
                ) : (
                  <Folder className="w-4 h-4 mr-2 text-blue-500" />
                )}
              </>
            ) : (
              <>
                <div className="w-4 h-4 mr-1" />
                <File className="w-4 h-4 mr-2 text-gray-500" />
              </>
            )}
            <span className="text-sm font-medium text-gray-700">{key}</span>
          </div>
          {isFolder && isExpanded && (
            <div>
              {renderFileTree(value, currentPath, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }, [expandedFolders, toggleFolder])

  const clearAll = useCallback(() => {
    setJsonInput('')
    setFileStructure(null)
    setError('')
    setExpandedFolders(new Set())
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">JSON to ZIP Converter</h1>
          <p className="text-gray-600">Convert JSON file structure to downloadable ZIP archive</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                JSON Input
              </h2>
              {jsonInput && (
                <button
                  onClick={clearAll}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  title="Clear all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonInput(e.target.value)}
              placeholder={`Enter your JSON structure here, e.g.:
{
  "src": {
    "components": {
      "Header.js": "export default function Header() { return <h1>Hello</h1> }",
      "Footer.js": { "content": "export default function Footer() { return <footer>Footer</footer> }" }
    },
    "styles": {
      "main.css": "body { margin: 0; padding: 0; }"
    },
    "index.js": "import React from 'react';"
  },
  "README.md": "# My Project\\nThis is a sample project.",
  "package.json": {
    "name": "my-project",
    "version": "1.0.0"
  }
}`}
              className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {error && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Folder className="w-5 h-5 mr-2" />
              File Tree Preview
            </h2>
            
            {fileStructure ? (
              <div className="border border-gray-200 rounded-md p-4 h-96 overflow-y-auto bg-gray-50">
                {renderFileTree(fileStructure)}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-8 h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Enter valid JSON to see file tree preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        {fileStructure && (
          <div className="mt-6 text-center">
            <button
              onClick={generateZip}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              {isGenerating ? 'Generating ZIP...' : 'Download ZIP File'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App