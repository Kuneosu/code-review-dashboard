/**
 * Main App Component
 */
import { useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Phase1Page } from './pages/Phase1Page';
import { Phase2Page } from './pages/Phase2Page';
import { DashboardPage } from './pages/DashboardPage';
import { SetupPage } from './pages/SetupPage';

console.log('[DEBUG] App.tsx loaded');

// Setup Mode Router - 첫 실행시 Setup Wizard로 이동
function SetupModeRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    // @ts-ignore - window.__SETUP_MODE__ is injected by extension
    if (window.__SETUP_MODE__ === true) {
      console.log('[DEBUG] Setup mode detected, navigating to /setup');
      navigate('/setup');
    }
  }, [navigate]);

  return null;
}

function App() {
  console.log('[DEBUG] App component rendering');

  return (
    <HashRouter>
      <SetupModeRouter />
      <Routes>
        <Route path="/" element={<Phase1Page />} />
        <Route path="/analysis" element={<Phase2Page />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
