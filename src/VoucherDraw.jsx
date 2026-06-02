import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const getOrCreateUserUUID = () => {
  let uuid = localStorage.getItem('boss_outdoor_voter_id');
  if (!uuid) {
    uuid = 'voter_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('boss_outdoor_voter_id', uuid);
  }
  return uuid;
};

const VoucherDraw = ({ storeLocation, onBack }) => {
  const [viewMode, setViewMode] = useState('voting'); 
  const [entries, setEntries] = useState([]);
  const [previousWinner, setPreviousWinner] = useState(null);
  const [pastWinnersArchive, setPastWinnersArchive] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userVotedId, setUserVotedId] = useState(null);

  const currentMonthYear = new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  const voterUUID = getOrCreateUserUUID();

  useEffect(() => {
    fetchCatches();
    fetchPastWinnersAndArchive();
  }, [storeLocation]);

  const fetchCatches = async () => {
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const { data: catchesData } = await supabase
      .from('catches')
      .select('*')
      .eq('is_approved', true)
      .eq('is_archived', false)
      .eq('store_location', storeLocation || 'Canberra')
      .gte('created_at', startOfCurrentMonth.toISOString()) 
      .order('votes', { ascending: false });

    const { data: userVoteRecord } = await supabase
      .from('catch_votes')
      .select('catch_id')
      .eq('user_uuid', voterUUID)
      .eq('store_location', storeLocation || 'Canberra')
      .eq('voting_month_year', currentMonthYear)
      .maybeSingle();

    if (userVoteRecord) {
      setUserVotedId(userVoteRecord.catch_id);
    } else {
      setUserVotedId(null);
    }

    setEntries(catchesData || []);
  };

  const fetchPastWinnersAndArchive = async () => {
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const { data: pastEntries } = await supabase
      .from('catches')
      .select('*')
      .eq('is_approved', true)
      .eq('store_location', storeLocation || 'Canberra')
      .lt('created_at', startOfCurrentMonth.toISOString()) 
      .order('created_at', { ascending: false });

    if (pastEntries && pastEntries.length > 0) {
      const winnersMap = {};
      
      pastEntries.forEach(entry => {
        const periodStr = new Date(entry.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
        if (!winnersMap[periodStr] || (entry.votes || 0) > (winnersMap[periodStr].votes || 0)) {
          winnersMap[periodStr] = {
            ...entry,
            computedPeriod: periodStr
          };
        }
      });

      const sortedWinners = Object.values(winnersMap).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setPastWinnersArchive(sortedWinners);

      if (sortedWinners.length > 0) {
        setPreviousWinner(sortedWinners[0]);
      } else {
        setPreviousWinner(null);
      }
    } else {
      setPastWinnersArchive([]);
      setPreviousWinner(null);
    }
  };

  const handleVote = async (id) => {
    try {
      setEntries(prev => {
        const updated = prev.map(item => {
          if (userVotedId === id && item.id === id) {
            return { ...item, votes: Math.max(0, (item.votes || 0) - 1) };
          }
          if (userVotedId && item.id === userVotedId) {
            return { ...item, votes: Math.max(0, (item.votes || 0) - 1) };
          }
          if (item.id === id) {
            return { ...item, votes: (item.votes || 0) + 1 };
          }
          return item;
        });
        return updated.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      });

      if (userVotedId === id) {
        setUserVotedId(null);
      } else {
        setUserVotedId(id);
      }

      const { error } = await supabase.rpc('handle_user_vote', {
        target_catch_id: id,
        voter_uuid: voterUUID,
        active_store: storeLocation || 'Canberra',
        active_month_year: currentMonthYear
      });

      if (error) throw error;
      fetchCatches();
    } catch (err) {
      console.error("Voting system sync malfunction:", err.message);
      fetchCatches();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="bg-black/60 p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-[#8cc63f] uppercase">BRAG BOARD</h1>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{storeLocation} Gallery</p>
        </div>
        {onBack && <button onClick={onBack} className="text-xs uppercase bg-white/10 px-4 py-2 rounded-lg font-bold">Back</button>}
      </div>

      <div className="px-4 mt-4 space-y-5 max-w-md mx-auto">
        
        {/* INTERACTIVE VIEW MODES */}
        <div className="bg-zinc-900/80 p-1 rounded-xl grid grid-cols-2 gap-1 border border-white/5 shadow-inner">
          <button 
            onClick={() => setViewMode('voting')}
            className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${viewMode === 'voting' ? 'bg-[#8cc63f] text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            🔥 Current Voting
          </button>
          <button 
            onClick={() => setViewMode('archive')}
            className={`py-2 text-xs font-black uppercase rounded-lg transition-all ${viewMode === 'archive' ? 'bg-[#8cc63f] text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
          >
            🏆 Winners Archive
          </button>
        </div>

        {/* 🎯 NEW REWORDED INFO BANNER PANEL */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-2xl p-4 shadow-xl text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#8cc63f] font-black uppercase tracking-wider text-[11px]">
            <span>🏆</span> Photo of the Month Draw
          </div>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            Every single submission to the Boss Outdoor Brag Board automatically enters the running! The champion is decided directly by community votes right here to secure the bragging rights and a <span className="text-white font-black bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">$50 Store Voucher</span> at the end of the month.
          </p>
        </div>

        {viewMode === 'voting' && (
          <div className="space-y-5 animate-fade-in">
            {previousWinner && (
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-[#8cc63f]/30 p-4 rounded-xl relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 bg-[#8cc63f] text-black text-[8px] font-black px-2.5 py-1 uppercase tracking-wider rounded-bl-lg shadow-md z-10">
                  Last Month's Winner 🏆
                </div>
                <div className="flex items-center gap-4">
                  <img 
                    src={previousWinner.image_url} 
                    className="w-16 h-16 rounded-lg object-cover bg-black border border-white/5 cursor-zoom-in" 
                    alt="Winner"
                    onClick={() => setSelectedImage(previousWinner.image_url)}
                  />
                  <div>
                    <h3 className="font-black text-white text-sm uppercase tracking-wide">{previousWinner.angler_name}</h3>
                    <p className="text-xs text-[#8cc63f] uppercase font-bold">{previousWinner.species}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider">Scored {previousWinner.votes || 0} local votes</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-white/5 pb-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Live Submissions</h2>
              <span className="text-[9px] text-[#8cc63f] font-black bg-[#8cc63f]/10 border border-[#8cc63f]/20 px-2 py-0.5 rounded uppercase tracking-wider">
                {currentMonthYear}
              </span>
            </div>

            {entries.length > 0 ? (
              entries.map((entry, index) => {
                const isMyVote = userVotedId === entry.id;
                return (
                  <div key={entry.id} className={`bg-zinc-900 rounded-xl overflow-hidden border transition-all duration-300 relative ${isMyVote ? 'border-[#8cc63f] shadow-lg ring-1 ring-[#8cc63f]/20' : 'border-white/10'}`}>
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-black border border-white/5 tracking-wide z-10 uppercase flex items-center gap-1">
                      <span>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎣'}</span>
                      <span>{index === 0 ? 'Leader' : index === 1 ? '2nd' : index === 2 ? '3rd' : `#${index + 1}`}</span>
                    </div>

                    <div className="h-64 w-full cursor-pointer" onClick={() => setSelectedImage(entry.image_url)}>
                      <img src={entry.image_url} className="w-full h-full object-cover" alt="Catch submission" />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base font-bold">{entry.angler_name}</h3>
                          <p className="text-xs text-[#8cc63f] uppercase font-bold tracking-wide">{entry.species}</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-black text-white">{entry.votes || 0}</div>
                          <div className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Votes</div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleVote(entry.id)}
                        className={`w-full font-black py-2 rounded-lg uppercase text-xs transition-all duration-200 ${isMyVote ? 'bg-zinc-800 text-[#8cc63f] border border-[#8cc63f]/40' : 'bg-[#8cc63f] text-black'}`}
                      >
                        {isMyVote ? 'Retract My Vote' : userVotedId ? 'Change My Vote Here' : 'Cast My Vote'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 px-6 border border-white/10 rounded-xl bg-zinc-900">
                <h2 className="text-base font-bold text-white mb-1">No entries recorded yet</h2>
                <p className="text-zinc-500 text-xs">Be the first to submit a photo for {storeLocation} this month!</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'archive' && (
          <div className="space-y-4 animate-fade-in">
            <div className="border-b border-white/5 pb-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Historical Hall of Champions</h2>
            </div>

            {pastWinnersArchive.length > 0 ? (
              pastWinnersArchive.map((winner) => (
                <div key={winner.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={winner.image_url} 
                      className="w-14 h-14 rounded-lg object-cover bg-black border border-white/5 cursor-zoom-in" 
                      alt="Archived winner"
                      onClick={() => setSelectedImage(winner.image_url)}
                    />
                    <div>
                      <h3 className="font-black text-white text-sm uppercase tracking-wide">{winner.angler_name}</h3>
                      <p className="text-xs text-zinc-400 font-bold uppercase">{winner.species}</p>
                      <span className="text-[9px] font-black text-[#8cc63f] bg-[#8cc63f]/10 border border-[#8cc63f]/20 px-1.5 py-0.5 rounded inline-block mt-1 uppercase tracking-wide">
                        🏆 {winner.computedPeriod} Champion
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-white block leading-none">{winner.votes || 0}</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Votes</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 px-6 border border-white/10 rounded-xl bg-zinc-900">
                <h2 className="text-base font-bold text-zinc-400">Archive is currently empty</h2>
                <p className="text-zinc-600 text-xs mt-0.5">Historical monthly data will populate automatically here.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Zoomed view" />
        </div>
      )}
    </div>
  );
};

export default VoucherDraw;