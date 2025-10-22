"""
Prompt builder for AI-powered code analysis
"""
import os
import aiofiles
from typing import Dict, Any, List


class PromptBuilder:
    """Builds effective prompts for Ollama LLM code analysis"""

    # System prompt for code analysis
    SYSTEM_PROMPT = """You are an expert code reviewer and security analyst.
Your task is to analyze code issues and provide detailed, actionable insights.

Format your response as follows:
1. Summary: Brief overview of the issue (2-3 sentences)
2. Root Cause: Technical explanation of why this is a problem
3. Impact: Potential consequences if left unfixed
4. Recommendations: Specific steps to fix the issue
5. Code Example: If applicable, show before/after code snippets

Be specific, technical, and actionable. Focus on practical solutions."""

    @staticmethod
    def build_analysis_prompt(
        issue: Dict[str, Any],
        file_content: str,
        project_path: str
    ) -> str:
        """
        Build a comprehensive analysis prompt for a code issue

        Args:
            issue: Issue dictionary with file, line, severity, etc.
            file_content: Content of the file containing the issue
            project_path: Root path of the project

        Returns:
            Formatted prompt string
        """
        # Extract relevant code context (5 lines before and after)
        context_lines = PromptBuilder._extract_code_context(
            file_content,
            issue['line'],
            context_size=5
        )

        # Build the prompt
        prompt = f"""Analyze this code issue:

**Issue Details:**
- File: {issue['file']}
- Line: {issue['line']}, Column: {issue['column']}
- Severity: {issue['severity']}
- Category: {issue['category']}
- Rule: {issue['rule']}
- Tool: {issue['tool']}
- Message: {issue['message']}

**Code Context:**
```
{context_lines}
```

**File Path:** {issue['file']}

Please provide:
1. **Summary**: What is the core issue? (2-3 sentences)
2. **Root Cause**: Why is this a problem? (technical explanation)
3. **Impact**: What could happen if this isn't fixed?
4. **Recommendations**: How to fix this? (step-by-step if complex)
5. **Code Example** (if applicable): Show before/after code

Focus on practical, actionable advice. Be specific about the fix."""

        return prompt

    @staticmethod
    def _extract_code_context(
        file_content: str,
        line_number: int,
        context_size: int = 5
    ) -> str:
        """
        Extract code context around the issue line

        Args:
            file_content: Full file content
            line_number: Line number of the issue (1-indexed)
            context_size: Number of lines before and after to include

        Returns:
            Formatted code context with line numbers
        """
        lines = file_content.split('\n')
        total_lines = len(lines)

        # Calculate range (convert to 0-indexed)
        start = max(0, line_number - 1 - context_size)
        end = min(total_lines, line_number + context_size)

        # Extract lines with line numbers
        context_lines = []
        for i in range(start, end):
            line_num = i + 1
            prefix = ">>> " if line_num == line_number else "    "
            context_lines.append(f"{prefix}{line_num:4d} | {lines[i]}")

        return '\n'.join(context_lines)

    @staticmethod
    def read_file_content(file_path: str, project_path: str) -> str:
        """
        Read file content safely

        Args:
            file_path: Relative or absolute file path
            project_path: Project root path

        Returns:
            File content or error message
        """
        try:
            # Handle both relative and absolute paths
            if os.path.isabs(file_path):
                full_path = file_path
            else:
                full_path = os.path.join(project_path, file_path)

            # Check if file exists
            if not os.path.exists(full_path):
                return f"[File not found: {file_path}]"

            # Read with encoding fallback
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except UnicodeDecodeError:
                with open(full_path, 'r', encoding='latin-1') as f:
                    return f.read()

        except Exception as e:
            return f"[Error reading file: {str(e)}]"

    @staticmethod
    async def read_file_content_async(file_path: str, project_path: str) -> str:
        """
        Read file content asynchronously (non-blocking)

        Args:
            file_path: Relative or absolute file path
            project_path: Project root path

        Returns:
            File content or error message
        """
        try:
            # Handle both relative and absolute paths
            if os.path.isabs(file_path):
                full_path = file_path
            else:
                full_path = os.path.join(project_path, file_path)

            # Check if file exists
            if not os.path.exists(full_path):
                return f"[File not found: {file_path}]"

            # Read asynchronously with encoding fallback
            try:
                async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
                    return await f.read()
            except UnicodeDecodeError:
                async with aiofiles.open(full_path, 'r', encoding='latin-1') as f:
                    return await f.read()

        except Exception as e:
            return f"[Error reading file: {str(e)}]"

    @staticmethod
    def parse_ai_response(response_text: str) -> Dict[str, Any]:
        """
        Parse AI response into structured format

        Args:
            response_text: Raw AI response text

        Returns:
            Structured response dictionary
        """
        # Simple section-based parsing
        sections = {
            'summary': '',
            'root_cause': '',
            'impact': '',
            'recommendations': [],
            'code_example': None
        }

        current_section = None
        buffer = []

        lines = response_text.split('\n')

        for line in lines:
            line_lower = line.lower().strip()

            # Detect section headers
            if 'summary' in line_lower and ':' in line:
                if buffer and current_section:
                    PromptBuilder._save_section(sections, current_section, buffer)
                current_section = 'summary'
                buffer = [line.split(':', 1)[1].strip()] if ':' in line else []

            elif 'root cause' in line_lower and ':' in line:
                if buffer and current_section:
                    PromptBuilder._save_section(sections, current_section, buffer)
                current_section = 'root_cause'
                buffer = [line.split(':', 1)[1].strip()] if ':' in line else []

            elif 'impact' in line_lower and ':' in line:
                if buffer and current_section:
                    PromptBuilder._save_section(sections, current_section, buffer)
                current_section = 'impact'
                buffer = [line.split(':', 1)[1].strip()] if ':' in line else []

            elif 'recommendation' in line_lower and ':' in line:
                if buffer and current_section:
                    PromptBuilder._save_section(sections, current_section, buffer)
                current_section = 'recommendations'
                buffer = [line.split(':', 1)[1].strip()] if ':' in line else []

            elif 'code example' in line_lower:
                if buffer and current_section:
                    PromptBuilder._save_section(sections, current_section, buffer)
                current_section = 'code_example'
                buffer = []

            else:
                if current_section:
                    buffer.append(line)

        # Save last section
        if buffer and current_section:
            PromptBuilder._save_section(sections, current_section, buffer)

        return sections

    @staticmethod
    def _save_section(sections: Dict, section_name: str, buffer: List[str]):
        """Save parsed section content"""
        content = '\n'.join(buffer).strip()

        if section_name == 'recommendations':
            # Split into list items
            recommendations = []
            for line in buffer:
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or line[0].isdigit()):
                    # Remove bullet/number prefix
                    clean_line = line.lstrip('-•0123456789. ').strip()
                    if clean_line:
                        recommendations.append(clean_line)
                elif line and recommendations:
                    # Continuation of previous recommendation
                    recommendations[-1] += ' ' + line

            sections['recommendations'] = recommendations if recommendations else [content]

        elif section_name == 'code_example':
            # Try to parse before/after code blocks
            sections['code_example'] = content

        else:
            sections[section_name] = content
