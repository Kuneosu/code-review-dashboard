# Smart Code Review

Local AI-powered code analysis tool that detects security vulnerabilities, performance issues, and code quality problems.

## Current Status: Phase 1 ✅

**Phase 1: Project Upload & File Filtering** - Complete
- ✅ Project directory selection
- ✅ Smart file filtering with language presets
- ✅ .gitignore parsing
- ✅ Custom filter rules
- ✅ File tree visualization
- ✅ Filter configuration export/import

## Quick Start

### Prerequisites

- **Backend**: Python 3.9+, Poetry
- **Frontend**: Node.js 18+, npm/yarn
- **OS**: macOS, Linux, or Windows

### Installation & Running

#### Backend Setup

```bash
cd backend

# Install dependencies with Poetry
poetry install

# Run the FastAPI server
poetry run python main.py

# Server will start at http://localhost:8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev

# Frontend will start at http://localhost:5173
```

### Using the Application

1. Open your browser to `http://localhost:5173`
2. Enter a project path (e.g., `/path/to/your/project`)
3. Click "Browse" to scan the project
4. Configure filters:
   - Toggle language presets
   - Toggle .gitignore rules
   - Add custom filter patterns
5. Click "Apply Filters" to see results
6. Review selected files in the file tree
7. Click "Start Analysis" to proceed to Phase 2 (coming soon)

## Project Structure

```
code-review-dashboard/
├── backend/                # FastAPI backend
│   ├── api/               # API endpoints
│   │   └── phase1.py      # Phase 1 routes
│   ├── models/            # Pydantic models
│   │   └── schemas.py     # Data schemas
│   ├── services/          # Business logic
│   │   ├── file_scanner.py
│   │   └── filter_service.py
│   ├── main.py            # FastAPI app entry
│   └── pyproject.toml     # Python dependencies
│
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ProjectSelector.tsx
│   │   │   ├── FilterConfiguration.tsx
│   │   │   └── FileTreeViewer.tsx
│   │   ├── pages/         # Page components
│   │   │   └── Phase1Page.tsx
│   │   ├── stores/        # Zustand state management
│   │   │   └── phase1Store.ts
│   │   ├── types/         # TypeScript types
│   │   │   └── index.ts
│   │   ├── utils/         # Utilities
│   │   │   └── api.ts     # API client
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   └── package.json       # Node dependencies
│
├── CLAUDE.md              # Claude Code guidance
└── README.md              # This file
```

## Development

### Backend Development

```bash
cd backend

# Run with auto-reload
poetry run python main.py

# Run tests (coming soon)
poetry run pytest

# Type checking (coming soon)
poetry run mypy .
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Phase 1 Endpoints

- `POST /api/scan-project` - Scan project directory
- `POST /api/apply-filters` - Apply filter configuration
- `POST /api/filter-config/export` - Export filter config
- `POST /api/filter-config/import` - Import filter config

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **Poetry** - Dependency management

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **TailwindCSS** - Styling

## Roadmap

### Phase 1: Project Upload & File Filtering ✅ (Current)
- Project selection and scanning
- Language detection
- Smart filtering with presets
- File tree visualization

### Phase 2: Static Analysis & Dashboard (Next)
- ESLint, Bandit, Pylint integration
- Security, performance, quality issue detection
- Interactive dashboard with charts
- Filtering and export capabilities

### Phase 3: AI Deep Analysis (Future)
- Local LLM integration (Ollama)
- AI-powered code suggestions
- Root cause analysis
- Code improvement recommendations

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9
```

**Import errors:**
```bash
# Ensure you're in poetry shell or use poetry run
cd backend
poetry shell
```

### Frontend Issues

**Port 5173 already in use:**
```bash
# Change port in vite.config.ts or kill the process
lsof -ti:5173 | xargs kill -9
```

**TypeScript errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## License

MIT License - See LICENSE file for details

## Contributing

This project is currently in active development. Phase 1 is complete, and we're moving towards Phase 2 implementation.
