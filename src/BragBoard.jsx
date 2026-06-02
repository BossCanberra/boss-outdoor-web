import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function BragBoard({ storeLocation, onBack }) {
  const [brags, setBrags] = useState([]);
  const [filteredBrags, setFilteredBrags] = useState([]);
  const [speciesList, setSpeciesList] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('ALL');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [anglerName, setAnglerName] = useState('');
  const [species, setSpecies] = useState('');
  const [catchLocation, setCatchLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(''); // 📞 New Contact State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBrags();
  }, []);

  const fetchBrags = async () => {
    const { data } = await supabase
      .from('catches')
      .select('*')
      .eq('is_approved', true)
      .eq('store_location', storeLocation)
      .order('created_at', { ascending: false });
    
    const entries = data || [];
    setBrags(entries);
    setFilteredBrags(entries);

    // Dynamically build the species list based on unique values in database entries
    const uniques = ['ALL', ...new Set(entries.map(item => item.species ? item.species.trim().toUpperCase() : 'UNKNOWN'))];
    setSpeciesList(uniques);
  };

  // Run the filter change logic
  const handleSpeciesFilter = (selected) => {
    setSelectedSpecies(selected);
    if (selected === 'ALL') {
      setFilteredBrags(brags);
    } else {
      setFilteredBrags(brags.filter(b => b.species && b.species.trim().toUpperCase() === selected));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !anglerName || !species || !catchLocation || !contactInfo) {
      alert("Please fill in your name, contact info, species, location, and select a clear catch photo!");
      return;
    }

    try {
      setUploading(true);
      
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `brags/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('catch-images')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('catch-images')
        .getPublicUrl(filePath);

      // 🔒 Safely isolate contact data behind a string delimiter to protect user privacy on public wall rows
      const consolidatedDetails = `${catchLocation}${description ? ` - ${description}` : ''} [CONTACT: ${contactInfo}]`;

      const { error: insertError } = await supabase
        .from('catches')
        .insert([{
          angler_name: anglerName,
          species: species,
          details: consolidatedDetails,
          image_url: urlData.publicUrl,
          store_location: storeLocation,
          is_approved: false 
        }]);

      if (insertError) throw insertError;

      alert("Awesome catch! It's been submitted to the team for approval and will pin to the wall shortly.");
      
      setAnglerName('');
      setSpecies('');
      setCatchLocation('');
      setDescription('');
      setContactInfo('');
      setSelectedFile(null);
      setShowForm(false);
      
      fetchBrags();
      
    } catch (error) {
      alert("Error submitting catch: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12 animate-fade-in duration-500 relative">
      
      {/* Header Sticky Bar */}
      <div className="bg-zinc-950/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#8cc63f] uppercase">{storeLocation} BRAG BOARD</h1>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Local Records & Legends</p>
        </div>
        <button onClick={onBack} className="text-xs uppercase bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-bold transition-colors">
          &larr; Dashboard
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
        
        {/* Toggle Form Button */}
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-[#8cc63f] text-black font-black py-4 rounded-xl shadow-lg uppercase tracking-wide text-sm transition-all active:scale-98 mb-6"
        >
          {showForm ? '✕ Close Submission Form' : '🎣 Submit Your Prize Catch'}
        </button>

        {/* Submission Form Container */}
        {showForm && (
          <form 
            onSubmit={handlePhotoSubmit} 
            className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 p-6 rounded-2xl space-y-5 mb-8 shadow-2xl animate-fade-in"
          >
            <div className="border-b border-white/10 pb-3 mb-2 flex items-center justify-between">
              <h3 className="font-black text-white uppercase text-xs tracking-widest flex items-center gap-2">
                <span className="text-[#8cc63f]">📝</span> Catch Registry
              </h3>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Store: {storeLocation}</span>
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-zinc-400 font-black uppercase tracking-wider">Angler Name</label>
              <input type="text" required value={anglerName} onChange={(e) => setAnglerName(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-[#8cc63f] p-3.5 rounded-xl text-sm outline-none text-white transition-all duration-300 placeholder-zinc-700 font-medium" placeholder="Your full name" />
            </div>

            {/* 📞 NEW REQUIRED CONTACT INPUT */}
            <div className="space-y-1">
              <label className="block text-[10px] text-amber-400 font-black uppercase tracking-wider">Contact Details (Email or Phone Number)</label>
              <input type="text" required value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="w-full bg-black/60 border border-amber-500/20 focus:border-[#8cc63f] p-3.5 rounded-xl text-sm outline-none text-white transition-all duration-300 placeholder-zinc-700 font-medium" placeholder="Used only to send your $50 Voucher if you win!" />
              <span className="text-[9px] text-zinc-500 block pt-0.5">🔒 Protected Lock: Hidden completely from the public screens.</span>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-zinc-400 font-black uppercase tracking-wider">Fish Species</label>
              <input type="text" required value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-[#8cc63f] p-3.5 rounded-xl text-sm outline-none text-white transition-all duration-300 placeholder-zinc-700 font-medium" placeholder="e.g. Murray Cod, Yellowbelly, Flathead" />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-zinc-400 font-black uppercase tracking-wider">Waterway / Location</label>
              <input type="text" required value={catchLocation} onChange={(e) => setCatchLocation(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-[#8cc63f] p-3.5 rounded-xl text-sm outline-none text-white transition-all duration-300 placeholder-zinc-700 font-medium" placeholder={storeLocation === 'Canberra' ? 'e.g. Googong Dam, Murrumbidgee' : 'e.g. Merimbula Lake, Offshore'} />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-zinc-400 font-black uppercase tracking-wider">The Story / Gear Details</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-[#8cc63f] p-3.5 rounded-xl text-sm outline-none text-white h-24 resize-none transition-all duration-300 placeholder-zinc-700 font-medium leading-relaxed" placeholder="Tell us the story!" />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-zinc-400 font-black uppercase tracking-wider">Upload Catch Photo</label>
              <div className="relative group border border-dashed border-white/20 hover:border-[#8cc63f]/50 bg-black/40 rounded-xl p-4 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer text-center">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">📸</span>
                <span className="text-xs font-bold text-zinc-300 block">
                  {selectedFile ? selectedFile.name : 'Select a clear, high-res image'}
                </span>
                <input type="file" id="brag-upload" accept="image/*" onChange={handleFileChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>

            <button type="submit" disabled={uploading} className="w-full bg-white hover:bg-[#8cc63f] hover:text-black text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all duration-300 active:scale-98 disabled:opacity-40">
              {uploading ? 'Uploading...' : '🚀 Send to Shop Admin'}
            </button>
          </form>
        )}

        {/* --- DYNAMIC SPECIES FILTER ROW --- */}
        {speciesList.length > 2 && (
          <div className="mb-6 space-y-2">
            <label className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest">Filter by Target Species</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
              {speciesList.map((spec) => (
                <button
                  key={spec}
                  onClick={() => handleSpeciesFilter(spec)}
                  className={`px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase whitespace-nowrap shrink-0 transition-all border ${
                    selectedSpecies === spec 
                      ? 'bg-[#8cc63f] text-black border-[#8cc63f] shadow-md shadow-[#8cc63f]/10' 
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* ---------------------------------- */}

        {/* Permanent Photo Grid Display */}
        {filteredBrags.length > 0 ? (
          <div className="space-y-6">
            {filteredBrags.map((brag) => (
              <div key={brag.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                <div className="h-64 w-full relative cursor-pointer" onClick={() => setSelectedImage(brag.image_url)}>
                  <img src={brag.image_url} className="w-full h-full object-cover" alt="Wall Entry" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent"></div>
                  
                  {/* Date Badge positioned top-left */}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-zinc-400 text-[9px] font-bold px-2.5 py-1 rounded-md tracking-wide uppercase border border-white/5">
                    🗓️ {new Date(brag.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="bg-[#8cc63f] text-black text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">{brag.species}</span>
                    </div>
                    <h3 className="text-xl font-black text-white mt-2 drop-shadow-md uppercase tracking-wide">{brag.angler_name}</h3>
                  </div>
                </div>
                
                {/* 🍏 Public safety splitter: split at the [CONTACT: tag and only print the custom story string */}
                {brag.details && (
                  <div className="p-4 text-xs text-zinc-400 italic border-t border-white/5 leading-relaxed bg-zinc-900/50">
                    "{brag.details.split(' [CONTACT:')[0]}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-white/5 bg-zinc-900/30 rounded-2xl text-zinc-500 text-xs italic">
            No entries found matching "{selectedSpecies}".
          </div>
        )}
      </div>

      {/* Lightbox Modal View */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full object-contain rounded" alt="Enlarged catch" />
          <button className="absolute top-4 right-4 text-white text-sm bg-white/10 px-3 py-1 rounded-full">✕ CLOSE</button>
        </div>
      )}
    </div>
  );
}