/**
 * Main App Component
 */
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Phase1Page } from './pages/Phase1Page';
import { Phase2Page } from './pages/Phase2Page';

console.log('[DEBUG] App.tsx loaded');

function App() {
  console.log('[DEBUG] App component rendering');

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Phase1Page />} />
        <Route path="/analysis" element={<Phase2Page />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
