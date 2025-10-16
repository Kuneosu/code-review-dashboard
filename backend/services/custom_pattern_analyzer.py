"""
Custom pattern analyzer using regex
"""
import re
import os
from typing import List, Dict, Any
from models.schemas import Issue, Severity, Category


class CustomPatternAnalyzer:
    """Analyzes files using custom regex patterns"""

    # Define custom patterns
    PATTERNS = [
        {
            'id': 'console-log',
            'pattern': r'console\.(log|debug|info|warn|error)',
            'category': Category.QUALITY,
            'severity': Severity.LOW,
            'message': 'Remove console.log statements before production',
            'file_types': ['.js', '.ts', '.jsx', '.tsx']
        },
        {
            'id': 'todo-comment',
            'pattern': r'(TODO|FIXME|XXX|HACK)[\s:]+',
            'category': Category.QUALITY,
            'severity': Severity.LOW,
            'message': 'TODO/FIXME comment found - resolve before production',
            'file_types': ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go']
        },
        {
            'id': 'hardcoded-password',
            'pattern': r'(password|passwd|pwd)\s*=\s*["\'][^"\']{3,}["\']',
            'category': Category.SECURITY,
            'severity': Severity.CRITICAL,
            'message': 'Possible hardcoded password detected',
            'file_types': ['.js', '.ts', '.py', '.java', '.go', '.php']
        },
        {
            'id': 'hardcoded-api-key',
            'pattern': r'(api[_-]?key|apikey|access[_-]?key)\s*=\s*["\'][^"\']{10,}["\']',
            'category': Category.SECURITY,
            'severity': Severity.CRITICAL,
            'message': 'Possible hardcoded API key detected',
            'file_types': ['.js', '.ts', '.py', '.java', '.go', '.php']
        },
        {
            'id': 'hardcoded-secret',
            'pattern': r'(secret|token)\s*=\s*["\'][^"\']{10,}["\']',
            'category': Category.SECURITY,
            'severity': Severity.CRITICAL,
            'message': 'Possible hardcoded secret/token detected',
            'file_types': ['.js', '.ts', '.py', '.java', '.go', '.php']
        },
        {
            'id': 'debugger-statement',
            'pattern': r'\bdebugger\b',
            'category': Category.QUALITY,
            'severity': Severity.MEDIUM,
            'message': 'Debugger statement found - remove before production',
            'file_types': ['.js', '.ts', '.jsx', '.tsx']
        },
    ]

    def __init__(self, project_path: str):
        self.project_path = project_path

    async def analyze_files(self, file_paths: List[str]) -> List[Issue]:
        """Analyze multiple files with custom patterns"""
        if not file_paths:
            return []

        all_issues = []

        for file_path in file_paths:
            file_issues = await self._analyze_file(file_path)
            all_issues.extend(file_issues)

        return all_issues

    async def _analyze_file(self, file_path: str) -> List[Issue]:
        """Analyze a single file with custom patterns"""
        try:
            # Get file extension
            _, ext = os.path.splitext(file_path)

            # Find applicable patterns
            applicable_patterns = [
                p for p in self.PATTERNS
                if ext in p['file_types']
            ]

            if not applicable_patterns:
                return []

            # Read file content
            full_path = os.path.join(self.project_path, file_path)
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            issues = []

            # Check each pattern
            for pattern_def in applicable_patterns:
                pattern_issues = self._find_pattern_matches(
                    file_path,
                    content,
                    pattern_def
                )
                issues.extend(pattern_issues)

            return issues

        except Exception as e:
            print(f"Error analyzing file {file_path}: {e}")
            return []

    def _find_pattern_matches(
        self,
        file_path: str,
        content: str,
        pattern_def: Dict[str, Any]
    ) -> List[Issue]:
        """Find all matches of a pattern in file content"""
        issues = []

        try:
            pattern = re.compile(pattern_def['pattern'], re.IGNORECASE)
            lines = content.split('\n')

            for line_num, line in enumerate(lines, start=1):
                matches = pattern.finditer(line)

                for match in matches:
                    # Extract code snippet (match + context)
                    snippet = line.strip()

                    issue = Issue(
                        file=file_path,
                        line=line_num,
                        column=match.start() + 1,
                        severity=pattern_def['severity'],
                        category=pattern_def['category'],
                        rule=f"custom/{pattern_def['id']}",
                        message=pattern_def['message'],
                        code_snippet=snippet,
                        tool='CustomPattern'
                    )
                    issues.append(issue)

        except Exception as e:
            print(f"Error matching pattern {pattern_def['id']}: {e}")

        return issues
