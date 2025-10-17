/**
 * Ollama 백엔드 관리자
 * Ollama 설치, 실행, 모델 관리를 담당
 */
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as os from 'os';

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

export interface ModelStatus {
  installed: boolean;
  downloading: boolean;
  progress?: number;
  error?: string;
}

export class OllamaManager {
  private process: child_process.ChildProcess | null = null;
  private outputChannel: vscode.OutputChannel;
  private ollamaPath: string = 'ollama';

  constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel =
      outputChannel || vscode.window.createOutputChannel('Ollama');
  }

  /**
   * Ollama가 설치되어 있는지 확인
   */
  async checkInstallation(): Promise<OllamaStatus> {
    try {
      // Windows에서는 where, Unix 계열에서는 which 사용
      const command = os.platform() === 'win32' ? 'where' : 'which';
      const result = child_process.spawnSync(command, ['ollama']);

      if (result.status === 0) {
        // Ollama 버전 확인
        const versionResult = child_process.spawnSync('ollama', ['--version']);
        const version = versionResult.stdout.toString().trim();

        // Ollama가 실행 중인지 확인
        const running = await this.checkRunning();

        return {
          installed: true,
          running,
          version,
        };
      }

      return {
        installed: false,
        running: false,
      };
    } catch (error: any) {
      return {
        installed: false,
        running: false,
        error: error.message,
      };
    }
  }

  /**
   * Ollama가 실행 중인지 확인
   */
  async checkRunning(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ollama 서버 시작
   */
  async start(): Promise<void> {
    // 이미 실행 중이면 중복 실행 방지
    if (this.process) {
      this.outputChannel.appendLine('[Ollama] 이미 실행 중입니다');
      return;
    }

    // 외부에서 이미 실행 중인지 확인
    const isRunning = await this.checkRunning();
    if (isRunning) {
      this.outputChannel.appendLine('[Ollama] 외부에서 이미 실행 중입니다');
      return;
    }

    this.outputChannel.appendLine('[Ollama] 서버를 시작합니다...');

    try {
      // Ollama serve 시작
      this.process = child_process.spawn('ollama', ['serve'], {
        env: { ...process.env },
      });

      // 표준 출력 처리
      this.process.stdout?.on('data', (data) => {
        this.outputChannel.appendLine(`[Ollama] ${data.toString().trim()}`);
      });

      // 표준 에러 처리
      this.process.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(
          `[Ollama Error] ${data.toString().trim()}`
        );
      });

      // 프로세스 에러 처리
      this.process.on('error', (error) => {
        this.outputChannel.appendLine(`[Ollama Process Error] ${error.message}`);
        vscode.window.showErrorMessage(`Ollama 시작 실패: ${error.message}`);
      });

      // 프로세스 종료 처리
      this.process.on('exit', (code, signal) => {
        this.outputChannel.appendLine(
          `[Ollama] 프로세스 종료 (코드: ${code}, 시그널: ${signal})`
        );
        this.process = null;
      });

      // 서버가 준비될 때까지 대기
      await this.waitForServer();
      this.outputChannel.appendLine('[Ollama] ✓ 서버가 성공적으로 시작되었습니다');
    } catch (error: any) {
      this.outputChannel.appendLine(`[Ollama] 시작 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ollama 서버 중지
   */
  stop(): void {
    if (this.process) {
      this.outputChannel.appendLine('[Ollama] 서버를 중지합니다...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  /**
   * 서버가 준비될 때까지 대기
   */
  private async waitForServer(maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const isRunning = await this.checkRunning();
      if (isRunning) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.outputChannel.appendLine(
        `[Ollama] 서버 대기 중... (${i + 1}/${maxRetries})`
      );
    }

    throw new Error('Ollama 서버가 제한 시간 내에 시작되지 않았습니다');
  }

  /**
   * 설치된 모델 목록 조회
   */
  async listModels(): Promise<string[]> {
    try {
      const result = child_process.spawnSync('ollama', ['list']);

      if (result.status === 0) {
        const output = result.stdout.toString();
        const lines = output.split('\n').slice(1); // 헤더 제거

        return lines
          .filter((line) => line.trim())
          .map((line) => line.split(/\s+/)[0]); // 첫 번째 컬럼이 모델명
      }

      return [];
    } catch (error: any) {
      this.outputChannel.appendLine(
        `[Ollama] 모델 목록 조회 실패: ${error.message}`
      );
      return [];
    }
  }

  /**
   * 특정 모델이 설치되어 있는지 확인
   */
  async checkModel(modelName: string): Promise<ModelStatus> {
    try {
      const models = await this.listModels();
      const installed = models.some((model) =>
        model.toLowerCase().includes(modelName.toLowerCase())
      );

      return {
        installed,
        downloading: false,
      };
    } catch (error: any) {
      return {
        installed: false,
        downloading: false,
        error: error.message,
      };
    }
  }

  /**
   * 모델 다운로드
   */
  async downloadModel(
    modelName: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.outputChannel.appendLine(`[Ollama] 모델 다운로드 시작: ${modelName}`);

    return new Promise<void>((resolve, reject) => {
      const pullProcess = child_process.spawn('ollama', ['pull', modelName]);

      let lastProgress = 0;

      pullProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        this.outputChannel.appendLine(`[Ollama] ${message}`);

        // 진행률 파싱 (예: "downloading 50%")
        const progressMatch = message.match(/(\d+)%/);
        if (progressMatch && onProgress) {
          const progress = parseInt(progressMatch[1], 10);
          if (progress !== lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });

      pullProcess.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(
          `[Ollama Error] ${data.toString().trim()}`
        );
      });

      pullProcess.on('close', (code) => {
        if (code === 0) {
          this.outputChannel.appendLine(
            `[Ollama] ✓ 모델 다운로드 완료: ${modelName}`
          );
          resolve();
        } else {
          const error = `모델 다운로드 실패 (코드: ${code})`;
          this.outputChannel.appendLine(`[Ollama] ${error}`);
          reject(new Error(error));
        }
      });

      pullProcess.on('error', (error) => {
        this.outputChannel.appendLine(
          `[Ollama] 다운로드 프로세스 에러: ${error.message}`
        );
        reject(error);
      });
    });
  }

  /**
   * Ollama 설치 가이드 URL 반환 (OS별)
   */
  getInstallGuideUrl(): string {
    const platform = os.platform();

    switch (platform) {
      case 'darwin': // macOS
        return 'https://ollama.com/download/mac';
      case 'win32': // Windows
        return 'https://ollama.com/download/windows';
      case 'linux':
        return 'https://ollama.com/download/linux';
      default:
        return 'https://ollama.com/download';
    }
  }

  /**
   * Ollama 자동 설치 (macOS의 경우)
   */
  async autoInstall(): Promise<void> {
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOS - Homebrew 사용
      this.outputChannel.appendLine('[Ollama] Homebrew를 통해 설치를 시도합니다...');

      return new Promise<void>((resolve, reject) => {
        const installProcess = child_process.spawn('brew', ['install', 'ollama']);

        installProcess.stdout?.on('data', (data) => {
          this.outputChannel.appendLine(`[brew] ${data.toString().trim()}`);
        });

        installProcess.stderr?.on('data', (data) => {
          this.outputChannel.appendLine(`[brew] ${data.toString().trim()}`);
        });

        installProcess.on('close', (code) => {
          if (code === 0) {
            this.outputChannel.appendLine('[Ollama] ✓ 설치 완료');
            resolve();
          } else {
            reject(new Error(`Ollama 설치 실패 (코드: ${code})`));
          }
        });

        installProcess.on('error', (error) => {
          reject(error);
        });
      });
    } else {
      // 다른 OS는 수동 설치 안내
      throw new Error(
        `${platform}에서는 자동 설치가 지원되지 않습니다. ${this.getInstallGuideUrl()}에서 수동으로 설치해주세요.`
      );
    }
  }

  /**
   * 현재 실행 중인지 여부
   */
  isRunning(): boolean {
    return this.process !== null;
  }
}
