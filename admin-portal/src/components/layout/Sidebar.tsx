import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Sliders,
  LogOut,
  ShieldCheck,
  Building2,
  User as UserIcon,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'super-admin';
  const isDeptHead = user?.role === 'dept-head';
  const isStaff = user?.role === 'staff';

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super-admin', 'dept-head', 'staff'],
    },
    {
      to: '/reports',
      label: 'Report Queue',
      icon: ClipboardList,
      roles: ['super-admin', 'dept-head', 'staff'],
    },
    {
      to: '/analytics',
      label: 'Analytics & SLA',
      icon: BarChart3,
      roles: ['super-admin', 'dept-head'],
    },
    {
      to: '/admin/config',
      label: 'Admin Config',
      icon: Sliders,
      roles: ['super-admin'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'super-admin':
        return { label: 'Super Admin', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'dept-head':
        return { label: 'Dept Head', color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' };
      case 'staff':
        return { label: 'Field Staff', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default:
        return { label: 'Admin', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    }
  };

  const roleInfo = getRoleLabel();

  // Get department name
  const deptName =
    typeof user?.department_id === 'object' && user.department_id
      ? (user.department_id as any).name
      : null;

  return (
    <aside className="w-64 bg-background-card border-r border-background-border flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-background-border/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 flex items-center justify-center text-white shadow-glow-brand">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              CivicPulse
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Admin
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Municipal Command Center</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>

          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-glow-brand font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-background-hover'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-background-border/80 bg-background-secondary/40 space-y-3">
        {/* User Card */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 font-bold shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-100 truncate">{user?.name || 'Staff User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.color}`}
              >
                {roleInfo.label}
              </span>
            </div>
            {deptName && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{deptName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 bg-background-card hover:bg-rose-950/30 border border-background-border hover:border-rose-800/50 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
