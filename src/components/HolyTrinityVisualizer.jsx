import React, { useState } from 'react';
import { DOMAINS, TRINITY_DATA } from '../data';

export default function HolyTrinityVisualizer() {
  const [selectedDomainNum, setSelectedDomainNum] = useState(null);
  const [selectedTrinityKey, setSelectedTrinityKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDomain = DOMAINS.find(d => d.num === selectedDomainNum);

  // Checks if a specific source in a pillar is associated with the selected domain
  const isSourceHighlighted = (pillarKey, sourceName) => {
    if (!selectedDomain) return false;
    const list = (pillarKey === 'P' ? selectedDomain.p : pillarKey === 'A' ? selectedDomain.a : selectedDomain.h) || [];
    
    const s = sourceName.toLowerCase().trim();
    return list.some(item => {
      const i = item.toLowerCase().trim();
      
      // Check if exact or substring match
      if (i === s || i.includes(s) || s.includes(i)) return true;
      
      // Custom mappings to connect raw domain terms to tree nodes:
      if (s === "monthly audit" && i.includes("monthly audit")) return true;
      if (s === "monthly audit" && i.includes("monthly reflection")) return true;
      if (s === "daily journaling" && i.includes("daily journaling")) return true;
      if (s === "daily journaling" && i.includes("journal sentiment")) return true;
      if (s === "inner circle" && i.includes("inner circle")) return true;
      if (s === "self-assessment" && (i.includes("self-assessment") || i.includes("self-reported") || i.includes("energy self-report") || i.includes("perceived exertion") || i.includes("food relationship") || i.includes("hunger cues") || i.includes("risk tolerance") || i.includes("autonomy feelings") || i.includes("satisfaction scores") || i.includes("career ambitions") || i.includes("risk awareness") || i.includes("estate intentions") || i.includes("presence quality") || i.includes("was that real?") || i.includes("comfort & satisfaction") || i.includes("maintenance intentions") || i.includes("relationship energy") || i.includes("experience ratings") || i.includes("bucket list") || i.includes("travel style") || i.includes("10th man challenge"))) return true;
      if (s === "conversational input" && i.includes("conversational")) return true;
      if (s === "belief declarations" && (i.includes("belief") || i.includes("position declarations"))) return true;
      
      if (s === "13 domain agents" && (i.includes("13 agents") || i.includes("domain agents") || i.includes("fitness agent") || i.includes("medical agent") || i.includes("financial agent") || i.includes("career agent") || i.includes("home agent") || i.includes("legal agent") || i.includes("social agent") || i.includes("family agent") || i.includes("temporal agent") || i.includes("epistemic agent") || i.includes("all domain agents"))) return true;
      if (s === "cross-domain signals" && (i.includes("cross-ref") || i.includes("signals") || i.includes("human moments"))) return true;
      if (s === "meta-agent synthesis" && i.includes("meta-agent")) return true;
      if (s === "six hat sub-agents" && i.includes("six hat")) return true;
      if (s === "10th man protocol" && i.includes("10th man")) return true;
      if (s === "longitudinal patterns" && (i.includes("pattern") || i.includes("trends") || i.includes("living layer") || i.includes("entropy tracker"))) return true;
      
      if (s === "financial systems" && (i.includes("bank") || i.includes("brokerage") || i.includes("tax") || i.includes("spend") || i.includes("receipt"))) return true;
      if (s === "wearable devices" && (i.includes("wearable") || i.includes("vitals") || i.includes("hrv") || i.includes("sleep") || i.includes("workout"))) return true;
      if (s === "medical records" && (i.includes("lab") || i.includes("doctor") || i.includes("pharmacy") || i.includes("therapy") || i.includes("clinical"))) return true;
      if (s === "calendar & time" && (i.includes("calendar") || i.includes("time tracking") || i.includes("meeting") || i.includes("time logs"))) return true;
      if (s === "google drive vault" && i.includes("vault")) return true;
      if (s === "app exports" && (i.includes("app") || i.includes("strava") || i.includes("myfitnesspal") || i.includes("logs") || i.includes("booking") || i.includes("reading") || i.includes("course"))) return true;
      if (s === "web & social" && (i.includes("web") || i.includes("social") || i.includes("usage") || i.includes("screen time") || i.includes("browsing") || i.includes("seekingalpha") || i.includes("x") || i.includes("linkedin") || i.includes("email") || i.includes("communication"))) return true;
      if (s === "property & assets" && (i.includes("property") || i.includes("mortgage") || i.includes("utility") || i.includes("maintenance") || i.includes("deeds") || i.includes("contract") || i.includes("will") || i.includes("trust") || i.includes("insurance") || i.includes("warranty"))) return true;
      
      return false;
    });
  };

  // Check if a pillar has any highlighted source for the selected domain
  const hasAssociatedSourcesInPillar = (pillarKey) => {
    if (!selectedDomain) return true;
    const pillarData = TRINITY_DATA.find(p => p.key === pillarKey);
    if (!pillarData) return false;
    return pillarData.sources.some(src => isSourceHighlighted(pillarKey, src.name));
  };

  // Filter domains based on search query and selectedTrinityKey
  const filteredDomains = DOMAINS.filter(d => {
    // Trinity filter
    if (selectedTrinityKey) {
      const hasSource = selectedTrinityKey === 'P' ? d.p.length > 0 : selectedTrinityKey === 'A' ? d.a.length > 0 : d.h.length > 0;
      if (!hasSource) return false;
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.num.includes(q) ||
      (d.p && d.p.some(s => s.toLowerCase().includes(q))) ||
      (d.a && d.a.some(s => s.toLowerCase().includes(q))) ||
      (d.h && d.h.some(s => s.toLowerCase().includes(q)))
    );
  });

  const getSourceId = (pillarKey, name) => `trinity-source-item-${pillarKey.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const handlePillarClick = (key) => {
    setSelectedTrinityKey(selectedTrinityKey === key ? null : key);
  };

  const handleDomainCardClick = (num) => {
    setSelectedDomainNum(selectedDomainNum === num ? null : num);
  };

  const handleClearFilters = () => {
    setSelectedDomainNum(null);
    setSelectedTrinityKey(null);
  };

  return (
    <div className="flex-1 p-8 sm:p-12 max-w-7xl mx-auto w-full font-sans antialiased text-[#D8E4F2] bg-[#090D16]">
      {/* Premium Header */}
      <header className="mb-12 border-b border-[#1C2840] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] text-[#4A6080] tracking-widest uppercase mb-2 font-mono">
            Digital Me · Sovereignty Architecture · R2 Visualizer
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-2">
            Holy Trinity <em className="italic text-[#E8B84B] font-normal font-serif">Data Sources</em>
          </h1>
          <p className="font-mono text-xs text-[#4A6080] tracking-widest uppercase">
            Perception Data (P) · Agent Feedback (A) · Hard Data (H)
          </p>
        </div>

        {/* Dynamic Search Box */}
        <div className="relative w-full md:w-80">
          <input
            id="datasources-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search data sources or domains..."
            className="w-full bg-[#0E1524] text-[#D8E4F2] border border-[#1C2840] focus:border-[#2DD4BF] rounded px-4 py-2 text-xs outline-none transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#4A6080] hover:text-[#D8E4F2] text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>
      </header>

      {/* ── VISUAL TREE LAYOUT ── */}
      <section className="mb-16 border border-[#1C2840] rounded-lg p-8 bg-[#0A0E1A]/40 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,160,48,0.02)_0%,transparent_70%)]" />
        
        {/* Title */}
        <div className="text-center mb-10">
          <span className="font-mono text-[9px] text-[#C8922A] uppercase tracking-widest border border-[#C8922A]/20 px-3 py-1 rounded bg-[#C8922A]/5">
            Sovereignty Flow Diagram
          </span>
        </div>

        {/* Tree Canvas */}
        <div className="flex flex-col items-center min-w-[900px] w-full select-none">
          {/* Root Node */}
          <div className="flex flex-col items-center">
            <div
              id="trinity-tree-root"
              className="border border-[#C8922A] bg-gradient-to-br from-[#1a2235] to-[#0f1825] rounded-lg px-8 py-4 text-center shadow-[0_0_25px_rgba(200,146,42,0.12),0_0_0_1px_rgba(200,146,42,0.06)] relative transition-all duration-300 z-20 hover:scale-[1.02]"
            >
              <div className="text-xl mb-1 text-[#C8922A] drop-shadow-[0_0_8px_rgba(200,146,42,0.5)]">✦</div>
              <h3 className="font-serif text-lg font-normal text-[#E8B84B] tracking-wide">
                Star of Mind — Digital Me
              </h3>
              <p className="font-mono text-[8px] text-[#4A6080] tracking-widest uppercase mt-1">
                All domain insights flow here
              </p>
            </div>
            
            {/* Stem from Root */}
            <div className="w-[1.5px] h-10 bg-gradient-to-b from-[#C8922A] to-[#1C2840]/60" />
          </div>

          {/* Trinity Horizontal Connector Bar */}
          <div className="w-full flex items-center px-[16.666%] mb-0 relative">
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#4FC3F7]/50 to-[#4FC3F7]" />
            <div className="w-2 h-2 rounded-full bg-[#1C2840] border border-[#1C2840]" />
            <div className="flex-1 h-[1.5px] bg-[#81C784]" />
            <div className="w-2 h-2 rounded-full bg-[#1C2840] border border-[#1C2840]" />
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-[#FF8A65] via-[#FF8A65]/50 to-transparent" />
          </div>

          {/* Column Layout */}
          <div className="grid grid-cols-3 gap-8 w-full mt-0">
            {TRINITY_DATA.map((pillar) => {
              const accentColor = pillar.color;
              const hasHighlight = selectedDomainNum !== null;
              const isPillarDimmed = selectedDomainNum !== null && !hasAssociatedSourcesInPillar(pillar.key);
              const isSelectedPillar = selectedTrinityKey === pillar.key;

              return (
                <div
                  key={pillar.key}
                  className={`flex flex-col items-center transition-opacity duration-300 ${
                    isPillarDimmed ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  {/* Stem down to Pillar Header */}
                  <div
                    className="w-[1.5px] h-8 transition-colors duration-300"
                    style={{ backgroundColor: selectedDomainNum || isSelectedPillar ? accentColor : '#1C2840' }}
                  />

                  {/* Pillar Header Card */}
                  <div
                    id={`trinity-source-${pillar.key}`}
                    onClick={() => handlePillarClick(pillar.key)}
                    className={`border rounded-md px-5 py-3 text-center w-64 bg-[#0A0D16] transition-all duration-300 relative cursor-pointer select-none ${
                      isSelectedPillar ? 'scale-105' : 'hover:scale-[1.01]'
                    }`}
                    style={{
                      borderColor: isSelectedPillar ? accentColor : (selectedDomainNum ? `${accentColor}50` : '#1C2840'),
                      boxShadow: isSelectedPillar || selectedDomainNum
                        ? `0 0 15px rgba(${pillar.hsl.split(',')[0]}, ${pillar.hsl.split(',')[1]}%, 0.15)`
                        : 'none'
                    }}
                  >
                    <div className="text-xl mb-1" style={{ color: accentColor }}>
                      {pillar.icon}
                    </div>
                    <h4 className="font-serif text-md font-normal text-[#D8E4F2]">{pillar.name}</h4>
                    <p className="font-mono text-[8px] text-[#4A6080] tracking-wider uppercase mt-0.5">
                      {pillar.sub}
                    </p>
                    {isSelectedPillar && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: accentColor }} />
                    )}
                  </div>

                  {/* Stem down to Source List */}
                  <div
                    className="w-[1.5px] h-10 transition-colors duration-300"
                    style={{ backgroundColor: selectedDomainNum || isSelectedPillar ? accentColor : '#1C2840' }}
                  />

                  {/* Horizontal Bar for Source Grid Branching */}
                  <div className="w-[80%] h-[1px] mb-4 bg-gradient-to-r from-transparent via-[#1C2840] to-transparent" />

                  {/* Source items block */}
                  <div className="flex flex-col gap-2 w-full px-4">
                    {pillar.sources.map((src) => {
                      const active = isSourceHighlighted(pillar.key, src.name);
                      const inactive = selectedDomainNum !== null && !active;

                      return (
                        <div
                          key={src.name}
                          id={getSourceId(pillar.key, src.name)}
                          className={`border rounded p-3 text-left transition-all duration-300 bg-[#070A12] ${
                            active
                              ? 'scale-[1.01] border-[1.5px]'
                              : 'border-[#1C2840]'
                          } ${inactive ? 'opacity-20' : 'opacity-100'}`}
                          style={{
                            borderColor: active ? accentColor : '#1C2840',
                            boxShadow: active
                              ? `0 0 12px rgba(${pillar.hsl.split(',')[0]}, ${pillar.hsl.split(',')[1]}%, 0.25)`
                              : 'none'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">{src.icon}</span>
                            <span className="font-sans text-[11px] font-semibold text-[#D8E4F2] tracking-wide">
                              {src.name}
                            </span>
                            {active && (
                              <span
                                className="ml-auto w-1.5 h-1.5 rounded-full animate-ping"
                                style={{ backgroundColor: accentColor }}
                              />
                            )}
                          </div>
                          <p className="font-mono text-[9px] text-[#4A6080] leading-normal uppercase">
                            {src.examples}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE MAPPING MATRIX ── */}
      <section className="border border-[#1C2840] rounded-lg p-6 bg-[#0E1524]/10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="font-serif text-xl font-normal text-[#E8B84B] font-serif">
              Domain → Primary Source Mapping Matrix
            </h3>
            <p className="text-[10px] text-[#4A6080] font-mono mt-1 uppercase tracking-wider">
              Select a domain card to trace its telemetry flows through the Holy Trinity
            </p>
          </div>
          {(selectedDomainNum !== null || selectedTrinityKey !== null) && (
            <button
              onClick={handleClearFilters}
              className="text-[10px] text-[#2DD4BF] border border-[#2DD4BF]/30 hover:border-[#2DD4BF] px-3 py-1 rounded bg-[#2DD4BF]/5 font-mono transition-colors cursor-pointer"
            >
              Clear Selection [×]
            </button>
          )}
        </div>

        {/* Matrix Grid */}
        <div id="mappingGrid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDomains.map((d) => {
            const isSelected = selectedDomainNum === d.num;
            
            // Build temporary source arrays matching E2E verification requirements
            // When selectedTrinityKey is active, only show sources belonging to that key in the card
            const showPerception = !selectedTrinityKey || selectedTrinityKey === 'P';
            const showAgent = !selectedTrinityKey || selectedTrinityKey === 'A';
            const showHard = !selectedTrinityKey || selectedTrinityKey === 'H';

            const perceptionList = showPerception ? (d.p || []) : [];
            const agentList = showAgent ? (d.a || []) : [];
            const hardList = showHard ? (d.h || []) : [];

            return (
              <div
                key={d.num}
                id={`domain-mapping-card-${d.num}`}
                onClick={() => handleDomainCardClick(d.num)}
                className={`border p-4 rounded-md cursor-pointer transition-all duration-300 text-left relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#0E1524] border-[1.5px] scale-[1.02]'
                    : 'border-[#1C2840] bg-[#0A0D16] hover:bg-white/[0.01] hover:border-[#4A6080]'
                }`}
                style={{
                  borderColor: isSelected ? d.color : '#1C2840',
                  boxShadow: isSelected
                    ? `0 0 15px ${d.color}25`
                    : 'none'
                }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3 border-b border-[#1C2840]/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base" style={{ color: d.color }}>{d.icon}</span>
                    <span className="font-serif text-lg font-normal text-[#D8E4F2]">{d.name}</span>
                  </div>
                  <span className="text-[9px] text-[#4A6080] font-mono">D·{d.num}</span>
                </div>

                {/* Tagline */}
                <div className="text-[10px] text-[#4A6080] font-mono mb-4 uppercase tracking-wider">
                  ↳ {d.tagline}
                </div>

                {/* Core source bindings */}
                <div className="space-y-3 font-mono text-[9px]">
                  {/* Perception */}
                  {perceptionList.length > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#4FC3F7] mb-1">
                        Perception Data (P)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perceptionList.map((s) => (
                          <span
                            key={s}
                            className="bg-[#4FC3F7]/5 border border-[#4FC3F7]/20 text-[#4FC3F7] px-2 py-0.5 rounded transition-all duration-300"
                            style={{
                              borderColor: isSelected ? '#4FC3F7' : 'rgba(79,195,247,0.2)',
                              backgroundColor: isSelected ? 'rgba(79,195,247,0.1)' : 'rgba(79,195,247,0.05)'
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent Feedback */}
                  {agentList.length > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#81C784] mb-1">
                        Agent Feedback (A)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {agentList.map((s) => (
                          <span
                            key={s}
                            className="bg-[#81C784]/5 border border-[#81C784]/20 text-[#81C784] px-2 py-0.5 rounded transition-all duration-300"
                            style={{
                              borderColor: isSelected ? '#81C784' : 'rgba(129,199,132,0.2)',
                              backgroundColor: isSelected ? 'rgba(129,199,132,0.1)' : 'rgba(129,199,132,0.05)'
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hard Data */}
                  {hardList.length > 0 && (
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wider text-[#FF8A65] mb-1">
                        Hard Data (H)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {hardList.map((s) => (
                          <span
                            key={s}
                            className="bg-[#FF8A65]/5 border border-[#FF8A65]/20 text-[#FF8A65] px-2 py-0.5 rounded transition-all duration-300"
                            style={{
                              borderColor: isSelected ? '#FF8A65' : 'rgba(255,138,101,0.2)',
                              backgroundColor: isSelected ? 'rgba(255,138,101,0.1)' : 'rgba(255,138,101,0.05)'
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDomains.length === 0 && (
            <div className="col-span-full border border-dashed border-[#1C2840] p-12 text-center text-[#4A6080] font-mono text-xs">
              No domain mappings match the current query.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
