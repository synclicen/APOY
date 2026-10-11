'use client';

import { Settings, Shield } from 'lucide-react';
import { ViewType } from './types';
import { cn } from '@/lib/utils';

interface TopBarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  authUser?: { username: string; role: string };
  onOpenAccount?: () => void;
}

export function TopBar({ currentView, onViewChange, authUser, onOpenAccount }: TopBarProps) {
  const navItems: { label: string; view: ViewType }[] = [
    { label: 'Projects', view: 'import' },
    { label: 'Assets', view: 'analysis' },
    { label: 'Export', view: 'export' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 z-50 px-3 md:px-5 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-6">
        <span
          className="text-lg font-black tracking-tight text-primary font-headline cursor-pointer"
          onClick={() => onViewChange('import')}
        >
          APOY
        </span>
        <nav className="flex gap-3 md:gap-6">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={cn(
                'font-headline font-bold text-xs md:text-sm transition-all duration-300 pb-1 border-b-2 active:scale-95',
                currentView === item.view
                  ? 'text-primary border-primary'
                  : 'text-on-surface-variant border-transparent hover:text-on-surface'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Settings button → opens Account Management */}
        <button
          onClick={onOpenAccount}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
          title="Account & Settings"
        >
          <Settings size={18} />
        </button>

        {/* Profile avatar → opens Account Management */}
        <button
          onClick={onOpenAccount}
          className="flex items-center gap-2 ml-1 pr-2 pl-1 py-1 rounded-full hover:bg-surface-container-high transition-colors"
          title="Account"
        >
          {authUser?.role === 'super_admin' && (
            <Shield size={13} className="text-primary shrink-0" />
          )}
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
            <span className="text-primary font-bold text-[10px] uppercase">
              {authUser?.username?.slice(0, 2) || '?'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant hidden md:block max-w-[80px] truncate">
            {authUser?.username || 'Guest'}
          </span>
        </button>
      </div>
    </header>
  );
}
