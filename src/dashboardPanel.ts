/**
 * Dashboard Webview Panel
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PythonServerManager } from './pythonServer';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _serverManager: PythonServerManager;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    serverManager: PythonServerManager
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 이미 패널이 있으면 표시
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      return;
    }

    // 새 패널 생성
    const panel = vscode.window.createWebviewPanel(
      'smartCodeReview',
      'Smart Code Review',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview', 'dist'),
          vscode.Uri.joinPath(extensionUri, 'frontend', 'dist')
        ]
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      serverManager
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    serverManager: PythonServerManager
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._serverManager = serverManager;

    // HTML 콘텐츠 설정
    this._update();

    // 패널 닫힘 이벤트 처리
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // 메시지 처리
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this._handleMessage(message);
      },
      null,
      this._disposables
    );
  }

  public postMessage(message: any): void {
    this._panel.webview.postMessage(message);
  }

  public dispose() {
    DashboardPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _handleMessage(message: any) {
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
        } catch (error: any) {
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
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // 프론트엔드 빌드 파일 경로
    const frontendDistPath = path.join(
      this._extensionUri.fsPath,
      'frontend',
      'dist'
    );

    // index.html 읽기
    const indexHtmlPath = path.join(frontendDistPath, 'index.html');

    if (fs.existsSync(indexHtmlPath)) {
      let html = fs.readFileSync(indexHtmlPath, 'utf-8');

      // 리소스 경로를 Webview URI로 변환
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, 'frontend', 'dist', 'assets')
      );

      // HTML 수정: 스크립트 및 스타일 경로 변경
      html = html.replace(
        /(<script[^>]*src=")\/assets\//g,
        `$1${scriptUri}/`
      );
      html = html.replace(
        /(<link[^>]*href=")\/assets\//g,
        `$1${scriptUri}/`
      );

      // VS Code Webview API 주입
      html = html.replace(
        '</head>',
        `
        <script>
          const vscode = acquireVsCodeApi();
          window.vscodeApi = vscode;
        </script>
        </head>
        `
      );

      return html;
    }

    // 빌드 파일이 없으면 안내 메시지
    return this._getPlaceholderHtml();
  }

  private _getPlaceholderHtml(): string {
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
