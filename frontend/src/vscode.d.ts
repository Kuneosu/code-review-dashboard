/**
 * VS Code Webview API type definitions
 */

interface VscodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

interface Window {
  vscodeApi?: VscodeApi;
}

declare function acquireVsCodeApi(): VscodeApi;
