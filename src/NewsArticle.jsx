import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function NewsArticle({ params, onBack }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Safely grab the store location context passed through the router navigation params
  const storeContext = params?.location || 'Canberra';
  const isMerimbula = storeContext.toLowerCase() === 'merimbula';

  useEffect(() => {
    const fetchArticleDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('store_news')
          .select('*')
          .eq('store_location', storeContext)
          .maybeSingle();

        if (data && !error) {
          setArticle(data);
        }
      } catch (err) {
        console.error('System error resolving article content node:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleDetails();
  }, [storeContext]);

  return (
    <div className="min-h-screen bg-black text-white pb-12 font-sans select-none relative overflow-hidden">
      {/* Background Ambience Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-zinc-950 via-black to-black z-0" />
      
      <div className="relative z-10">
        {/* Dynamic Sticky Top Navigation Header */}
        <div className="bg-black/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10 sticky top-0">
          <button 
            onClick={onBack} 
            className="text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            &larr; Back to Feed
          </button>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
            isMerimbula 
              ? 'bg-[#00aeef]/10 text-[#00aeef] border-[#00aeef]/20' 
              : 'bg-[#8cc63f]/10 text-[#8cc63f] border-[#8cc63f]/20'
          }`}>
            {storeContext} Wire Hub
          </span>
        </div>

        {loading ? (
          <div className="max-w-md mx-auto px-4 mt-20 text-center text-xs text-zinc-500 tracking-wide font-mono">
            Decrypting full article content wire...
          </div>
        ) : !article ? (
          <div className="max-w-md mx-auto px-4 mt-20 text-center space-y-3">
            <p className="text-sm text-zinc-400 italic">This announcement article layer is no longer active or has been removed.</p>
            <button onClick={onBack} className="text-xs font-black uppercase text-[#8cc63f] tracking-wider">&larr; Return to Dashboard</button>
          </div>
        ) : (
          <article className="max-w-md mx-auto px-4 mt-6 space-y-5">
            
            {/* Header Content Wrapper */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide leading-tight">
                {article.headline}
              </h1>
              <p className="text-zinc-400 text-xs italic leading-relaxed pl-3 border-l-2 border-zinc-800">
                "{article.blurb}"
              </p>
            </div>

            {/* Feature Cover Aspect Image Banner */}
            <div className="w-full aspect-[16/10] bg-zinc-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src={article.image_url} 
                alt={article.headline} 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Article Main Text Body Area */}
            <div className="text-zinc-300 text-xs leading-relaxed space-y-4 font-normal pt-2 border-t border-zinc-900">
              {article.content.split('\n\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                return (
                  <p key={index} className="tracking-wide">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Interactive Call To Action Footer Button Section */}
            {article.button_text && article.button_url && (
              <div className="pt-6 border-t border-zinc-900 mt-4">
                <a 
                  href={article.button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full text-black font-black text-xs uppercase py-3.5 rounded-xl tracking-widest text-center block shadow-xl hover:brightness-110 transition-all ${
                    isMerimbula ? 'bg-[#00aeef]' : 'bg-[#8cc63f]'
                  }`}
                >
                  {article.button_text} &rarr;
                </a>
              </div>
            )}

          </article>
        )}
      </div>
    </div>
  );
}