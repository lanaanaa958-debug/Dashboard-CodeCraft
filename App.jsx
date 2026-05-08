import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, doc, updateDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  LayoutDashboard, Lightbulb, CheckCircle2, XCircle, 
  Search, RefreshCw, AlertTriangle, ChevronRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBR3_Au3SqzIEA0Xk5fAmzvtCw3xBWjbOk",
  authDomain: "codecraft-dasboard.firebaseapp.com",
  projectId: "codecraft-dasboard",
  storageBucket: "codecraft-dasboard.appspot.com",
  messagingSenderId: "7845123690",
  appId: "1:7845123690:web:abc123def456"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedIdea, setSelectedIdea] = useState(null);

  useEffect(() => {
    const startApp = async () => {
      try {
        await signInAnonymously(auth);
        // Struktur path sesuai instruksi sebelumnya
        const ideasCol = collection(db, 'artifacts', 'codecraft-dasboard', 'public', 'data', 'ide_submissions');
        
        const unsubscribe = onSnapshot(ideasCol, (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setIdeas(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
          setLoading(false);
        }, (err) => {
          setError("Izin ditolak. Cek tab 'Rules' di Firebase Console.");
          setLoading(false);
        });
        return unsubscribe;
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    startApp();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const docRef = doc(db, 'artifacts', 'codecraft-dasboard', 'public', 'data', 'ide_submissions', id);
      await updateDoc(docRef, { status });
      setSelectedIdea(null);
    } catch (err) { alert("Gagal update: " + err.message); }
  };

  const filtered = useMemo(() => {
    return ideas.filter(i => {
      const matchSearch = (i.judul_ide || "").toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || i.status === filter;
      return matchSearch && matchFilter;
    });
  }, [ideas, search, filter]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-blue-500">Memuat Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold">CodeCraft Admin</h1>
            <p className="text-slate-500 text-sm">Real-time Ide Monitor</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full text-xs font-bold border border-emerald-500/20">
            ● Live System
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-8">
          <input 
            className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-xl outline-none focus:border-blue-500"
            placeholder="Cari ide..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="bg-slate-900 border border-slate-800 p-3 rounded-xl outline-none"
            value={filter} onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        {/* Grid Ide */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(idea => (
            <motion.div 
              layout key={idea.id} onClick={() => setSelectedIdea(idea)}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/50 cursor-pointer transition-all"
            >
              <span className={`text-[10px] font-bold uppercase p-1 rounded ${idea.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {idea.status || 'pending'}
              </span>
              <h3 className="text-lg font-bold mt-2">{idea.judul_ide}</h3>
              <p className="text-slate-400 text-sm line-clamp-2 mt-2">{idea.deskripsi}</p>
              <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
                Oleh: {idea.nama_pengirim}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal Detail */}
        <AnimatePresence>
          {selectedIdea && (
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedIdea(null)} />
              <motion.div initial={{y: 50}} animate={{y: 0}} className="relative bg-slate-900 border border-slate-800 p-8 rounded-[2rem] w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-2">{selectedIdea.judul_ide}</h2>
                <p className="text-blue-400 text-sm mb-6">Pengirim: {selectedIdea.nama_pengirim}</p>
                <p className="text-slate-300 mb-8 leading-relaxed">{selectedIdea.deskripsi}</p>
                
                <div className="flex gap-4">
                  <button onClick={() => updateStatus(selectedIdea.id, 'rejected')} className="flex-1 bg-red-500/10 text-red-500 py-3 rounded-xl font-bold">Tolak</button>
                  <button onClick={() => updateStatus(selectedIdea.id, 'approved')} className="flex-1 bg-blue-600 py-3 rounded-xl font-bold">Setujui</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
