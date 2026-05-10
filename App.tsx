import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import IdeaBoard from './components/IdeaBoard';
import ProjectManager from './components/ProjectManager';
import ActivityGallery from './components/ActivityGallery';
import { TabType } from './types';
import { getIdeas, getProjects, getActivities } from './lib/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ideas');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = {
    ideas: getIdeas().length,
    projects: getProjects().length,
    activities: getActivities().length,
  };

  const newIdeasCount = getIdeas().filter((i) => i.status === 'new').length;

  return (
    <div className="min-h-screen bg-[#060b18] text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d1f3c',
            color: '#fff',
            border: '1px solid rgba(6,182,212,0.2)',
            fontSize: '13px',
            fontFamily: 'JetBrains Mono, monospace',
          },
        }}
      />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.02]"
          style={{
            background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.015]"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <main
        className="transition-all duration-300 min-h-screen"
        style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 border-b border-white/5 backdrop-blur-xl bg-[#060b18]/80">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Online</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-xs font-mono text-gray-600">
              {currentTime.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
              <span>
                <span className="text-cyan-400">{stats.ideas}</span> ideas
              </span>
              <span className="text-white/10">|</span>
              <span>
                <span className="text-emerald-400">{stats.projects}</span> projects
              </span>
              <span className="text-white/10">|</span>
              <span>
                <span className="text-purple-400">{stats.activities}</span> photos
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-xs font-mono text-cyan-400/70">
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'ideas' && <IdeaBoard />}
              {activeTab === 'projects' && <ProjectManager />}
              {activeTab === 'gallery' && <ActivityGallery />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
