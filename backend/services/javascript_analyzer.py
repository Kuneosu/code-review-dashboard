"""
JavaScript/TypeScript analyzer using ESLint
"""
import subprocess
import json
import os
from typing import List
from models.schemas import Issue, Severity, Category


class JavaScriptAnalyzer:
    """Analyzes JavaScript/TypeScript files using ESLint"""

    # Security-related rules
    SECURITY_RULES = {
        'no-eval',
        'no-implied-eval',
        'no-new-func',
        'security/detect-sql-injection',
        'security/detect-unsafe-regex',
        'security/detect-buffer-noassert',
        'security/detect-child-process',
        'security/detect-disable-mustache-escape',
        'security/detect-eval-with-expression',
        'security/detect-no-csrf-before-method-override',
        'security/detect-non-literal-fs-filename',
        'security/detect-non-literal-regexp',
        'security/detect-non-literal-require',
        'security/detect-object-injection',
        'security/detect-possible-timing-attacks',
        'security/detect-pseudoRandomBytes',
    }

    # Performance-related rules
    PERFORMANCE_RULES = {
        'no-loop-func',
        'no-await-in-loop',
    }

    def __init__(self, project_path: str):
        self.project_path = project_path
        self.config_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            '.eslintrc.json'
        )

    async def analyze_files(self, file_paths: List[str]) -> List[Issue]:
        """Analyze multiple files with ESLint"""
        if not file_paths:
            return []

        all_issues = []

        # Analyze in batches of 10 files to avoid command line length limits
        batch_size = 10
        for i in range(0, len(file_paths), batch_size):
            batch = file_paths[i:i + batch_size]
            batch_issues = await self._run_eslint(batch)
            all_issues.extend(batch_issues)

        return all_issues

    async def _run_eslint(self, file_paths: List[str]) -> List[Issue]:
        """Run ESLint on a batch of files"""
        try:
            # Build command
            cmd = [
                'npx', 'eslint',
                '--format', 'json',
                '--config', self.config_path,
                '--no-eslintrc',  # Don't use project's .eslintrc
                *file_paths
            ]

            # Run ESLint
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=self.project_path,
                timeout=30  # 30 second timeout per batch
            )

            # Parse output (ESLint returns non-zero on errors found)
            if result.stdout:
                eslint_output = json.loads(result.stdout)
                return self._parse_eslint_output(eslint_output)
            else:
                return []

        except subprocess.TimeoutExpired:
            print(f"ESLint timeout for files: {file_paths}")
            return []
        except json.JSONDecodeError as e:
            print(f"Failed to parse ESLint output: {e}")
            return []
        except Exception as e:
            print(f"ESLint error: {e}")
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

    def _parse_eslint_output(self, eslint_output: List[dict]) -> List[Issue]:
        """Parse ESLint JSON output to Issue objects"""
        issues = []

        for file_result in eslint_output:
            file_path = file_result.get('filePath', '')

            # Normalize path to relative
            file_path = self._normalize_path(file_path)

            for message in file_result.get('messages', []):
                issue = Issue(
                    file=file_path,
                    line=message.get('line', 0),
                    column=message.get('column', 0),
                    severity=self._map_severity(message.get('severity', 1)),
                    category=self._map_category(message.get('ruleId', '')),
                    rule=message.get('ruleId', 'unknown'),
                    message=message.get('message', 'Unknown error'),
                    tool='ESLint'
                )
                issues.append(issue)

        return issues

    def _map_severity(self, eslint_severity: int) -> Severity:
        """Map ESLint severity (1=warning, 2=error) to our Severity"""
        if eslint_severity == 2:
            return Severity.HIGH
        else:
            return Severity.MEDIUM

    def _map_category(self, rule_id: str) -> Category:
        """Map ESLint rule ID to category"""
        if not rule_id:
            return Category.QUALITY

        if rule_id in self.SECURITY_RULES:
            return Category.SECURITY
        elif rule_id in self.PERFORMANCE_RULES:
            return Category.PERFORMANCE
        else:
            return Category.QUALITY
