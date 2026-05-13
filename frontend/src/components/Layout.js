import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>⚡ TaskFlow</span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {[
            { to: '/dashboard', label: '▦  Dashboard' },
            { to: '/projects',  label: '◈  Projects' },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'block', padding: '9px 12px',
              borderRadius: 'var(--radius)', marginBottom: 4,
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              background: isActive ? 'rgba(129,140,248,.12)' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14,
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatar">{initials(user?.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{user?.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11 }} className="truncate">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', color: 'var(--red)' }}
            onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}