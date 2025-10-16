"""
Python analyzer using Bandit for security analysis
"""
import subprocess
import json
import os
from typing import List
from models.schemas import Issue, Severity, Category


class PythonAnalyzer:
    """Analyzes Python files using Bandit"""

    def __init__(self, project_path: str):
        self.project_path = project_path

    async def analyze_files(self, file_paths: List[str]) -> List[Issue]:
        """Analyze multiple Python files with Bandit"""
        if not file_paths:
            return []

        all_issues = []

        # Analyze files one by one for better progress tracking
        for file_path in file_paths:
            file_issues = await self._run_bandit(file_path)
            all_issues.extend(file_issues)

        return all_issues

    async def _run_bandit(self, file_path: str) -> List[Issue]:
        """Run Bandit on a single file"""
        try:
            # Build command
            cmd = [
                'bandit',
                '-f', 'json',
                '-ll',  # Only report low severity and above
                file_path
            ]

            # Run Bandit
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=self.project_path,
                timeout=10  # 10 second timeout per file
            )

            # Parse output
            if result.stdout:
                bandit_output = json.loads(result.stdout)
                return self._parse_bandit_output(bandit_output, file_path)
            else:
                return []

        except subprocess.TimeoutExpired:
            print(f"Bandit timeout for file: {file_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"Failed to parse Bandit output: {e}")
            return []
        except FileNotFoundError:
            print("Bandit not found. Please install: pip install bandit")
            return []
        except Exception as e:
            print(f"Bandit error: {e}")
            return []

    def _normalize_path(self, file_path: str) -> str:
        """Normalize file path to be relative to project root"""
        # If absolute path, make it relative
        if os.path.isabs(file_path):
            try:
                return os.path.relpath(file_path, self.project_path)
            except ValueError:
                # Different drives on Windows
                return file_path

        # Already relative, return as-is
        return file_path

    def _parse_bandit_output(self, bandit_output: dict, file_path: str) -> List[Issue]:
        """Parse Bandit JSON output to Issue objects"""
        issues = []

        # Normalize path to relative
        file_path = self._normalize_path(file_path)

        for result in bandit_output.get('results', []):
            issue = Issue(
                file=file_path,
                line=result.get('line_number', 0),
                column=result.get('col_offset', 0),
                severity=self._map_severity(result.get('issue_severity', 'LOW')),
                category=Category.SECURITY,  # Bandit is security-focused
                rule=result.get('test_id', 'unknown'),
                message=result.get('issue_text', 'Security issue detected'),
                code_snippet=result.get('code', None),
                tool='Bandit'
            )
            issues.append(issue)

        return issues

    def _map_severity(self, bandit_severity: str) -> Severity:
        """Map Bandit severity to our Severity"""
        severity_map = {
            'HIGH': Severity.CRITICAL,
            'MEDIUM': Severity.HIGH,
            'LOW': Severity.MEDIUM
        }
        return severity_map.get(bandit_severity.upper(), Severity.LOW)
