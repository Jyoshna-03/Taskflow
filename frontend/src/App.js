import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout          from './components/Layout';
import LoginPage       from './pages/LoginPage';
import SignupPage      from './pages/SignupPage';
import DashboardPage   from './pages/DashboardPage';
import ProjectsPage    from './pages/ProjectsPage';
import ProjectDetail   from './pages/ProjectDetailPage';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #2a2a45' },
            success: { iconTheme: { primary: '#4ade80', secondary: '#1a1a2e' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#1a1a2e' } },
          }}
        />
        <Routes>
          <Route path="/login"  element={<Public><LoginPage  /></Public>} />
          <Route path="/signup" element={<Public><SignupPage /></Public>} />
          <Route path="/" element={<Private><Layout /></Private>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"       element={<DashboardPage />} />
            <Route path="projects"        element={<ProjectsPage  />} />
            <Route path="projects/:id"    element={<ProjectDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}