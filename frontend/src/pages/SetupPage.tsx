/**
 * Setup Wizard Page
 *
 * First-run setup wizard for Smart Code Review extension
 */
import React, { useEffect, useState } from 'react';

interface SetupStatus {
  python: {
    installed: boolean;
    version?: string;
    error?: string;
  };
  dependencies: {
    installed: boolean;
    installing: boolean;
    error?: string;
  };
  ollama: {
    installed: boolean;
    running: boolean;
    version?: string;
    error?: string;
  };
  model: {
    installed: boolean;
    downloading: boolean;
    progress?: number;
    error?: string;
  };
}

// Declare vscodeApi globally
declare const vscodeApi: any;

export const SetupPage: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus>({
    python: { installed: false },
    dependencies: { installed: false, installing: false },
    ollama: { installed: false, running: false },
    model: { installed: false, downloading: false },
  });

  useEffect(() => {
    // Request initial status check
    vscodeApi.postMessage({ type: 'checkSetupStatus' });

    // Listen for status updates
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'setupStatus') {
        setStatus(message.status);
      } else if (message.type === 'modelProgress') {
        // Update model download progress
        setStatus(prev => ({
          ...prev,
          model: {
            ...prev.model,
            progress: message.progress,
          },
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInstallDependencies = () => {
    setStatus(prev => ({
      ...prev,
      dependencies: { ...prev.dependencies, installing: true },
    }));
    vscodeApi.postMessage({ type: 'installDependencies' });
  };

  const handleInstallOllama = () => {
    vscodeApi.postMessage({ type: 'installOllama' });
  };

  const handleStartOllama = () => {
    vscodeApi.postMessage({ type: 'startOllama' });
  };

  const handleDownloadModel = () => {
    setStatus(prev => ({
      ...prev,
      model: { ...prev.model, downloading: true },
    }));
    vscodeApi.postMessage({ type: 'downloadModel' });
  };

  const handleSkipAI = () => {
    vscodeApi.postMessage({ type: 'completeSetup', skipAI: true });
  };

  const handleComplete = () => {
    vscodeApi.postMessage({ type: 'completeSetup', skipAI: false });
  };

  // Determine overall progress
  const allEssentialReady = status.python.installed && status.dependencies.installed;
  const allAIReady = status.ollama.installed && status.ollama.running && status.model.installed;
  const canComplete = allEssentialReady;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome to Smart Code Review!</h1>
          <p className="text-blue-100">
            Let's set up your development environment for AI-powered code analysis
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Python */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">🐍</span>
                Python Environment
              </h2>
              {status.python.installed ? (
                <span className="text-green-600 font-medium">✓ Ready</span>
              ) : (
                <span className="text-orange-600 font-medium">⚠ Required</span>
              )}
            </div>

            {status.python.installed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✓ Python {status.python.version} detected
                </p>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 mb-3">
                  Python 3.8+ is required for code analysis.
                </p>
                {status.python.error && (
                  <p className="text-sm text-red-600 mb-3">{status.python.error}</p>
                )}
                <a
                  href="https://www.python.org/downloads/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Download Python →
                </a>
              </div>
            )}
          </div>

          {/* Step 2: Dependencies */}
          {status.python.installed && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  Python Dependencies
                </h2>
                {status.dependencies.installed ? (
                  <span className="text-green-600 font-medium">✓ Installed</span>
                ) : (
                  <span className="text-blue-600 font-medium">→ Required</span>
                )}
              </div>

              {status.dependencies.installed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    ✓ All required packages installed (FastAPI, ESLint, Bandit, etc.)
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 mb-3">
                    Install required Python packages for code analysis tools.
                  </p>
                  {status.dependencies.error && (
                    <p className="text-sm text-red-600 mb-3">{status.dependencies.error}</p>
                  )}
                  <button
                    onClick={handleInstallDependencies}
                    disabled={status.dependencies.installing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {status.dependencies.installing ? 'Installing...' : 'Install Dependencies'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {allEssentialReady && (
            <div className="border-t border-gray-200 my-8 pt-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                AI Analysis (Optional)
              </h3>
              <p className="text-gray-600 mb-6">
                Enable AI-powered code analysis with local LLM (Ollama + CodeLlama).
                You can skip this and install later.
              </p>
            </div>
          )}

          {/* Step 3: Ollama */}
          {allEssentialReady && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="text-2xl">🦙</span>
                  Ollama (Local LLM)
                </h2>
                {status.ollama.installed && status.ollama.running ? (
                  <span className="text-green-600 font-medium">✓ Running</span>
                ) : status.ollama.installed ? (
                  <span className="text-blue-600 font-medium">○ Installed</span>
                ) : (
                  <span className="text-gray-500 font-medium">○ Optional</span>
                )}
              </div>

              {status.ollama.installed ? (
                status.ollama.running ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      ✓ Ollama {status.ollama.version} is running
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 mb-3">Ollama is installed but not running.</p>
                    <button
                      onClick={handleStartOllama}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Start Ollama
                    </button>
                  </div>
                )
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    Ollama provides local AI analysis without cloud dependencies.
                  </p>
                  {status.ollama.error && (
                    <p className="text-sm text-red-600 mb-3">{status.ollama.error}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleInstallOllama}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      Install Ollama
                    </button>
                    <a
                      href="https://ollama.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Manual Install Guide →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: CodeLlama Model */}
          {allEssentialReady && status.ollama.installed && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  CodeLlama Model
                </h2>
                {status.model.installed ? (
                  <span className="text-green-600 font-medium">✓ Ready</span>
                ) : status.model.downloading ? (
                  <span className="text-blue-600 font-medium">⏳ Downloading...</span>
                ) : (
                  <span className="text-gray-500 font-medium">○ Optional</span>
                )}
              </div>

              {status.model.installed ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">✓ CodeLlama 7B model ready</p>
                </div>
              ) : status.model.downloading ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 mb-3">Downloading CodeLlama 7B model...</p>
                  {status.model.progress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${status.model.progress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    This may take several minutes (approx. 3.8GB download)
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    Download CodeLlama 7B model for AI-powered code analysis (~3.8GB).
                  </p>
                  {status.model.error && (
                    <p className="text-sm text-red-600 mb-3">{status.model.error}</p>
                  )}
                  <button
                    onClick={handleDownloadModel}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Download Model
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {allEssentialReady ? (
              allAIReady ? (
                <span className="text-green-600 font-medium">✓ All systems ready!</span>
              ) : (
                <span>Essential tools ready. AI features are optional.</span>
              )
            ) : (
              <span>Please complete Python setup to continue.</span>
            )}
          </div>

          <div className="flex gap-3">
            {allEssentialReady && !allAIReady && (
              <button
                onClick={handleSkipAI}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Skip AI Setup
              </button>
            )}
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
            >
              {allAIReady ? 'Complete Setup ✓' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
