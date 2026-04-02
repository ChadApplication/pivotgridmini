import React, { useState, useCallback } from 'react';
import { Upload, X, FileSpreadsheet, ArrowRight, Package } from 'lucide-react';
import JSZip from 'jszip';

export interface ColumnMapping {
  titleField: string;
  imageField: string;
  yearField: string;
  groupableFields: string[];
  displayFields: string[];
}

interface DataLoaderProps {
  onDataLoaded: (items: Record<string, string>[], columns: string[], mapping: ColumnMapping, imageBlobs: Record<string, string>) => void;
  onCancel: () => void;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });

  return { headers, rows };
}

const DataLoader: React.FC<DataLoaderProps> = ({ onDataLoaded, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [imageBlobs, setImageBlobs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Step 2: mapping state
  const [titleField, setTitleField] = useState('');
  const [imageField, setImageField] = useState('');
  const [yearField, setYearField] = useState('');
  const [groupableFields, setGroupableFields] = useState<string[]>([]);
  const [displayFields, setDisplayFields] = useState<string[]>([]);

  const applyAutoDetect = (headers: string[], rows: Record<string, string>[], name: string) => {
    setColumns(headers);
    setRawData(rows);
    setFileName(name);

    const lower = headers.map(h => h.toLowerCase());
    setTitleField(headers[lower.findIndex(h => h.includes('title') || h.includes('name'))] || headers[0]);
    setImageField(headers[lower.findIndex(h => h.includes('image') || h.includes('img') || h.includes('photo') || h.includes('thumbnail'))] || '');
    setYearField(headers[lower.findIndex(h => h.includes('year') || h.includes('date'))] || '');

    const autoGroup = headers.filter((_, i) => {
      const l = lower[i];
      return l.includes('category') || l.includes('tag') || l.includes('author') || l.includes('type') || l.includes('status') || l.includes('group');
    });
    setGroupableFields(autoGroup);

    const autoDisplay = headers.filter((_, i) => {
      const l = lower[i];
      return !l.includes('id') && !l.includes('image') && !l.includes('img') && !l.includes('thumbnail');
    });
    setDisplayFields(autoDisplay);
    setStep(2);
  };

  const parseDataFile = (text: string, name: string): { headers: string[]; rows: Record<string, string>[] } => {
    if (name.endsWith('.json')) {
      try {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : json.items || json.data || [];
        if (arr.length > 0) {
          const headers = Object.keys(arr[0]);
          const rows = arr.map((r: Record<string, unknown>) => {
            const row: Record<string, string> = {};
            headers.forEach(h => { row[h] = String(r[h] ?? ''); });
            return row;
          });
          return { headers, rows };
        }
      } catch { /* invalid json */ }
    } else {
      return parseCSV(text);
    }
    return { headers: [], rows: [] };
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);

    // ZIP file: extract data/ and images/
    if (file.name.endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(file);
        const blobs: Record<string, string> = {};

        // Find data file (data/items.csv or data/items.json)
        let dataText = '';
        let dataName = '';
        for (const path of Object.keys(zip.files)) {
          if (path.startsWith('data/') && (path.endsWith('.csv') || path.endsWith('.json'))) {
            dataText = await zip.files[path].async('text');
            dataName = path.split('/').pop() || path;
            break;
          }
        }

        // Extract images as blob URLs
        for (const path of Object.keys(zip.files)) {
          if (path.startsWith('images/') && !zip.files[path].dir) {
            const blob = await zip.files[path].async('blob');
            const url = URL.createObjectURL(blob);
            const fileName = path.split('/').pop() || path;
            // Map both "images/001.jpg" and "001.jpg" to the blob URL
            blobs[path] = url;
            blobs[fileName] = url;
          }
        }

        setImageBlobs(blobs);

        if (dataText) {
          const { headers, rows } = parseDataFile(dataText, dataName);
          if (headers.length > 0 && rows.length > 0) {
            applyAutoDetect(headers, rows, file.name);
          }
        }
      } catch (e) {
        console.error('ZIP parse error:', e);
      }
      setLoading(false);
      return;
    }

    // CSV / JSON file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseDataFile(text, file.name);
      if (headers.length > 0 && rows.length > 0) {
        applyAutoDetect(headers, rows, file.name);
      }
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleApply = () => {
    if (!titleField) return;
    onDataLoaded(rawData, columns, {
      titleField,
      imageField,
      yearField,
      groupableFields,
      displayFields,
    }, imageBlobs);
  };

  const toggleField = (field: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(field) ? list.filter(f => f !== field) : [...list, field]);
  };

  // Step 1: File Upload
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900">Load Data</h2>
            <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-400'
            }`}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv,.json,.zip';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
              };
              input.click();
            }}
          >
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-blue-600">Processing...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-600 mb-1">Drop file here</p>
                <p className="text-xs text-slate-400">or click to browse</p>
              </>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <Package size={14} />
              <span><strong>.zip</strong> — data/ + images/ folder (recommended)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <FileSpreadsheet size={14} />
              <span><strong>.csv / .json</strong> — data only (no images)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Column Mapping
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Map Columns</h2>
            <p className="text-sm text-slate-400 mt-1">{fileName} — {rawData.length} rows, {columns.length} columns</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-8 overflow-x-auto">
          <table className="text-[10px] w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map(col => (
                  <th key={col} className="px-2 py-1 text-left font-bold text-slate-400 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map(col => (
                    <td key={col} className="px-2 py-1 text-slate-600 truncate max-w-[120px]">{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Required Roles */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Required Roles</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Title</label>
              <select value={titleField} onChange={e => setTitleField(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Image (optional)</label>
              <select value={imageField} onChange={e => setImageField(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">None</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Year Field</label>
              <select value={yearField} onChange={e => setYearField(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                <option value="">None</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Groupable Fields */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Groupable Fields (Stack By / Filter)</h3>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <button
                key={col}
                onClick={() => toggleField(col, groupableFields, setGroupableFields)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  groupableFields.includes(col)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {/* Display Fields */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Display Fields (Detail Modal)</h3>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <button
                key={col}
                onClick={() => toggleField(col, displayFields, setDisplayFields)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  displayFields.includes(col)
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
            Back
          </button>
          <button
            onClick={handleApply}
            disabled={!titleField}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            Apply & Render <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataLoader;
