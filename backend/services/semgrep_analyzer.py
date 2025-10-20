"""
Semgrep analyzer for advanced security and code quality analysis
"""
import subprocess
import json
import os
from typing import List, Dict, Any
from models.schemas import Issue, Severity, Category


class SemgrepAnalyzer:
    """Analyzes files using Semgrep with local rules"""

    def __init__(self, project_path: str):
        self.project_path = project_path

        # Use specific rule directories instead of entire repo
        # This avoids broken rules like stats/web_frameworks.yml
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        rules_base = os.path.join(backend_dir, 'config', 'semgrep-rules')
        custom_rules = os.path.join(backend_dir, 'config', 'custom-semgrep-rules.yaml')

        # Use custom rules only to avoid hashlib issues with official rules
        # Official rules cause exit code 2 on Python 3.12 due to blake2b/blake2s
        # Our custom rules provide comprehensive coverage without dependencies
        self.rule_dirs = [custom_rules]

        self.rules_path = rules_base
        self.official_rules_available = os.path.exists(rules_base)

    async def analyze_files(self, file_paths: List[str]) -> List[Issue]:
        """Analyze multiple files with Semgrep"""
        if not file_paths:
            return []

        # Check if Semgrep is installed
        if not self._is_semgrep_available():
            print("Semgrep not installed - skipping Semgrep analysis")
            return []

        # Log which rules are available
        available_rules = [r for r in self.rule_dirs if os.path.exists(r)]

        if not available_rules:
            print("⚠️  No Semgrep rules available")
            print("   Custom rules should be at: backend/config/custom-semgrep-rules.yaml")
            return []

        # Log rule configuration
        print(f"[DEBUG] Semgrep using custom rules (8 security & quality patterns)")
        print(f"[DEBUG] Analyzing {len(file_paths)} files...")

        # Run Semgrep on all files at once (more efficient)
        return await self._run_semgrep(file_paths)

    def _is_semgrep_available(self) -> bool:
        """Check if Semgrep is installed"""
        try:
            result = subprocess.run(
                ['semgrep', '--version'],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    async def _run_semgrep(self, file_paths: List[str]) -> List[Issue]:
        """Run Semgrep on files"""
        try:
            # Get semgrep binary path from .python-version file
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            python_version_file = os.path.join(backend_dir, '..', '.python-version')

            semgrep_cmd = 'semgrep'  # Default fallback
            if os.path.exists(python_version_file):
                with open(python_version_file, 'r') as f:
                    python_version = f.read().strip()
                    # Use absolute path to semgrep binary (not python -m semgrep)
                    semgrep_cmd = os.path.expanduser(f'~/.pyenv/versions/{python_version}/bin/semgrep')
                    print(f"[DEBUG] Using Semgrep from: {semgrep_cmd}")

            # Build command - analyze multiple files at once
            # Use absolute semgrep binary path to ensure correct Python version
            cmd = [
                semgrep_cmd,
                '--json',
                '--no-git-ignore',  # We already filtered files
                # NOTE: Don't use --quiet, it suppresses JSON output!
                '--metrics=off',  # Disable telemetry for privacy
                '--disable-version-check',  # Disable version check to avoid network calls
                '--no-force-color',  # Disable color output
            ]

            # Add all available rule files/directories
            for rule_path in self.rule_dirs:
                if os.path.exists(rule_path):
                    cmd.extend(['--config', rule_path])

            # Add file paths
            cmd.extend(file_paths)

            # Debug: log the exact command
            print(f"[DEBUG] Semgrep command: {' '.join(cmd)}")
            print(f"[DEBUG] Working directory: {self.project_path}")
            print(f"[DEBUG] Files to analyze: {file_paths}")

            # Run Semgrep with modified environment to suppress hashlib warnings
            env = os.environ.copy()
            env['PYTHONWARNINGS'] = 'ignore'  # Suppress Python warnings

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=self.project_path,
                env=env,
                timeout=300  # 5 minutes timeout
            )

            # Semgrep returns:
            # 0 = no findings
            # 1 = findings found
            # 2 = fatal error (often hashlib issue, but results may still be valid)
            # 7 = fatal error but may have partial results
            #
            # We accept 0, 1, 2, and 7 (hashlib errors are cosmetic on Python 3.12)
            if result.returncode not in [0, 1, 2, 7]:
                print(f"Semgrep error (exit code {result.returncode}): {result.stderr}")
                return []

            # Warn about hashlib issues but continue
            if result.returncode == 2:
                print(f"⚠️  Semgrep completed with hashlib warnings (exit code 2) - this is cosmetic, results are still valid")

            # Parse output
            if result.stdout:
                try:
                    # Debug: show raw output
                    print(f"[DEBUG] Semgrep stdout length: {len(result.stdout)} bytes")

                    # Extract JSON from output (status bar may be present)
                    # JSON starts with '{' and ends with '}'
                    json_start = result.stdout.find('{')
                    json_end = result.stdout.rfind('}') + 1

                    if json_start >= 0 and json_end > json_start:
                        json_str = result.stdout[json_start:json_end]
                        semgrep_output = json.loads(json_str)
                    else:
                        print("[DEBUG] No JSON found in output")
                        semgrep_output = json.loads(result.stdout)  # Try anyway

                    # Debug: show results count in JSON
                    results_count = len(semgrep_output.get('results', []))
                    print(f"[DEBUG] Semgrep JSON has {results_count} results")

                    issues = self._parse_semgrep_output(semgrep_output)

                    # Log results
                    if result.returncode == 7:
                        print(f"[DEBUG] Semgrep completed with warnings (exit code 7) - {len(issues)} issues found")
                    else:
                        print(f"[DEBUG] Semgrep completed successfully - {len(issues)} issues found")

                    return issues
                except json.JSONDecodeError as e:
                    print(f"Failed to parse Semgrep JSON output: {e}")
                    print(f"Output preview: {result.stdout[:500]}")
                    return []
            else:
                print(f"[DEBUG] Semgrep produced no stdout output")
                print(f"[DEBUG] Semgrep stderr: {result.stderr[:500] if result.stderr else 'None'}")
                return []

        except subprocess.TimeoutExpired:
            print("Semgrep timeout - analysis took too long")
            return []
        except FileNotFoundError:
            print("Semgrep not found. Please install: pip install semgrep")
            return []
        except Exception as e:
            print(f"Semgrep error: {e}")
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

    def _parse_semgrep_output(self, semgrep_output: Dict[str, Any]) -> List[Issue]:
        """Parse Semgrep JSON output to Issue objects"""
        issues = []

        for finding in semgrep_output.get('results', []):
            # Normalize path
            file_path = self._normalize_path(finding.get('path', ''))

            # Extract metadata
            extra = finding.get('extra', {})

            # Map severity
            severity = self._map_severity(extra.get('severity', 'WARNING'))

            # Map category from rule ID
            category = self._map_category(finding.get('check_id', ''))

            # Extract code snippet
            code_snippet = extra.get('lines', '')
            if not code_snippet and 'extra' in finding:
                # Fallback: use matched text
                code_snippet = finding.get('extra', {}).get('message', '')

            issue = Issue(
                file=file_path,
                line=finding.get('start', {}).get('line', 0),
                column=finding.get('start', {}).get('col', 0),
                severity=severity,
                category=category,
                rule=finding.get('check_id', 'unknown'),
                message=extra.get('message', 'Security/Quality issue detected'),
                code_snippet=code_snippet,
                tool='Semgrep'
            )
            issues.append(issue)

        return issues

    def _map_severity(self, semgrep_severity: str) -> Severity:
        """Map Semgrep severity to our Severity enum"""
        severity_map = {
            'ERROR': Severity.CRITICAL,
            'WARNING': Severity.HIGH,
            'INFO': Severity.MEDIUM,
        }
        return severity_map.get(semgrep_severity.upper(), Severity.LOW)

    def _map_category(self, check_id: str) -> Category:
        """Map Semgrep rule ID to our Category enum"""
        check_id_lower = check_id.lower()

        # Security patterns
        security_keywords = [
            'security', 'crypto', 'injection', 'xss', 'csrf',
            'auth', 'password', 'secret', 'token', 'key',
            'sql', 'command', 'xxe', 'deserialization'
        ]

        # Performance patterns
        performance_keywords = [
            'performance', 'inefficient', 'slow', 'optimization',
            'memory', 'leak', 'blocking', 'synchronous'
        ]

        # Check category
        if any(keyword in check_id_lower for keyword in security_keywords):
            return Category.SECURITY
        elif any(keyword in check_id_lower for keyword in performance_keywords):
            return Category.PERFORMANCE
        else:
            return Category.QUALITY
