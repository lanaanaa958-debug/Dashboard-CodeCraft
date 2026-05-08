import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc,
  query,
  limit
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Bell,
  Menu,
  X,
  PieChart,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  Zap,
  BarChart3,
  BrainCircuit,
  MessageSquareQuote,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'codecraft-admin';

const CATEGORIES = ['All', 'Web', 'Mobile', 'AI/ML', 'IoT', 'Game Dev', 'Cybersecurity'];
const STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
};

export default function App() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // AI Related State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const submissionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'ide_submissions');
    
    const unsubscribe = onSnapshot(submissionsRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const sortedData = data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setSubmissions(sortedData);
        setLoading(false);
        setPermissionError(false);
      }, 
      (error) => {
        if (error.code === 'permission-denied') setPermissionError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const analyzeIdeaWithAI = async (idea) => {
    setAiAnalyzing(true);
    setAiInsights(null);
    
    const systemPrompt = `Act as a senior technical project manager. Analyze the following project submission and provide structured feedback in JSON format. 
    Include:
    1. "summary": A 1-sentence catchy pitch.
    2. "feasibility": A number from 1-10.
    3. "challenges": An array of 3 potential technical hurdles.
    4. "recommendation": A short advice (Approve/Refine/Reject).`;

    const userPrompt = `Project Title: ${idea.judul_ide}\nCategory: ${idea.kategori}\nDescription: ${idea.deskripsi || idea.description}`;

    try {
      const apiKey = ""; // Canvas handles this
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const result = await response.json();
      const aiData = JSON.parse(result.candidates[0].content.parts[0].text);
      setAiInsights(aiData);
    } catch (error) {
      console.error("AI Analysis Error:", error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const generateExecutiveSummary = async () => {
    if (submissions.length === 0) return;
    setIsGeneratingSummary(true);
    
    const projectList = submissions.slice(0, 10).map(s => `- ${s.judul_ide} (${s.kategori})`).join('\n');
    
    try {
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ text: `Based on these recent submissions, identify the 3 most prominent trends and provide a 2-sentence outlook for the current project cycle:\n\n${projectList}` }] 
          }],
          systemInstruction: { parts: [{ text: "You are a Chief Technology Officer. Provide a professional, high-level executive summary." }] }
        })
      });

      const result = await response.json();
      setDashboardSummary(result.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error("Summary Error:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter(s => s.status === STATUSES.PENDING).length,
      approved: submissions.filter(s => s.status === STATUSES.APPROVED).length,
      rejected: submissions.filter(s => s.status === STATUSES.REJECTED).length,
    };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = 
        sub.nama_pengirim?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.judul_ide?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || sub.kategori === selectedCategory;
      const matchesTab = activeTab === 'archive' 
        ? sub.status === STATUSES.ARCHIVED 
        : sub.status !== STATUSES.ARCHIVED;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [submissions, searchQuery, selectedCategory, activeTab]);

  const updateStatus = async (id, newStatus) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ide_submissions', id);
      await updateDoc(docRef, { status: newStatus });
      if (selectedIdea?.id === id) setSelectedIdea(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error("Update Error:", error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex items-center gap-4 hover:border-slate-700 transition-all hover:translate-y-[-2px]">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`relative z-40 bg-slate-900 border-r border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-white">CodeCraft AI</span>}
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: PieChart },
            { id: 'submissions', label: 'Idea Board', icon: Lightbulb },
            { id: 'archive', label: 'Archive', icon: Archive },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-slate-900/50 backdrop-blur-md flex-shrink-0 border-b border-slate-800 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 p-2 hover:bg-slate-800 rounded-lg">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold capitalize text-white">{activeTab}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="Search ideas..."
                className="bg-slate-800/50 border border-slate-700 rounded-full pl-10 pr-4 py-2 w-64 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-9 w-9 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-500/20">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Permission Error */}
            {permissionError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400">
                <ShieldAlert size={20} />
                <p className="text-sm">Firestore permission denied. Check your Security Rules.</p>
                <button onClick={() => window.location.reload()} className="ml-auto p-1.5 hover:bg-rose-500/20 rounded-md transition-colors"><RefreshCw size={16}/></button>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Total Ideas" value={stats.total} icon={Lightbulb} colorClass="bg-blue-500/10 text-blue-500" />
                  <StatCard title="Pending Review" value={stats.pending} icon={Clock} colorClass="bg-yellow-500/10 text-yellow-500" />
                  <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} colorClass="bg-emerald-500/10 text-emerald-500" />
                  <StatCard title="Rejected" value={stats.rejected} icon={XCircle} colorClass="bg-rose-500/10 text-rose-500" />
                </div>

                {/* AI Summary Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BrainCircuit size={120} />
                  </div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Zap size={20} />
                      </div>
                      <h2 className="text-lg font-bold text-white">AI Executive Summary</h2>
                    </div>
                    <button 
                      onClick={generateExecutiveSummary}
                      disabled={isGeneratingSummary || submissions.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
                    >
                      {isGeneratingSummary ? <RefreshCw className="animate-spin" size={16}/> : <BrainCircuit size={16}/>}
                      {dashboardSummary ? 'Regenerate' : 'Analyze Submissions'}
                    </button>
                  </div>

                  <div className="min-h-[100px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-800/20 p-6 text-center">
                    {isGeneratingSummary ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                        </div>
                        <p className="text-sm text-slate-500 font-medium italic">Gemini is synthesizing submission trends...</p>
                      </div>
                    ) : dashboardSummary ? (
                      <p className="text-slate-300 text-sm leading-relaxed max-w-4xl">{dashboardSummary}</p>
                    ) : (
                      <p className="text-slate-500 text-sm">Click the button above to generate a high-level overview of recent student ideas.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Submissions Table Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Filter size={16} className="text-slate-500 shrink-0" />
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                        selectedCategory === cat 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/30 text-slate-400 text-[10px] uppercase tracking-[0.1em] font-bold">
                    <tr>
                      <th className="px-8 py-4">Sender</th>
                      <th className="px-8 py-4">Idea</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <AnimatePresence mode="popLayout">
                      {filteredSubmissions.length > 0 ? (
                        filteredSubmissions.map((sub) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            key={sub.id} 
                            className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                            onClick={() => {
                              setSelectedIdea(sub);
                              setAiInsights(null); // Reset AI insights on new selection
                            }}
                          >
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-indigo-400 font-bold border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  {sub.nama_pengirim?.[0] || '?'}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">{sub.nama_pengirim}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {sub.timestamp?.seconds ? new Date(sub.timestamp.seconds * 1000).toLocaleDateString() : 'Active'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 max-w-md">
                              <div className="text-sm text-slate-100 font-semibold truncate">{sub.judul_ide}</div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">{sub.deskripsi}</div>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                sub.status === STATUSES.APPROVED ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                sub.status === STATUSES.REJECTED ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                sub.status === STATUSES.ARCHIVED ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => updateStatus(sub.id, STATUSES.APPROVED)} 
                                  className="p-2 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle2 size={18}/>
                                </button>
                                <button 
                                  onClick={() => updateStatus(sub.id, STATUSES.REJECTED)} 
                                  className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <XCircle size={18}/>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-medium italic">
                            {loading ? (
                              <div className="flex flex-col items-center gap-3">
                                <RefreshCw className="animate-spin text-indigo-500" size={24}/>
                                <span>Establishing secure connection...</span>
                              </div>
                            ) : (
                              'No submissions found for the selected criteria.'
                            )}
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {}
      <AnimatePresence>
        {selectedIdea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedIdea(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Left Content: Submission Info */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-slate-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-600/30 mb-2 inline-block uppercase tracking-wider">
                      {selectedIdea.kategori}
                    </span>
                    <h2 className="text-2xl font-extrabold text-white leading-tight">{selectedIdea.judul_ide}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-8 p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {selectedIdea.nama_pengirim?.[0]}
                  </div>
                  <div>
                    <div className="font-bold text-white">{selectedIdea.nama_pengirim}</div>
                    <div className="text-xs text-slate-500 font-medium">Project Submitter</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BarChart3 size={14}/> Original Description
                    </h3>
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedIdea.deskripsi || selectedIdea.description}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => updateStatus(selectedIdea.id, STATUSES.APPROVED)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">Approve</button>
                    <button onClick={() => updateStatus(selectedIdea.id, STATUSES.REJECTED)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20">Reject</button>
                  </div>
                </div>
              </div>

              {/* Right Content: AI Insights */}
              <div className="w-full md:w-[380px] bg-slate-900/50 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Sparkles className="text-indigo-400" size={18}/>
                    AI Analysis
                  </h3>
                  <button onClick={() => setSelectedIdea(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <X size={20}/>
                  </button>
                </div>

                {!aiInsights && !aiAnalyzing ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-800">
                    <BrainCircuit size={40} className="text-slate-700 mb-4" />
                    <p className="text-sm text-slate-500 font-medium mb-4">Request a smart evaluation of this project idea.</p>
                    <button 
                      onClick={() => analyzeIdeaWithAI(selectedIdea)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={14}/> Analyze with Gemini
                    </button>
                  </div>
                ) : aiAnalyzing ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={24}/>
                    </div>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Computing Insights...</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        <MessageSquareQuote size={12}/> AI Pitch
                      </div>
                      <p className="text-sm text-indigo-200 italic font-medium leading-relaxed bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                        "{aiInsights.summary}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Feasibility</div>
                        <div className="text-2xl font-black text-white">{aiInsights.feasibility}<span className="text-slate-500 text-xs font-normal">/10</span></div>
                      </div>
                      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status</div>
                        <div className={`text-xs font-black uppercase ${
                          aiInsights.recommendation?.toLowerCase().includes('approve') ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {aiInsights.recommendation}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                        <AlertTriangle size={12} className="text-amber-500"/> Tech Challenges
                      </div>
                      <ul className="space-y-2">
                        {aiInsights.challenges?.map((c, i) => (
                          <li key={i} className="text-xs text-slate-400 flex gap-2 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      onClick={() => analyzeIdeaWithAI(selectedIdea)}
                      className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
                    >
                      Regenerate Analysis
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
