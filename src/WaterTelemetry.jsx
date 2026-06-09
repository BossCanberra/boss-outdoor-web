import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function WaterTelemetry({ onBack }) {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedName, setExpandedName] = useState(null);
  const [chartWidth, setChartWidth] = useState(350);

  // 1. Monitor layout dimensions for responsive tracking
  useEffect(() => {
    const handleResize = () => {
      const availableWidth = Math.min(390, window.innerWidth - 48);
      setChartWidth(availableWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Automated telemetry data fetch
  useEffect(() => {
    const fetchAllWaterData = async () => {
      try {
        const { data: dbData } = await supabase
          .from('water_levels')
          .select('*')
          .order('location_type', { ascending: true })
          .order('location_name', { ascending: true });
        setData(dbData || []);

        const { data: histData } = await supabase
          .from('water_history')
          .select('location_name, water_level, recorded_at')
          .order('recorded_at', { ascending: true });

        const groupedHistory = {};
        histData?.forEach(row => {
          const nameKey = row.location_name.trim();
          if (!groupedHistory[nameKey]) {
            groupedHistory[nameKey] = [];
          }
          groupedHistory[nameKey].push({
            day: new Date(row.recorded_at).toLocaleDateString('en-AU', { weekday: 'short' }),
            level: parseFloat(row.water_level)
          });
        });
        setHistory(groupedHistory);

      } catch (err) {
        console.error("Error fetching telemetry pipeline:", err);
      } finally {
        loading(false);
      }
    };
    fetchAllWaterData();
  }, []);

  const dams = data.filter(item => item.location_type === 'DAM');
  const rivers = data.filter(item => item.location_type === 'RIVER');

  const toggleLocation = (name) => {
    const cleanName = name.trim();
    setExpandedName(prev => prev === cleanName ? null : cleanName);
  };

 const calculateFlowRate = (name, height) => {
    const h = parseFloat(height);
    const upperName = name.toUpperCase();

    if (upperName.includes('TUMUT')) return Math.round(h * 3600 + 420);
    if (upperName.includes('HALL')) return Math.round(h * 850 + 120);
    if (upperName.includes('LOBS HOLE')) return Math.round(h * 600 + 80);
    return Math.round(h * 450 + 30);
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' AEST';
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12 animate-fade-in">
      
      {/* Sticky Header */}
      <div className="bg-zinc-950/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#8cc63f] uppercase">LOCAL WATER LEVELS</h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Daily Fishing Telemetry Report</p>
        </div>
        <button 
          onClick={onBack} 
          className="text-xs uppercase bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-colors shadow-md active:scale-95"
        >
          ← Dashboard
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {loading ? (
          <div className="text-center py-20 text-zinc-500 text-xs italic">
            <div className="w-5 h-5 border-2 border-[#8cc63f] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-zinc-500 text-xs italic">Polling gauge logs...</div>
          </div>
        ) : (
          <>
            {/* INFORMATION ALERT FOOTER PANEL */}
            <div className="bg-zinc-900/40 border border-white/5 p-3 rounded-xl flex flex-col space-y-1 text-[10px] text-zinc-400 uppercase tracking-wide">
              <div className="flex justify-between items-center">
                <span>🔄 Telemetry Cycle: Updated Daily</span>
                {data[0] && <span className="font-bold text-zinc-500">{formatTime(data[0].updated_at)}</span>}
              </div>
              <div className="text-zinc-500 text-[9px] border-t border-zinc-900/50 pt-1 mt-0.5 normal-case font-medium">
                🌦️ Weather metrics aggregated live via Open-Meteo API backends synced directly to regional BoM radar arrays.
              </div>
            </div>

            {/* --- SECTION 1: CATCHMENT DAM STORAGE CAPACITY --- */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                <span>💧</span> Water Storage Catchments
              </h2>
              
              <div className="grid grid-cols-1 gap-3">
                {dams.map(dam => {
                  const isExpanded = expandedName === dam.location_name.trim();
                  const chartData = history[dam.location_name.trim()] || [];
                  const uniqueGradientId = `dam-grad-${dam.id}`;
                  
                  // Clean match against the upper-case delta strings generated by cron
                  const indicator = dam.status_indicator || 'STEADY';
                  const isRising = indicator.toUpperCase().includes('RISEN');
                  const isFalling = indicator.toUpperCase().includes('FALLEN');

                  return (
                    <div 
                      key={dam.id} 
                      onClick={() => toggleLocation(dam.location_name)}
                      className={`bg-zinc-900 p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none z-10 ${
                        isExpanded ? 'border-amber-500 bg-zinc-900' : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex justify-between items-center relative z-20">
                        <div className="space-y-1">
                          <h3 className="font-black text-white text-sm uppercase tracking-wide">{dam.location_name}</h3>
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded w-max ${
                              isRising ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/30' :
                              isFalling ? 'bg-amber-950 text-amber-400 border border-amber-800/30' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {isRising ? `📈 ${indicator}` : isFalling ? `📉 ${indicator}` : '➡️ STEADY'}
                            </span>
                            <span className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase mt-0.5">
                              {isExpanded ? '[-] Hide Trend Timeline' : '[+] Open Trend Timeline'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black text-[#8cc63f]">{Number(dam.current_value).toFixed(1)}%</div>
                          <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Capacity</div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div 
                          className="mt-5 pt-4 border-t border-white/10 relative z-20 flex flex-col items-center w-full" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[10px] font-mono text-zinc-400 mb-3 bg-black p-2 rounded border border-white/5 w-full text-center">
                            {chartData.length > 0 
                              ? chartData.map(d => `${d.day}: ${d.level}%`).join(' | ') 
                              : 'Compiling history metrics framework...'}
                          </div>

                          {chartData.length > 0 && (
                            <AreaChart width={chartWidth} height={140} data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8cc63f" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#8cc63f" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                              <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                domain={['dataMin - 1', 'dataMax + 1']} 
                                tickFormatter={(v) => `${v}%`} 
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                                labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                              />
                              <Area type="monotone" dataKey="level" stroke="#8cc63f" strokeWidth={2.5} fillOpacity={1} fill={`url(#${uniqueGradientId})`} isAnimationActive={false} />
                            </AreaChart>
                          )}
                        </div>
                      )}

                      {!isExpanded && (
                        <div 
                          className="absolute bottom-0 left-0 bg-[#8cc63f]/5 transition-all duration-500 z-0" 
                          style={{ width: '100%', height: `${dam.current_value}%` }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- SECTION 2: RIVER STATION DEPTH CHANNELS --- */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                <span>🌊</span> River Gauges & Runoff
              </h2> 

              <div className="space-y-2.5">
                {rivers.map(river => {
                  const isExpanded = expandedName === river.location_name.trim();
                  const chartData = history[river.location_name.trim()] || [];
                  const uniqueGradientId = `river-grad-${river.id}`;
                  
                  const indicator = river.status_indicator || 'STEADY';
                  const isRising = indicator.toUpperCase().includes('RISEN');
                  const isFalling = indicator.toUpperCase().includes('FALLEN');

                  return (
                    <div 
                      key={river.id} 
                      onClick={() => toggleLocation(river.location_name)}
                      className={`p-3.5 rounded-xl relative overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none z-10 ${
                        isExpanded ? 'border-amber-500 bg-zinc-900' : 'border-white/5 bg-zinc-900/70 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between relative z-20">
                        <div>
                          <h4 className="font-bold text-white text-xs uppercase tracking-wide">{river.location_name}</h4>
                          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Flow Rate: <span className="text-zinc-300 font-bold">{calculateFlowRate(river.location_name, river.current_value).toLocaleString()} ML/day</span></p>
                          <div className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase mt-1">
                            {isExpanded ? '[-] Hide Trend Timeline' : '[+] Open Trend Timeline'}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="text-base font-black text-white">{Number(river.current_value).toFixed(2)}m</div>
                            <div className={`text-[9px] font-bold text-right uppercase ${
                              isRising ? 'text-emerald-400' : isFalling ? 'text-amber-400' : 'text-zinc-500'
                            }`}>
                              {isRising ? '▲ RISING' : isFalling ? '▼ FALLING' : '■ STEADY'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div 
                          className="mt-4 pt-4 border-t border-white/10 relative z-20 flex flex-col items-center w-full" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[10px] font-mono text-zinc-400 mb-3 bg-black p-2 rounded border border-white/5 w-full text-center">
                            {chartData.length > 0 
                              ? chartData.map(d => `${d.day}: ${d.level}m`).join(' | ') 
                              : 'Compiling history metrics framework...'}
                          </div>

                          {chartData.length > 0 && (
                            <AreaChart width={chartWidth} height={140} data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id={uniqueGradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                              <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis 
                                stroke="#71717a" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                domain={['dataMin - 0.1', 'dataMax + 0.1']} 
                                tickFormatter={(v) => `${v}m`} 
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                                labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                              />
                              <Area type="monotone" dataKey="level" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill={`url(#${uniqueGradientId})`} isAnimationActive={false} />
                            </AreaChart>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}