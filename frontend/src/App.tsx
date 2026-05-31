import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { useAuth } from './context/AuthContext';
import { AdminPage } from './pages/AdminPage';
import { CarPage } from './pages/CarPage';
import { CatalogPage } from './pages/CatalogPage';
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from './pages/ErrorPages';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { TripsPage } from './pages/TripsPage';

function RequireAuth({ children, admin = false }: { children: JSX.Element; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="stateBlock">Проверяем сессию...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (admin && user.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<CatalogPage />} />
          <Route path="cars/:id" element={<CarPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route
            path="trips"
            element={
              <RequireAuth>
                <TripsPage />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth admin>
                <AdminPage />
              </RequireAuth>
            }
          />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route path="server-error" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
