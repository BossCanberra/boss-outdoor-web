import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * Helper to extract exact calendar date components strictly adjusted to AEST/AEDT
 * Includes a strict regex sanitizer to destroy hidden iOS Safari BiDi markers (\u200e)
 */
const getAESTDateDetails = (dateOrString) => {
  if (!dateOrString) return { monthIndex: -1, year: -1, displayLabel: 'Unknown Date' };
  
  let date;
  if (typeof dateOrString === 'string') {
    const sanitizedString = dateOrString
      .replace(' ', 'T')
      .replace(/\.(\d{3})\d+/, '.$1');
    
    date = new Date(Date.parse(sanitizedString));
  } else {
    date = dateOrString;
  }

  if (isNaN(date.getTime())) return { monthIndex: -1, year: -1, displayLabel: 'Unknown Date' };

  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  
  const yearStr = parts.find(p => p.type === 'year').value.replace(/[^\d]/g, '');
  const monthStr = parts.find(p => p.type === 'month').value.replace(/[^\d]/g, '');
  
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const displayLabel = date.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    month: 'long',
    year: 'numeric'
  });

  return { monthIndex, year, displayLabel };
};

/**
 * Helper to extract 11-character YouTube ID from various URL formats
 */
const getYouTubeId = (url) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

export default function AdminDashboard({ onBack }) {
  // 🔒 Authentication Gate States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // 🕒 Timezone-Aware Initial Time Anchors
  const currentAEST = getAESTDateDetails(new Date());
  const currentMonthIndex = currentAEST.monthIndex;
  const currentYear = currentAEST.year;

  // 🏪 Store Context & Filtering States
  const [activeStore, setActiveStore] = useState('Canberra'); 
  const [submissions, setSubmissions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isLoading, setIsLoading] = useState(true);

  // 🎥 Video Fishing Report States
  const [videoLinks, setVideoLinks] = useState({ Canberra: '', Merimbula: '' });
  const [loadingVideo, setLoadingVideo] = useState(false);

  // 🎣 Staff Picks Pool States
  const [staffPicks, setStaffPicks] = useState([]);
  const [editingPickId, setEditingPickId] = useState(null);
  const [pickFormData, setPickFormData] = useState({
    staff_name: '',
    product_name: '',
    blurb: '',
    product_url: '',
    image_url: ''
  });

  // 🏆 Product of the Week Pool States
  const [weeklyProducts, setWeeklyProducts] = useState([]);
  const [editingWeeklyId, setEditingWeeklyId] = useState(null);
  const [weeklyFormData, setWeeklyFormData] = useState({
    product_name: '',
    blurb: '',
    product_url: '',
    image_url: ''
  });

  // 📝 Inline Editing States (Catches)
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    angler_name: '',
    species: '',
    details: ''
  });

  // 📢 Latest News / Feature Story States
  const [newsHeadline, setNewsHeadline] = useState('');
  const [newsBlurb, setNewsBlurb] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsBtnText, setNewsBtnText] = useState('');
  const [newsBtnUrl, setNewsBtnUrl] = useState('');
  const [loadingNews, setLoadingNews] = useState(false);
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSubmissions(), 
      fetchStaffPicks(),
      fetchWeeklyProducts(),
      fetchVideoLinks(),
      fetchStoreNews()
    ]);
    setIsLoading(false);
  };

  const fetchVideoLinks = async () => {
    try {
      const { data, error } = await supabase.from('store_videos').select('*');
      if (data && !error) {
        const links = { Canberra: '', Merimbula: '' };
        data.forEach(row => {
          if (row.store_location === 'Canberra') links.Canberra = row.youtube_url;
          if (row.store_location === 'Merimbula') links.Merimbula = row.youtube_url;
        });
        setVideoLinks(links);
      }
    } catch (err) {
      console.error('System error fetching video links:', err);
    }
  };
useEffect(() => {
    if (isAuthenticated) {
      fetchStoreNews();
    }
  }, [activeStore, isAuthenticated]);

  const fetchStoreNews = async () => {
    try {
      const { data, error } = await supabase
        .from('store_news')
        .select('*');
      
      if (data && !error) {
        const currentNews = data.find(row => row.store_location.toLowerCase() === activeStore.toLowerCase());
        if (currentNews) {
          setNewsHeadline(currentNews.headline || '');
          setNewsBlurb(currentNews.blurb || '');
          setNewsContent(currentNews.content || '');
          setNewsImageUrl(currentNews.image_url || '');
          setNewsBtnText(currentNews.button_text || '');
          setNewsBtnUrl(currentNews.button_url || '');
        } else {
          setNewsHeadline(''); setNewsBlurb(''); setNewsContent('');
          setNewsImageUrl(''); setNewsBtnText(''); setNewsBtnUrl('');
        }
      }
    } catch (err) {
      console.error('System error fetching store news data:', err);
    }
  };

  const handlePublishNews = async (e) => {
    e.preventDefault();
    setLoadingNews(true);

    try {
      const { error } = await supabase
        .from('store_news')
        .upsert({
          store_location: activeStore,
          headline: newsHeadline,
          blurb: newsBlurb,
          content: newsContent,
          image_url: newsImageUrl,
          button_text: newsBtnText || null,
          button_url: newsBtnUrl || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_location' });

      if (error) {
        alert('Error publishing news: ' + error.message);
      } else {
        alert(`Successfully published live feature story for the ${activeStore} Hub!`);
      }
    } catch (err) {
      console.error('System error publishing news:', err);
    }
    setLoadingNews(false);
  };
  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setSubmissions(data);
    } catch (err) {
      console.error('System error fetching catches:', err);
    }
  };

  const fetchStaffPicks = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_picks')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) setStaffPicks(data);
    } catch (err) {
      console.error('System error fetching staff picks:', err);
    }
  };

  const fetchWeeklyProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_of_the_week')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) setWeeklyProducts(data);
    } catch (err) {
      console.error('System error fetching weekly products:', err);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'BossAdmin2026') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // ================= VIDEO REPORT LOGIC =================
  const handleSaveVideo = async () => {
    setLoadingVideo(true);
    const updates = [
      { store_location: 'Canberra', youtube_url: getYouTubeId(videoLinks.Canberra), updated_at: new Date() },
      { store_location: 'Merimbula', youtube_url: getYouTubeId(videoLinks.Merimbula), updated_at: new Date() }
    ];
    
    try {
      const { error } = await supabase.from('store_videos').upsert(updates);
      if (error) alert('Error saving videos: ' + error.message);
    } catch (err) {
      console.error('System error saving videos:', err);
    }
    setLoadingVideo(false);
  };

  // ================= PRODUCT OF THE WEEK LOGIC =================
  const startEditingWeekly = (item) => {
    setEditingWeeklyId(item.id);
    setWeeklyFormData({
      product_name: item.product_name || '',
      blurb: item.blurb || '',
      product_url: item.product_url || '',
      image_url: item.image_url || ''
    });
  };

  const handleSaveWeekly = async (id) => {
    try {
      const { error } = await supabase
        .from('product_of_the_week')
        .update(weeklyFormData)
        .eq('id', id);

      if (!error) {
        setWeeklyProducts(prev => prev.map(w => w.id === id ? { ...w, ...weeklyFormData } : w));
        setEditingWeeklyId(null);
      } else {
        alert("Error saving weekly product highlights: " + error.message);
      }
    } catch (err) {
      console.error('System error processing weekly update:', err);
    }
  };

  const handleAddBlankWeekly = async () => {
    const freshWeekly = {
      store_location: activeStore,
      product_name: 'Weekly Feature Product Title',
      blurb: 'Write a short compelling description about why this item is the choice highlight of the week.',
      product_url: 'https://bossoutdoor.com.au',
      image_url: 'https://images.unsplash.com/photo-1517462964-21fdcec3f25b?auto=format&fit=crop&w=600&q=80'
    };

    try {
      const { data, error } = await supabase
        .from('product_of_the_week')
        .insert([freshWeekly])
        .select();
      if (!error && data) setWeeklyProducts(prev => [...prev, data[0]]);
    } catch (err) {
      console.error('System error generating weekly highlights row:', err);
    }
  };

  const handleDeleteWeekly = async (id) => {
    if (!window.confirm("Remove this Weekly Feature layout row completely?")) return;
    try {
      const { error } = await supabase.from('product_of_the_week').delete().eq('id', id);
      if (!error) setWeeklyProducts(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      console.error('System error deleting weekly showcase:', err);
    }
  };

  // ================= STAFF PICKS CRUD LOGIC =================
  const startEditingPick = (pick) => {
    setEditingPickId(pick.id);
    setPickFormData({
      staff_name: pick.staff_name || '',
      product_name: pick.product_name || '',
      blurb: pick.blurb || '',
      product_url: pick.product_url || '',
      image_url: pick.image_url || ''
    });
  };

  const handleSavePick = async (id) => {
    try {
      const { error } = await supabase
        .from('staff_picks')
        .update(pickFormData)
        .eq('id', id);

      if (!error) {
        setStaffPicks(prev => prev.map(p => p.id === id ? { ...p, ...pickFormData } : p));
        setEditingPickId(null);
      } else {
        alert("Error saving pick modifications: " + error.message);
      }
    } catch (err) {
      console.error('System error saving pick adjustments:', err);
    }
  };

  const handleAddBlankPick = async () => {
    const freshPick = {
      store_location: activeStore,
      staff_name: 'Staff Member',
      product_name: 'New Product Name',
      blurb: 'Short blurb about why this gear rocks.',
      product_url: 'https://bossoutdoor.com.au',
      image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80'
    };

    try {
      const { data, error } = await supabase
        .from('staff_picks')
        .insert([freshPick])
        .select();
      if (!error && data) setStaffPicks(prev => [...prev, data[0]]);
    } catch (err) {
      console.error('System error pushing blank selection row:', err);
    }
  };

  const handleDeletePick = async (id) => {
    if (!window.confirm("Remove this product choice permanently from the storefront view?")) return;
    try {
      const { error } = await supabase.from('staff_picks').delete().eq('id', id);
      if (!error) setStaffPicks(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('System error removing product feature:', err);
    }
  };

  // ================= BRAG CATCHES MODERATION LOGIC =================
  const handleVoucherStatusToggle = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('catches')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (!error) {
        setSubmissions(prev => 
          prev.map(sub => sub.id === id ? { ...sub, is_approved: !currentStatus } : sub)
        );
      }
    } catch (err) {
      console.error('Error updating approval status:', err);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditFormData({
      angler_name: item.angler_name || '',
      species: item.species || '',
      details: item.details || ''
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('catches')
        .update({
          angler_name: editFormData.angler_name,
          species: editFormData.species,
          details: editFormData.details
        })
        .eq('id', id);

      if (!error) {
        setSubmissions(prev => prev.map(sub => sub.id === id ? { ...sub, ...editFormData } : sub));
        setEditingId(null);
      }
    } catch (err) {
      console.error('System error saving edits:', err);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Delete this catch submission permanently from the system?")) return;
    try {
      const { error } = await supabase.from('catches').delete().eq('id', id);
      if (!error) setSubmissions(prev => prev.filter(sub => sub.id !== id));
    } catch (err) {
      console.error('System error processing deletion:', err);
    }
  };

  // Matrix Filter Subsets
  const filteredBragItems = submissions.filter(sub => {
    const { monthIndex, year } = getAESTDateDetails(sub.created_at);
    return (sub.store_location || '').toLowerCase().trim() === activeStore.toLowerCase().trim() && monthIndex === parseInt(selectedMonth, 10) && year === parseInt(selectedYear, 10);
  });

  const currentMonthVoucherSubmissions = submissions.filter(sub => {
    const { monthIndex, year } = getAESTDateDetails(sub.created_at);
    return (sub.store_location || '').toLowerCase().trim() === activeStore.toLowerCase().trim() && monthIndex === currentMonthIndex && year === currentYear;
  });

  const displayStaffPicks = staffPicks.filter(p => (p.store_location || '').toLowerCase().trim() === activeStore.toLowerCase().trim());
  const displayWeeklyProducts = weeklyProducts.filter(w => (w.store_location || '').toLowerCase().trim() === activeStore.toLowerCase().trim());

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 select-none">
        <form onSubmit={handleLoginSubmit} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="text-center">
            <h1 className="text-lg font-black tracking-wide text-white uppercase">BOSS OUTDOOR <span className="text-[#8cc63f]">ADMIN</span></h1>
            <p className="text-xs text-zinc-500 mt-1">Enter your manager access key to unlock dashboard controls</p>
          </div>
          <div>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              placeholder="••••••••" 
              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-center text-white focus:outline-none focus:border-[#8cc63f]"
              required 
            />
            {authError && <span className="text-[10px] text-rose-400 font-bold block mt-1.5 text-center">❌ Invalid credentials.</span>}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onBack} className="w-1/3 bg-zinc-800 border border-zinc-700 font-bold text-xs uppercase py-2.5 rounded-xl text-zinc-300">Cancel</button>
            <button type="submit" className="w-2/3 bg-[#8cc63f] text-black font-black text-xs uppercase py-2.5 rounded-xl tracking-wider hover:brightness-105 transition-all">Verify Key</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 font-sans select-none">
      
      {/* HEADER CONTROL BAR */}
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black tracking-wide uppercase">Hub Control <span className="text-[#8cc63f]">Admin</span></h1>
          <p className="text-xs text-zinc-500 mt-0.5">Managing active image rosters, hot stock items, and weekly targets</p>
        </div>
        <div className="flex bg-black p-1 rounded-xl border border-zinc-800 w-full sm:w-fit justify-center">
          <button onClick={() => setActiveStore('Canberra')} className={`text-xs font-black uppercase px-4 py-2 rounded-lg transition-all flex-1 sm:flex-initial text-center ${activeStore === 'Canberra' ? 'bg-[#8cc63f] text-black' : 'text-zinc-400 hover:text-white'}`}>Canberra</button>
          <button onClick={() => setActiveStore('Merimbula')} className={`text-xs font-black uppercase px-4 py-2 rounded-lg transition-all flex-1 sm:flex-initial text-center ${activeStore === 'Merimbula' ? 'bg-[#8cc63f] text-black' : 'text-zinc-400 hover:text-white'}`}>Merimbula</button>
        </div>
        <button onClick={onBack} className="text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl w-full sm:w-fit">&larr; Exit Admin</button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-sm text-zinc-500">Polling secure records pool...</div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-10">

          {/* ================= SECTION 0: VIDEO FISHING REPORTS ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-white uppercase tracking-wide">🎥 YouTube Fishing Reports</h2>
              <p className="text-xs text-zinc-400">Update the weekly video embed links for both store dashboards</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Canberra Video ID/URL</label>
                <input 
                  type="text" 
                  value={videoLinks.Canberra} 
                  onChange={(e) => setVideoLinks({...videoLinks, Canberra: e.target.value})}
                  placeholder="e.g. Catching a meter-mark Murray cod on fly..."
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:border-[#8cc63f] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Merimbula Video ID/URL</label>
                <input 
                  type="text" 
                  value={videoLinks.Merimbula} 
                  onChange={(e) => setVideoLinks({...videoLinks, Merimbula: e.target.value})}
                  placeholder="Paste link or ID here..."
                  className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:border-[#00aeef] outline-none transition-colors"
                />
              </div>
            </div>
            <button 
              onClick={handleSaveVideo}
              disabled={loadingVideo}
              className="mt-2 w-full sm:w-auto bg-[#8cc63f] hover:brightness-110 text-black text-[10px] font-black uppercase px-4 py-2.5 rounded-lg tracking-wider transition-all disabled:opacity-50"
            >
              {loadingVideo ? 'Saving to Database...' : 'Update Active Videos'}
            </button>
          </div>
          {/* ================= SECTION 0.5: LATEST NEWS MANAGER ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                📢 Hub Feature Story & Blog Announcement ({activeStore})
              </h2>
              <p className="text-xs text-zinc-400">Publish top-of-feed banners linked to individual blog write-ups</p>
            </div>

            <form onSubmit={handlePublishNews} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Article Headline Title</label>
                    <input 
                      type="text" required value={newsHeadline} onChange={e => setNewsHeadline(e.target.value)}
                      placeholder="e.g., Rise Fly Fishing Film Tour Tickets On Sale!"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Main Feed Preview Blurb (Short Summary)</label>
                    <input 
                      type="text" required value={newsBlurb} onChange={e => setNewsBlurb(e.target.value)}
                      placeholder="A crisp 1-2 sentence teaser context line to pull views from the feed."
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Feature Cover Image Link URL</label>
                    <input 
                      type="url" required value={newsImageUrl} onChange={e => setNewsImageUrl(e.target.value)}
                      placeholder="Paste link to your hosted header picture layout..."
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Full Article Page Content (Blog Text Layout)</label>
                  <textarea 
                    rows="7" required value={newsContent} onChange={e => setNewsContent(e.target.value)}
                    placeholder="Write out the comprehensive story message details. Double return spaces will generate clean content paragraph transitions."
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none resize-none h-[178px]"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-850 pt-3">
                <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider block mb-2">⚡ Optional Interactive Action Button Link</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Button Text Tag</label>
                    <input 
                      type="text" value={newsBtnText} onChange={e => setNewsBtnText(e.target.value)}
                      placeholder="e.g., Secure Tickets Now"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1">Button Destination Web Link Address</label>
                    <input 
                      type="url" value={newsBtnUrl} onChange={e => setNewsBtnUrl(e.target.value)}
                      placeholder="e.g., https://risefilmtour.com.au/tickets"
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-white focus:border-[#8cc63f] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={loadingNews}
                  className="w-full sm:w-auto bg-[#8cc63f] hover:brightness-110 text-black text-[10px] font-black uppercase px-5 py-2.5 rounded-lg tracking-wider transition-all disabled:opacity-50"
                >
                  {loadingNews ? 'Publishing Wire Update...' : `Publish Live ${activeStore} Story`}
                </button>
              </div>
            </form>
          </div>

          {/* ================= SECTION A: PRODUCT OF THE WEEK WORKBENCH ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wide">⭐ Product of the Week ({activeStore})</h2>
                <p className="text-xs text-zinc-400">Manage store-wide highlighted gear running on key showroom slots</p>
              </div>
              {displayWeeklyProducts.length === 0 && (
                <button onClick={handleAddBlankWeekly} className="bg-cyan-600 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg tracking-wider">
                  + Create Weekly Card
                </button>
              )}
            </div>

            {displayWeeklyProducts.map(weekly => {
              const isEditingWeekly = editingWeeklyId === weekly.id;
              return (
                <div key={weekly.id} className="bg-black/40 border border-zinc-850 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="w-20 h-20 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shrink-0 mx-auto md:mx-0">
                    <img src={isEditingWeekly ? weeklyFormData.image_url : weekly.image_url} className="w-full h-full object-cover" alt="Weekly Product" />
                  </div>

                  {isEditingWeekly ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-grow w-full text-xs">
                      <input type="text" value={weeklyFormData.product_name} onChange={e => setWeeklyFormData({...weeklyFormData, product_name: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2" placeholder="Product Title" />
                      <input type="text" value={weeklyFormData.product_url} onChange={e => setWeeklyFormData({...weeklyFormData, product_url: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2" placeholder="Website Product Link URL" />
                      <input type="text" value={weeklyFormData.image_url} onChange={e => setWeeklyFormData({...weeklyFormData, image_url: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2" placeholder="Direct Image URL Address" />
                      <textarea value={weeklyFormData.blurb} onChange={e => setWeeklyFormData({...weeklyFormData, blurb: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2 h-16 resize-none" placeholder="Weekly review blurb..." />
                      <div className="flex gap-2 pt-1 sm:col-span-2">
                        <button onClick={() => setEditingWeeklyId(null)} className="w-1/2 bg-zinc-800 font-bold py-1.5 rounded uppercase text-[10px]">Cancel</button>
                        <button onClick={() => handleSaveWeekly(weekly.id)} className="w-1/2 bg-cyan-600 text-white font-black py-1.5 rounded uppercase text-[10px]">Save Feature</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow space-y-1 text-xs w-full md:w-auto">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded font-black uppercase tracking-wider">{activeStore}'s Choice</span>
                        <h4 className="font-bold text-sm text-white">{weekly.product_name}</h4>
                      </div>
                      <p className="text-zinc-400 italic">"{weekly.blurb}"</p>
                      <div className="text-[10px] text-zinc-600 truncate font-mono">Link: {weekly.product_url}</div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => startEditingWeekly(weekly)} className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded text-[10px] font-bold text-zinc-300">✏️ Edit Feature</button>
                        <button onClick={() => handleDeleteWeekly(weekly.id)} className="bg-rose-950/40 border border-rose-900/60 px-3 py-1 rounded text-[10px] font-bold text-rose-400">0 Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================= SECTION B: STAFF PICKS WORKBENCH ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wide">🏷️ Staff Picks Manager ({activeStore})</h2>
                <p className="text-xs text-zinc-400">Control active staff gear recommendations running on secondary display tracks</p>
              </div>
              <button onClick={handleAddBlankPick} className="bg-[#8cc63f] text-black text-[10px] font-black uppercase px-3 py-2 rounded-lg tracking-wider">
                + Add Staff Pick
              </button>
            </div>

            {displayStaffPicks.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">No showcase products loaded for {activeStore}.</div>
            ) : (
              <div className="space-y-4">
                {displayStaffPicks.map(pick => {
                  const isEditingPick = editingPickId === pick.id;
                  return (
                    <div key={pick.id} className="bg-black/40 border border-zinc-850 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div className="w-20 h-20 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shrink-0 mx-auto md:mx-0">
                        <img src={isEditingPick ? pickFormData.image_url : pick.image_url} className="w-full h-full object-cover" alt="Product" />
                      </div>

                      {isEditingPick ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-grow w-full text-xs">
                          <input type="text" value={pickFormData.staff_name} onChange={e => setPickFormData({...pickFormData, staff_name: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white" placeholder="Staff Name (e.g. Nathan)" />
                          <input type="text" value={pickFormData.product_name} onChange={e => setPickFormData({...pickFormData, product_name: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white" placeholder="Product Title" />
                          <input type="text" value={pickFormData.product_url} onChange={e => setPickFormData({...pickFormData, product_url: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2" placeholder="Website Product Link URL" />
                          <input type="text" value={pickFormData.image_url} onChange={e => setPickFormData({...pickFormData, image_url: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2" placeholder="Direct Image URL Address" />
                          <textarea value={pickFormData.blurb} onChange={e => setPickFormData({...pickFormData, blurb: e.target.value})} className="bg-black border border-zinc-800 rounded p-2 text-white sm:col-span-2 h-16 resize-none" placeholder="Short blurb recommendation..." />
                          <div className="flex gap-2 pt-1 sm:col-span-2">
                            <button onClick={() => setEditingPickId(null)} className="w-1/2 bg-zinc-800 font-bold py-1.5 rounded uppercase text-[10px]">Cancel</button>
                            <button onClick={() => handleSavePick(pick.id)} className="w-1/2 bg-[#8cc63f] text-black font-black py-1.5 rounded uppercase text-[10px]">Save Card</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-grow space-y-1 text-xs w-full md:w-auto">
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-[#8cc63f] uppercase tracking-wide text-[10px] bg-[#8cc63f]/10 px-2 py-0.5 rounded border border-[#8cc63f]/20">{pick.staff_name}'s Choice</span>
                            <h4 className="font-bold text-sm text-white">{pick.product_name}</h4>
                          </div>
                          <p className="text-zinc-400 italic">"{pick.blurb}"</p>
                          <div className="text-[10px] text-zinc-600 truncate font-mono">Link: {pick.product_url}</div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={() => startEditingPick(pick)} className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded text-[10px] font-bold text-zinc-300">✏️ Edit Fields</button>
                            <button onClick={() => handleDeletePick(pick.id)} className="bg-rose-950/40 border border-rose-900/60 px-3 py-1 rounded text-[10px] font-bold text-rose-400">🗑️ Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= SECTION C: BRAG BOARD MODERATION ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wide">📸 Brag Board Moderation ({activeStore})</h2>
                <p className="text-xs text-zinc-400">Reviewing files logged to this specific storefront timeline</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-fit">
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white font-bold outline-none focus:border-[#8cc63f]">
                  {monthsList.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white font-bold outline-none focus:border-[#8cc63f]">
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            {filteredBragItems.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">No gallery items logged for {activeStore} in {monthsList[selectedMonth]} {selectedYear}.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredBragItems.map(item => {
                  const { displayLabel } = getAESTDateDetails(item.created_at);
                  const isEditing = editingId === item.id;
                  return (
                    <div key={item.id} className="bg-black/40 backdrop-blur-sm border border-zinc-850 rounded-xl overflow-hidden flex flex-col justify-between relative">
                      <div className="aspect-square bg-zinc-950 relative">
                        <img src={item.image_url} alt="Catch" className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md text-[9px] px-2 py-0.5 rounded text-zinc-300 font-bold border border-white/5">🗓️ Sent: {displayLabel}</span>
                      </div>
                      <div className="p-3 space-y-3 flex-grow flex flex-col justify-between bg-zinc-950/20">
                        {isEditing ? (
                          <div className="space-y-1.5 pt-1">
                            <input type="text" value={editFormData.angler_name} onChange={e => setEditFormData({...editFormData, angler_name: e.target.value})} className="w-full bg-black border border-zinc-800 rounded p-2 text-[11px] text-white" placeholder="Angler Name" />
                            <input type="text" value={editFormData.species} onChange={e => setEditFormData({...editFormData, species: e.target.value})} className="w-full bg-black border border-zinc-800 rounded p-2 text-[11px] text-white" placeholder="Species" />
                            <input type="text" value={editFormData.details} onChange={e => setEditFormData({...editFormData, details: e.target.value})} className="w-full bg-black border border-zinc-800 rounded p-2 text-[11px] text-white" placeholder="Details" />
                            <div className="flex gap-1 pt-1">
                              <button onClick={() => setEditingId(null)} className="w-1/2 bg-zinc-800 text-zinc-300 font-bold text-[10px] py-1.5 rounded uppercase">Cancel</button>
                              <button onClick={() => handleSaveEdit(item.id)} className="w-1/2 bg-[#8cc63f] text-black font-black text-[10px] py-1.5 rounded uppercase">Save</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <span className="font-black text-white block text-sm">{item.angler_name || 'Anonymous'}</span>
                            <span className="text-zinc-400 text-[11px] block mt-0.5 leading-relaxed">{item.species} <br /> <span className="text-zinc-600 font-mono text-[10px] break-all">{item.details}</span></span>
                          </div>
                        )}
                        <div className="space-y-2 pt-2 border-t border-zinc-900 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Voucher:</span>
                            <button onClick={() => handleVoucherStatusToggle(item.id, item.is_approved)} className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded transition-all ${item.is_approved ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{item.is_approved ? '✅ Entered' : '❌ Not Entered'}</button>
                          </div>
                          {!isEditing && (
                            <div className="grid grid-cols-2 gap-1 pt-1">
                              <button onClick={() => startEditing(item)} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-300 font-bold py-1.5 rounded text-center">✏️ Edit Text</button>
                              <button onClick={() => handleDeleteSubmission(item.id)} className="bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900 text-[10px] text-rose-400 font-bold py-1.5 rounded text-center">🗑️ Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= SECTION D: VOUCHER MATRICES WINDOW ================= */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wide">🎟️ Active Voucher Draw Pool ({activeStore})</h2>
                <p className="text-xs text-zinc-400">Submissions qualifying strictly for this storefront's active calendar phase</p>
              </div>
              <span className="text-xs bg-[#8cc63f]/10 border border-[#8cc63f]/30 text-[#8cc63f] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-fit">
                {monthsList[currentMonthIndex]} {currentYear}
              </span>
            </div>

            {currentMonthVoucherSubmissions.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">No submissions tracked for {activeStore} inside this specific calendar month loop.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px] tracking-wider bg-black/20">
                      <th className="p-3">Angler Profile</th>
                      <th className="p-3">Logged Target</th>
                      <th className="p-3">Submission Frame</th>
                      <th className="p-3 text-right">Draw Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 bg-black/10">
                    {currentMonthVoucherSubmissions.map(sub => {
                      const { displayLabel } = getAESTDateDetails(sub.created_at);
                      return (
                        <tr key={sub.id} className="hover:bg-zinc-850/30 transition-colors">
                          <td className="p-3 font-black text-white">{sub.angler_name || 'Anonymous'}</td>
                          <td className="p-3 text-zinc-400">{sub.species}</td>
                          <td className="p-3 text-zinc-500 text-[11px] font-mono">{displayLabel}</td>
                          <td className="p-3 text-right">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sub.is_approved ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-amber-950/40 text-amber-500 border border-amber-900/30'}`}>{sub.is_approved ? '🎫 Ready' : '⏳ Action Required'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}