import React from 'react';
import bossLogo from './boss logo.png';

export default function HomeScreen({ onNavigate }) {
  // 🏔️ FIXED: High-availability clear alpine river rushing over freestone rapids and granite structures
  const canberraBgUrl = "https://images.unsplash.com/photo-1444090542259-0af8fa96557e?auto=format&fit=crop&w=1200&q=80";
  const merimbulaBgUrl = "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-between pt-6 px-6 pb-4 font-sans text-slate-100 select-none overflow-hidden">
      
      {/* BRANDING HEADER AREA - Tightened margins to save vertical screen space */}
      <div className="flex flex-col items-center text-center w-full max-w-md shrink-0">
        <img 
          src={bossLogo} 
          alt="Boss Outdoor Logo" 
          className="h-44 w-auto object-contain block m-0 p-0"
        />
        <p className="text-[10px] tracking-[0.45em] text-zinc-500 uppercase font-bold mt-3 pl-[0.45em]">
          COMMUNITY HUB
        </p>
      </div>

      {/* STORE SELECTION CARDS CONTAINER - Responsive vertical gaps */}
      <div className="w-full max-w-md my-auto space-y-4 flex flex-col justify-center">
        
        {/* 1. CANBERRA FRESHWATER CARD (Optimized Height) */}
        <div 
          onClick={() => onNavigate('canberra')}
          className="relative w-full h-44 rounded-3xl overflow-hidden shadow-xl border border-zinc-900 active:scale-[0.99] active:brightness-95 transition-all duration-150 ease-out cursor-pointer group"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.75)), url(${canberraBgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 55%'
          }}
        >
          {/* Card Content Stack */}
          <div className="absolute inset-0 p-5 flex flex-col justify-center items-center text-center">
            <h2 className="text-2xl font-black text-white tracking-wider uppercase drop-shadow-md group-hover:scale-105 transition-transform duration-200">
              Canberra
            </h2>
            <p className="text-[11px] text-zinc-300 font-medium mt-1.5 max-w-[90%] leading-relaxed drop-shadow">
              Inland rivers & lakes. Barometer trends, dam levels, and localized cod tactics.
            </p>
          </div>
        </div>

        {/* 2. MERIMBULA SALTWATER CARD (Optimized Height) */}
        <div 
          onClick={() => onNavigate('merimbula')}
          className="relative w-full h-44 rounded-3xl overflow-hidden shadow-xl border border-zinc-900 active:scale-[0.99] active:brightness-95 transition-all duration-150 ease-out cursor-pointer group"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.75)), url(${merimbulaBgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Card Content Stack */}
          <div className="absolute inset-0 p-5 flex flex-col justify-center items-center text-center">
            <h2 className="text-2xl font-black text-white tracking-wider uppercase drop-shadow-md group-hover:scale-105 transition-transform duration-200">
              Merimbula
            </h2>
            <p className="text-[11px] text-zinc-300 font-medium mt-1.5 max-w-[90%] leading-relaxed drop-shadow">
              Ocean reefs, surf, & estuaries. Live swell heights, tide charts, and bluewater updates.
            </p>
          </div>
        </div>

      </div>

      {/* FOOTER CONTAINER WITH INVISIBLE BACKDOOR - Tucked cleanly at the base */}
      <div className="w-full max-w-md flex justify-end shrink-0 h-6 mt-2">
        <div 
          onClick={() => onNavigate('admin')}
          className="w-14 h-full cursor-default active:bg-transparent"
          title="System Access"
        />
      </div>

    </div>
  );
}