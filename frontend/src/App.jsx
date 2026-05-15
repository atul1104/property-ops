import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { token, role } = useSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <div className="animate-fade-in">{children}</div>;
};

export default function App() {
  const { token } = useSelector((s) => s.auth);

  return (
    <div className="min-h-screen flex flex-col">
      {token && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route
            path="/dashboard"
            element={<PrivateRoute><DashboardPage /></PrivateRoute>}
          />
          <Route
            path="/tickets"
            element={<PrivateRoute><TicketsPage /></PrivateRoute>}
          />
          <Route
            path="/chat"
            element={<PrivateRoute><ChatPage /></PrivateRoute>}
          />
          <Route
            path="/admin"
            element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>}
          />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
