'use client';

import { Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolType } from './types';

interface SidebarProps {
  activeTool: ToolType | null;
  onToolSelect: (tool: ToolType) => void;
}

const tools = [
  { id: 'enhance', icon: Sparkles, label: 'Enhance' },
] as const;

export function Sidebar({ activeTool, onToolSelect }: SidebarProps) {
  return (
    <aside className="fixed md:left-4 md:top-24 md:bottom-24 md:w-20 left-0 right-0 bottom-0 md:h-auto h-20 bg-surface-container-highest/30 backdrop-blur-xl md:rounded-full border-t md:border border-outline-variant/10 flex md:flex-col flex-row items-center md:py-8 px-6 md:px-0 z-40 shadow-2xl transition-all duration-300">
      <div className="hidden md:block mb-8">
        <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
          <Sparkles className="text-primary" size={20} />
        </div>
      </div>

      <div className="flex md:flex-col flex-row gap-4 md:gap-8 flex-1 justify-around md:justify-start w-full">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id as ToolType)}
              className="flex flex-col items-center gap-1 group flex-1 md:flex-none active:scale-90 transition-transform"
            >
              <div
                className={cn(
                  'p-2.5 md:p-3 rounded-full transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container shadow-lg shadow-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                )}
              >
                <tool.icon size={20} />
              </div>
              <span
                className={cn(
                  'hidden md:block text-[10px] font-medium uppercase tracking-widest transition-colors',
                  isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'
                )}
              >
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      <button className="hidden md:block mt-auto p-3 text-on-surface-variant hover:text-primary transition-colors">
        <HelpCircle size={20} />
      </button>
    </aside>
  );
}
