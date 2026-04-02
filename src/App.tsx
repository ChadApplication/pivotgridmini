import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Grid, LayoutPanelLeft, Search, X, BarChart2, Info, User, Calendar, Tag, ChevronRight, Hash } from 'lucide-react';
import { ITEMS, Item } from './data';

// Custom Layout Icon
const CustomLayoutIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const App: React.FC = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'group'>('grid');
  const [groupBy, setGroupBy] = useState<'category' | 'year'>('category');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // 1. Viewport Size Tracking (Define this first!)
  const [viewportSize, setViewportSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1200, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });

  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Year Range State
  const minYear = useMemo(() => Math.min(...ITEMS.map(i => i.year)), []);
  const maxYear = useMemo(() => Math.max(...ITEMS.map(i => i.year)), []);
  const [yearRange, setYearRange] = useState<[number, number]>([minYear, maxYear]);
  const [initialRange, setInitialRange] = useState<[number, number] | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(ITEMS.map(item => item.category))).sort();
  }, []);

  const years = useMemo(() => {
    const yearsArr = [];
    for (let y = minYear; y <= maxYear; y++) yearsArr.push(y);
    return yearsArr;
  }, [minYear, maxYear]);

  // 3. Histogram & Filtering
  const histogramData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let y = minYear; y <= maxYear; y++) counts[y] = 0;
    ITEMS.forEach(item => { counts[item.year]++; });
    return Object.entries(counts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
  }, [minYear, maxYear]);

  const filteredItems = useMemo(() => {
    return ITEMS.filter(item => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = item.year >= yearRange[0] && item.year <= yearRange[1];
      return matchesCategory && matchesSearch && matchesYear;
    });
  }, [selectedCategories, searchQuery, yearRange]);

  // 4. --- Viewport-Aware Dynamic Grid Scaling Strategy ---
  const { densityMode, cardSize } = useMemo(() => {
    const n = Math.max(1, filteredItems.length);
    const contentWidth = Math.max(400, viewportSize.width - 320); 
    const contentHeight = Math.max(400, viewportSize.height - 80);
    const availableArea = contentWidth * contentHeight;
    const idealSide = Math.sqrt((availableArea * 0.8) / n);
    
    if (idealSide > 220 || n < 12) {
      return { densityMode: 'large' as const, cardSize: Math.min(300, Math.max(220, idealSide)) };
    }
    if (idealSide > 120 || n < 60) {
      return { densityMode: 'medium' as const, cardSize: Math.min(220, Math.max(130, idealSide)) };
    }
    return { densityMode: 'small' as const, cardSize: Math.min(130, Math.max(75, idealSide)) };
  }, [filteredItems.length, viewportSize]);

  // 5. Dynamic Grouping Logic
  const groupKeys = useMemo(() => {
    return groupBy === 'category' ? categories : years.map(String);
  }, [groupBy, categories, years]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    groupKeys.forEach(key => {
      groups[key] = filteredItems.filter(item => {
        const itemKey = groupBy === 'category' ? item.category : String(item.year);
        return itemKey === key;
      });
    });
    return groups;
  }, [filteredItems, groupKeys, groupBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
    setYearRange([minYear, maxYear]);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 cursor-pointer" onClick={() => window.location.reload()}>
            <LayoutPanelLeft className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">PivotGrid</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Discovery Engine</p>
          </div>
        </div>
        
        <div className="p-8 space-y-10 overflow-y-auto flex-1 pb-20">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Search size={14} /> Search
            </h3>
            <input 
              type="text" 
              placeholder="Find anything..."
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={14} /> Publication Year
              </h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-tighter">
                {yearRange[0]} — {yearRange[1]}
              </span>
            </div>
            
            <div className="px-1 pt-10 pb-2 relative group">
              <div className="absolute top-0 inset-x-1 h-10 flex items-end gap-[2px] opacity-30 group-hover:opacity-50 transition-opacity">
                {histogramData.map((d) => (
                  <div 
                    key={d.year} 
                    className={`flex-1 rounded-t-[2px] transition-all duration-500 ${d.year >= yearRange[0] && d.year <= yearRange[1] ? 'bg-blue-600' : 'bg-slate-300'}`}
                    style={{ height: `${(d.count / Math.max(1, ...histogramData.map(h => h.count))) * 100}%` }}
                  />
                ))}
              </div>
              
              <div className="relative h-6 flex items-center">
                 <input 
                   type="range" min={minYear} max={maxYear} value={yearRange[0]}
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     setYearRange([Math.min(val, yearRange[1] - 1), yearRange[1]]);
                   }}
                   className="range-slider-input absolute w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-blue-600 pointer-events-auto"
                   style={{ zIndex: yearRange[0] < minYear + (maxYear - minYear) / 2 ? 50 : 30 }}
                 />
                 <input 
                   type="range" min={minYear} max={maxYear} value={yearRange[1]}
                   onChange={(e) => {
                     const val = parseInt(e.target.value);
                     setYearRange([yearRange[0], Math.max(val, yearRange[0] + 1)]);
                   }}
                   className="range-slider-input absolute w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-blue-600 pointer-events-auto"
                   style={{ zIndex: yearRange[1] > maxYear - (maxYear - minYear) / 2 ? 50 : 30 }}
                 />
                 <div className="absolute inset-x-0 h-1.5 bg-slate-100 rounded-full" />
                 <motion.div 
                   onPanStart={() => setInitialRange(yearRange)}
                   onPan={(_, info) => {
                     if (!initialRange) return;
                     const track = (info.target as HTMLElement).parentElement;
                     if (!track) return;
                     const trackWidth = track.clientWidth;
                     const yearPerPixel = (maxYear - minYear) / trackWidth;
                     const deltaYears = Math.round(info.offset.x * yearPerPixel);
                     if (deltaYears !== 0) {
                        const rangeSpan = initialRange[1] - initialRange[0];
                        let newMin = initialRange[0] + deltaYears;
                        let newMax = newMin + rangeSpan;
                        if (newMin < minYear) { newMin = minYear; newMax = minYear + rangeSpan; }
                        else if (newMax > maxYear) { newMax = maxYear; newMin = maxYear - rangeSpan; }
                        setYearRange([newMin, newMax]);
                     }
                   }}
                   onPanEnd={() => setInitialRange(null)}
                   className="absolute h-1.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] z-20 cursor-grab active:cursor-grabbing touch-none" 
                   style={{ 
                     left: `${((yearRange[0] - minYear) / Math.max(1, maxYear - minYear)) * 100}%`,
                     right: `${100 - ((yearRange[1] - minYear) / Math.max(1, maxYear - minYear)) * 100}%`
                   }}
                 />
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-300 tracking-widest uppercase">
                <span>{minYear}</span>
                <span>{maxYear}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Filter size={14} /> Categories
              </h3>
              {selectedCategories.length > 0 && (
                <button onClick={() => setSelectedCategories([])} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  RESET
                </button>
              )}
            </div>
            <div className="space-y-1">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className={`text-sm font-medium transition-colors ${selectedCategories.includes(cat) ? 'text-slate-900' : 'text-slate-500'}`}>
                    {cat}
                  </span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold">
                    {ITEMS.filter(i => i.category === cat).length}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Discovery Stats</div>
           <div className="flex justify-between items-end">
              <div className="text-3xl font-black text-slate-800">{filteredItems.length}</div>
              <div className="text-xs font-bold text-slate-400 mb-1">Items Found</div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-6">
             <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button 
                  onClick={() => setViewType('grid')}
                  className={`p-2 rounded-lg flex items-center gap-2 px-4 transition-all ${viewType === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Grid size={18}/><span className="text-xs font-bold uppercase tracking-wider">Grid</span>
                </button>
                <button 
                  onClick={() => setViewType('group')}
                  className={`p-2 rounded-lg flex items-center gap-2 px-4 transition-all ${viewType === 'group' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <BarChart2 size={18}/><span className="text-xs font-bold uppercase tracking-wider">Stacked</span>
                </button>
             </div>
             
             {viewType === 'group' && (
                <div className="flex bg-slate-100 p-1.5 rounded-xl ml-4">
                  <button 
                    onClick={() => setGroupBy('category')}
                    className={`p-2 rounded-lg flex items-center gap-2 px-3 transition-all ${groupBy === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Tag size={14}/><span className="text-[10px] font-bold uppercase tracking-wider">By Category</span>
                  </button>
                  <button 
                    onClick={() => setGroupBy('year')}
                    className={`p-2 rounded-lg flex items-center gap-2 px-3 transition-all ${groupBy === 'year' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Hash size={14}/><span className="text-[10px] font-bold uppercase tracking-wider">By Year</span>
                  </button>
                </div>
             )}

             <div className="h-6 w-px bg-slate-200 mx-2" />
             <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Discovery <ChevronRight size={12} /> <span className="text-blue-600">{viewType === 'grid' ? 'Grid' : 'Stacked'}</span>
                <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{densityMode} Density</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 lg:p-14 bg-slate-50/30">
          <AnimatePresence mode="wait">
            {viewType === 'grid' ? (
              <motion.div 
                key="grid" 
                layout 
                className="grid gap-6 justify-center"
                style={{ 
                   gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
                   maxWidth: '100%'
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <ItemCard 
                      key={item.id} 
                      item={item} 
                      densityMode={densityMode}
                      onClick={() => setSelectedItem(item)} 
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div 
                key="group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex gap-12 h-full min-h-[600px] items-end pb-20 overflow-x-auto px-4"
              >
                {groupKeys.map(key => {
                  const itemsInGroup = groupedItems[key];
                  const overlap = itemsInGroup.length > 15 ? (120 / itemsInGroup.length) : 8;
                  
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-4 h-full justify-end min-w-[60px] max-w-[120px]">
                      <div className="flex flex-col-reverse w-full" style={{ gap: itemsInGroup.length > 15 ? `-${85 - overlap}px` : '6px' }}>
                        <AnimatePresence mode="popLayout">
                          {itemsInGroup.map((item, idx) => (
                            <motion.div
                              key={item.id} layoutId={`item-${item.id}`} layout
                              initial={{ opacity: 0, scale: 0.5, y: 50 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.5, y: 50 }}
                              transition={{ delay: idx * 0.01 }}
                              onClick={() => setSelectedItem(item)}
                              className="aspect-square w-full bg-white rounded-md shadow-md border border-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative z-0 hover:z-50"
                            >
                               <img src={item.image} alt="" className="w-full h-full object-cover" />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="text-center mt-4">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate w-16">{key}</div>
                         <div className="text-lg font-black text-slate-800">{itemsInGroup.length}</div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DETAIL MODAL */}
        <AnimatePresence>
          {selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-24 overflow-hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div layoutId={`item-${selectedItem.id}`}
                className="bg-white w-full max-w-5xl h-full max-h-[700px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10"
              >
                <button onClick={() => setSelectedItem(null)} className="absolute top-8 right-8 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-xl z-20 transition-all active:scale-90">
                  <X size={24} />
                </button>
                <div className="lg:w-1/2 h-64 lg:h-auto bg-slate-100 overflow-hidden relative">
                   <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-full object-cover" />
                </div>
                <div className="lg:w-1/2 p-12 lg:p-20 flex flex-col overflow-y-auto">
                   <div className="inline-flex px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full self-start mb-8 shadow-lg shadow-blue-200">
                     {selectedItem.category}
                   </div>
                   <h2 className="text-4xl font-black text-slate-900 leading-tight mb-4">{selectedItem.title}</h2>
                   <p className="text-xl text-slate-400 font-medium mb-12 italic">Published in {selectedItem.year} by {selectedItem.author}</p>
                   <div className="space-y-6 flex-1 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-10 text-slate-500 leading-relaxed">
                      <p>
                        Explore detailed insights about this discovery. In high-density mode, 
                        the system optimizes the display for pattern recognition, while detail view provides the full semantic context.
                      </p>
                   </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Semantic Item Card Component ---
const ItemCard: React.FC<{ 
  item: Item, 
  densityMode: 'large' | 'medium' | 'small',
  onClick: () => void 
}> = ({ item, densityMode, onClick }) => (
  <motion.div
    layoutId={`item-${item.id}`}
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    onClick={onClick}
    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative"
  >
    <div className={`${densityMode === 'small' ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden bg-slate-50`}>
      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      
      {densityMode !== 'small' && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-white/95 backdrop-blur-sm text-[9px] font-black rounded-lg text-slate-900 shadow-sm border border-slate-100">
            {item.year}
          </span>
        </div>
      )}

      {densityMode === 'small' && (
        <div className="absolute inset-0 bg-blue-600/90 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-[10px] font-bold text-white text-center leading-tight">{item.title}</p>
        </div>
      )}
    </div>

    {densityMode !== 'small' && (
      <div className={`p-4 ${densityMode === 'medium' ? 'space-y-0.5' : 'space-y-2'}`}>
        {densityMode === 'large' && (
          <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{item.category}</div>
        )}
        <h4 className={`font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors leading-tight ${densityMode === 'large' ? 'text-sm' : 'text-xs'}`}>
          {item.title}
        </h4>
        {densityMode === 'large' && (
          <p className="text-[11px] text-slate-400 font-medium">{item.author}</p>
        )}
      </div>
    )}
  </motion.div>
);

export default App;
