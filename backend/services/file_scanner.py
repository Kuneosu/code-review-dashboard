"""
File system scanning service
"""
import os
from pathlib import Path
from typing import List, Tuple, Optional
import json

from models.schemas import (
    FileNode, FileType, Language, FilterRule,
    FilterPreset, FilterConfig
)


class FileScanner:
    """Service for scanning project directories"""

    # Language detection markers
    LANGUAGE_MARKERS = {
        Language.JAVASCRIPT: ['package.json', '.js', '.jsx'],
        Language.TYPESCRIPT: ['tsconfig.json', '.ts', '.tsx'],
        Language.PYTHON: ['requirements.txt', 'setup.py', 'pyproject.toml', '.py'],
    }

    # Default filter presets
    PRESETS = {
        Language.JAVASCRIPT: FilterPreset(
            language=Language.JAVASCRIPT,
            rules=[
                FilterRule(pattern="node_modules/**", exclude=True, description="Node modules"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
                FilterRule(pattern="coverage/**", exclude=True, description="Coverage reports"),
                FilterRule(pattern=".next/**", exclude=True, description="Next.js build"),
                FilterRule(pattern="*.log", exclude=True, description="Log files"),
                FilterRule(pattern="*.min.js", exclude=True, description="Minified files"),
                FilterRule(pattern="*.bundle.js", exclude=True, description="Bundle files"),
            ]
        ),
        Language.TYPESCRIPT: FilterPreset(
            language=Language.TYPESCRIPT,
            rules=[
                FilterRule(pattern="node_modules/**", exclude=True, description="Node modules"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
                FilterRule(pattern="*.tsbuildinfo", exclude=True, description="TypeScript build info"),
            ]
        ),
        Language.PYTHON: FilterPreset(
            language=Language.PYTHON,
            rules=[
                FilterRule(pattern="__pycache__/**", exclude=True, description="Python cache"),
                FilterRule(pattern="*.pyc", exclude=True, description="Compiled Python"),
                FilterRule(pattern=".venv/**", exclude=True, description="Virtual environment"),
                FilterRule(pattern="venv/**", exclude=True, description="Virtual environment"),
                FilterRule(pattern=".pytest_cache/**", exclude=True, description="Pytest cache"),
                FilterRule(pattern="*.egg-info/**", exclude=True, description="Egg info"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
            ]
        )
    }

    def scan_project_directory(self, path: str) -> FileNode:
        """
        Recursively scan project directory and build file tree

        Args:
            path: Project root path

        Returns:
            FileNode tree structure

        Raises:
            PermissionError: If directory is not accessible
            FileNotFoundError: If path doesn't exist
        """
        project_path = Path(path).resolve()

        if not project_path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")

        if not os.access(project_path, os.R_OK):
            raise PermissionError(f"No read permission for: {path}")

        return self._build_tree(project_path)

    def _build_tree(self, path: Path, max_depth: int = 10, current_depth: int = 0) -> FileNode:
        """
        Build file tree recursively

        Args:
            path: Current path
            max_depth: Maximum recursion depth
            current_depth: Current recursion level

        Returns:
            FileNode for current path
        """
        if current_depth > max_depth:
            return FileNode(
                name=path.name,
                path=str(path),
                type=FileType.DIRECTORY,
                children=[]
            )

        if path.is_file():
            return FileNode(
                name=path.name,
                path=str(path),
                type=FileType.FILE,
                size=path.stat().st_size
            )

        # Directory
        children = []
        try:
            for item in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                try:
                    child_node = self._build_tree(item, max_depth, current_depth + 1)
                    children.append(child_node)
                except (PermissionError, OSError):
                    # Skip inaccessible files/directories
                    continue
        except PermissionError:
            pass

        return FileNode(
            name=path.name,
            path=str(path),
            type=FileType.DIRECTORY,
            children=children
        )

    def detect_language(self, project_path: str) -> Language:
        """
        Detect primary language of the project

        Args:
            project_path: Project root path

        Returns:
            Detected Language
        """
        path = Path(project_path)

        # Check for language markers
        for lang, markers in self.LANGUAGE_MARKERS.items():
            for marker in markers:
                if marker.startswith('.'):
                    # File extension - check if any files have this extension
                    if list(path.rglob(f"*{marker}")):
                        return lang
                else:
                    # Specific file - check if it exists
                    if (path / marker).exists():
                        return lang

        return Language.UNKNOWN

    def parse_gitignore(self, project_path: str) -> List[FilterRule]:
        """
        Parse .gitignore file and convert to filter rules

        Args:
            project_path: Project root path

        Returns:
            List of FilterRule from .gitignore
        """
        gitignore_path = Path(project_path) / '.gitignore'
        rules = []

        if not gitignore_path.exists():
            return rules

        try:
            with open(gitignore_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()

                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue

                    # Handle negation (! prefix)
                    exclude = True
                    if line.startswith('!'):
                        exclude = False
                        line = line[1:]

                    rules.append(FilterRule(
                        pattern=line,
                        exclude=exclude,
                        description=f"From .gitignore"
                    ))
        except Exception:
            # If parsing fails, return empty list
            pass

        return rules

    def load_language_preset(self, language: Language) -> Optional[FilterPreset]:
        """
        Load filter preset for a language

        Args:
            language: Target language

        Returns:
            FilterPreset or None if not found
        """
        return self.PRESETS.get(language)

    def count_files(self, node: FileNode) -> int:
        """
        Count total files in tree

        Args:
            node: Root FileNode

        Returns:
            Total file count
        """
        if node.type == FileType.FILE:
            return 1

        count = 0
        if node.children:
            for child in node.children:
                count += self.count_files(child)

        return count
