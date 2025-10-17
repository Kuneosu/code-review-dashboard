/**
 * Setup Wizard Manager
 * 첫 실행 설정 마법사 로직 관리
 */
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { OllamaManager } from './ollamaManager';

export interface SetupStatus {
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

export class SetupManager {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private ollamaManager: OllamaManager;
  private pythonPath: string = 'python3';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('Smart Code Review Setup');
    this.ollamaManager = new OllamaManager(this.outputChannel);
  }

  /**
   * 전체 설정 상태 확인
   */
  async checkSetupStatus(): Promise<SetupStatus> {
    const status: SetupStatus = {
      python: { installed: false },
      dependencies: { installed: false, installing: false },
      ollama: { installed: false, running: false },
      model: { installed: false, downloading: false },
    };

    // Python 확인
    const pythonStatus = await this.checkPython();
    status.python = pythonStatus;

    // Python이 설치되어 있으면 의존성 확인
    if (pythonStatus.installed) {
      const depsStatus = await this.checkDependencies();
      status.dependencies = depsStatus;
    }

    // Ollama 확인
    const ollamaStatus = await this.ollamaManager.checkInstallation();
    status.ollama = {
      installed: ollamaStatus.installed,
      running: ollamaStatus.running,
      version: ollamaStatus.version,
      error: ollamaStatus.error,
    };

    // Ollama가 설치되어 있으면 모델 확인
    if (ollamaStatus.installed) {
      const modelStatus = await this.ollamaManager.checkModel('codellama:7b');
      status.model = modelStatus;
    }

    return status;
  }

  /**
   * Python 설치 확인
   */
  private async checkPython(): Promise<{
    installed: boolean;
    version?: string;
    error?: string;
  }> {
    const possiblePaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const result = child_process.spawnSync(pythonPath, ['--version']);
        if (result.status === 0) {
          this.pythonPath = pythonPath;
          const version = result.stdout.toString().trim();

          // Python 버전 파싱 (예: Python 3.9.7)
          const versionMatch = version.match(/Python (\d+\.\d+)/);
          if (versionMatch) {
            const [major, minor] = versionMatch[1].split('.').map(Number);
            if (major >= 3 && minor >= 8) {
              this.outputChannel.appendLine(`[Setup] Python 발견: ${version}`);
              return {
                installed: true,
                version: versionMatch[1],
              };
            } else {
              return {
                installed: false,
                error: `Python 3.8 이상이 필요합니다 (현재: ${versionMatch[1]})`,
              };
            }
          }
        }
      } catch (error) {
        continue;
      }
    }

    return {
      installed: false,
      error: 'Python 3.8 이상이 설치되어 있지 않습니다',
    };
  }

  /**
   * Python 의존성 설치 확인
   */
  private async checkDependencies(): Promise<{
    installed: boolean;
    installing: boolean;
    error?: string;
  }> {
    const markerPath = path.join(
      this.context.globalStorageUri.fsPath,
      '.deps-installed'
    );

    if (fs.existsSync(markerPath)) {
      return {
        installed: true,
        installing: false,
      };
    }

    return {
      installed: false,
      installing: false,
    };
  }

  /**
   * Python 의존성 설치
   */
  async installDependencies(
    onProgress?: (message: string) => void
  ): Promise<void> {
    const backendPath = path.join(this.context.extensionPath, 'backend');
    const requirementsPath = path.join(backendPath, 'requirements.txt');

    this.outputChannel.appendLine('[Setup] Python 의존성을 설치합니다...');

    // 디렉토리 생성
    if (!fs.existsSync(this.context.globalStorageUri.fsPath)) {
      fs.mkdirSync(this.context.globalStorageUri.fsPath, { recursive: true });
    }

    return new Promise<void>((resolve, reject) => {
      const installProcess = child_process.spawn(
        this.pythonPath,
        ['-m', 'pip', 'install', '-r', requirementsPath, '--user'],
        { cwd: backendPath }
      );

      installProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        this.outputChannel.appendLine(`[pip] ${message}`);
        onProgress?.(message);
      });

      installProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        this.outputChannel.appendLine(`[pip] ${message}`);
        onProgress?.(message);
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          const markerPath = path.join(
            this.context.globalStorageUri.fsPath,
            '.deps-installed'
          );
          fs.writeFileSync(markerPath, new Date().toISOString());
          this.outputChannel.appendLine('[Setup] ✓ 의존성 설치 완료');
          resolve();
        } else {
          const error = `의존성 설치 실패 (코드: ${code})`;
          this.outputChannel.appendLine(`[Setup] ${error}`);
          reject(new Error(error));
        }
      });

      installProcess.on('error', (error) => {
        this.outputChannel.appendLine(
          `[Setup] 설치 프로세스 에러: ${error.message}`
        );
        reject(error);
      });
    });
  }

  /**
   * Ollama 설치
   */
  async installOllama(): Promise<void> {
    this.outputChannel.appendLine('[Setup] Ollama 설치를 시도합니다...');

    try {
      await this.ollamaManager.autoInstall();
      this.outputChannel.appendLine('[Setup] ✓ Ollama 설치 완료');
    } catch (error: any) {
      this.outputChannel.appendLine(`[Setup] Ollama 설치 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ollama 서버 시작
   */
  async startOllama(): Promise<void> {
    this.outputChannel.appendLine('[Setup] Ollama 서버를 시작합니다...');

    try {
      await this.ollamaManager.start();
      this.outputChannel.appendLine('[Setup] ✓ Ollama 서버 시작 완료');
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[Setup] Ollama 서버 시작 실패: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * CodeLlama 모델 다운로드
   */
  async downloadModel(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.outputChannel.appendLine('[Setup] CodeLlama 모델을 다운로드합니다...');

    try {
      await this.ollamaManager.downloadModel('codellama:7b', onProgress);
      this.outputChannel.appendLine('[Setup] ✓ 모델 다운로드 완료');
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[Setup] 모델 다운로드 실패: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * 설정 완료 표시
   */
  async completeSetup(skipAI: boolean = false): Promise<void> {
    // 설정 완료 플래그 저장
    await this.context.globalState.update('setupCompleted', true);

    if (skipAI) {
      await this.context.globalState.update('aiSkipped', true);
      this.outputChannel.appendLine('[Setup] ✓ 기본 설정 완료 (AI 기능 제외)');
    } else {
      this.outputChannel.appendLine('[Setup] ✓ 모든 설정 완료');
    }
  }

  /**
   * 첫 실행 여부 확인
   */
  isFirstRun(): boolean {
    return !this.context.globalState.get<boolean>('setupCompleted', false);
  }

  /**
   * Ollama Manager 반환
   */
  getOllamaManager(): OllamaManager {
    return this.ollamaManager;
  }

  /**
   * Output Channel 표시
   */
  showOutput(): void {
    this.outputChannel.show();
  }
}
