'use client';

import {
  BarChart3,
  Users,
  Inbox,
  FileCheck,
  FileText,
  Settings,
  House,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'players', icon: Users, label: 'Players' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'submissions', icon: Inbox, label: 'Submissions', badge: 0 },
  { id: 'resume-requests', icon: FileCheck, label: 'Resume Requests', badge: 0 },
  { id: 'blog', icon: FileText, label: 'Blog' },
  { id: 'agent', icon: Users, label: 'Agent' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function AdminSidebar({ activeView, onViewChange, collapsed, onToggleCollapse }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'en';

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-full border border-divider bg-primary-card p-2 text-primary-text shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 flex h-full flex-col z-50 md:z-10
          bg-primary-navy border-r border-primary-text-inverse/10 text-primary-text-inverse
          transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary-text-inverse/10 p-4">
          <div
            className={`flex items-center gap-2 transition-opacity ${
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            <Image src="/logo/logo3.svg" alt="FootballBank logo" width={40} height={40} />
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-accent">FootballBank</p><p className="text-sm font-medium text-primary-text-inverse/60">Admin console</p></div>
          </div>

          {/* Collapse toggle */}
          <button
            className="ml-auto hidden text-primary-text-inverse/50 transition hover:text-primary-accent md:block"
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;

              return (
                <li key={item.id} >
                  <button
                    onClick={() => {
                      onViewChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-primary-action text-primary-text-inverse shadow-lg shadow-primary-action/20'
                        : 'text-primary-text-inverse/65 hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {item.badge !== undefined && item.badge > 0 && !collapsed && (
                      <span className="ml-auto rounded-full bg-accent-red px-2 py-1 text-xs text-primary-text-inverse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-primary-text-inverse/10 p-2">
          <Link
            href={`/${lang}`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary-text-inverse/65 transition hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse"
            aria-label="Home"
            title="Home"
          >
            <House className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Home</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
