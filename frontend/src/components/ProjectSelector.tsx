/**
 * Project Selector Component
 * Allows user to select a project directory via file picker or manual input
 */
import React, { useState, useEffect } from 'react';
import { usePhase1Store } from '@/stores/phase1Store';

export const ProjectSelector: React.FC = () => {
  const {
    projectPath,
    setProjectPath,
    loadFileTree,
    isScanning,
    error,
    clearError,
    recentProjects,
  } = usePhase1Store();

  const [inputPath, setInputPath] = useState(projectPath);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);

  // Listen for messages from VS Code extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'setProjectPath') {
        const workspacePath = message.projectPath;
        console.log('[ProjectSelector] Received workspace path:', workspacePath);

        setCurrentWorkspace(workspacePath);
        setInputPath(workspacePath);
        setProjectPath(workspacePath);

        // Auto-load file tree
        loadFileTree();
      } else if (message.type === 'folderSelected') {
        const selectedPath = message.path;
        setInputPath(selectedPath);
        setProjectPath(selectedPath);
        loadFileTree();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setProjectPath, loadFileTree]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      setProjectPath(inputPath.trim());
      await loadFileTree();
    }
  };

  const handleRecentClick = async (path: string) => {
    setInputPath(path);
    setProjectPath(path);
    await loadFileTree();
  };

  const getDefaultBasePath = (): string => {
    // Try to detect OS and suggest common base paths
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    if (platform.includes('mac') || userAgent.includes('mac')) {
      // macOS
      return '/Users/username';
    } else if (platform.includes('win') || userAgent.includes('win')) {
      // Windows
      return 'C:\\Users\\username';
    } else {
      // Linux/Unix
      return '/home/username';
    }
  };

  const handleBrowseClick = async () => {
    try {
      // Check if running in VS Code Webview
      // @ts-ignore - vscodeApi is injected by VS Code
      if (typeof window.vscodeApi !== 'undefined') {
        // VS Code Extension: 네이티브 폴더 선택 다이얼로그 사용
        // Message is handled by the global useEffect listener
        // @ts-ignore
        window.vscodeApi.postMessage({
          type: 'openFolderPicker'
        });
        return;
      }

      // 브라우저 환경: File System Access API 사용
      if ('showDirectoryPicker' in window) {
        // @ts-ignore - showDirectoryPicker is not yet in TypeScript types
        const dirHandle = await window.showDirectoryPicker({
          mode: 'read',
        });

        const dirName = dirHandle.name;

        // Get base path based on OS
        const basePath = getDefaultBasePath();

        // Common directory patterns
        const commonPaths = [
          `${basePath}/Documents`,
          `${basePath}/Projects`,
          `${basePath}/Developer`,
          `${basePath}/workspace`,
          `${basePath}/code`,
          basePath,
        ];

        // Create suggestion message
        const suggestions = commonPaths.map((p, i) => `${i + 1}. ${p}/${dirName}`).join('\n');

        const message = `Selected directory: "${dirName}"\n\n` +
          `⚠️ For security reasons, browsers cannot access the full filesystem path.\n\n` +
          `Please enter the complete path to your project directory.\n\n` +
          `Common locations:\n${suggestions}\n\n` +
          `Or enter your custom path:`;

        // Try to guess from recent projects
        let suggestedPath = `${basePath}/Documents/${dirName}`;

        // If there are recent projects, try to infer the pattern
        if (recentProjects.length > 0) {
          const recentPath = recentProjects[0];
          const parentDir = recentPath.substring(0, recentPath.lastIndexOf('/'));
          suggestedPath = `${parentDir}/${dirName}`;
        }

        const confirmedPath = prompt(message, suggestedPath);

        if (confirmedPath && confirmedPath.trim()) {
          const trimmedPath = confirmedPath.trim();
          setInputPath(trimmedPath);
          setProjectPath(trimmedPath);
          await loadFileTree();
        }
      } else {
        // Fallback: show alert for manual input
        const basePath = getDefaultBasePath();
        alert(
          `Your browser does not support the File System Access API.\n\n` +
          `Please manually enter the full path to your project directory.\n\n` +
          `Examples:\n` +
          `  macOS: /Users/username/Documents/my-project\n` +
          `  Linux: /home/username/projects/my-project\n` +
          `  Windows: C:\\Users\\username\\Documents\\my-project\n\n` +
          `Your typical base path might be: ${basePath}`
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting directory:', err);
        alert('Failed to select directory. Please enter the path manually.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Smart Code Review</h1>

        {/* Current Workspace Display */}
        {currentWorkspace && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  📂 Current Workspace
                </p>
                <p className="text-sm text-blue-700 font-mono break-all">
                  {currentWorkspace}
                </p>
              </div>
              <button
                onClick={() => setCurrentWorkspace(null)}
                className="ml-2 text-blue-600 hover:text-blue-800"
                title="Clear current workspace"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ℹ️ This folder was automatically selected from your VS Code workspace
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📁 Select Project Folder
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder={`e.g., ${getDefaultBasePath()}/Documents/my-project`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isScanning}
            />
            <button
              type="button"
              onClick={handleBrowseClick}
              disabled={isScanning}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              title="Browse for folder (you'll need to confirm the path)"
            >
              📂 Browse
            </button>
            <button
              type="submit"
              disabled={isScanning || !inputPath.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              💡 Click "Browse" to help select a folder, then confirm/edit the full path
            </p>
            <p className="text-xs text-gray-400">
              ⚠️ Due to browser security, you must verify the complete path after browsing
            </p>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-800 font-medium">{error.message}</p>
                {error.path && (
                  <p className="text-red-600 text-sm mt-1">Path: {error.path}</p>
                )}
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {recentProjects.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">or</p>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Recent Projects:
              </p>
              <ul className="space-y-2">
                {recentProjects.map((path, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleRecentClick(path)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors truncate"
                      disabled={isScanning}
                      title={path}
                    >
                      • {path}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">Scanning project directory...</p>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs font-medium text-gray-700 mb-2">💡 Quick Tips:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• You can paste or type the full path directly in the input field</li>
            <li>• Use "Browse" button as a helper to find the folder, then edit the path</li>
            <li>• Recent projects are saved for quick access</li>
            <li>• For exact paths, use your terminal: <code className="bg-white px-1 rounded">pwd</code> (macOS/Linux) or <code className="bg-white px-1 rounded">cd</code> (Windows)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
