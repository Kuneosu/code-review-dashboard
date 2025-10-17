/**
 * Dashboard Webview Panel
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PythonServerManager } from './pythonServer';
import { SetupManager } from './setupManager';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _serverManager: PythonServerManager | null;
  private readonly _setupManager: SetupManager;
  private readonly _setupMode: boolean;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    serverManager: PythonServerManager | null,
    setupManager: SetupManager,
    setupMode: boolean = false
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
      serverManager,
      setupManager,
      setupMode
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    serverManager: PythonServerManager | null,
    setupManager: SetupManager,
    setupMode: boolean
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._serverManager = serverManager;
    this._setupManager = setupManager;
    this._setupMode = setupMode;

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
        if (!this._serverManager) {
          this._panel.webview.postMessage({
            type: 'apiResponse',
            id: message.id,
            error: 'Server not initialized',
            status: 500
          });
          break;
        }

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

      case 'checkSetupStatus':
        // Setup Wizard: 설정 상태 확인
        try {
          const status = await this._setupManager.checkSetupStatus();
          this._panel.webview.postMessage({
            type: 'setupStatus',
            status
          });
        } catch (error: any) {
          console.error('[Setup] Status check failed:', error);
        }
        break;

      case 'installDependencies':
        // Setup Wizard: Python 의존성 설치
        try {
          await this._setupManager.installDependencies((msg) => {
            this._panel.webview.postMessage({
              type: 'installProgress',
              message: msg
            });
          });

          // 설치 완료 후 상태 업데이트
          const status = await this._setupManager.checkSetupStatus();
          this._panel.webview.postMessage({
            type: 'setupStatus',
            status
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `의존성 설치 실패: ${error.message}`
          );
        }
        break;

      case 'installOllama':
        // Setup Wizard: Ollama 설치
        try {
          await this._setupManager.installOllama();

          // 설치 완료 후 상태 업데이트
          const status = await this._setupManager.checkSetupStatus();
          this._panel.webview.postMessage({
            type: 'setupStatus',
            status
          });
        } catch (error: any) {
          const installUrl =
            this._setupManager.getOllamaManager().getInstallGuideUrl();
          vscode.window.showErrorMessage(
            `Ollama 자동 설치 실패: ${error.message}. ${installUrl}에서 수동으로 설치해주세요.`,
            'Open Install Guide'
          ).then((selection) => {
            if (selection === 'Open Install Guide') {
              vscode.env.openExternal(vscode.Uri.parse(installUrl));
            }
          });
        }
        break;

      case 'startOllama':
        // Setup Wizard: Ollama 서버 시작
        try {
          await this._setupManager.startOllama();

          // 시작 완료 후 상태 업데이트
          const status = await this._setupManager.checkSetupStatus();
          this._panel.webview.postMessage({
            type: 'setupStatus',
            status
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Ollama 서버 시작 실패: ${error.message}`
          );
        }
        break;

      case 'downloadModel':
        // Setup Wizard: 모델 다운로드
        try {
          await this._setupManager.downloadModel((progress) => {
            this._panel.webview.postMessage({
              type: 'modelProgress',
              progress
            });
          });

          // 다운로드 완료 후 상태 업데이트
          const status = await this._setupManager.checkSetupStatus();
          this._panel.webview.postMessage({
            type: 'setupStatus',
            status
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `모델 다운로드 실패: ${error.message}`
          );
        }
        break;

      case 'completeSetup':
        // Setup Wizard: 설정 완료
        try {
          await this._setupManager.completeSetup(message.skipAI);

          vscode.window.showInformationMessage(
            'Smart Code Review 설정이 완료되었습니다! VS Code를 재시작해주세요.',
            'Reload Window'
          ).then((selection) => {
            if (selection === 'Reload Window') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `설정 완료 실패: ${error.message}`
          );
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
          const position = new vscode.Position(
            Math.max(0, message.line - 1), // 0-indexed
            Math.max(0, message.column - 1) // 0-indexed
          );
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );

          vscode.window.showInformationMessage(
            `Opened ${path.basename(message.file)} at line ${message.line}`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${error.message}`
          );
        }
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

      // VS Code Webview API 및 Setup Mode 주입
      html = html.replace(
        '</head>',
        `
        <script>
          const vscode = acquireVsCodeApi();
          window.vscodeApi = vscode;
          window.__SETUP_MODE__ = ${this._setupMode};
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
