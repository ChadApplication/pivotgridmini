import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Grid, LayoutPanelLeft, Search, X, BarChart2, Calendar, Tag, ChevronRight, ChevronLeft, Hash, User, Download, Upload } from 'lucide-react';
import { ITEMS as DEFAULT_ITEMS, Item } from './data';
import DataLoader, { ColumnMapping } from './DataLoader';

const App: React.FC = () => {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'group'>('grid');
  const [groupBy, setGroupBy] = useState<string>('category');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importedItems, setImportedItems] = useState<Item[] | null>(null);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [useDemo, setUseDemo] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);

  const ITEMS = importedItems || (useDemo ? DEFAULT_ITEMS : []);

  // Dynamic groupable field names (from mapping or defaults for demo)
  const groupableFields = useMemo(() => {
    if (columnMapping) return columnMapping.groupableFields;
    if (useDemo) return ['category', 'year', 'author', 'tags'];
    return [];
  }, [columnMapping, useDemo]);

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
  const minYear = useMemo(() => ITEMS.length > 0 ? Math.min(...ITEMS.map(i => i.year)) : 2000, [ITEMS]);
  const maxYear = useMemo(() => ITEMS.length > 0 ? Math.max(...ITEMS.map(i => i.year)) : 2025, [ITEMS]);
  const [yearRange, setYearRange] = useState<[number, number]>([2000, 2025]);

  // Sync yearRange when ITEMS change
  useEffect(() => {
    setYearRange([minYear, maxYear]);
  }, [minYear, maxYear]);
  const [initialRange, setInitialRange] = useState<[number, number] | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(ITEMS.map(item => item.category))).sort();
  }, [ITEMS]);

  const allAuthors = useMemo(() => {
    return Array.from(new Set(ITEMS.map(item => item.author))).sort();
  }, [ITEMS]);

  const allTags = useMemo(() => {
    return Array.from(new Set(ITEMS.flatMap(item => item.tags))).sort();
  }, [ITEMS]);

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
  }, [minYear, maxYear, ITEMS]);

  const filteredItems = useMemo(() => {
    return ITEMS.filter(item => {
      // Dynamic field filters
      const matchesFilters = Object.entries(selectedFilters).every(([field, selected]) => {
        if (selected.length === 0) return true;
        const values = getItemValues(item, field);
        return selected.some(s => values.includes(s));
      });
      const matchesSearch = searchQuery === '' ||
        Object.values(item.fields || {}).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = item.year >= yearRange[0] && item.year <= yearRange[1];
      return matchesFilters && matchesSearch && matchesYear;
    });
  }, [ITEMS, selectedFilters, searchQuery, yearRange]);

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
  const getItemValues = (item: Item, field: string): string[] => {
    // Check fields map first (imported data), then known properties
    const raw = item.fields?.[field] ?? (item as Record<string, unknown>)[field];
    if (raw === undefined || raw === null || raw === '') return [''];
    const str = String(raw);
    // If semicolon-separated, split into multiple values
    if (str.includes(';')) return str.split(';').map(s => s.trim()).filter(Boolean);
    return [str];
  };

  const groupKeys = useMemo(() => {
    const keySet = new Set<string>();
    ITEMS.forEach(item => {
      getItemValues(item, groupBy).forEach(v => { if (v) keySet.add(v); });
    });
    return Array.from(keySet).sort();
  }, [ITEMS, groupBy]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    groupKeys.forEach(key => { groups[key] = []; });
    filteredItems.forEach(item => {
      getItemValues(item, groupBy).forEach(key => {
        if (groups[key]) groups[key].push(item);
      });
    });
    return groups;
  }, [filteredItems, groupKeys, groupBy]);

  const toggleFilter = (field: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const clearFilter = (field: string) => {
    setSelectedFilters(prev => ({ ...prev, [field]: [] }));
  };

  const handleDataLoaded = (
    rows: Record<string, string>[],
    _columns: string[],
    mapping: ColumnMapping,
    blobs: Record<string, string>
  ) => {
    const items: Item[] = rows.map((row, i) => {
      const imageVal = mapping.imageField ? row[mapping.imageField] || '' : '';
      const resolvedImage = blobs[imageVal] || blobs[`images/${imageVal}`] || imageVal;

      // First groupable field as category, find tags-like fields (semicolon values)
      const catField = mapping.groupableFields[0] || '';
      const tagField = mapping.groupableFields.find(f => {
        const sample = row[f] || '';
        return sample.includes(';');
      }) || '';

      return {
        id: i + 1,
        title: row[mapping.titleField] || `Item ${i + 1}`,
        description: row['description'] || row[mapping.displayFields.find(f => f.toLowerCase().includes('desc')) || ''] || '',
        category: catField ? row[catField] || '' : '',
        tags: tagField ? row[tagField].split(';').map(t => t.trim()).filter(Boolean) : [],
        author: row['author'] || row['name'] || '',
        year: mapping.continuousFields[0] ? parseInt(row[mapping.continuousFields[0]]) || 0 : 0,
        image: resolvedImage,
        email: row['email'] || '',
        url: row['url'] || '',
        fields: { ...row },
      };
    });

    setImportedItems(items);
    setImageBlobs(blobs);
    setColumnMapping(mapping);
    setShowImporter(false);
    setGroupBy(mapping.groupableFields[0] || 'category');
    clearFilters();
  };

  const downloadZip = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const dataFolder = zip.folder('data')!;
    const imagesFolder = zip.folder('images')!;

    // Build CSV with image filenames (not blob URLs)
    const header = "id,title,description,category,tags,author,year,email,url,image";
    const rows = filteredItems.map(i => {
      const imgName = `${String(i.id).padStart(3, '0')}.jpg`;
      return `${i.id},"${i.title}","${i.description}","${i.category}","${i.tags.join(';')}","${i.author}",${i.year},"${i.email || ''}","${i.url || ''}","${imgName}"`;
    });
    dataFolder.file('items.csv', "\uFEFF" + [header, ...rows].join("\n"));

    // Add images: blob URLs only (external URLs skipped due to CORS)
    const imagePromises = filteredItems.map(async (item) => {
      const imgName = `${String(item.id).padStart(3, '0')}.jpg`;
      const blobUrl = imageBlobs[item.image] || imageBlobs[imgName];
      if (blobUrl && blobUrl.startsWith('blob:')) {
        try {
          const resp = await fetch(blobUrl);
          const blob = await resp.blob();
          imagesFolder.file(imgName, blob);
        } catch { /* skip */ }
      }
    });
    await Promise.allSettled(imagePromises);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivotgrid_${filteredItems.length}_items.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedFilters({});
    setSearchQuery('');
    setYearRange([minYear, maxYear]);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 cursor-pointer" onClick={() => clearFilters()}>
            <LayoutPanelLeft className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">PivotGrid</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Discovery Engine</p>
          </div>
        </div>
        
        <div className="p-8 space-y-10 overflow-y-auto flex-1 pb-20">
          {ITEMS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-xs text-slate-400">Import data to enable filters</p>
            </div>
          ) : (
          <>
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

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart2 size={14} /> Stack By
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {groupableFields.map(field => (
                <button
                  key={field}
                  onClick={() => { setGroupBy(field); setViewType('group'); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    groupBy === field && viewType === 'group'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {field}
                </button>
              ))}
            </div>
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
                   onPan={(event, info) => {
                     if (!initialRange) return;
                     const track = (event.target as HTMLElement).parentElement;
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

          {groupableFields.map(field => {
            const uniqueValues = Array.from(new Set(
              ITEMS.flatMap(item => getItemValues(item, field))
            )).filter(Boolean).sort();
            const selected = selectedFilters[field] || [];

            return (
              <div key={field} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Filter size={14} /> {field}
                  </h3>
                  {selected.length > 0 && (
                    <button onClick={() => clearFilter(field)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                      RESET
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {uniqueValues.map(val => (
                    <label key={val} className="flex items-center gap-3 group cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        className="peer appearance-none w-4 h-4 border-2 border-slate-200 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                        checked={selected.includes(val)}
                        onChange={() => toggleFilter(field, val)}
                      />
                      <span className={`text-xs font-medium transition-colors truncate ${selected.includes(val) ? 'text-slate-900' : 'text-slate-500'}`}>
                        {val}
                      </span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold shrink-0">
                        {ITEMS.filter(i => getItemValues(i, field).includes(val)).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          </>
          )}
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
             
             <div className="h-6 w-px bg-slate-200 mx-2" />
             <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Discovery <ChevronRight size={12} /> <span className="text-blue-600">{viewType === 'grid' ? 'Grid' : 'Stacked'}</span>
                <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{densityMode} Density</span>
             </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowImporter(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
              title="Import data (CSV, JSON, ZIP)"
            >
              <Upload size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Import</span>
            </button>
            <button
              onClick={downloadZip}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              title={`Download ${filteredItems.length} items as ZIP`}
            >
              <Download size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Export</span>
            </button>
            {importedItems && (
              <button
                onClick={() => { setImportedItems(null); setImageBlobs({}); setUseDemo(false); clearFilters(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Clear imported data, restore demo"
              >
                <X size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Clear</span>
              </button>
            )}
          </div>
        </header>

        <div className={`flex-1 bg-slate-50/30 ${viewType === 'grid' ? 'overflow-y-auto p-10 lg:p-14' : 'overflow-hidden p-2'}`}>
          {ITEMS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">No Data Loaded</h2>
              <p className="text-sm text-slate-400 mb-8 max-w-sm">
                Import a ZIP package (data/ + images/) or CSV/JSON file to start exploring your collection.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImporter(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  <Upload size={16} /> Import Data
                </button>
                <button
                  onClick={() => setUseDemo(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Load Demo (200 items)
                </button>
              </div>
            </div>
          ) : (
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
                className="flex gap-8 h-full items-end overflow-x-auto px-4"
                style={{ height: `calc(100vh - 140px)`, paddingBottom: '50px' }}
              >
                {(() => {
                  const COL_THRESHOLD = 25;
                  const maxCount = Math.max(...groupKeys.map(k => groupedItems[k].length), 1);
                  const numCols = Math.ceil(maxCount / COL_THRESHOLD);
                  const effectiveMax = Math.ceil(maxCount / numCols);
                  const availableHeight = viewportSize.height - 140 - 50 - 60;
                  const maxCardSize = Math.min(80, Math.floor(availableHeight / effectiveMax));
                  const cardSize = Math.max(20, maxCardSize);
                  const peekPerCard = effectiveMax > 1 ? Math.max(3, (availableHeight - cardSize) / (effectiveMax - 1)) : cardSize + 4;
                  const defaultGap = peekPerCard - cardSize;

                  return groupKeys.map(key => {
                    const itemsInGroup = groupedItems[key];
                    const colWidth = numCols > 1 ? cardSize * numCols + (numCols - 1) * 4 : cardSize;

                    // Split items evenly into columns (all groups use same column count)
                    const columns: Item[][] = [];
                    if (numCols > 1) {
                      const perCol = Math.ceil(itemsInGroup.length / numCols);
                      for (let c = 0; c < numCols; c++) {
                        const slice = itemsInGroup.slice(c * perCol, (c + 1) * perCol);
                        if (slice.length > 0) columns.push(slice);
                      }
                    } else {
                      columns.push(itemsInGroup);
                    }

                    const colCount = Math.max(...columns.map(c => c.length), 1);
                    const groupGap = colCount <= 1 ? 4 : Math.min(4, defaultGap);

                    return (
                      <div key={key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" style={{ minWidth: `${colWidth + 20}px`, maxWidth: `${colWidth + 40}px` }}>
                        <div className="flex gap-1 items-end w-full">
                          {columns.map((colItems, colIdx) => (
                            <div key={colIdx} className="flex flex-col-reverse flex-1" style={{ gap: `${groupGap}px` }}>
                              <AnimatePresence mode="popLayout">
                                {colItems.map((item, idx) => (
                                  <motion.div
                                    key={item.id} layoutId={`item-${item.id}`} layout
                                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, y: 50 }}
                                    transition={{ delay: idx * 0.01 }}
                                    onClick={() => setSelectedItem(item)}
                                    className="bg-white rounded-md shadow-md border border-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative z-0 hover:z-50"
                                    style={{ width: `${cardSize}px`, height: `${cardSize}px` }}
                                  >
                                    <ItemImage src={item.image} alt={item.title} category={item.category} className="w-full h-full object-cover" />
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                        <div className="text-center mt-2">
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate" style={{ width: `${colWidth + 20}px` }}>{key}</div>
                           <div className="text-lg font-black text-slate-800">{itemsInGroup.length}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>

        {/* Detail Modal: navigation helpers */}
        {(() => {
          const currentIdx = selectedItem ? filteredItems.findIndex(i => i.id === selectedItem.id) : -1;
          const prevItem = currentIdx > 0 ? filteredItems[currentIdx - 1] : null;
          const nextItem = currentIdx < filteredItems.length - 1 ? filteredItems[currentIdx + 1] : null;

          // Keyboard navigation
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useEffect(() => {
            if (!selectedItem) return;
            const handler = (e: KeyboardEvent) => {
              if (e.key === 'Escape') setSelectedItem(null);
              if (e.key === 'ArrowLeft' && prevItem) setSelectedItem(prevItem);
              if (e.key === 'ArrowRight' && nextItem) setSelectedItem(nextItem);
            };
            window.addEventListener('keydown', handler);
            return () => window.removeEventListener('keydown', handler);
          }, [selectedItem, prevItem, nextItem]);

          return null;
        })()}

        {/* DETAIL MODAL */}
        <AnimatePresence>
          {selectedItem && (() => {
            const currentIdx = filteredItems.findIndex(i => i.id === selectedItem.id);
            const prevItem = currentIdx > 0 ? filteredItems[currentIdx - 1] : null;
            const nextItem = currentIdx < filteredItems.length - 1 ? filteredItems[currentIdx + 1] : null;
            const relatedItems = ITEMS.filter(i => i.category === selectedItem.category && i.id !== selectedItem.id).slice(0, 6);

            return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-16 overflow-hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />

              {/* Prev button */}
              {prevItem && (
                <button onClick={() => setSelectedItem(prevItem)}
                  className="absolute left-4 lg:left-8 z-30 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-xl transition-all active:scale-90">
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Next button */}
              {nextItem && (
                <button onClick={() => setSelectedItem(nextItem)}
                  className="absolute right-4 lg:right-8 z-30 w-12 h-12 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-xl transition-all active:scale-90">
                  <ChevronRight size={24} />
                </button>
              )}

              <motion.div layoutId={`item-${selectedItem.id}`}
                className="bg-white w-full max-w-5xl h-full max-h-[750px] rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10"
              >
                {/* Close + counter */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
                  <span className="px-3 py-1 bg-black/40 backdrop-blur text-white text-[11px] font-mono rounded-full">
                    {currentIdx + 1} / {filteredItems.length}
                  </span>
                  <button onClick={() => setSelectedItem(null)} className="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-lg transition-all active:scale-90">
                    <X size={20} />
                  </button>
                </div>

                {/* Image */}
                <div className="lg:w-1/2 h-56 lg:h-auto bg-slate-100 overflow-hidden relative">
                   <ItemImage src={selectedItem.image} alt={selectedItem.title} category={selectedItem.category} className="w-full h-full object-cover" />
                </div>

                {/* Content */}
                <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col overflow-y-auto">
                   <div className="inline-flex px-4 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full self-start mb-6 shadow-lg shadow-blue-200">
                     {selectedItem.category}
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 leading-tight mb-3">{selectedItem.title}</h2>

                   {/* Metadata */}
                   <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-500">
                     <span className="flex items-center gap-1.5"><User size={14} /> {selectedItem.author}</span>
                     <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedItem.year}</span>
                     <span className="flex items-center gap-1.5"><Hash size={14} /> ID-{selectedItem.id}</span>
                   </div>

                   {/* Tags */}
                   {selectedItem.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1.5 mb-6">
                       {selectedItem.tags.map(tag => (
                         <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">{tag}</span>
                       ))}
                     </div>
                   )}

                   {/* Links */}
                   <div className="flex flex-wrap gap-3 mb-6 text-xs">
                     {selectedItem.email && (
                       <a href={`mailto:${selectedItem.email}`} className="text-blue-600 hover:underline">{selectedItem.email}</a>
                     )}
                     {selectedItem.url && (
                       <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedItem.url}</a>
                     )}
                   </div>

                   <div className="text-sm border-t border-slate-100 pt-6 text-slate-500 leading-relaxed mb-8">
                      <p>{selectedItem.description}</p>
                   </div>

                   {/* Related items */}
                   {relatedItems.length > 0 && (
                     <div className="border-t border-slate-100 pt-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Related in {selectedItem.category}</h4>
                       <div className="flex gap-2">
                         {relatedItems.map(ri => (
                           <button key={ri.id} onClick={() => setSelectedItem(ri)}
                             className="w-12 h-12 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all flex-shrink-0">
                             <ItemImage src={ri.image} alt={ri.title} category={ri.category} className="w-full h-full object-cover" />
                           </button>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Keyboard hint */}
                   <div className="mt-auto pt-4 flex gap-3 text-[10px] text-slate-300">
                     <span className="px-2 py-0.5 bg-slate-50 rounded">← →</span> navigate
                     <span className="px-2 py-0.5 bg-slate-50 rounded">ESC</span> close
                   </div>
                </div>
              </motion.div>
            </div>
            );
          })()}
        </AnimatePresence>
      </main>

      {/* Data Importer */}
      {showImporter && (
        <DataLoader
          onDataLoaded={handleDataLoaded}
          onCancel={() => setShowImporter(false)}
        />
      )}
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
      <ItemImage src={item.image} alt={item.title} category={item.category} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      
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

// --- Fallback Image Component ---
const CATEGORY_COLORS: Record<string, string> = {
  Development: '#3B82F6', Design: '#EC4899', Data: '#10B981',
  Architecture: '#F59E0B', Security: '#EF4444', Mobile: '#8B5CF6', Cloud: '#06B6D4',
};

const ItemImage: React.FC<{
  src: string; alt: string; category?: string; className?: string;
}> = ({ src, alt, category, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const bg = CATEGORY_COLORS[category || ''] || '#64748B';
  const initials = alt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ background: bg }}>
        <span className="text-white font-black text-lg opacity-80">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export default App;
