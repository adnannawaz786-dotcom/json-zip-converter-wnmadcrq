
/**
 * Validates if a string is valid JSON
 * @param {string} jsonString - The JSON string to validate
 * @returns {boolean} - True if valid JSON, false otherwise
 */
export const isValidJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Parses JSON string safely
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object|null} - Parsed JSON object or null if invalid
 */
export const parseJSON = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Invalid JSON:', error);
    return null;
  }
};

/**
 * Creates a file tree structure from JSON data
 * @param {Object} data - The JSON data to convert
 * @param {string} rootName - Name for the root directory
 * @returns {Object} - File tree structure
 */
export const createFileTree = (data, rootName = 'root') => {
  const tree = {
    name: rootName,
    type: 'folder',
    children: []
  };

  const processValue = (key, value, parent) => {
    if (value === null || value === undefined) {
      parent.children.push({
        name: `${key}.txt`,
        type: 'file',
        content: String(value)
      });
    } else if (Array.isArray(value)) {
      const arrayFolder = {
        name: key,
        type: 'folder',
        children: []
      };
      
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const itemFolder = {
            name: `item_${index}`,
            type: 'folder',
            children: []
          };
          processObject(item, itemFolder);
          arrayFolder.children.push(itemFolder);
        } else {
          arrayFolder.children.push({
            name: `item_${index}.txt`,
            type: 'file',
            content: String(item)
          });
        }
      });
      
      parent.children.push(arrayFolder);
    } else if (typeof value === 'object') {
      const objectFolder = {
        name: key,
        type: 'folder',
        children: []
      };
      processObject(value, objectFolder);
      parent.children.push(objectFolder);
    } else {
      parent.children.push({
        name: `${key}.txt`,
        type: 'file',
        content: String(value)
      });
    }
  };

  const processObject = (obj, parent) => {
    Object.entries(obj).forEach(([key, value]) => {
      processValue(key, value, parent);
    });
  };

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      processValue(`item_${index}`, item, tree);
    });
  } else if (typeof data === 'object' && data !== null) {
    processObject(data, tree);
  } else {
    tree.children.push({
      name: 'data.txt',
      type: 'file',
      content: String(data)
    });
  }

  return tree;
};

/**
 * Converts file tree to ZIP format
 * @param {Object} fileTree - The file tree structure
 * @returns {Promise<Blob>} - ZIP file as blob
 */
export const convertTreeToZip = async (fileTree) => {
  const zip = new JSZip();

  const addToZip = (node, currentPath = '') => {
    if (node.type === 'file') {
      const filePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      zip.file(filePath, node.content || '');
    } else if (node.type === 'folder' && node.children) {
      const folderPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      
      // Add empty folder if it has no children
      if (node.children.length === 0) {
        zip.folder(folderPath);
      } else {
        node.children.forEach(child => {
          addToZip(child, folderPath);
        });
      }
    }
  };

  // Start from root children to avoid creating unnecessary root folder
  if (fileTree.children && fileTree.children.length > 0) {
    fileTree.children.forEach(child => {
      addToZip(child);
    });
  } else {
    // If no children, create empty root folder
    zip.folder(fileTree.name);
  }

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    return content;
  } catch (error) {
    console.error('Error generating ZIP:', error);
    throw new Error('Failed to generate ZIP file');
  }
};

/**
 * Downloads a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Formats file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Sanitizes filename by removing invalid characters
 * @param {string} filename - The filename to sanitize
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Counts total files and folders in a file tree
 * @param {Object} fileTree - The file tree structure
 * @returns {Object} - Object with files and folders count
 */
export const countTreeItems = (fileTree) => {
  let files = 0;
  let folders = 0;

  const countItems = (node) => {
    if (node.type === 'file') {
      files++;
    } else if (node.type === 'folder') {
      folders++;
      if (node.children) {
        node.children.forEach(countItems);
      }
    }
  };

  if (fileTree.children) {
    fileTree.children.forEach(countItems);
  }

  return { files, folders };
};

/**
 * Generates a unique filename with timestamp
 * @param {string} baseName - Base name for the file
 * @param {string} extension - File extension
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (baseName = 'converted', extension = 'zip') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${baseName}_${timestamp}.${extension}`;
};

/**
 * Validates file tree structure
 * @param {Object} fileTree - The file tree to validate
 * @returns {boolean} - True if valid structure
 */
export const isValidFileTree = (fileTree) => {
  if (!fileTree || typeof fileTree !== 'object') {
    return false;
  }

  if (!fileTree.name || !fileTree.type) {
    return false;
  }

  if (fileTree.type !== 'file' && fileTree.type !== 'folder') {
    return false;
  }

  if (fileTree.type === 'folder' && fileTree.children) {
    return Array.isArray(fileTree.children) && 
           fileTree.children.every(child => isValidFileTree(child));
  }

  return true;
};

/**
 * Deep clones a file tree structure
 * @param {Object} fileTree - The file tree to clone
 * @returns {Object} - Cloned file tree
 */
export const cloneFileTree = (fileTree) => {
  if (!fileTree) return null;

  const cloned = {
    name: fileTree.name,
    type: fileTree.type
  };

  if (fileTree.content !== undefined) {
    cloned.content = fileTree.content;
  }

  if (fileTree.children) {
    cloned.children = fileTree.children.map(child => cloneFileTree(child));
  }

  return cloned;
};