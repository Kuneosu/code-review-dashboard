/**
 * Smart Code Review - VS Code Extension
 * Main extension entry point
 */
import * as vscode from 'vscode';
import { PythonServerManager } from './pythonServer';
import { DashboardPanel } from './dashboardPanel';

let serverManager: PythonServerManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Smart Code Review extension is now active');

  // Python 서버 관리자 초기화
  serverManager = new PythonServerManager(context);

  // Python 서버 시작
  try {
    await serverManager.start();
    vscode.window.showInformationMessage('Smart Code Review: 서버가 시작되었습니다');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Smart Code Review: 서버 시작 실패 - ${error}`
    );
  }

  // 명령어: Dashboard 열기
  const openDashboardCommand = vscode.commands.registerCommand(
    'smart-code-review.openDashboard',
    () => {
      DashboardPanel.createOrShow(context.extensionUri, serverManager);
    }
  );

  // 명령어: 현재 프로젝트 분석
  const analyzeProjectCommand = vscode.commands.registerCommand(
    'smart-code-review.analyzeCurrentProject',
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage(
          'Smart Code Review: 분석할 프로젝트 폴더를 열어주세요'
        );
        return;
      }

      const projectPath = workspaceFolders[0].uri.fsPath;
      DashboardPanel.createOrShow(context.extensionUri, serverManager);

      // Dashboard에 프로젝트 경로 전달
      setTimeout(() => {
        DashboardPanel.currentPanel?.postMessage({
          type: 'setProjectPath',
          projectPath: projectPath
        });
      }, 500);
    }
  );

  context.subscriptions.push(openDashboardCommand);
  context.subscriptions.push(analyzeProjectCommand);

  // Extension 비활성화 시 서버 종료
  context.subscriptions.push({
    dispose: () => {
      serverManager.stop();
    }
  });
}

export function deactivate() {
  if (serverManager) {
    serverManager.stop();
  }
}
