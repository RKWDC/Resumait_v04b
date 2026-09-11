'use client';

import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black text-black tracking-tighter">
            RESUM<span className="text-[#FF0033]">AI</span>T
          </h1>
          
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('platform-reset'))}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-[#FF0033] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            START OVER
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Simulation Suite */}
          <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('dev-auto-fill-1'))}
              className='px-3 py-1.5 text-[9px] bg-white text-black border border-zinc-200 rounded-lg font-black hover:bg-zinc-50 transition-all uppercase tracking-widest shadow-sm active:scale-95'
            >
              Sample Resume: Tech
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('dev-auto-fill-2'))}
              className='px-3 py-1.5 text-[9px] bg-white text-black border border-zinc-200 rounded-lg font-black hover:bg-zinc-50 transition-all uppercase tracking-widest shadow-sm active:scale-95'
            >
              Sample Resume: Sales
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
