import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CarFront, LogIn, LogOut, Route, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatShortName } from '../utils/name';
import { Button } from './Button';

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="appShell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')} aria-label="CarShare">
          <span>CS</span>
          <strong>CarShare</strong>
        </button>
        <div className="topbarActions">
          {user ? (
            <>
              <span className="userPill">{formatShortName(user)}</span>
              <Button variant="ghost" icon={<LogOut size={18} />} aria-label="Выйти" onClick={() => void logout()} />
            </>
          ) : (
            <Button variant="secondary" icon={<LogIn size={18} />} onClick={() => navigate('/login')}>
              Войти
            </Button>
          )}
        </div>
      </header>

      <main className="screen">
        <Outlet />
      </main>

      <nav className="bottomNav" aria-label="Основная навигация">
        <NavLink to="/" end>
          <CarFront size={20} />
          <span>Каталог</span>
        </NavLink>
        <NavLink to="/trips">
          <Route size={20} />
          <span>Поездки</span>
        </NavLink>
        <NavLink to="/profile">
          <UserRound size={20} />
          <span>Профиль</span>
        </NavLink>
        {user?.role === 'ADMIN' ? (
          <NavLink to="/admin">
            <Shield size={20} />
            <span>Админ</span>
          </NavLink>
        ) : null}
      </nav>
    </div>
  );
}
