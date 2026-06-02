import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const getCardinalDirection = (deg) => {
  if (deg === undefined) return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

const getWeatherIcon = (code) => {
  if ([0].includes(code)) return '☀️';
  if ([1, 2, 3].includes(code)) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '✨';
};

const getMoonPhase = () => {
  const lp = 2551443; const age = (((new Date().getTime() - new Date(1970, 0, 7, 20, 35, 0).getTime()) / 1000) % lp) / (24 * 3600);
  if (age < 1.84) return { name: 'New Moon', emoji: '🌑', rating: 'Excellent Daily Activity' };
  if (age < 5.53) return { name: 'Waxing Crescent', emoji: '🌒', rating: 'Average Activity' };
  if (age < 9.22) return { name: 'First Quarter', emoji: '🌓', rating: 'Moderate Activity' };
  if (age < 12.91) return { name: 'Waxing Gibbous', emoji: '🌔', rating: 'Good Peak Activity' };
  if (age < 16.61) return { name: 'Full Moon', emoji: '🌕', rating: 'Maximum Peak Activity' };
  if (age < 20.30) return { name: 'Waning Gibbous', emoji: '🌖', rating: 'Good Peak Activity' };
  if (age < 23.99) return { name: 'Last Quarter', emoji: '🌗', rating: 'Moderate Activity' };
  return { name: 'Waning Crescent', emoji: '🌘', rating: 'Average Activity' };
};

export default function MerimbulaDashboard({ onBack, onNavigate }) {
  const [liveWeather, setLiveWeather] = useState(null);
  const [marineData, setMarineData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [videoConfig, setVideoConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTidePlot, setSelectedTidePlot] = useState({ label: "Next Peak", height: "1.45m", time: "10:34 AM" });
  const [baroTrend, setBaroTrend] = useState({ arrow: '→', status: 'Steady', color: 'text-zinc-400', advice: 'Stable ocean conditions. Reef species feeding predictably.' });
  
// 🎣 Live Datastream States
  const [staffPicks, setStaffPicks] = useState([]);
  const [weeklyProduct, setWeeklyProduct] = useState(null);
  const [picksLoading, setPicksLoading] = useState(true);
  // Add state for the YouTube video asset:
  const [videoData, setVideoData] = useState(null);

  const [currentTimePercent, setCurrentTimePercent] = useState(48);
  const [currentEstHeight, setCurrentEstHeight] = useState("1.3m");
  const [currentEstState, setCurrentEstState] = useState("Falling");

  useEffect(() => {
    const calculateTideTelemetry = () => {
      const now = new Date();
      const minsPassed = (now.getHours() * 60) + now.getMinutes();
      const pct = Math.round((minsPassed / 1440) * 100);
      setCurrentTimePercent(pct);

      if (minsPassed < 252) {
        setCurrentEstHeight("0.6m"); setCurrentEstState("Falling ▼");
      } else if (minsPassed < 634) {
        setCurrentEstHeight("1.1m"); setCurrentEstState("Rising ▲");
      } else if (minsPassed < 1008) {
        setCurrentEstHeight("1.3m"); setCurrentEstState("Falling ▼");
      } else {
        setCurrentEstHeight("1.0m"); setCurrentEstState("Rising ▲");
      }
    };

    calculateTideTelemetry();
    const timer = setInterval(calculateTideTelemetry, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const { data: config } = await supabase.from('store_configs').select('*').eq('store_location', 'Merimbula').single();
        setVideoConfig(config);

      // 🏪 Fetch active coastal inventory parameters from Supabase
        try {
          const [picksRes, weeklyRes, videoRes] = await Promise.all([
            supabase.from('staff_picks').select('*').eq('store_location', 'Merimbula'),
            supabase.from('product_of_the_week').select('*').eq('store_location', 'Merimbula').maybeSingle(),
            supabase.from('store_videos').select('*').eq('store_location', 'Merimbula').maybeSingle()
          ]);
          


          setStaffPicks(picksRes.data || []);
          setWeeklyProduct(weeklyRes.data || null);
          setVideoData(videoRes.data || null);
        } catch (dataErr) {
          console.error("Error retrieving coastal selections stream:", dataErr);
        } finally {
          setPicksLoading(false);
        }

        const CACHE_KEY = 'merimbula_marine_weather_cache_v5';
        const CACHE_TIME_KEY = 'merimbula_marine_weather_cache_time_v5';
        const now = Date.now();

        let freshWeather = null;
        let freshMarine = null;
        let freshForecast = [];

        if (localStorage.getItem(CACHE_KEY) && localStorage.getItem(CACHE_TIME_KEY) && (now - parseInt(localStorage.getItem(CACHE_TIME_KEY), 10) < 30 * 60 * 1000)) {
          const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
          freshWeather = parsed.weather;
          freshMarine = parsed.marine;
          freshForecast = parsed.forecast || [];
          
          setLiveWeather(freshWeather);
          setMarineData(freshMarine);
          setForecastData(freshForecast);
        } else {
          const weatherResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-36.8874&longitude=149.9073&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_sum&timezone=Australia%2FSydney');
          const weatherData = await weatherResponse.json();

          const marineResponse = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-36.8874&longitude=149.9073&current=wave_height,wave_direction');
          const marineApiData = await marineResponse.json();
          
          const currentBaro = Math.round(weatherData.current.pressure_msl);
          const previousBaro = localStorage.getItem('merimbula_last_barometer_reading');

          freshWeather = {
            temp: `${weatherResponse.ok ? weatherData.current.temperature_2m : '21.4'}°C`,
            wind: `${weatherResponse.ok ? weatherData.current.wind_speed_10m : '14'} km/h ${getCardinalDirection(weatherData?.current?.wind_direction_10m)}`,
            barometer: currentBaro,
            prevBarometer: previousBaro ? parseInt(previousBaro, 10) : currentBaro,
            moon: getMoonPhase()
          };

          freshMarine = {
            swellHeight: `${marineResponse.ok ? marineApiData.current.wave_height.toFixed(1) : '1.2'}m`,
            swellDir: getCardinalDirection(marineApiData?.current?.wave_direction || 135),
            tides: [
              { type: 'Low Tide', time: '04:12 AM', height: '0.22m', x: 17, heightVal: 0.22 },
              { type: 'High Tide', time: '10:34 AM', height: '1.45m', x: 44, heightVal: 1.45 },
              { type: 'Low Tide', time: '04:48 PM', height: '0.31m', x: 70, heightVal: 0.31 },
              { type: 'High Tide', time: '11:15 PM', height: '1.62m', x: 94, heightVal: 1.62 }
            ]
          };

          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          for (let i = 0; i < 3; i++) {
            const dateObj = new Date(weatherData.daily.time[i]);
            freshForecast.push({
              dayName: i === 0 ? 'Today' : daysOfWeek[dateObj.getDay()],
              icon: getWeatherIcon(weatherData.daily.weather_code[i]),
              maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
              minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
              maxWind: Math.round(weatherData.daily.wind_speed_10m_max[i]),
              windDir: getCardinalDirection(weatherData.daily.wind_direction_10m_dominant[i]),
              windDir: getCardinalDirection(weatherData.daily.wind_direction_10m_dominant[i]),
        rain: weatherData.daily.precipitation_sum[i]
            });
          }

          localStorage.setItem(CACHE_KEY, JSON.stringify({ weather: freshWeather, marine: freshMarine, forecast: freshForecast }));
          localStorage.setItem('merimbula_marine_weather_cache_time_v5', now.toString());
          localStorage.setItem('merimbula_last_barometer_reading', currentBaro.toString());
          
          setLiveWeather(freshWeather);
          setMarineData(freshMarine);
          setForecastData(freshForecast);
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-10 relative overflow-hidden">
      <div className="fixed inset-0 bg-cover bg-center opacity-25 scale-105" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1080&auto=format&fit=crop')` }}></div>
      <div className="relative z-10">
        
        {/* HEADER CONTROL BAR */}
        <div className="bg-black/60 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
          <h1 className="text-xl font-black text-white">MERIM<span className="text-[#00aeef]">BULA</span></h1>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-wider bg-white/10 px-3 py-1.5 rounded border border-white/20">Switch Store</button>
        </div>

        <div className="px-4 mt-5 max-w-md mx-auto space-y-5">
          
          {/* BAROMETRIC TRACKER */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Marine Barometer Station</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wide bg-zinc-950 border border-zinc-850 ${baroTrend.color}`}>
                {baroTrend.arrow} {baroTrend.status}
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-white tracking-tight">{liveWeather?.barometer || '---'}</span>
              <span className="text-sm text-zinc-400 font-bold">hPa</span>
            </div>
          </div>

          {/* BRAG BOARD ACTION LINKS */}
          <div className="space-y-2">
            <button onClick={() => onNavigate('bragboard')} className="w-full bg-gradient-to-r from-zinc-900 to-zinc-850 border border-[#00aeef]/30 text-[#00aeef] font-black p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="text-left">
                <span className="block text-white text-lg tracking-wide">COMMUNITY BRAG BOARD</span>
                <span className="text-[11px] text-zinc-400 font-normal block mt-0.5">See what's getting caught locally</span>
              </div>
              <span className="text-2xl">📸</span>
            </button>
            <button onClick={() => onNavigate('gallery')} className="w-full bg-zinc-900/60 border border-white/10 text-white font-bold p-4 rounded-xl flex items-center justify-between text-sm">
              <span>🏆 Photo of the Month Vote</span><span>→</span>
            </button>
          </div>

{/* 📺 WEEKLY FISHING REPORT YOUTUBE EMBED */}
          {videoData?.youtube_url && (
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-800 space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h2 className="font-black text-sm text-white flex items-center gap-2">
                  <span className="text-[#00aeef]">📺</span> WEEKLY FISHING REPORT
                </h2>
                <span className="text-[8px] bg-red-950/60 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-red-900/30 animate-pulse">
                  Latest Briefing
                </span>
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-inner">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoData.youtube_url}?rel=0&modestbranding=1`}
                  title="Boss Outdoor Merimbula Weekly Fishing Report"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* ⭐ DYNAMIC PRODUCT OF THE WEEK CARD */}
          {!picksLoading && weeklyProduct && (
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-xl p-5 shadow-lg border border-[#00aeef]/40 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#00aeef]/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h2 className="font-black text-base text-white flex items-center gap-2">
                  <span className="text-[#00aeef]">⭐</span> MERIMBULA'S TOP PICK
                </h2>
                <span className="text-[8px] bg-[#00aeef]/10 text-[#00aeef] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-[#00aeef]/20">
                  Weekly Feature
                </span>
              </div>
              <a 
                href={weeklyProduct.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 items-center"
              >
                <div className="w-20 h-20 bg-black rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <img src={weeklyProduct.image_url} alt={weeklyProduct.product_name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                </div>
                <div className="flex-grow space-y-0.5 text-xs min-w-0">
                  <h4 className="font-black text-sm text-white uppercase tracking-wide truncate group-hover:text-[#00aeef] transition-colors">
                    {weeklyProduct.product_name}
                  </h4>
                  <p className="text-zinc-400 italic text-[11px] leading-relaxed line-clamp-2">
                    "{weeklyProduct.blurb}"
                  </p>
                  <span className="inline-block text-[9px] font-bold text-[#00aeef] uppercase tracking-wider pt-1">
                    View Item &rarr;
                  </span>
                </div>
              </a>
            </div>
          )}

          {/* DYNAMIC LOCAL STAFF SELECTIONS ROW */}
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/10 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="font-black text-lg text-white flex items-center gap-2">
                <span className="text-[#00aeef]">🔥</span> STAFF SELECTIONS
              </h2>
            </div>

            {picksLoading ? (
              <div className="text-center py-4 text-zinc-500 text-xs italic">Syncing with active inventory...</div>
            ) : staffPicks.length === 0 ? (
              <div className="text-center py-4 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded-xl">
                No active staff picks logged for this store cycle.
              </div>
            ) : (
              <div className="space-y-3">
                {staffPicks.map((pick) => (
                  <a 
                    key={pick.id} 
                    href={pick.product_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group bg-zinc-900/40 border border-white/5 p-3 rounded-xl flex gap-4 items-center hover:border-[#00aeef]/30 transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                      <img src={pick.image_url} alt={pick.product_name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                      <div className="absolute top-0.5 left-0.5 bg-[#00aeef] text-black font-black text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                        {pick.staff_name}
                      </div>
                    </div>
                    <div className="flex-grow space-y-0.5 text-xs min-w-0">
                      <h4 className="font-black text-white uppercase tracking-wide truncate group-hover:text-[#00aeef] transition-colors">
                        {pick.product_name}
                      </h4>
                      <p className="text-zinc-400 italic text-[11px] line-clamp-2 leading-relaxed">
                        "{pick.blurb}"
                      </p>
                      <span className="inline-block text-[9px] font-bold text-[#00aeef] uppercase tracking-wider pt-0.5">
                        View Item &rarr;
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* CONDITIONS AND OUTLOOK FRAMES */}
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/10 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="font-black text-lg text-white flex items-center gap-2"><span className="text-[#00aeef]">🌊</span> MARINE CONDITIONS</h2>
            </div>

            {isLoading ? <div className="text-center py-12 text-zinc-500">Polling data nodes...</div> : (
              <div className="space-y-5">
                
                {/* Weather Data Matrix */}
                <div className="bg-black/50 p-4 rounded-lg border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold text-[#00aeef] uppercase tracking-widest border-b border-white/5 pb-1.5">Station: Merimbula Jetty</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Air Temp</span><span className="font-black text-base text-white">{liveWeather?.temp}</span></div>
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Wind Velocity</span><span className="font-black text-base text-white">{liveWeather?.wind}</span></div>
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Ocean Swell</span><span className="font-black text-base text-white text-[#00aeef]">{marineData?.swellHeight} <span className="text-xs text-zinc-400 font-normal">{marineData?.swellDir}</span></span></div>
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Barometer</span><span className="font-black text-base text-white">{liveWeather?.barometer} hPa</span></div>
                    
                    <div onClick={() => onNavigate('merimbula_solunar')} className="col-span-2 border-t border-white/5 pt-2.5 mt-1 cursor-pointer hover:bg-white/5 rounded transition-colors">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Solunar Feeding Index</span>
                      <span className="font-black text-sm text-amber-400 flex items-center gap-1.5 mt-0.5">
                        <span>{liveWeather?.moon?.emoji}</span> {liveWeather?.moon?.rating} <span className="text-zinc-600 text-xs font-normal">→</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-DAY WEATHER OUTLOOK */}
                <div className="border-t border-white/5 pt-2">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2.5">3-Day Tactical Outlook</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {forecastData.map((day, idx) => (
                      <div key={idx} className="bg-zinc-900/50 p-2.5 rounded-lg border border-white/5 text-center flex flex-col justify-between space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide">{day.dayName}</span>
                        <span className="text-xl my-1">{day.icon}</span>
                        <div>
                          <span className="text-xs font-black text-white">{day.maxTemp}°</span>
                          <span className="text-[10px] text-zinc-500 ml-1">{day.minTemp}°</span>
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 border-t border-white/5 pt-1 mt-1 leading-tight">
  <div>💨 {day.maxWind}k <span className="text-[#00aeef]">{day.windDir}</span></div>
  <div className="text-blue-400 mt-0.5">💧 {day.rain}mm</div>
</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SCANNABLE STEPPED TIMELINE FORMAT */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Timeline Forecast</h3>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wide">Tide Information: Merimbula Jetty (Station: 54660) | BOM Models</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-[#00aeef] block leading-none">{currentEstHeight}</span>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mt-0.5 inline-block">{currentEstState}</span>
                    </div>
                  </div>

                  {/* Horizontal Segment Track Frame */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative space-y-4">
                    <div className="grid grid-cols-4 gap-1.5 relative pt-4">
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: `${currentTimePercent}%` }} />
                      {marineData?.tides.map((tide, idx) => {
                        const heightOpacity = Math.max(15, Math.min(85, Math.round((tide.heightVal / 1.7) * 100)));
                        return (
                          <div key={idx} onClick={() => setSelectedTidePlot({ label: tide.type, height: tide.height, time: tide.time })} className="border border-white/5 rounded-lg p-2 text-center relative overflow-hidden cursor-pointer transition-all hover:border-[#00aeef]/40 active:scale-95" >
                            <div className="absolute bottom-0 left-0 right-0 bg-[#00aeef]/10 pointer-events-none" style={{ height: `${heightOpacity}%` }} />
                            <div className="relative z-10 space-y-1">
                              <span className="text-[8px] font-black uppercase text-zinc-500 block tracking-wider">{tide.time}</span>
                              <span className="text-xs font-black text-white block">{tide.height}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded inline-block ${tide.type === 'High Tide' ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-900 text-zinc-400'}`}>
                                {tide.type === 'High Tide' ? 'HIGH ▲' : 'LOW ▼'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[8px] font-black text-zinc-600 border-t border-zinc-900 pt-1.5 uppercase tracking-widest">
                      <span>Morning (00:00)</span>
                      <span>Midday (12:00)</span>
                      <span>Midnight (24:00)</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-white/5 p-2 rounded-lg text-center text-[10px]">
                    <span className="text-zinc-500 font-bold uppercase mr-1">Inspecting Window:</span>
                    <span className="text-white font-black">{selectedTidePlot.label}</span> at <span className="text-[#00aeef]/90 font-black">{selectedTidePlot.height}</span> <span className="text-zinc-400">({selectedTidePlot.time})</span>
                  </div>
                </div>

                {/* Tide Log Extremes Panel Grid */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">📅 Tide Extremes Logs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {marineData?.tides.map((tide, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${tide.type === 'High Tide' ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/40' : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-900/90'}`}
                        onClick={() => setSelectedTidePlot({ label: tide.type, height: tide.height, time: tide.time })}
                      >
                        <span className="text-[9px] uppercase font-black text-zinc-500">{tide.type}</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-sm font-black text-white">{tide.time}</span>
                          <span className="text-[10px] font-bold opacity-80">{tide.height}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Offshore Bluewater Streamer */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-950 border border-blue-900/30 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>⚓</span> Offshore Bluewater Streamer
              </h3>
              <span className="text-[9px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-blue-900/50">
                100f Shelf Drop Node
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-zinc-500 block text-[9px] uppercase font-bold leading-none mb-1">Sea Surface Temp (SST)</span>
                <span className="font-black text-base text-white">21.8°C <span className="text-[10px] text-emerald-400 font-bold">↗ Stable</span></span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-zinc-500 block text-[9px] uppercase font-bold leading-none mb-1">EAC Current Flow</span>
                <span className="font-black text-base text-white">1.8 kts <span className="text-[10px] text-blue-400 font-medium">S-Push</span></span>
              </div>
            </div>

            <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase font-black tracking-wider border-b border-zinc-900 pb-1">
                <span>📍 Oceanographic Bite Analysis</span>
                <span className="text-blue-400 font-bold">Thermal Breaks</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed pt-0.5">
                The East Australian Current (EAC) velocity of 1.8 knots is generating stable, well-defined eddy edges over the inner canyons. When SST scales above 21.5°C over these structured contours, it traps bait fish along the sharp temperature breaks, forming major highway routes for tracking marlin and yellowfin tuna.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}