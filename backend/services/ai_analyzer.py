"""
AI Analyzer Engine - Coordinates Ollama-based code analysis
"""
import asyncio
import hashlib
import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from services.ollama_client import OllamaClient
from services.prompt_builder import PromptBuilder


class AIAnalysisResult:
    """AI analysis result for a single issue"""

    def __init__(self, issue_id: str, issue: Dict[str, Any]):
        self.issue_id = issue_id
        self.issue = issue
        self.summary = ""
        self.root_cause = ""
        self.impact = ""
        self.recommendations: List[str] = []
        self.code_example: Optional[str] = None
        self.analysis_time = 0.0
        self.error: Optional[str] = None
        self.timestamp = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'issue_id': self.issue_id,
            'summary': self.summary,
            'root_cause': self.root_cause,
            'impact': self.impact,
            'recommendations': self.recommendations,
            'code_example': self.code_example,
            'analysis_time': self.analysis_time,
            'error': self.error,
            'timestamp': self.timestamp.isoformat(),
        }


class AIAnalysisQueue:
    """Manages AI analysis queue with caching and batch processing"""

    def __init__(self, ollama_client: OllamaClient):
        self.ollama_client = ollama_client
        self.prompt_builder = PromptBuilder()

        # Queue state
        self.queues: Dict[str, Dict[str, Any]] = {}

        # Cache (7-day TTL)
        self.cache: Dict[str, AIAnalysisResult] = {}
        self.cache_ttl = timedelta(days=7)

        # Semaphore for concurrency control (max 2 concurrent analyses)
        self.semaphore = asyncio.Semaphore(2)

    def create_queue(
        self,
        project_path: str,
        issues: List[Dict[str, Any]]
    ) -> str:
        """
        Create a new analysis queue

        Args:
            project_path: Project root path
            issues: List of issues to analyze

        Returns:
            Queue ID
        """
        queue_id = str(uuid.uuid4())

        self.queues[queue_id] = {
            'queue_id': queue_id,
            'project_path': project_path,
            'issues': issues,
            'status': 'pending',
            'total_issues': len(issues),
            'completed': 0,
            'failed': 0,
            'progress': 0,
            'results': [],
            'start_time': None,
            'end_time': None,
            'estimated_remaining': 0,
            'cancelled': False,
        }

        return queue_id

    async def process_queue(self, queue_id: str) -> None:
        """
        Process all issues in a queue with batch processing

        Args:
            queue_id: Queue identifier
        """
        if queue_id not in self.queues:
            return

        queue = self.queues[queue_id]

        # Check if already cancelled
        if queue['cancelled']:
            queue['status'] = 'cancelled'
            queue['end_time'] = time.time()
            print(f"[AI] Queue {queue_id} was cancelled before processing started")
            return

        queue['status'] = 'analyzing'
        queue['start_time'] = time.time()

        issues = queue['issues']
        project_path = queue['project_path']

        # Process issues concurrently with semaphore control
        tasks = [
            self._analyze_issue_with_semaphore(issue, project_path, queue_id)
            for issue in issues
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Check if cancelled during processing
        if queue['cancelled']:
            queue['status'] = 'cancelled'
            queue['end_time'] = time.time()
            print(f"[AI] Queue {queue_id} was cancelled during processing")
            return

        # Update queue with results
        queue['results'] = [r.to_dict() for r in results if isinstance(r, AIAnalysisResult)]
        queue['completed'] = len([r for r in results if isinstance(r, AIAnalysisResult) and not r.error])
        queue['failed'] = len([r for r in results if isinstance(r, AIAnalysisResult) and r.error])
        queue['status'] = 'completed' if queue['failed'] == 0 else 'partially_completed'
        queue['progress'] = 100
        queue['end_time'] = time.time()

    async def _analyze_issue_with_semaphore(
        self,
        issue: Dict[str, Any],
        project_path: str,
        queue_id: str
    ) -> AIAnalysisResult:
        """
        Analyze single issue with semaphore control

        Args:
            issue: Issue dictionary
            project_path: Project root path
            queue_id: Queue ID for progress tracking

        Returns:
            Analysis result
        """
        async with self.semaphore:
            # Check if queue is cancelled before starting
            if queue_id in self.queues and self.queues[queue_id]['cancelled']:
                # Return dummy result for cancelled task
                issue_id = str(uuid.uuid4())
                cancelled_result = AIAnalysisResult(issue_id, issue)
                cancelled_result.error = "Analysis cancelled by user"
                return cancelled_result

            result = await self._analyze_single_issue(issue, project_path)

            # Update queue progress (only if not cancelled)
            if queue_id in self.queues:
                queue = self.queues[queue_id]

                if not queue['cancelled']:
                    queue['completed'] += 1
                    queue['progress'] = int((queue['completed'] / queue['total_issues']) * 100)

                    # Estimate remaining time
                    if queue['completed'] > 0:
                        elapsed = time.time() - queue['start_time']
                        avg_time_per_issue = elapsed / queue['completed']
                        remaining_issues = queue['total_issues'] - queue['completed']
                        queue['estimated_remaining'] = int(avg_time_per_issue * remaining_issues)

            return result

    async def _analyze_single_issue(
        self,
        issue: Dict[str, Any],
        project_path: str
    ) -> AIAnalysisResult:
        """
        Analyze a single issue with caching

        Args:
            issue: Issue dictionary
            project_path: Project root path

        Returns:
            Analysis result
        """
        # Generate cache key
        cache_key = self._generate_cache_key(issue, project_path)

        # Check cache
        if cache_key in self.cache:
            cached_result = self.cache[cache_key]
            if datetime.now() - cached_result.timestamp < self.cache_ttl:
                print(f"[AI] Cache hit for {issue['file']}:{issue['line']}")
                return cached_result

        # Create result object
        issue_id = str(uuid.uuid4())
        result = AIAnalysisResult(issue_id, issue)

        start_time = time.time()

        try:
            # Read file content
            file_content = self.prompt_builder.read_file_content(
                issue['file'],
                project_path
            )

            if file_content.startswith('['):
                # Error reading file
                result.error = file_content
                return result

            # Build prompt
            prompt = self.prompt_builder.build_analysis_prompt(
                issue,
                file_content,
                project_path
            )

            # Generate AI response
            response = await self.ollama_client.generate(
                prompt=prompt,
                system_prompt=PromptBuilder.SYSTEM_PROMPT,
                temperature=0.3,
                max_tokens=2000
            )

            if not response['success']:
                result.error = response.get('error', 'AI generation failed')
                return result

            # Parse response
            parsed = self.prompt_builder.parse_ai_response(response['response'])

            result.summary = parsed['summary']
            result.root_cause = parsed['root_cause']
            result.impact = parsed['impact']
            result.recommendations = parsed['recommendations']
            result.code_example = parsed['code_example']

            result.analysis_time = time.time() - start_time

            # Cache result
            self.cache[cache_key] = result

            print(f"[AI] Analyzed {issue['file']}:{issue['line']} in {result.analysis_time:.2f}s")

        except Exception as e:
            result.error = str(e)
            result.analysis_time = time.time() - start_time

        return result

    def _generate_cache_key(self, issue: Dict[str, Any], project_path: str) -> str:
        """
        Generate cache key based on file content + issue location

        Args:
            issue: Issue dictionary
            project_path: Project root path

        Returns:
            Cache key hash
        """
        file_content = self.prompt_builder.read_file_content(issue['file'], project_path)

        key_data = f"{file_content}|{issue['file']}|{issue['line']}|{issue['rule']}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def get_queue_status(self, queue_id: str) -> Optional[Dict[str, Any]]:
        """
        Get queue status

        Args:
            queue_id: Queue identifier

        Returns:
            Queue status dictionary or None
        """
        return self.queues.get(queue_id)

    def cancel_queue(self, queue_id: str) -> bool:
        """
        Cancel an ongoing analysis queue

        Args:
            queue_id: Queue identifier

        Returns:
            True if cancelled, False if queue not found
        """
        if queue_id not in self.queues:
            return False

        queue = self.queues[queue_id]

        # Only cancel if still analyzing or pending
        if queue['status'] in ['pending', 'analyzing']:
            queue['cancelled'] = True
            queue['status'] = 'cancelled'
            queue['end_time'] = time.time()
            print(f"[AI] Queue {queue_id} marked for cancellation")
            return True

        return False

    def clear_old_queues(self, max_age_hours: int = 24):
        """
        Clear queues older than max_age_hours

        Args:
            max_age_hours: Maximum queue age in hours
        """
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        to_remove = []
        for queue_id, queue in self.queues.items():
            if queue['end_time'] and (current_time - queue['end_time'] > max_age_seconds):
                to_remove.append(queue_id)

        for queue_id in to_remove:
            del self.queues[queue_id]
            print(f"[AI] Cleared old queue: {queue_id}")
