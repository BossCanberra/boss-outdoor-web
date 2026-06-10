import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LocalWaterHydrometrics from './LocalWaterHydrometrics';

const getWindDirection = (deg) => {
  if (deg === undefined) return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

const getWeatherIcon = (code) => {
  if ([0].includes(code)) return '☀️';
  if ([1, 2, 3].includes(code)) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 85, 86].includes(code)) return '❄️';
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

export default function CanberraDashboard({ onBack, onNavigate }) {
  const [waterData, setWaterData] = useState([]);
  const [liveWeather, setLiveWeather] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [videoConfig, setVideoConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [baroTrend, setBaroTrend] = useState({ arrow: '→', status: 'Steady', color: 'text-zinc-400', advice: 'Steady glass. Focus on standard native structures.' });
  
  // 🎣 Live Datastream States
  const [staffPicks, setStaffPicks] = useState([]);
  const [weeklyProduct, setWeeklyProduct] = useState(null);
  const [picksLoading, setPicksLoading] = useState(true);
  const [videoReportId, setVideoReportId] = useState(null);
  const [latestNews, setLatestNews] = useState(null);

  const canberraBgUrl = "https://images.unsplash.com/photo-1444090542259-0af8fa96557e?auto=format&fit=crop&w=1200&q=80";

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const { data: config } = await supabase.from('store_configs').select('*').eq('store_location', 'Canberra').single();
        setVideoConfig(config);

        // 🏪 Fetch dynamic inventory selections from Supabase streams
        try {
          const [picksRes, weeklyRes, videoRes, newsRes] = await Promise.all([
            supabase.from('staff_picks').select('*').eq('store_location', 'Canberra'),
            supabase.from('product_of_the_week').select('*').eq('store_location', 'Canberra').maybeSingle(),
            supabase.from('store_videos').select('youtube_url').eq('store_location', 'Canberra').maybeSingle(),
            supabase.from('store_news').select('*').eq('store_location', 'Canberra').maybeSingle()
          ]);
          setStaffPicks(picksRes.data || []);
          setWeeklyProduct(weeklyRes.data || null);
          if (videoRes.data?.youtube_url) setVideoReportId(videoRes.data.youtube_url);
          setLatestNews(newsRes.data || null);
        } catch (dataErr) {
          console.error("Error retrieving store selections stream:", dataErr);
        } finally {
          setPicksLoading(false);
        }

        const { data: dbWater } = await supabase
          .from('water_levels')
          .select('*')
          .order('location_type', { ascending: true })
          .order('location_name', { ascending: true });
        setWaterData(dbWater || []);

        const CACHE_KEY = 'canberra_weather_cache_v6';
        const CACHE_TIME_KEY = 'canberra_weather_cache_time_v6';
        const LAST_BARO_KEY = 'canberra_last_barometer_reading';
        
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        let weatherObj = null;

        if (cachedData && cachedTime && (now - cachedTime < 30 * 60 * 1000)) {
          const parsing = JSON.parse(cachedData);
          weatherObj = parsing.live;
          setLiveWeather(weatherObj);
          setForecastData(parsing.forecast || []);
        } else {
          const weatherResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-35.2835&longitude=149.1281&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_sum&timezone=Australia%2FSydney');
          const weatherData = await weatherResponse.json(); 
          
          const currentBaro = Math.round(weatherData.current.pressure_msl);
          const previousBaro = localStorage.getItem(LAST_BARO_KEY);

          weatherObj = {
            temp: weatherData.current.temperature_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            windDir: getWindDirection(weatherData.current.wind_direction_10m),
            barometer: currentBaro,
            prevBarometer: previousBaro ? parseInt(previousBaro, 10) : currentBaro,
            moon: getMoonPhase()
          };

          const forecastArray = [];
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          for (let i = 0; i < 3; i++) {
            const dateObj = new Date(weatherData.daily.time[i]);
            forecastArray.push({
              dayName: i === 0 ? 'Today' : daysOfWeek[dateObj.getDay()],
              icon: getWeatherIcon(weatherData.daily.weather_code[i]),
              rain: weatherData.daily.precipitation_sum[i],
              maxTemp: Math.round(weatherData.daily.temperature_2m_max[i]),
              minTemp: Math.round(weatherData.daily.temperature_2m_min[i]),
              maxWind: Math.round(weatherData.daily.wind_speed_10m_max[i]),
              windDir: getWindDirection(weatherData.daily.wind_direction_10m_dominant[i])
            });
          }

          localStorage.setItem(CACHE_KEY, JSON.stringify({ live: weatherObj, forecast: forecastArray }));
          localStorage.setItem(CACHE_TIME_KEY, now.toString());
          localStorage.setItem(LAST_BARO_KEY, currentBaro.toString());
          
          setLiveWeather(weatherObj);
          setForecastData(forecastArray);
        }

        if (weatherObj) {
          const current = weatherObj.barometer;
          const prev = weatherObj.prevBarometer;
          
          if (current > prev) {
            setBaroTrend({
              arrow: '↗',
              status: 'Rising Pressure',
              color: 'text-emerald-400',
              advice: 'The Goldens are waking up on the rocks and clay edges. Cod are up and hunting too—it\'s a cracking window for slow-rolling surface paddlers and swimbaits over shallow structures.'
            });
          } else if (current < prev) {
            setBaroTrend({
              arrow: '↘',
              status: 'Falling Pressure',
              color: 'text-rose-400',
              advice: 'Barometer is dropping ahead of a front! The native bite is about to explode. Get your big spinnerbaits, chatterbaits, or massive surface lures right into the gnarliest timber snags before the weather arrives.'
            });
          } else {
            if (current >= 1014) {
              setBaroTrend({
                arrow: '→',
                status: 'Steady High',
                color: 'text-amber-400',
                advice: 'Bluebird skies and flat glass. Fish will be light-sensitive and sitting a bit deeper on the river drops and channel edges. Best bet is trolling deep hardbodies or casting vibes tight to deep timber.'
              });
            } else {
              setBaroTrend({
                arrow: '→',
                status: 'Steady Low',
                color: 'text-zinc-400',
                advice: 'Persistent low system means tough, shut-down fish. Downsize your plastics or hardbodies, slap on some scent, and crawl your retrieve to get a reaction out of natives hugging the deep logs.'
              });
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error logging telemetry components:", error);
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const dams = [];
  let googongMatched = false;
  waterData.forEach(item => {
    if (item.location_type === 'DAM') {
      const name = item.location_name.toUpperCase();
      if (name.includes('CORIN') || name.includes('COTTER')) return;
      if (name.includes('GOOGONG')) {
        if (googongMatched) return;
        googongMatched = true;
        dams.push({ ...item, location_name: 'Googong Dam' });
        return;
      }
      dams.push(item);
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-10 relative overflow-hidden">
      <div className="fixed inset-0 bg-cover bg-center opacity-25 scale-105" style={{ backgroundImage: `url(${canberraBgUrl})` }}></div>
      <div className="relative z-10">
        <div className="bg-black/60 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
          <h1 className="text-xl font-black text-white">CAN<span className="text-[#8cc63f]">BERRA</span></h1>
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-wider bg-white/10 px-3 py-1.5 rounded border border-white/20">Switch Store</button>
        </div>

        <div className="px-4 mt-5 max-w-md mx-auto space-y-5">
          {/* 📢 LATEST NEWS FEATURE BANNER */}
          {latestNews && (
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col group">
              <div className="h-40 w-full relative bg-zinc-950 overflow-hidden shrink-0">
                <img 
                  src={latestNews.image_url} 
                  alt={latestNews.headline} 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-out cursor-pointer"
                  onClick={() => onNavigate('blog-article', { location: 'Canberra' })}
                />
                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-[8px] px-2 py-0.5 rounded-full text-[#8cc63f] font-black uppercase tracking-wider border border-white/5">
                  Latest News
                </span>
              </div>
              <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                <div className="space-y-1 cursor-pointer" onClick={() => onNavigate('blog-article', { location: 'Canberra' })}>
                  <h3 className="font-black text-base text-white uppercase tracking-wide leading-tight group-hover:text-[#8cc63f] transition-colors">
                    {latestNews.headline}
                  </h3>
                  <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 font-normal">
                    {latestNews.blurb}
                  </p>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <button
                    onClick={() => onNavigate('blog-article', { location: 'Canberra' })}
                    className="w-full flex justify-center items-center bg-[#8cc63f] hover:bg-[#9bd44e] text-black font-black text-[10px] uppercase py-2 rounded-xl tracking-wider transition-colors duration-150"
                  >
                  READ MORE
</button>
                </div>
              </div>
</div>
  )}

  {/* BAROMETRIC PRESSURE STATION CARD */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Barometric Pressure Station</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wide bg-zinc-950 border border-zinc-850 ${baroTrend.color}`}>
                {baroTrend.arrow} {baroTrend.status}
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-white tracking-tight">{liveWeather?.barometer || '---'}</span>
              <span className="text-sm text-zinc-400 font-bold">hPa</span>
            </div>
          </div>

          {/* HUB PATH LINK CONNECTIONS */}
          <div className="space-y-2">
            <button onClick={() => onNavigate('bragboard')} className="w-full bg-gradient-to-r from-zinc-900 to-zinc-850 border border-white/10 text-white font-black p-5 rounded-2xl flex items-center justify-between shadow-lg" >
              <div className="text-left"><span className="block text-white text-lg tracking-wide">COMMUNITY BRAG BOARD</span><span className="text-[11px] text-zinc-400 font-normal block mt-0.5">See what's getting caught locally</span></div>
              <span className="text-2xl">📸</span>
            </button>
            <button onClick={() => onNavigate('gallery')} className="w-full bg-zinc-900/60 border border-white/10 text-white font-bold p-4 rounded-xl flex items-center justify-between text-sm shadow-md">
              <span>🏆 Photo of the Month Vote</span><span>→</span>
            </button>
          </div>

          {/* 📺 WEEKLY FISHING REPORT VIDEO */}
          {videoReportId && (
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h2 className="font-black text-sm text-white flex items-center gap-2">
                  <span className="text-[#8cc63f]">📺</span> WEEKLY FISHING REPORT
                </h2>
                <span className="text-[8px] bg-red-950/60 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-red-900/30 animate-pulse">
                  Latest Briefing
                </span>                
              </div>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-inner">
                <iframe
                  src={`https://www.youtube.com/embed/${videoReportId}?rel=0`}
                  title="Boss Outdoor Fishing Report"
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* LIVE WEATHER CONDITIONS CARD */}
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/10">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <h2 className="font-black text-lg text-white flex items-center gap-2"><span className="text-[#8cc63f]">🌤️</span> LIVE CONDITIONS</h2>
            </div>

            {isLoading ? <div className="text-center py-6 text-zinc-500">Polling environmental metrics...</div> : (
              <div className="space-y-4">
                <div className="bg-black/50 p-4 rounded-lg border border-white/5">
                  <h3 className="text-xs font-bold text-[#8cc63f] uppercase border-b border-white/5 pb-1 mb-2">Station: Canberra Central</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Temperature</span><span className="font-black text-base text-white">{liveWeather?.temp}°C</span></div>
                    <div><span className="text-zinc-500 block text-[10px] uppercase font-bold">Wind Velocity</span><span className="font-black text-base text-white">{liveWeather?.windSpeed} km/h {liveWeather?.windDir}</span></div>
                    
                    {/* 🎯 PROMINENT SOLUNAR SUB-BLOCK: CANBERRA */}
                    <div onClick={() => onNavigate('canberra_solunar')} className="col-span-2 border-t border-white/5 pt-2.5 mt-2 cursor-pointer hover:bg-white/5 rounded transition-colors">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">Solunar Feeding Index</span>
                      <span className="font-black text-sm text-amber-400 flex items-center gap-1.5 mt-0.5">
                        <span>{liveWeather?.moon?.emoji}</span> {liveWeather?.moon?.rating} <span className="text-zinc-600 text-xs font-normal">→</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3-DAY OUTLOOK CONTAINER */}
                <div className="border-t border-white/5 pt-3">
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
                          <div>💨 {day.maxWind}k <span className="text-[#8cc63f]">{day.windDir}</span></div>
                          <div className="text-blue-400 mt-0.5">💧 {day.rain}mm</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ⭐ DYNAMIC PRODUCT OF THE WEEK CARD */}
          {!picksLoading && weeklyProduct && (
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 rounded-xl p-5 shadow-lg border border-[#8cc63f]/30 space-y-3.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#8cc63f]/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h2 className="font-black text-base text-white flex items-center gap-2">
                  <span className="text-[#8cc63f]">⭐</span> CANBERRA'S TOP PICK
                </h2>
                <span className="text-[8px] bg-[#8cc63f]/10 text-[#8cc63f] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-[#8cc63f]/30">
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
                  <h4 className="font-black text-sm text-white uppercase tracking-wide truncate group-hover:text-[#8cc63f] transition-colors">
                    {weeklyProduct.product_name}
                  </h4>
                  <p className="text-zinc-400 italic text-[11px] leading-relaxed line-clamp-2">
                    "{weeklyProduct.blurb}"
                  </p>
                  <span className="inline-block text-[9px] font-bold text-[#8cc63f] uppercase tracking-wider pt-1">
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
                <span className="text-[#8cc63f]">🔥</span> STAFF SELECTIONS
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
                    className="group bg-zinc-900/40 border border-white/5 p-3 rounded-xl flex gap-4 items-center hover:border-[#8cc63f]/30 transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                      <img src={pick.image_url} alt={pick.product_name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                      <div className="absolute top-0.5 left-0.5 bg-[#8cc63f] text-black font-black text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                        {pick.staff_name}
                      </div>
                    </div>
                    <div className="flex-grow space-y-0.5 text-xs min-w-0">
                      <h4 className="font-black text-white uppercase tracking-wide truncate group-hover:text-[#8cc63f] transition-colors">
                        {pick.product_name}
                      </h4>
                      <p className="text-zinc-400 italic text-[11px] line-clamp-2 leading-relaxed">
                        "{pick.blurb}"
                      </p>
                      <span className="inline-block text-[9px] font-bold text-[#8cc63f] uppercase tracking-wider pt-0.5">
                        View Item &rarr;
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* EMBEDDED WATER TELEMETRY CONTAINER */}
          <LocalWaterHydrometrics />

        </div>
      </div>
    </div>
  );
}