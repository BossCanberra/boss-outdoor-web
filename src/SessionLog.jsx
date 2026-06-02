import React, { useState, useEffect } from 'react';

export default function SessionLog({ storeContext }) {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    species: '',
    length: '',
    lureFly: '',
    notes: ''
  });

  const STORAGE_KEY = `boss_outdoor_logs_${storeContext.toLowerCase()}`;

  // Load user logs on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, [STORAGE_KEY]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.species) return;

    // Grab current weather state from cache if it exists to auto-log conditions
    const weatherCacheKey = storeContext === 'Canberra' ? 'canberra_weather_cache_v4' : 'merimbula_marine_weather_cache_v4';
    const cachedWeather = localStorage.getItem(weatherCacheKey);
    let baroData = '---';
    
    if (cachedWeather) {
      const parsed = JSON.parse(cachedWeather);
      baroData = storeContext === 'Canberra' ? `${parsed.barometer} hPa` : `${parsed.weather?.barometer || '---'} hPa`;
    }

    const newLog = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
      barometer: baroData,
      ...formData
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    
    // Reset form
    setFormData({ species: '', length: '', lureFly: '', notes: '' });
  };

  const deleteLog = (id) => {
    const filtered = logs.filter(log => log.id !== id);
    setLogs(filtered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  };

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white/10 mt-5">
      <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
        <h2 className="font-black text-lg text-white flex items-center gap-2">
          <span className="text-[#8cc63f]">📓</span> MY LOG BOOK
        </h2>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-[10px] bg-white/10 border border-white/20 font-black px-3 py-1.5 rounded-lg uppercase tracking-wider"
        >
          {isOpen ? 'Close Log' : '➕ Log Current Trip'}
        </button>
      </div>

      {/* TRIP LOGGER FORM EXPANSION */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-3 mb-5 animate-fade-in">
          <h3 className="text-xs font-bold text-[#8cc63f] uppercase tracking-widest border-b border-zinc-800 pb-1.5">Record New Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Target Species *</label>
              <input type="text" name="species" value={formData.species} onChange={handleInputChange} placeholder="e.g. Murray Cod" className="w-full bg-black/60 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[#8cc63f]" required />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Length / Weight</label>
              <input type="text" name="length" value={formData.length} onChange={handleInputChange} placeholder="e.g. 85cm" className="w-full bg-black/60 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[#8cc63f]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Successful Lure / Fly / Bait</label>
            <input type="text" name="lureFly" value={formData.lureFly} onChange={handleInputChange} placeholder="e.g. 150mm Surface Wakebait" className="w-full bg-black/60 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[#8cc63f]" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Session Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Structure types, weed lines, retrieve style changes..." rows="2" className="w-full bg-black/60 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[#8cc63f] resize-none" />
          </div>
          <button type="submit" className="w-full bg-[#8cc63f] text-black font-black py-2 rounded text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.99] transition-all">
            Save Session to Device
          </button>
        </form>
      )}

      {/* SAVED HISTORICAL LOGS GRID */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500">
            No tracked sessions yet. Hit the log button above to bookmark your next catch.
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white/5 border border-white/5 p-3 rounded-lg relative group">
              <button 
                onClick={() => deleteLog(log.id)}
                className="absolute top-2 right-2 text-zinc-600 hover:text-rose-400 text-xs font-bold px-1 transition-colors"
                title="Delete entry"
              >
                ✕
              </button>
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-black text-sm text-white">{log.species}</span>
                {log.length && <span className="text-xs text-[#8cc63f] font-bold mr-4">{log.length}</span>}
              </div>
              <div className="flex gap-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">
                <span>📅 {log.date}</span>
                <span>🎈 Baro: {log.barometer}</span>
              </div>
              {log.lureFly && (
                <div className="text-xs text-zinc-300 font-medium leading-relaxed mb-1">
                  <span className="text-[#8cc63f]/80 font-bold">Rig:</span> {log.lureFly}
                </div>
              )}
              {log.notes && (
                <p className="text-[11px] text-zinc-400 italic leading-relaxed border-t border-white/5 pt-1 mt-1">
                  "{log.notes}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}