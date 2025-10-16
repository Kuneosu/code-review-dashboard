# Smart Code Review - Frontend

React + Vite frontend for Smart Code Review application.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will start at `http://localhost:5173`

## Development

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Project Structure

```
frontend/src/
├── components/           # Reusable components
│   ├── ProjectSelector.tsx
│   ├── FilterConfiguration.tsx
│   └── FileTreeViewer.tsx
├── pages/               # Page components
│   └── Phase1Page.tsx
├── stores/              # Zustand state management
│   └── phase1Store.ts
├── types/               # TypeScript type definitions
│   └── index.ts
├── utils/               # Utility functions
│   └── api.ts          # API client
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles (Tailwind)
```

## State Management

The application uses Zustand for state management:

- `phase1Store.ts` - Manages Phase 1 state (project selection, filtering)

## API Integration

API calls are centralized in `utils/api.ts`. The frontend communicates with the FastAPI backend at `http://localhost:8000`.

All API calls are proxied through Vite's dev server configuration.

## Styling

The application uses TailwindCSS for styling with custom color schemes:

```javascript
// Severity colors
critical: '#EF4444'
high: '#F97316'
medium: '#F59E0B'
low: '#10B981'

// Category colors
security: '#DC2626'
performance: '#2563EB'
quality: '#7C3AED'
```

## TypeScript

The project uses strict TypeScript configuration. All components are typed and type-safe.
