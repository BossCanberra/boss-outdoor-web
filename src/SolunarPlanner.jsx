import React, { useState } from 'react';

// Compass helper to turn degrees to text direction
const getWindDirectionText = (deg) => {
  if (deg === undefined) return 'Calm';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
};

// Pure math astronomical cycle solver to calculate moon metrics for any given date offset
const calculateSolunarForDate = (dateOffset) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);
  
  const lp = 2551443; 
  const newMoon = new Date(1970, 0, 7, 20, 35, 0);
  const phase = ((targetDate.getTime() - newMoon.getTime()) / 1000) % lp;
  const age = phase / (24 * 3600);
  
  let name = 'New Moon';
  let emoji = '🌑';
  let score = 95; // Out of 100
  let rating = '🏆 Peak Activity';

  if (age < 1.84) { name = 'New Moon'; emoji = '🌑'; score = 95; rating = '🏆 Peak Activity'; }
  else if (age < 5.53) { name = 'Waxing Crescent'; emoji = '🌒'; score = 55; rating = 'Average Bite'; }
  else if (age < 9.22) { name = 'First Quarter'; emoji = '🌓'; score = 70; rating = 'Moderate Bite'; }
  else if (age < 12.91) { name = 'Waxing Gibbous'; emoji = '🌔'; score = 85; rating = 'Good Action'; }
  else if (age < 16.61) { name = 'Full Moon'; emoji = '🌕'; score = 100; rating = '💥 Maximum Peak'; }
  else if (age < 20.30) { name = 'Waning Gibbous'; emoji = '🌖'; score = 80; rating = 'Good Action'; }
  else if (age < 23.99) { name = 'Last Quarter'; emoji = '🌗'; score = 65; rating = 'Moderate Bite'; }
  else if (age < 27.68) { name = 'Waning Crescent'; emoji = '🌘'; score = 45; rating = 'Slow / Testing'; }

  // Dynamic baseline timing shifts based on rotation physics offsets per calendar day
  const dailyOffsetMinutes = (dateOffset * 48) % 60;
  const hourShift = Math.floor((dateOffset * 48) / 60);

  const formatTimeString = (baseHour, baseMin) => {
    let h = (baseHour + hourShift) % 12;
    if (h === 0) h = 12;
    let m = (baseMin + dailyOffsetMinutes) % 60;
    const ampm = (baseHour + hourShift) % 24 >= 12 ? 'PM' : 'AM';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return {
    dateLabel: targetDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' }),
    fullDate: targetDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    moon: { name, emoji, score, rating },
    windows: {
      major1: `${formatTimeString(5, 30)} - ${formatTimeString(7, 30)}`,
      major2: `${formatTimeString(17, 50)} - ${formatTimeString(19, 50)}`,
      minor1: `${formatTimeString(11, 15)} - ${formatTimeString(12, 15)}`,
      minor2: `${formatTimeString(23, 40)} - ${formatTimeString(0, 40)}`
    }
  };
};

export default function SolunarPlanner({ storeLocation, onBack }) {
  const [selectedDay, setSelectedDay] = useState(0);

  // Generate the upcoming 7 days of raw predictive data strings
  const forecastDays = Array.from({ length: 7 }, (_, i) => calculateSolunarForDate(i));
  const activeForecast = forecastDays[selectedDay];

  // Specific store strategies to make the text feel bespoke for your counters
  const isCanberra = storeLocation === 'Canberra';

  return (
    <div className="min-h-screen bg-black text-white pb-12 animate-fade-in">
      {/* Dynamic Header */}
      <div className="bg-zinc-950/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#8cc63f] uppercase">SOLUNAR PEAK PLANNER</h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{storeLocation} Bite Windows</p>
        </div>
        <button onClick={onBack} className="text-xs uppercase bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-colors">
          ← Back
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-5">
        
        {/* --- HORIZONTAL 7-DAY CALENDAR TRACK COMPONENT --- */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block">Select Forecast Day</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            {forecastDays.map((day, index) => {
              const isSelected = selectedDay === index;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border shrink-0 w-20 transition-all snap-center ${
                    isSelected 
                      ? 'bg-[#8cc63f] text-black border-[#8cc63f] font-black shadow-lg scale-105' 
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-tight block opacity-70">{day.dateLabel.split(' ')[0]}</span>
                  <span className="text-base font-black block mt-0.5">{day.dateLabel.split(' ')[1]}</span>
                  <span className="text-xs mt-1 block">{day.moon.emoji}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- MASTER FORECAST METRIC DISPLAY BOARD --- */}
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex justify-between items-start border-b border-white/5 pb-3">
            <div>
              <span className="text-[9px] text-[#8cc63f] uppercase font-black tracking-widest block">Selected Window</span>
              <h2 className="text-base font-black text-white">{activeForecast.fullDate}</h2>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Solunar Rating</span>
              <span className="text-xs text-[#8cc63f] font-black uppercase tracking-wide bg-[#8cc63f]/10 border border-[#8cc63f]/20 px-2 py-0.5 rounded block mt-0.5">
                {activeForecast.moon.rating}
              </span>
            </div>
          </div>

          {/* Solunar Window Breakdown Blocks */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">⏱️ Feeding Efficiency Windows</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl relative overflow-hidden">
                <span className="text-[9px] text-[#8cc63f] uppercase font-black tracking-wider block">🔥 Major Window 1</span>
                <span className="text-sm font-black text-white block mt-1">{activeForecast.windows.major1}</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Optimal Moon Overhead Crossing</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl relative overflow-hidden">
                <span className="text-[9px] text-[#8cc63f] uppercase font-black tracking-wider block">🔥 Major Window 2</span>
                <span className="text-sm font-black text-white block mt-1">{activeForecast.windows.major2}</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Optimal Underfoot Transition</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">🌙 Minor Window 1</span>
                <span className="text-xs font-bold text-zinc-300 block mt-1">{activeForecast.windows.minor1}</span>
                <span className="text-[9px] text-zinc-600 block mt-0.5">Moonrise Horizonal Intersect</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-3 rounded-xl">
                <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider block">🌙 Minor Window 2</span>
                <span className="text-xs font-bold text-zinc-300 block mt-1">{activeForecast.windows.minor2}</span>
                <span className="text-[9px] text-zinc-600 block mt-0.5">Moonset Horizon Intersect</span>
              </div>
            </div>
          </div>

          {/* Bespoke Local Tactical Strategy Card */}
          <div className="bg-black/30 border border-white/5 p-4 rounded-xl space-y-1.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span> Store Tactical Strategy
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isCanberra 
                ? `Freshwater targets like Murray cod and golden perch are highly sensitive to these barometric alignments. Plan your fly casting or hardbody presentations to overlap directly with Major Windows, focusing heavily on structured drop-offs as daylight fades.`
                : `For Sapphire Coast marine conditions, match these high-efficiency major feeding windows with incoming tidal crossings around the lake mouths. Flathead, bream, and estuary predators will strike aggressively on soft plastics during these specific periods.`
              }
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}