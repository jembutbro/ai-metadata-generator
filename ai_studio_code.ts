import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileVideo, 
  Trash2, 
  Download, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  FileSpreadsheet,
  ChevronRight,
  LayoutDashboard,
  Settings,
  BarChart3,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VideoItem {
  id: string;
  filename: string;
  tempPath: string;
  mimetype: string;
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  metadata?: {
    title: string;
    keywords: string;
    category: string;
  };
  error?: string;
}

const CATEGORIES = [
  "Animals", "Buildings and Architecture", "Business", "Drinks", "The Environment", 
  "States of Mind", "Food", "Graphic Resources", "Healthy and Wellness", "People", 
  "Industry", "Landscapes", "Lifestyle", "Nature", "Night Photography", "Pastimes", 
  "Plants and Flowers", "Religion and Culture", "Science", "Social Issues", "Sports", 
  "Technology", "Transport", "Travel", "Other"
];

export default function App() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith("video/")).slice(0, 100);
    if (validFiles.length === 0) return;

    const formData = new FormData();
    validFiles.forEach(file => formData.append("videos", file));

    const newItems: VideoItem[] = validFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      filename: f.name,
      tempPath: "",
      mimetype: f.type,
      status: "uploading",
      progress: 10,
    }));
    setItems(prev => [...prev, ...newItems]);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.files) {
        setItems(prev => {
          const updated = [...prev];
          data.files.forEach((serverFile: any) => {
            const index = updated.findIndex(item => item.filename === serverFile.originalName && item.status === "uploading");
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                tempPath: serverFile.tempPath,
                status: "idle",
                progress: 100,
              };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const processBatch = async () => {
    const idleItems = items.filter(i => i.status === "idle");
    if (idleItems.length === 0) return;

    setIsProcessing(true);
    const batchSize = 5;
    for (let i = 0; i < idleItems.length; i += batchSize) {
      const batch = idleItems.slice(i, i + batchSize);
      await Promise.all(batch.map(item => processItem(item)));
    }
    setIsProcessing(false);
  };

  const processItem = async (item: VideoItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing", progress: 20 } : i));

    try {
      const res = await fetch("/api/generate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempPath: item.tempPath,
          originalName: item.filename,
          mimetype: item.mimetype
        }),
      });
      const data = await res.json();

      setItems(prev => prev.map(i => i.id === item.id ? { 
        ...i, 
        status: data.error ? "error" : "success", 
        metadata: {
          title: data.title,
          keywords: data.keywords,
          category: data.category
        },
        error: data.error,
        progress: 100 
      } : i));
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: "AI Failed" } : i));
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateMetadata = (id: string, field: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { 
      ...i, 
      metadata: i.metadata ? { ...i.metadata, [field]: value } : undefined 
    } : i));
  };

  const downloadCSV = () => {
    const readyItems = items.filter(i => i.status === "success").map(i => ({
      filename: i.filename,
      title: i.metadata?.title || "",
      keywords: i.metadata?.keywords || "",
      category: i.metadata?.category || "Other"
    }));
    if (readyItems.length === 0) return;
    const data = encodeURIComponent(JSON.stringify(readyItems));
    window.open(`/api/export-csv?data=${data}`, "_blank");
  };

  const successCount = items.filter(i => i.status === "success").length;
  const analyzingCount = items.filter(i => i.status === "processing").length;

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 bg-white border-r border-slate-200">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-200">
          <Zap size={20} fill="currentColor" />
        </div>
        <nav className="flex flex-col gap-6">
          <div className="p-2 text-indigo-600 bg-indigo-50 rounded-lg cursor-pointer">
            <LayoutDashboard size={20} />
          </div>
          <div className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
            <BarChart3 size={20} />
          </div>
          <div className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
            <Settings size={20} />
          </div>
        </nav>
        <div className="mt-auto p-2 text-slate-400 cursor-pointer">
          <Info size={20} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">StockAI Batch Gen</h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">v2.4.0</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Batch</p>
              <p className="text-sm font-bold text-slate-700">{items.length}/100 Files</p>
            </div>
            <button 
              onClick={downloadCSV}
              disabled={successCount === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-100"
            >
              <Download size={16} />
              Export Adobe CSV ({successCount})
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Main Workspace Area */}
          <div className="flex-[3] flex flex-col gap-6 min-w-0">
            {/* Dropzone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                bg-white border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 transition-all cursor-pointer group
                ${isDragging ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"}
              `}
            >
              <input type="file" multiple accept="video/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              <Upload className={`mb-3 transition-transform duration-300 ${isDragging ? "scale-110 text-indigo-600" : "group-hover:translate-y-[-2px]"}`} size={32} />
              <p className="text-sm font-bold text-slate-600">
                <span className="text-indigo-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs mt-1 font-medium text-slate-400">Maximum 100 MP4/MOV files per batch</p>
            </div>

            {/* Batch Table Area */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Batch Metadata Preview</h2>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded uppercase font-bold">{successCount} Ready</span>
                  {analyzingCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold animate-pulse">{analyzingCount} Analyzing</span>
                  )}
                  {items.some(i => i.status === "idle") && (
                    <button 
                      onClick={processBatch}
                      disabled={isProcessing}
                      className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded uppercase font-bold hover:bg-indigo-700"
                    >
                      Process AI
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50/80 text-slate-400 text-[10px] uppercase sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-bold tracking-wider">Filename</th>
                      <th className="px-5 py-3 font-bold tracking-wider">Status</th>
                      <th className="px-5 py-3 font-bold tracking-wider">Keywords Preview</th>
                      <th className="px-5 py-3 font-bold tracking-wider">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-20 text-center text-slate-400">
                          <p className="text-sm italic">No files uploaded yet. Start by dropping videos above.</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`
                            cursor-pointer transition-colors group
                            ${selectedId === item.id ? "bg-indigo-50/40 border-l-4 border-indigo-500" : "hover:bg-slate-50"}
                          `}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <FileVideo size={16} className={selectedId === item.id ? "text-indigo-600" : "text-slate-300"} />
                              <span className={`font-bold truncate max-w-[180px] ${selectedId === item.id ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}>
                                {item.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {item.status === "uploading" && (
                                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px] uppercase">
                                  <Loader2 size={12} className="animate-spin" /> Uploading
                                </div>
                              )}
                              {item.status === "idle" && (
                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] uppercase">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Pending
                                </div>
                              )}
                              {item.status === "processing" && (
                                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px] uppercase animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Testing AI
                                </div>
                              )}
                              {item.status === "success" && (
                                <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[11px] uppercase">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Ready
                                </div>
                              )}
                              {item.status === "error" && (
                                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[11px] uppercase">
                                  <AlertCircle size={12} /> Failed
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">
                              {item.metadata?.keywords || "---"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold text-slate-500">{item.metadata?.category || "---"}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Inspector Panel */}
          <aside className="w-80 bg-white border border-slate-200 rounded-xl flex flex-col shadow-lg">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800">File Inspector</h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {selectedItem ? selectedItem.filename : "Select a file to edit"}
                </p>
              </div>
              {selectedId && (
                <button onClick={() => removeItem(selectedId)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-md transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {selectedItem && selectedItem.status === "success" && selectedItem.metadata ? (
                <div className="space-y-6">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title (Max 70)</label>
                    <textarea 
                      value={selectedItem.metadata.title}
                      onChange={(e) => updateMetadata(selectedItem.id, "title", e.target.value)}
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none font-medium leading-relaxed"
                      placeholder="Describe your video..."
                      maxLength={70}
                    />
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-slate-400 font-bold">{selectedItem.metadata.title.length} / 70 characters</span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select 
                      value={selectedItem.metadata.category}
                      onChange={(e) => updateMetadata(selectedItem.id, "category", e.target.value)}
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium appearance-none"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keywords (49 Required)</label>
                      <span className={`text-[10px] font-bold ${selectedItem.metadata.keywords.split(",").filter(k => k.trim()).length === 49 ? "text-green-600" : "text-amber-500"}`}>
                        {selectedItem.metadata.keywords.split(",").filter(k => k.trim()).length}/49
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto">
                      {selectedItem.metadata.keywords.split(",").map((kw, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-bold border border-indigo-100 flex items-center gap-1 group">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">AI ensures exact count. Edit in text mode if needed.</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
                    <CheckCircle2 size={14} />
                    Verified for Export
                  </button>
                </div>
              ) : selectedItem && (selectedItem.status === "processing" || selectedItem.status === "uploading") ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-100 border-t-indigo-600 animate-spin" />
                  <div>
                    <h4 className="font-bold text-slate-700">Analyzing Content</h4>
                    <p className="text-xs text-slate-400 mt-1">Our AI is generating SEO-ready metadata for you.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4 border-2 border-dashed border-slate-100 rounded-xl m-2">
                  <div className="p-3 bg-slate-50 rounded-full text-slate-300">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-400">Inspector Idle</h4>
                    <p className="text-[11px] text-slate-300 mt-1">Select a file to view or edit generated metadata.</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Status Bar */}
        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-100"></div> AI Engine Ready</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Cloud Storage Sync</span>
          </div>
          <div className="flex items-center gap-1 opacity-70">
            Design Version <span className="text-slate-600">Sleek Interface v1</span>
          </div>
        </footer>
      </main>
    </div>
  );
}