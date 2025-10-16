"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPanel = void 0;
/**
 * Dashboard Webview Panel
 */
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class DashboardPanel {
    static createOrShow(extensionUri, serverManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // 이미 패널이 있으면 표시
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }
        // 새 패널 생성
        const panel = vscode.window.createWebviewPanel('smartCodeReview', 'Smart Code Review', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
                vscode.Uri.joinPath(extensionUri, 'frontend', 'dist')
            ]
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, serverManager);
    }
    constructor(panel, extensionUri, serverManager) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._serverManager = serverManager;
        // HTML 콘텐츠 설정
        this._update();
        // 패널 닫힘 이벤트 처리
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // 메시지 처리
        this._panel.webview.onDidReceiveMessage(async (message) => {
            await this._handleMessage(message);
        }, null, this._disposables);
    }
    postMessage(message) {
        this._panel.webview.postMessage(message);
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    async _handleMessage(message) {
        switch (message.type) {
            case 'openFolderPicker':
                // VS Code 네이티브 폴더 선택 다이얼로그
                const folderUri = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: '프로젝트 선택'
                });
                if (folderUri && folderUri[0]) {
                    this._panel.webview.postMessage({
                        type: 'folderSelected',
                        path: folderUri[0].fsPath
                    });
                }
                break;
            case 'apiRequest':
                // Python 서버로 API 요청 프록시
                try {
                    const url = `${this._serverManager.getServerUrl()}${message.endpoint}`;
                    const response = await fetch(url, {
                        method: message.method || 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: message.body ? JSON.stringify(message.body) : undefined
                    });
                    const data = await response.json();
                    this._panel.webview.postMessage({
                        type: 'apiResponse',
                        id: message.id,
                        data: data,
                        status: response.status
                    });
                }
                catch (error) {
                    this._panel.webview.postMessage({
                        type: 'apiResponse',
                        id: message.id,
                        error: error.message,
                        status: 500
                    });
                }
                break;
            case 'showError':
                vscode.window.showErrorMessage(message.message);
                break;
            case 'showInfo':
                vscode.window.showInformationMessage(message.message);
                break;
            case 'log':
                console.log('[Webview]', message.message);
                break;
            case 'openFile':
                // Open file in editor at specific line
                try {
                    // Construct absolute path from project path + relative file path
                    const absolutePath = path.join(message.projectPath, message.file);
                    const fileUri = vscode.Uri.file(absolutePath);
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    const editor = await vscode.window.showTextDocument(document);
                    // Navigate to specific line and column
                    const position = new vscode.Position(Math.max(0, message.line - 1), // 0-indexed
                    Math.max(0, message.column - 1) // 0-indexed
                    );
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                    vscode.window.showInformationMessage(`Opened ${path.basename(message.file)} at line ${message.line}`);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
                }
                break;
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        // 프론트엔드 빌드 파일 경로
        const frontendDistPath = path.join(this._extensionUri.fsPath, 'frontend', 'dist');
        // index.html 읽기
        const indexHtmlPath = path.join(frontendDistPath, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
            let html = fs.readFileSync(indexHtmlPath, 'utf-8');
            // 리소스 경로를 Webview URI로 변환
            const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'frontend', 'dist', 'assets'));
            // HTML 수정: 스크립트 및 스타일 경로 변경
            html = html.replace(/(<script[^>]*src=")\/assets\//g, `$1${scriptUri}/`);
            html = html.replace(/(<link[^>]*href=")\/assets\//g, `$1${scriptUri}/`);
            // VS Code Webview API 주입
            html = html.replace('</head>', `
        <script>
          const vscode = acquireVsCodeApi();
          window.vscodeApi = vscode;
        </script>
        </head>
        `);
            return html;
        }
        // 빌드 파일이 없으면 안내 메시지
        return this._getPlaceholderHtml();
    }
    _getPlaceholderHtml() {
        return `<!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Smart Code Review</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 600px;
        }
        h1 {
          color: var(--vscode-textLink-foreground);
          margin-bottom: 20px;
        }
        p {
          margin-bottom: 10px;
          line-height: 1.6;
        }
        code {
          background-color: var(--vscode-textCodeBlock-background);
          padding: 2px 6px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚧 Smart Code Review</h1>
        <p>프론트엔드 빌드 파일을 찾을 수 없습니다.</p>
        <p>다음 명령어를 실행해주세요:</p>
        <p><code>cd frontend && npm install && npm run build</code></p>
      </div>
    </body>
    </html>`;
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=dashboardPanel.js.map