/**
 * Smart Code Review - VS Code Extension
 * Main extension entry point
 */
import * as vscode from 'vscode';
import { PythonServerManager } from './pythonServer';
import { DashboardPanel } from './dashboardPanel';
import { SetupManager } from './setupManager';

let serverManager: PythonServerManager;
let setupManager: SetupManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Smart Code Review extension is now active');

  // Setup 관리자 초기화
  setupManager = new SetupManager(context);

  // 첫 실행 확인
  if (setupManager.isFirstRun()) {
    console.log('[Extension] 첫 실행 감지 - Setup Wizard 표시');
    // Setup Wizard 자동 실행
    DashboardPanel.createOrShow(context.extensionUri, null, setupManager, true);
    return; // Setup이 완료될 때까지 서버 시작 안 함
  }

  // Python 서버 관리자 초기화
  serverManager = new PythonServerManager(context);

  // Python 서버 시작
  try {
    await serverManager.start();

    // Ollama 자동 시작 (AI 기능이 스킵되지 않은 경우)
    const aiSkipped = context.globalState.get<boolean>('aiSkipped', false);
    if (!aiSkipped) {
      const ollamaManager = setupManager.getOllamaManager();
      const ollamaStatus = await ollamaManager.checkInstallation();

      if (ollamaStatus.installed && !ollamaStatus.running) {
        try {
          await ollamaManager.start();
          console.log('[Extension] Ollama 서버 자동 시작 완료');
        } catch (error) {
          console.error('[Extension] Ollama 자동 시작 실패:', error);
        }
      }
    }

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
      DashboardPanel.createOrShow(context.extensionUri, serverManager, setupManager);
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
      DashboardPanel.createOrShow(context.extensionUri, serverManager, setupManager);

      // Dashboard에 프로젝트 경로 전달
      setTimeout(() => {
        DashboardPanel.currentPanel?.postMessage({
          type: 'setProjectPath',
          projectPath: projectPath
        });
      }, 500);
    }
  );

  // 명령어: Setup Wizard 열기
  const setupCommand = vscode.commands.registerCommand(
    'smart-code-review.setup',
    () => {
      DashboardPanel.createOrShow(context.extensionUri, serverManager, setupManager, true);
    }
  );

  // 개발 전용: Setup 상태 리셋 (첫 실행 시뮬레이션)
  const resetSetupCommand = vscode.commands.registerCommand(
    'smart-code-review.resetSetup',
    async () => {
      await context.globalState.update('setupCompleted', undefined);
      await context.globalState.update('aiSkipped', undefined);
      vscode.window.showInformationMessage(
        'Setup state reset. Reload window to see first-run wizard.',
        'Reload Window'
      ).then((selection) => {
        if (selection === 'Reload Window') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    }
  );

  context.subscriptions.push(openDashboardCommand);
  context.subscriptions.push(analyzeProjectCommand);
  context.subscriptions.push(setupCommand);
  context.subscriptions.push(resetSetupCommand);

  // Extension 비활성화 시 서버 종료
  context.subscriptions.push({
    dispose: () => {
      if (serverManager) {
        serverManager.stop();
      }
      if (setupManager) {
        setupManager.getOllamaManager().stop();
      }
    }
  });
}

export function deactivate() {
  if (serverManager) {
    serverManager.stop();
  }
  if (setupManager) {
    setupManager.getOllamaManager().stop();
  }
}
