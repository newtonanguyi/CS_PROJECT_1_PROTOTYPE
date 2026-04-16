import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = [
    { path: '/disease', label: 'Diagnose' },
    { path: '/chat', label: 'Advisory' },
    { path: '/about', label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary-600"
              >
                <path
                  d="M20 4c-6 0-10 3-12 7-1.1 2.2-1.2 4.6-.6 6.8.2.7 1 .9 1.5.4l3.1-3.1c1.3-1.3 3.4-1.3 4.7 0l.4.4c.4.4 1 .4 1.4 0C20.6 11.9 21 9 21 6c0-1.1-.4-2-.9-2Z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M4 20c6 0 10-3 12-7 1.1-2.2 1.2-4.6.6-6.8-.2-.7-1-.9-1.5-.4L12 8.1c-1.3 1.3-3.4 1.3-4.7 0l-.4-.4c-.4-.4-1-.4-1.4 0C3.4 12.1 3 15 3 18c0 1.1.4 2 .9 2Z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-serif text-xl font-semibold text-slate-900">TomatoDoc</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-6">
              {nav.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-sm font-semibold transition ${
                      active ? 'text-primary-700' : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-slate-600">
                {user?.username ? `Signed in as ${user.username}` : ''}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-slate-600">
          
        </div>
      </footer>
    </div>
  );
};

export default Layout;









