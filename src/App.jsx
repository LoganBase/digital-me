import React, { useState } from 'react';
import PrinciplesExplorer from './components/PrinciplesExplorer';
import InteractiveDashboard from './components/InteractiveDashboard';
import HolyTrinityVisualizer from './components/HolyTrinityVisualizer';
import DecryptionGate from './components/DecryptionGate';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('digitalme_api_token') || '');
  const [isTokenSaved, setIsTokenSaved] = useState(() => !!localStorage.getItem('digitalme_api_token'));

  const handleUnlock = (token) => {
    setApiToken(token);
    setIsTokenSaved(true);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('digitalme_api_token');
    setApiToken('');
    setIsTokenSaved(false);
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: '⌂', num: '' },
    { id: 'principles', label: 'Principles', icon: '◎', num: '01' },
    { id: 'domains', label: 'Domains', icon: '◈', num: '02' },
    { id: 'datasources', label: 'Data Sources', icon: '⊕', num: '03' }
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-[#D8E4F2] font-mono flex flex-col selection:bg-[#D4A030]/30 selection:text-[#E8B84B]">
      
      {/* ── Shell Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#090D16]/92 backdrop-blur-md border-b border-[#1C2840] flex items-stretch h-[56px]">
        <div 
          id="brand-logo"
          className="flex items-center gap-[10px] px-6 border-r border-[#1C2840] cursor-pointer shrink-0 select-none"
          onClick={() => setActiveTab('home')}
        >
          <span className="text-[18px] text-[#D4A030] drop-shadow-[0_0_6px_rgba(212,160,48,0.5)]">✦</span>
          <span className="font-serif text-[17px] font-normal text-[#E8B84B] tracking-wider font-serif">DigitalMe</span>
          <span className="font-mono text-[9px] text-[#4A6080] tracking-widest px-[5px] py-[2px] border border-[#1C2840] rounded-[2px] hidden sm:inline-block">V2.0</span>
        </div>
        
        <div className="flex items-stretch flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-[14px] sm:px-6 border-r border-[#1C2840] cursor-pointer transition-all duration-200 font-mono text-[11px] tracking-wider uppercase relative select-none outline-none ${
                  isActive 
                    ? 'text-[#D4A030] bg-[#D4A030]/[0.05]' 
                    : 'text-[#4A6080] hover:bg-white/[0.03] hover:text-[#8EA8C8]'
                }`}
              >
                <span className="text-[14px]">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.num && <span className="text-[9px] opacity-50 ml-[2px]">{tab.num}</span>}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4A030]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-4 px-6 ml-auto border-l border-[#1C2840]">
          <span className="font-mono text-[9px] tracking-widest text-[#2A3A55] uppercase">Sovereignty Architecture</span>
          <span className="font-mono text-[9px] tracking-widest text-[#2A3A55] uppercase">Star of Mind</span>
        </div>
      </nav>

      {/* ── Page Content Container ── */}
      <main className="pt-[56px] flex-1 flex flex-col animate-[fadeIn_0.35s_ease-out_forwards]">
        {activeTab === 'home' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center px-6 py-20 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_30%,rgba(59,130,246,0.05)_0%,transparent_55%),radial-gradient(ellipse_at_70%_70%,rgba(212,160,48,0.04)_0%,transparent_55%)]" />
            
            <div className="text-[64px] mb-6 text-[#D4A030] drop-shadow-[0_0_32px_rgba(212,160,48,0.5)] animate-pulse">✦</div>
            
            <h1 className="font-serif text-[48px] sm:text-[72px] font-light leading-none tracking-tight mb-4">
              Digital<em className="italic text-[#E8B84B] font-normal font-serif">Me</em>
            </h1>
            
            <p className="font-mono text-[13px] text-[#4A6080] tracking-widest uppercase mb-16">
              Sovereignty Architecture · Version 2.0 · Star of Mind
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] w-full mb-16 z-10">
              {/* Card: Principles */}
              <div 
                id="home-card-principles"
                onClick={() => setActiveTab('principles')}
                className="group bg-white/[0.01] hover:bg-white/[0.03] border border-[#1C2840] hover:border-[#3B82F6] rounded-md p-6 text-left cursor-pointer transition-all duration-200 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#3B82F6] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="text-[28px] mb-3 text-[#3B82F6]">◎</div>
                <div className="font-mono text-[9px] text-[#3B82F6] tracking-widest uppercase mb-2">View 01</div>
                <h3 className="font-serif text-[22px] text-[#D8E4F2] mb-2 font-normal">10 Principles</h3>
                <p className="font-mono text-[11px] text-[#4A6080] leading-relaxed">
                  The founding laws of the Core — sovereignty over time, truth, identity, information, relationships, action, failure, wealth, self-knowledge, and the system itself.
                </p>
                <span className="absolute bottom-5 right-5 text-[#3B82F6] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200">→</span>
              </div>

              {/* Card: Domains */}
              <div 
                id="home-card-domains"
                onClick={() => setActiveTab('domains')}
                className="group bg-white/[0.01] hover:bg-white/[0.03] border border-[#1C2840] hover:border-[#C8922A] rounded-md p-6 text-left cursor-pointer transition-all duration-200 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#C8922A] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="text-[28px] mb-3 text-[#C8922A]">◈</div>
                <div className="font-mono text-[9px] text-[#C8922A] tracking-widest uppercase mb-2">View 02</div>
                <h3 className="font-serif text-[22px] text-[#D8E4F2] mb-2 font-normal">13 Domains</h3>
                <p className="font-mono text-[11px] text-[#4A6080] leading-relaxed">
                  14 agents orbiting the Star of Mind — Medical, Fitness, Financial, Career, Legal, Family, Home, Social, Travel, Mind, Epistemic, Nutrition, Temporal — plus Core.
                </p>
                <span className="absolute bottom-5 right-5 text-[#C8922A] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200">→</span>
              </div>

              {/* Card: Data Sources */}
              <div 
                id="home-card-datasources"
                onClick={() => setActiveTab('datasources')}
                className="group bg-white/[0.01] hover:bg-white/[0.03] border border-[#1C2840] hover:border-[#2DD4BF] rounded-md p-6 text-left cursor-pointer transition-all duration-200 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#2DD4BF] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="text-[28px] mb-3 text-[#2DD4BF]">⊕</div>
                <div className="font-mono text-[9px] text-[#2DD4BF] tracking-widest uppercase mb-2">View 03</div>
                <h3 className="font-serif text-[22px] text-[#D8E4F2] mb-2 font-normal">Data Sources</h3>
                <p className="font-mono text-[11px] text-[#4A6080] leading-relaxed">
                  The Holy Trinity tree — Perception Data, Agent Feedback, and Hard Data — mapping every source to every domain across the entire architecture.
                </p>
                <span className="absolute bottom-5 right-5 text-[#2DD4BF] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200">→</span>
              </div>
            </div>

            <p className="font-serif text-[15px] sm:text-[18px] italic text-[#2A3A55] max-w-[640px] leading-relaxed">
              "I am a finite person with limited time, unlimited capacity for self-deception, and a genuine desire to live in alignment with my values. The Star of Mind is my living self-model. It is never finished. It is always becoming."
            </p>
          </div>
        )}

        {activeTab === 'principles' && <PrinciplesExplorer />}
        {activeTab === 'domains' && (
          isTokenSaved ? (
            <InteractiveDashboard apiToken={apiToken} isTokenSaved={isTokenSaved} onDisconnect={handleDisconnect} />
          ) : (
            <DecryptionGate onUnlock={handleUnlock} />
          )
        )}
        {activeTab === 'datasources' && (
          isTokenSaved ? (
            <HolyTrinityVisualizer apiToken={apiToken} isTokenSaved={isTokenSaved} onDisconnect={handleDisconnect} />
          ) : (
            <DecryptionGate onUnlock={handleUnlock} />
          )
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-[#1C2840] text-center text-[9px] text-[#2A3A55] tracking-widest uppercase font-mono mt-auto">
        Digital Me · Core V2.0 · Sovereignty Architecture
      </footer>
    </div>
  );
}
