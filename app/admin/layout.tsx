'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminThemeProvider, useTheme } from './_lib/theme-context';

/* ── Nav items ───────────────────────────────────────────────────────────── */

const NAV = [
  {
    label: 'Command Center', href: '/admin',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  },
  {
    label: 'Analytics', href: '/admin/analytics',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  },
  {
    label: 'Settings', href: '/admin/settings',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

/* ── Inner layout ────────────────────────────────────────────────────────── */

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [sidebar, setSidebar] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Mobile overlay */}
      {sidebar && (
        <div onClick={() => setSidebar(false)} style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--admin-bg-surface)',
        borderRight: '1px solid var(--admin-border)',
        boxShadow: isDark ? 'none' : 'var(--admin-shadow-card)',
        position: 'sticky', top: 0, height: '100vh',
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}>
        {/* Brand */}
        <div style={{
          height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--admin-border)',
          background: isDark
            ? 'linear-gradient(135deg, var(--bg-semantic-info) 0%, var(--bg-semantic-brand) 100%)'
            : 'linear-gradient(135deg, var(--color-semantic-info) 0%, var(--color-semantic-brand) 100%)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isDark ? 'linear-gradient(135deg, var(--color-semantic-info), var(--color-semantic-brand))' : 'rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: 'white',
            border: isDark ? 'none' : '1px solid rgba(255,255,255,0.3)',
          }}>CR</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#e8f0ff' : 'white', letterSpacing: '-0.02em' }}>CivicReport</div>
            <div style={{ fontSize: 10, color: isDark ? 'var(--color-semantic-info)' : 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600 }}>Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 8 }}>Navigation</div>
          {NAV.map(item => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebar(false)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9, marginBottom: 2,
                textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 600 : 500,
                color: active ? 'var(--color-semantic-info)' : 'var(--admin-text-secondary)',
                background: active ? 'var(--bg-semantic-info)' : 'transparent',
                boxShadow: active ? `inset 0 0 0 1px var(--color-semantic-info)` : 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--admin-bg-hover)'; el.style.color = 'var(--admin-text-primary)'; }}}
              onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--admin-text-secondary)'; }}}
              >
                {item.icon}{item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div style={{ padding: 16, borderTop: '1px solid var(--admin-border)', background: 'var(--admin-bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--color-semantic-brand), var(--color-semantic-danger))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12, color: 'white',
              boxShadow: '0 2px 10px rgba(139,92,246,0.4)',
            }}>SA</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>Super Admin</div>
              <div style={{ fontSize: 11, color: 'var(--admin-text-secondary)' }}>All departments</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          height: 56, padding: '0 24px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isDark ? 'rgba(21,24,34,0.92)' : 'rgba(255,255,255,0.95)', borderBottom: '1px solid var(--admin-border)',
          backdropFilter: 'blur(12px)',
          boxShadow: isDark ? 'none' : '0 1px 8px rgba(10,30,80,0.04)',
          position: 'sticky', top: 0, zIndex: 30,
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}>
          {/* Mobile menu */}
          <button onClick={() => setSidebar(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--admin-border)',
            background: 'var(--admin-bg-surface)', cursor: 'pointer', color: 'var(--admin-text-secondary)',
          }} className="lg:hidden">
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="hidden lg:block" />

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={isDark ? 'Switch to Light' : 'Switch to Dark'} style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--admin-border)', background: 'var(--admin-bg-surface)',
              cursor: 'pointer', color: 'var(--admin-text-secondary)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--admin-text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-bg-surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--admin-text-secondary)'; }}
            >
              {isDark
                ? <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              }
            </button>

            {/* Profile */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropdown(!dropdown)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 12px 4px 5px', borderRadius: 24,
                border: '1px solid var(--admin-border)', background: 'var(--admin-bg-surface)',
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-bg-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-bg-surface)'; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-semantic-brand), var(--color-semantic-danger))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 11, color: 'white',
                }}>SA</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--admin-text-secondary)' }}>Admin</span>
                <svg style={{ width: 13, height: 13, color: 'var(--admin-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>

              {dropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setDropdown(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 210, zIndex: 50,
                    background: 'var(--admin-bg-elevated)', border: '1px solid var(--admin-border)',
                    borderRadius: 12, boxShadow: 'var(--admin-shadow-elevated)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '10px 14px 10px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg-surface)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>Super Admin</div>
                      <div style={{ fontSize: 11, color: 'var(--admin-text-secondary)', marginTop: 1 }}>admin@civicreport.com</div>
                    </div>
                    <button onClick={() => router.push('/')} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, color: 'var(--color-semantic-danger)', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-semantic-danger)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <svg style={{ width: 15, height: 15, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
