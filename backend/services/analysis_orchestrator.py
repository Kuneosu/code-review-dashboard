"""
Analysis orchestrator for managing code analysis tasks
"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from models.schemas import (
    AnalysisStatus,
    Issue,
    LiveSummary,
    Severity,
    Category
)
from services.javascript_analyzer import JavaScriptAnalyzer
from services.python_analyzer import PythonAnalyzer
from services.custom_pattern_analyzer import CustomPatternAnalyzer


class AnalysisTask:
    """Internal representation of an analysis task"""

    def __init__(
        self,
        analysis_id: str,
        project_path: str,
        files: List[str],
        categories: List[Category]
    ):
        self.id = analysis_id
        self.project_path = project_path
        self.files = files
        self.categories = categories

        # Status
        self.status = AnalysisStatus.PENDING
        self.progress = 0.0
        self.current_file: Optional[str] = None
        self.completed_files = 0
        self.total_files = len(files)
        self.selected_files_count = len(files)  # 실제 선택한 파일 개수

        # Results
        self.issues: List[Issue] = []
        self.live_summary = LiveSummary()

        # Timing
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None

        # Error
        self.error: Optional[str] = None


class AnalysisOrchestrator:
    """Orchestrates code analysis tasks"""

    def __init__(self):
        self.active_tasks: Dict[str, AnalysisTask] = {}

    async def start_analysis(
        self,
        project_path: str,
        selected_files: List[str],
        categories: List[Category]
    ) -> str:
        """Start a new analysis task"""

        # Generate unique ID
        analysis_id = str(uuid.uuid4())

        # Create task
        task = AnalysisTask(
            analysis_id=analysis_id,
            project_path=project_path,
            files=selected_files,
            categories=categories
        )

        self.active_tasks[analysis_id] = task

        # Start analysis in background
        asyncio.create_task(self._run_analysis(task))

        return analysis_id

    async def _run_analysis(self, task: AnalysisTask) -> None:
        """Run the actual analysis"""

        try:
            task.status = AnalysisStatus.RUNNING
            task.started_at = datetime.utcnow()

            # Group files by language
            js_files = [
                f for f in task.files
                if f.endswith(('.js', '.ts', '.jsx', '.tsx'))
            ]
            py_files = [
                f for f in task.files
                if f.endswith('.py')
            ]

            # Calculate total analysis steps
            # Each file will be analyzed by multiple analyzers
            total_steps = 0
            analyzer_info = []

            if js_files:
                total_steps += len(js_files)  # ESLint
                analyzer_info.append(f"ESLint: {len(js_files)} files")
            if py_files and Category.SECURITY in task.categories:
                total_steps += len(py_files)  # Bandit
                analyzer_info.append(f"Bandit: {len(py_files)} files")
            total_steps += len(task.files)  # Custom pattern (all files)
            analyzer_info.append(f"Security Pattern: {len(task.files)} files")

            # Update total_files to reflect actual analysis steps
            task.total_files = total_steps
            task.completed_files = 0

            print(f"[DEBUG] Starting analysis: {total_steps} total steps")
            print(f"[DEBUG] Breakdown: {' + '.join(analyzer_info)} = {total_steps} steps")

            # Run analyzers
            all_issues = []

            # JavaScript/TypeScript analysis
            if js_files:
                print(f"[DEBUG] Running ESLint on {len(js_files)} files")
                js_analyzer = JavaScriptAnalyzer(task.project_path)
                js_issues = await self._analyze_with_progress(
                    js_analyzer,
                    js_files,
                    task,
                    'ESLint'
                )
                all_issues.extend(js_issues)
                task.live_summary = self._calculate_summary(all_issues)

            # Python analysis
            if py_files and Category.SECURITY in task.categories:
                print(f"[DEBUG] Running Bandit on {len(py_files)} files")
                py_analyzer = PythonAnalyzer(task.project_path)
                py_issues = await self._analyze_with_progress(
                    py_analyzer,
                    py_files,
                    task,
                    'Bandit'
                )
                all_issues.extend(py_issues)
                task.live_summary = self._calculate_summary(all_issues)

            # Custom pattern analysis (all files)
            print(f"[DEBUG] Running Custom Pattern on {len(task.files)} files")
            custom_analyzer = CustomPatternAnalyzer(task.project_path)
            custom_issues = await self._analyze_with_progress(
                custom_analyzer,
                task.files,
                task,
                'CustomPattern'
            )
            all_issues.extend(custom_issues)
            task.live_summary = self._calculate_summary(all_issues)

            # Check if cancelled
            if task.status == AnalysisStatus.CANCELLED:
                return

            # Complete
            task.issues = all_issues
            task.status = AnalysisStatus.COMPLETED
            task.progress = 1.0
            task.completed_at = datetime.utcnow()
            task.live_summary = self._calculate_summary(all_issues)

            print(f"[DEBUG] Analysis completed: {len(all_issues)} issues found")

        except Exception as e:
            task.status = AnalysisStatus.FAILED
            task.error = str(e)
            print(f"Analysis failed: {e}")

    async def _analyze_with_progress(
        self,
        analyzer,
        files: List[str],
        task: AnalysisTask,
        analyzer_name: str
    ) -> List[Issue]:
        """Analyze files with progress tracking"""

        issues = []

        for i, file_path in enumerate(files):
            # Check if paused
            while task.status == AnalysisStatus.PAUSED:
                await asyncio.sleep(0.5)

            # Check if cancelled
            if task.status == AnalysisStatus.CANCELLED:
                break

            # Update current file
            task.current_file = f"[{analyzer_name}] {file_path}"
            print(f"[DEBUG] Analyzing: {task.current_file}")

            # Analyze file
            file_issues = []
            try:
                file_issues = await analyzer.analyze_files([file_path])
                issues.extend(file_issues)

                # Add to task issues for live summary update
                task.issues.extend(file_issues)
                task.live_summary = self._calculate_summary(task.issues)

                print(f"[DEBUG] Found {len(file_issues)} issues in {file_path} (Total: {len(task.issues)})")
            except Exception as e:
                print(f"Error analyzing {file_path} with {analyzer_name}: {e}")

            # Update progress
            task.completed_files += 1
            task.progress = task.completed_files / task.total_files

            print(f"[DEBUG] Progress: {task.completed_files}/{task.total_files} ({task.progress*100:.1f}%) | Issues: {task.live_summary.total}")

            # Small delay to make progress visible (0.5 seconds per file)
            await asyncio.sleep(0.5)

        return issues

    def _calculate_summary(self, issues: List[Issue]) -> LiveSummary:
        """Calculate live summary from issues"""
        summary = LiveSummary()

        for issue in issues:
            if issue.severity == Severity.CRITICAL:
                summary.critical += 1
            elif issue.severity == Severity.HIGH:
                summary.high += 1
            elif issue.severity == Severity.MEDIUM:
                summary.medium += 1
            elif issue.severity == Severity.LOW:
                summary.low += 1

        summary.total = summary.critical + summary.high + summary.medium + summary.low

        return summary

    def _estimate_remaining_time(self, task: AnalysisTask) -> int:
        """Estimate remaining time in seconds"""
        if task.started_at is None or task.completed_files == 0:
            return 0

        elapsed = (datetime.utcnow() - task.started_at).total_seconds()
        avg_time_per_file = elapsed / task.completed_files
        remaining_files = task.total_files - task.completed_files

        return int(avg_time_per_file * remaining_files)

    def pause_analysis(self, analysis_id: str) -> None:
        """Pause an analysis"""
        if analysis_id in self.active_tasks:
            task = self.active_tasks[analysis_id]
            if task.status == AnalysisStatus.RUNNING:
                task.status = AnalysisStatus.PAUSED

    def resume_analysis(self, analysis_id: str) -> None:
        """Resume a paused analysis"""
        if analysis_id in self.active_tasks:
            task = self.active_tasks[analysis_id]
            if task.status == AnalysisStatus.PAUSED:
                task.status = AnalysisStatus.RUNNING

    def cancel_analysis(self, analysis_id: str) -> None:
        """Cancel an analysis"""
        if analysis_id in self.active_tasks:
            task = self.active_tasks[analysis_id]
            if task.status in [AnalysisStatus.PENDING, AnalysisStatus.RUNNING, AnalysisStatus.PAUSED]:
                task.status = AnalysisStatus.CANCELLED

    def get_status(self, analysis_id: str) -> Dict:
        """Get analysis status"""
        if analysis_id not in self.active_tasks:
            raise ValueError(f"Analysis {analysis_id} not found")

        task = self.active_tasks[analysis_id]

        elapsed_time = 0
        if task.started_at:
            elapsed_time = int((datetime.utcnow() - task.started_at).total_seconds())

        return {
            "analysis_id": analysis_id,
            "status": task.status.value,
            "progress": task.progress,
            "current_file": task.current_file,
            "completed_files": task.completed_files,
            "total_files": task.total_files,
            "selected_files_count": task.selected_files_count,
            "elapsed_time": elapsed_time,
            "estimated_remaining": self._estimate_remaining_time(task),
            "live_summary": {
                "critical": task.live_summary.critical,
                "high": task.live_summary.high,
                "medium": task.live_summary.medium,
                "low": task.live_summary.low,
                "total": task.live_summary.total
            },
            "updated_at": datetime.utcnow().isoformat()
        }

    def get_result(self, analysis_id: str) -> Dict:
        """Get complete analysis result"""
        if analysis_id not in self.active_tasks:
            raise ValueError(f"Analysis {analysis_id} not found")

        task = self.active_tasks[analysis_id]

        elapsed_time = 0
        if task.started_at and task.completed_at:
            elapsed_time = int((task.completed_at - task.started_at).total_seconds())

        return {
            "analysis_id": analysis_id,
            "status": task.status.value,
            "project_path": task.project_path,  # Add project path for VS Code integration
            "summary": {
                "critical": task.live_summary.critical,
                "high": task.live_summary.high,
                "medium": task.live_summary.medium,
                "low": task.live_summary.low,
                "total": task.live_summary.total
            },
            "issues": [
                {
                    "id": f"{task.id}-{i}",
                    "file": issue.file,
                    "line": issue.line,
                    "column": issue.column,
                    "severity": issue.severity.value,
                    "category": issue.category.value,
                    "rule": issue.rule,
                    "message": issue.message,
                    "code_snippet": issue.code_snippet,
                    "tool": issue.tool
                }
                for i, issue in enumerate(task.issues)
            ],
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "elapsed_time": elapsed_time,
            "total_files": task.total_files
        }
