"""
File filtering service
"""
from pathlib import Path
from typing import List, Tuple

from models.schemas import FileNode, FileType, FilterConfig, FilterRule, FilterStats


class FilterService:
    """Service for applying filters to file trees"""

    def apply_filters(
        self,
        file_tree: FileNode,
        filter_config: FilterConfig
    ) -> Tuple[FileNode, List[str]]:
        """
        Apply filters to file tree and return filtered tree with selected paths

        Args:
            file_tree: Original file tree
            filter_config: Filter configuration

        Returns:
            Tuple of (filtered_tree, selected_file_paths)
        """
        # Collect all filter rules
        all_rules: List[FilterRule] = []

        if filter_config.use_presets:
            for preset in filter_config.presets:
                all_rules.extend(preset.rules)

        if filter_config.use_gitignore:
            all_rules.extend(filter_config.gitignore_rules)

        all_rules.extend(filter_config.custom_rules)

        # Apply filters
        filtered_tree = self._filter_tree(
            file_tree,
            all_rules,
            Path(filter_config.project_path),
            parent_filtered=False
        )

        # Collect selected file paths
        selected_paths = self._collect_selected_paths(filtered_tree)

        return filtered_tree, selected_paths

    def _filter_tree(
        self,
        node: FileNode,
        rules: List[FilterRule],
        project_root: Path,
        parent_filtered: bool = False
    ) -> FileNode:
        """
        Recursively filter file tree

        Args:
            node: Current node
            rules: Filter rules to apply
            project_root: Project root path for relative path calculation
            parent_filtered: True if parent directory is filtered

        Returns:
            Filtered FileNode
        """
        # Create copy of node
        filtered_node = node.model_copy()

        # Calculate relative path
        try:
            rel_path = Path(node.path).relative_to(project_root)
            rel_path_str = str(rel_path)
        except ValueError:
            rel_path_str = node.name

        # Check if this path should be filtered
        # If parent is filtered, this should be filtered too
        if parent_filtered:
            should_filter = True
        else:
            should_filter = self._should_filter_path(rel_path_str, rules)

        filtered_node.filtered = should_filter

        # Process children
        if node.type == FileType.DIRECTORY and node.children:
            filtered_children = []
            for child in node.children:
                # Pass down the filtered state to children
                filtered_child = self._filter_tree(
                    child,
                    rules,
                    project_root,
                    parent_filtered=should_filter
                )
                filtered_children.append(filtered_child)
            filtered_node.children = filtered_children

        return filtered_node

    def _should_filter_path(self, path: str, rules: List[FilterRule]) -> bool:
        """
        Determine if a path should be filtered based on rules

        Args:
            path: Relative file path
            rules: List of filter rules

        Returns:
            True if path should be filtered (excluded)
        """
        # Default: include (not filtered)
        should_exclude = False

        # Apply rules in order (later rules override earlier ones)
        for rule in rules:
            if self._matches_pattern(path, rule.pattern):
                should_exclude = rule.exclude

        return should_exclude

    def _matches_pattern(self, path: str, pattern: str) -> bool:
        """
        Check if path matches glob pattern

        Args:
            path: File path
            pattern: Glob pattern

        Returns:
            True if matches
        """
        # Use pathlib for proper ** handling
        path_obj = Path(path)

        # Special handling for directory patterns like **/dirname/**
        if pattern.startswith('**/') and pattern.endswith('/**'):
            # Extract the directory name (e.g., "coverage" from "**/coverage/**")
            dir_name = pattern[3:-3]

            # Match if:
            # 1. Path equals the directory name (e.g., "coverage")
            # 2. Path starts with directory name followed by / (e.g., "coverage/...")
            # 3. Path contains /directory name/ anywhere (e.g., "src/coverage/...")
            # 4. Path contains /directory name at the end (e.g., "src/coverage")
            if path == dir_name:
                return True
            if path.startswith(dir_name + '/'):
                return True
            if '/' + dir_name + '/' in path:
                return True
            if path.endswith('/' + dir_name):
                return True

            # Also use pathlib match as fallback
            if path_obj.match(pattern):
                return True

        # For patterns starting with **/, we want to match anywhere in the path
        elif pattern.startswith('**/'):
            # Match the pattern against the path and all its parent paths
            if path_obj.match(pattern):
                return True
            # Also try matching just the filename/last component
            return path_obj.match(pattern[3:])

        # For other patterns, use pathlib match
        return path_obj.match(pattern)

    def _collect_selected_paths(self, node: FileNode) -> List[str]:
        """
        Collect all non-filtered file paths

        Args:
            node: Root node

        Returns:
            List of selected (non-filtered) file paths
        """
        paths = []

        # Only collect files that are not filtered
        if node.type == FileType.FILE and not node.filtered:
            paths.append(node.path)

        # Recursively collect from children
        if node.children:
            for child in node.children:
                paths.extend(self._collect_selected_paths(child))

        return paths

    def calculate_stats(self, tree: FileNode) -> FilterStats:
        """
        Calculate filtering statistics

        Args:
            tree: File tree

        Returns:
            FilterStats
        """
        total = self._count_all_files(tree)
        filtered = self._count_filtered_files(tree)
        selected = total - filtered

        return FilterStats(
            total_files=total,
            selected_files=selected,
            filtered_files=filtered
        )

    def _count_all_files(self, node: FileNode) -> int:
        """Count all files in tree"""
        if node.type == FileType.FILE:
            return 1

        count = 0
        if node.children:
            for child in node.children:
                count += self._count_all_files(child)
        return count

    def _count_filtered_files(self, node: FileNode) -> int:
        """Count filtered files in tree"""
        if node.type == FileType.FILE and node.filtered:
            return 1

        count = 0
        if node.children:
            for child in node.children:
                count += self._count_filtered_files(child)
        return count
