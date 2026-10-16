import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { Home } from './pages/Home';
import { Enhance } from './pages/Enhance';
import { JobProgress } from './pages/JobProgress';
import { ExportResult } from './pages/ExportResult';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { SharedView } from './pages/SharedView';
import { AuthLanding } from './pages/AuthLanding';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/enhance" element={<Enhance />} />
              <Route path="/jobs/:jobId" element={<JobProgress />} />
              <Route path="/exports/:exportId" element={<ExportResult />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/shared/:shareId" element={<SharedView />} />
              <Route path="/auth" element={<AuthLanding />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
