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
exports.activate = activate;
exports.deactivate = deactivate;
/**
 * Smart Code Review - VS Code Extension
 * Main extension entry point
 */
const vscode = __importStar(require("vscode"));
const pythonServer_1 = require("./pythonServer");
const dashboardPanel_1 = require("./dashboardPanel");
let serverManager;
async function activate(context) {
    console.log('Smart Code Review extension is now active');
    // Python 서버 관리자 초기화
    serverManager = new pythonServer_1.PythonServerManager(context);
    // Python 서버 시작
    try {
        await serverManager.start();
        vscode.window.showInformationMessage('Smart Code Review: 서버가 시작되었습니다');
    }
    catch (error) {
        vscode.window.showErrorMessage(`Smart Code Review: 서버 시작 실패 - ${error}`);
    }
    // 명령어: Dashboard 열기
    const openDashboardCommand = vscode.commands.registerCommand('smart-code-review.openDashboard', () => {
        dashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, serverManager);
    });
    // 명령어: 현재 프로젝트 분석
    const analyzeProjectCommand = vscode.commands.registerCommand('smart-code-review.analyzeCurrentProject', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Smart Code Review: 분석할 프로젝트 폴더를 열어주세요');
            return;
        }
        const projectPath = workspaceFolders[0].uri.fsPath;
        dashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, serverManager);
        // Dashboard에 프로젝트 경로 전달
        setTimeout(() => {
            dashboardPanel_1.DashboardPanel.currentPanel?.postMessage({
                type: 'setProjectPath',
                projectPath: projectPath
            });
        }, 500);
    });
    context.subscriptions.push(openDashboardCommand);
    context.subscriptions.push(analyzeProjectCommand);
    // Extension 비활성화 시 서버 종료
    context.subscriptions.push({
        dispose: () => {
            serverManager.stop();
        }
    });
}
function deactivate() {
    if (serverManager) {
        serverManager.stop();
    }
}
//# sourceMappingURL=extension.js.map