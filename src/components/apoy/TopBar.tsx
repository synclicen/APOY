'use client';

import { Settings, Bell, Search } from 'lucide-react';
import { ViewType } from './types';
import { cn } from '@/lib/utils';

interface TopBarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const navItems: { label: string; view: ViewType }[] = [
    { label: 'Projects', view: 'import' },
    { label: 'Assets', view: 'analysis' },
    { label: 'Export', view: 'export' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 z-50 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 md:gap-8">
        <span
          className="text-xl font-black tracking-tight text-primary font-headline cursor-pointer"
          onClick={() => onViewChange('import')}
        >
          APOY
        </span>
        <nav className="flex gap-4 md:gap-8">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={cn(
                'font-headline font-bold text-sm md:text-lg transition-all duration-300 pb-1 border-b-2 active:scale-95',
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

      <div className="flex items-center gap-2 md:gap-4">
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <Search size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors hidden sm:block">
          <Settings size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors relative hidden sm:block">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 ml-2">
          { }
          <img
            src="https://picsum.photos/seed/photographer/100/100"
            alt="User"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
