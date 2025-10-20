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
exports.PythonServerManager = void 0;
/**
 * Python 백엔드 서버 관리자
 */
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class PythonServerManager {
    constructor(context) {
        this.process = null;
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Smart Code Review');
        // 설정에서 값 가져오기
        const config = vscode.workspace.getConfiguration('smartCodeReview');
        this.port = config.get('serverPort') || 8000;
        this.pythonPath = config.get('pythonPath') || 'python3';
    }
    async start() {
        // 이미 실행 중이면 중복 실행 방지
        if (this.process) {
            this.outputChannel.appendLine('서버가 이미 실행 중입니다');
            return;
        }
        // Output Channel을 보이게 함
        this.outputChannel.show(true);
        this.outputChannel.appendLine('Python 서버를 시작합니다...');
        // Python 존재 확인
        const pythonExists = await this.checkPythonInstallation();
        if (!pythonExists) {
            throw new Error('Python 3.9 이상이 필요합니다. https://www.python.org/downloads/ 에서 설치해주세요.');
        }
        // 의존성 확인 및 설치
        await this.ensureDependencies();
        // 서버 시작
        const serverPath = path.join(this.context.extensionPath, 'backend');
        this.outputChannel.appendLine(`서버 경로: ${serverPath}`);
        this.outputChannel.appendLine(`Python 경로: ${this.pythonPath}`);
        this.outputChannel.appendLine(`포트: ${this.port}`);
        this.process = child_process.spawn(this.pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', this.port.toString()], {
            cwd: serverPath,
            env: { ...process.env }
        });
        // 표준 출력 처리
        this.process.stdout?.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                this.outputChannel.appendLine(`${message}`);
            }
        });
        // 표준 에러 처리
        this.process.stderr?.on('data', (data) => {
            const message = data.toString().trim();
            // 무시할 메시지들 (Python/Semgrep 내부 이슈)
            const ignoredPatterns = [
                'blake2', // Python hashlib 빌드 이슈
                'ERROR:root:code for hash', // hashlib 에러
                'Traceback (most recent call last)', // hashlib 트레이스백
                'File "/Users/', // hashlib 트레이스백 경로
                'ValueError: unsupported hash', // hashlib ValueError
                'DEBUG:semgrep.app.auth' // Semgrep auth 디버그 (불필요)
            ];
            // 패턴에 매치되지 않으면 출력
            if (!ignoredPatterns.some(pattern => message.includes(pattern))) {
                this.outputChannel.appendLine(`${message}`);
            }
        });
        // 프로세스 에러 처리
        this.process.on('error', (error) => {
            this.outputChannel.appendLine(`[프로세스 에러] ${error.message}`);
            vscode.window.showErrorMessage(`서버 시작 실패: ${error.message}`);
        });
        // 프로세스 종료 처리
        this.process.on('exit', (code, signal) => {
            this.outputChannel.appendLine(`서버 프로세스 종료 (코드: ${code}, 시그널: ${signal})`);
            this.process = null;
        });
        // 서버가 준비될 때까지 대기
        await this.waitForServer();
        this.outputChannel.appendLine('✓ 서버가 성공적으로 시작되었습니다');
    }
    stop() {
        if (this.process) {
            this.outputChannel.appendLine('서버를 중지합니다...');
            this.process.kill('SIGTERM');
            this.process = null;
        }
    }
    getServerUrl() {
        return `http://127.0.0.1:${this.port}`;
    }
    isRunning() {
        return this.process !== null;
    }
    async checkPythonInstallation() {
        // 1. 프로젝트 루트의 .python-version 파일 확인
        const pythonVersionFile = path.join(this.context.extensionPath, '.python-version');
        let pyenvPythonPath = null;
        if (fs.existsSync(pythonVersionFile)) {
            try {
                const version = fs.readFileSync(pythonVersionFile, 'utf-8').trim();
                // pyenv의 Python 경로 생성
                const homeDir = process.env.HOME || process.env.USERPROFILE;
                if (homeDir) {
                    pyenvPythonPath = path.join(homeDir, '.pyenv', 'versions', version, 'bin', 'python3');
                    this.outputChannel.appendLine(`[DEBUG] .python-version 발견: ${version}`);
                    this.outputChannel.appendLine(`[DEBUG] pyenv 경로: ${pyenvPythonPath}`);
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`[DEBUG] .python-version 읽기 실패: ${error}`);
            }
        }
        // pyenv 경로를 최우선으로 확인
        const possiblePaths = [
            ...(pyenvPythonPath ? [pyenvPythonPath] : []),
            this.pythonPath,
            'python3',
            'python',
            '/usr/bin/python3',
            '/usr/local/bin/python3'
        ];
        for (const pythonPath of possiblePaths) {
            try {
                const result = child_process.spawnSync(pythonPath, ['--version']);
                if (result.status === 0) {
                    this.pythonPath = pythonPath;
                    const version = result.stdout.toString().trim();
                    this.outputChannel.appendLine(`Python 발견: ${version}`);
                    this.outputChannel.appendLine(`사용할 경로: ${this.pythonPath}`);
                    return true;
                }
            }
            catch (error) {
                continue;
            }
        }
        return false;
    }
    async ensureDependencies() {
        const backendPath = path.join(this.context.extensionPath, 'backend');
        const requirementsPath = path.join(backendPath, 'requirements.txt');
        // requirements.txt 생성 (poetry 없이 사용하기 위해)
        if (!fs.existsSync(requirementsPath)) {
            const requirements = [
                'fastapi==0.104.0',
                'uvicorn[standard]==0.24.0',
                'pydantic==2.5.0',
                'httpx==0.25.0',
                'pathspec==0.11.0',
                'python-multipart==0.0.6'
            ].join('\n');
            fs.writeFileSync(requirementsPath, requirements);
            this.outputChannel.appendLine('requirements.txt 파일을 생성했습니다');
        }
        // 의존성 설치 확인 마커
        const markerPath = path.join(this.context.globalStorageUri.fsPath, '.deps-installed');
        // 디렉토리 생성
        if (!fs.existsSync(this.context.globalStorageUri.fsPath)) {
            fs.mkdirSync(this.context.globalStorageUri.fsPath, { recursive: true });
        }
        // 이미 설치되었는지 확인
        if (fs.existsSync(markerPath)) {
            this.outputChannel.appendLine('의존성이 이미 설치되어 있습니다');
            return;
        }
        // 의존성 설치
        this.outputChannel.appendLine('Python 의존성을 설치합니다...');
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Smart Code Review: 의존성 설치 중...',
            cancellable: false
        }, async () => {
            return new Promise((resolve, reject) => {
                const installProcess = child_process.spawn(this.pythonPath, ['-m', 'pip', 'install', '-r', requirementsPath, '--user'], { cwd: backendPath });
                installProcess.stdout?.on('data', (data) => {
                    this.outputChannel.appendLine(`[pip] ${data.toString().trim()}`);
                });
                installProcess.stderr?.on('data', (data) => {
                    this.outputChannel.appendLine(`[pip] ${data.toString().trim()}`);
                });
                installProcess.on('close', (code) => {
                    if (code === 0) {
                        fs.writeFileSync(markerPath, new Date().toISOString());
                        this.outputChannel.appendLine('✓ 의존성 설치 완료');
                        resolve();
                    }
                    else {
                        reject(new Error(`pip install 실패 (코드: ${code})`));
                    }
                });
            });
        });
    }
    async waitForServer(maxRetries = 30) {
        const url = `${this.getServerUrl()}/health`;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return;
                }
            }
            catch (error) {
                // 서버가 아직 준비되지 않음
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.outputChannel.appendLine(`서버 대기 중... (${i + 1}/${maxRetries})`);
        }
        throw new Error('서버가 제한 시간 내에 시작되지 않았습니다');
    }
}
exports.PythonServerManager = PythonServerManager;
//# sourceMappingURL=pythonServer.js.map