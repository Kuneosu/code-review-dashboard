# Development Guide

## Quick Start for Development

### 1. Backend Setup and Run

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
poetry install

# Run the development server
poetry run python main.py
```

The backend will start at `http://localhost:8000`
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 2. Frontend Setup and Run

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies (first time only)
npm install

# Run the development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 3. Test the Application

1. Open browser to `http://localhost:5173`
2. Enter a project path (try using this project's path)
3. Click "Browse" to scan
4. Configure filters and click "Apply Filters"
5. See the filtered file tree and statistics

## Development Workflow

### Backend Development

**File Locations:**
- API endpoints: `backend/api/phase1.py`
- Data models: `backend/models/schemas.py`
- Business logic: `backend/services/`
- Main app: `backend/main.py`

**Making Changes:**
1. Edit Python files
2. Server auto-reloads (thanks to uvicorn's `--reload` flag)
3. Test changes via Swagger UI at http://localhost:8000/docs

**Adding New Endpoints:**
1. Add endpoint function in `api/phase1.py`
2. Define request/response models in `models/schemas.py`
3. Implement business logic in `services/`
4. Test via Swagger UI

### Frontend Development

**File Locations:**
- Components: `frontend/src/components/`
- Pages: `frontend/src/pages/`
- State: `frontend/src/stores/`
- API calls: `frontend/src/utils/api.ts`
- Types: `frontend/src/types/index.ts`

**Making Changes:**
1. Edit TypeScript/React files
2. Vite auto-reloads with hot module replacement
3. Changes appear instantly in browser

**Adding New Features:**
1. Define TypeScript types in `types/index.ts`
2. Add API function in `utils/api.ts`
3. Update store if needed in `stores/`
4. Create/update components in `components/`
5. Update page in `pages/Phase1Page.tsx`

## Common Development Tasks

### Adding a New Filter Rule Type

**Backend (`services/file_scanner.py`):**
```python
PRESETS = {
    Language.JAVASCRIPT: FilterPreset(
        language=Language.JAVASCRIPT,
        rules=[
            # Add new rule here
            FilterRule(pattern="*.test.js", exclude=True),
        ]
    ),
}
```

**Frontend (`components/FilterConfiguration.tsx`):**
```typescript
// Component automatically uses backend presets
// No frontend changes needed for preset rules
```

### Adding a Custom Analysis Tool

**For Phase 2 (coming soon):**
1. Create analyzer in `backend/analyzers/`
2. Add tool configuration
3. Integrate with analysis orchestrator
4. Update UI to display results

### Debugging

**Backend:**
```python
# Add print statements or use Python debugger
import pdb; pdb.set_trace()

# Or use logging
import logging
logging.debug("Debug message")
```

**Frontend:**
```typescript
// Use browser console
console.log('Debug:', data)

// Use React DevTools
// Install browser extension for state inspection
```

## Code Style

### Backend (Python)
- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Use async/await for I/O operations

### Frontend (TypeScript/React)
- Use functional components with hooks
- Define proper TypeScript types
- Use async/await for API calls
- Keep components focused and reusable

## Testing

### Backend Tests (Coming Soon)
```bash
cd backend
poetry run pytest
```

### Frontend Tests (Coming Soon)
```bash
cd frontend
npm run test
```

## Performance Tips

### Backend
- Use async operations for file I/O
- Implement caching for repeated scans
- Batch process large file sets

### Frontend
- Virtual scrolling for large file trees (already implemented)
- Memoize expensive computations
- Debounce filter changes

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 8000 is in use
lsof -ti:8000 | xargs kill -9

# Verify Poetry environment
poetry env info

# Reinstall dependencies
poetry install --no-root
```

### Frontend Won't Start
```bash
# Check if port 5173 is in use
lsof -ti:5173 | xargs kill -9

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version (should be 18+)
node --version
```

### CORS Issues
- Ensure backend is running on port 8000
- Check CORS middleware in `backend/main.py`
- Verify Vite proxy configuration in `frontend/vite.config.ts`

### TypeScript Errors
```bash
# Check TypeScript configuration
npm run build

# Clear TypeScript cache
rm -rf node_modules/.cache
```

## Next Steps: Phase 2 Development

**Phase 2 will add:**
1. Static analysis tools integration (ESLint, Bandit, etc.)
2. Issue detection and categorization
3. Dashboard with charts and filtering
4. Export functionality

**Preparation:**
- Review `phase2_design_doc.md`
- Set up static analysis tools locally
- Plan API endpoints for analysis results
- Design dashboard components

## Git Workflow

```bash
# Check status
git status

# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "Add feature: description"

# Push to remote
git push origin feature/your-feature-name
```

## Resources

- FastAPI Docs: https://fastapi.tiangolo.com/
- React Docs: https://react.dev/
- Vite Docs: https://vitejs.dev/
- Zustand Docs: https://github.com/pmndrs/zustand
- TailwindCSS: https://tailwindcss.com/

## Questions?

Refer to:
- `CLAUDE.md` - For AI assistant guidance
- `README.md` - For general overview
- Design docs - For detailed specifications
