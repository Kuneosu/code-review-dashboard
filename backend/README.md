# Smart Code Review - Backend

FastAPI backend for Smart Code Review application.

## Setup

```bash
# Install Poetry (if not installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Run the server
poetry run python main.py
```

The server will start at `http://localhost:8000`

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

```bash
# Run with auto-reload (default behavior)
poetry run python main.py

# Run with uvicorn directly
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Project Structure

```
backend/
├── api/                 # API endpoints
│   └── phase1.py       # Phase 1 routes
├── models/             # Data models
│   └── schemas.py      # Pydantic schemas
├── services/           # Business logic
│   ├── file_scanner.py # File system operations
│   └── filter_service.py # Filter logic
├── main.py             # FastAPI application
└── pyproject.toml      # Dependencies
```

## Phase 1 Endpoints

### `POST /api/scan-project`
Scan a project directory and return file tree.

**Request:**
```json
{
  "project_path": "/path/to/project"
}
```

**Response:**
```json
{
  "file_tree": { ... },
  "detected_language": "javascript",
  "total_files": 150,
  "gitignore_found": true
}
```

### `POST /api/apply-filters`
Apply filter configuration to file tree.

**Request:**
```json
{
  "project_path": "/path/to/project",
  "filter_config": {
    "project_path": "/path/to/project",
    "use_presets": true,
    "use_gitignore": true,
    "presets": [],
    "gitignore_rules": [],
    "custom_rules": []
  }
}
```

**Response:**
```json
{
  "filtered_tree": { ... },
  "stats": {
    "total_files": 150,
    "selected_files": 45,
    "filtered_files": 105
  },
  "selected_file_paths": [...]
}
```

## Testing

```bash
# Run tests (coming soon)
poetry run pytest

# With coverage
poetry run pytest --cov=.
```
