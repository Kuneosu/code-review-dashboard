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

    # Universal preset for all projects (combines all common patterns)
    COMMON_PRESET = FilterPreset(
        language=Language.UNKNOWN,
        rules=[
            # Version Control
            FilterRule(pattern="**/.git/**", exclude=True, description="Git repository"),
            FilterRule(pattern="**/.svn/**", exclude=True, description="SVN repository"),

            # IDE & Editor
            FilterRule(pattern="**/.idea/**", exclude=True, description="IntelliJ IDEA"),
            FilterRule(pattern="**/.vscode/**", exclude=True, description="VS Code settings"),
            FilterRule(pattern="**/*.swp", exclude=True, description="Vim swap files"),
            FilterRule(pattern="**/*.swo", exclude=True, description="Vim swap files"),

            # OS Files
            FilterRule(pattern="**/.DS_Store", exclude=True, description="macOS metadata"),
            FilterRule(pattern="**/Thumbs.db", exclude=True, description="Windows metadata"),

            # Environment & Secrets
            FilterRule(pattern="**/.env", exclude=True, description="Environment variables"),
            FilterRule(pattern="**/.env.local", exclude=True, description="Local environment"),
            FilterRule(pattern="**/.env.*.local", exclude=True, description="Environment files"),

            # Logs
            FilterRule(pattern="**/*.log", exclude=True, description="Log files"),
            FilterRule(pattern="**/logs/**", exclude=True, description="Log directory"),

            # JavaScript/TypeScript
            FilterRule(pattern="**/node_modules/**", exclude=True, description="Node modules"),
            FilterRule(pattern="**/dist/**", exclude=True, description="Distribution files"),
            FilterRule(pattern="**/build/**", exclude=True, description="Build output"),
            FilterRule(pattern="**/out/**", exclude=True, description="Output directory"),
            FilterRule(pattern="**/.next/**", exclude=True, description="Next.js build"),
            FilterRule(pattern="**/coverage/**", exclude=True, description="Coverage reports"),
            FilterRule(pattern="**/*.min.js", exclude=True, description="Minified JavaScript"),
            FilterRule(pattern="**/*.bundle.js", exclude=True, description="Bundle files"),
            FilterRule(pattern="**/*.map", exclude=True, description="Source maps"),
            FilterRule(pattern="**/*.tsbuildinfo", exclude=True, description="TypeScript build info"),

            # Python
            FilterRule(pattern="**/__pycache__/**", exclude=True, description="Python cache"),
            FilterRule(pattern="**/*.pyc", exclude=True, description="Compiled Python"),
            FilterRule(pattern="**/*.pyo", exclude=True, description="Optimized Python"),
            FilterRule(pattern="**/.venv/**", exclude=True, description="Virtual environment"),
            FilterRule(pattern="**/venv/**", exclude=True, description="Virtual environment"),
            FilterRule(pattern="**/env/**", exclude=True, description="Environment directory"),
            FilterRule(pattern="**/.pytest_cache/**", exclude=True, description="Pytest cache"),
            FilterRule(pattern="**/*.egg-info/**", exclude=True, description="Python egg info"),
            FilterRule(pattern="**/.mypy_cache/**", exclude=True, description="MyPy cache"),
            FilterRule(pattern="**/.ruff_cache/**", exclude=True, description="Ruff cache"),

            # Package Locks (usually don't need review)
            FilterRule(pattern="**/package-lock.json", exclude=True, description="NPM lock file"),
            FilterRule(pattern="**/yarn.lock", exclude=True, description="Yarn lock file"),
            FilterRule(pattern="**/pnpm-lock.yaml", exclude=True, description="PNPM lock file"),

            # Documentation & Config
            FilterRule(pattern="**/*.md", exclude=True, description="Markdown files"),
            FilterRule(pattern="**/*.json", exclude=True, description="JSON files"),

            # Images
            FilterRule(pattern="**/*.png", exclude=True, description="PNG images"),
            FilterRule(pattern="**/*.jpg", exclude=True, description="JPG images"),
            FilterRule(pattern="**/*.jpeg", exclude=True, description="JPEG images"),
            FilterRule(pattern="**/*.gif", exclude=True, description="GIF images"),
            FilterRule(pattern="**/*.svg", exclude=True, description="SVG images"),
            FilterRule(pattern="**/*.ico", exclude=True, description="Icon files"),
            FilterRule(pattern="**/*.webp", exclude=True, description="WebP images"),

            # Videos & Audio
            FilterRule(pattern="**/*.mp4", exclude=True, description="MP4 videos"),
            FilterRule(pattern="**/*.mov", exclude=True, description="MOV videos"),
            FilterRule(pattern="**/*.avi", exclude=True, description="AVI videos"),
            FilterRule(pattern="**/*.webm", exclude=True, description="WebM videos"),
            FilterRule(pattern="**/*.m4a", exclude=True, description="M4A audio"),
            FilterRule(pattern="**/*.mp3", exclude=True, description="MP3 audio"),
            FilterRule(pattern="**/*.wav", exclude=True, description="WAV audio"),
        ]
    )

    # Default filter presets (language-specific)
    PRESETS = {
        Language.JAVASCRIPT: FilterPreset(
            language=Language.JAVASCRIPT,
            rules=[
                FilterRule(pattern="node_modules/**", exclude=True, description="Node modules"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
                FilterRule(pattern="coverage/**", exclude=True, description="Coverage reports"),
                FilterRule(pattern=".next/**", exclude=True, description="Next.js build"),
                FilterRule(pattern="out/**", exclude=True, description="Output directory"),
                FilterRule(pattern="*.min.js", exclude=True, description="Minified files"),
                FilterRule(pattern="*.bundle.js", exclude=True, description="Bundle files"),
                FilterRule(pattern="*.map", exclude=True, description="Source maps"),
            ]
        ),
        Language.TYPESCRIPT: FilterPreset(
            language=Language.TYPESCRIPT,
            rules=[
                FilterRule(pattern="node_modules/**", exclude=True, description="Node modules"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
                FilterRule(pattern="out/**", exclude=True, description="Output directory"),
                FilterRule(pattern="*.tsbuildinfo", exclude=True, description="TypeScript build info"),
                FilterRule(pattern="*.js.map", exclude=True, description="Source maps"),
                FilterRule(pattern="*.d.ts.map", exclude=True, description="Declaration maps"),
            ]
        ),
        Language.PYTHON: FilterPreset(
            language=Language.PYTHON,
            rules=[
                FilterRule(pattern="__pycache__/**", exclude=True, description="Python cache"),
                FilterRule(pattern="*.pyc", exclude=True, description="Compiled Python"),
                FilterRule(pattern="*.pyo", exclude=True, description="Optimized Python"),
                FilterRule(pattern=".venv/**", exclude=True, description="Virtual environment"),
                FilterRule(pattern="venv/**", exclude=True, description="Virtual environment"),
                FilterRule(pattern="env/**", exclude=True, description="Virtual environment"),
                FilterRule(pattern=".pytest_cache/**", exclude=True, description="Pytest cache"),
                FilterRule(pattern="*.egg-info/**", exclude=True, description="Egg info"),
                FilterRule(pattern="dist/**", exclude=True, description="Distribution files"),
                FilterRule(pattern="build/**", exclude=True, description="Build files"),
                FilterRule(pattern=".mypy_cache/**", exclude=True, description="MyPy cache"),
                FilterRule(pattern=".ruff_cache/**", exclude=True, description="Ruff cache"),
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
        Detect primary language of the project (for backward compatibility)

        Args:
            project_path: Project root path

        Returns:
            Detected Language (first detected or UNKNOWN)
        """
        languages = self.detect_languages(project_path)
        return languages[0] if languages else Language.UNKNOWN

    def detect_languages(self, project_path: str) -> List[Language]:
        """
        Detect all languages used in the project

        Args:
            project_path: Project root path

        Returns:
            List of detected Languages (empty if none found)
        """
        path = Path(project_path)
        detected_languages = []

        # Check for each language's markers
        for lang, markers in self.LANGUAGE_MARKERS.items():
            lang_detected = False

            for marker in markers:
                if marker.startswith('.'):
                    # File extension - check if any files have this extension
                    # Use a limited search to improve performance
                    try:
                        next(path.rglob(f"*{marker}"))
                        lang_detected = True
                        break
                    except StopIteration:
                        continue
                else:
                    # Specific file - check if it exists
                    if (path / marker).exists():
                        lang_detected = True
                        break

            if lang_detected and lang not in detected_languages:
                detected_languages.append(lang)

        return detected_languages

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

    def load_language_presets(self, languages: List[Language]) -> List[FilterPreset]:
        """
        Load filter presets for multiple languages

        Args:
            languages: List of detected languages

        Returns:
            List of FilterPresets (includes COMMON_PRESET)
        """
        presets = [self.COMMON_PRESET]  # Always include common preset

        for lang in languages:
            preset = self.PRESETS.get(lang)
            if preset:
                presets.append(preset)

        return presets

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
