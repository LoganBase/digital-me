import React, { useState } from 'react';
import { PRINCIPLES, SOVEREIGNTY_WORDS } from '../data';

export default function PrinciplesExplorer() {
  const [principlesQuery, setPrinciplesQuery] = useState('');
  const [selectedPrinciple, setSelectedPrinciple] = useState(null);

  // Filter principles
  const filteredPrinciples = PRINCIPLES.filter((p) => {
    const q = principlesQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.num.includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.sovereignty.toLowerCase().includes(q) ||
      p.refinement.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.implication.toLowerCase().includes(q) ||
      p.roots.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 p-8 sm:p-12 max-w-6xl mx-auto w-full animate-[fadeIn_0.35s_ease-out_forwards] font-sans">
      <header className="mb-12 border-b border-[#1C2840] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] text-[#4A6080] tracking-widest uppercase mb-2 font-mono">
            Digital Me · Star of Mind · Version 2.0
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-2">
            The Ten <em className="italic text-[#E8B84B] font-normal">Principles</em>
          </h1>
          <p className="font-mono text-xs text-[#4A6080] tracking-widest uppercase">
            A Sovereignty Architecture for Human Flourishing
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <input
            id="principles-search-input"
            type="text"
            value={principlesQuery}
            onChange={(e) => setPrinciplesQuery(e.target.value)}
            placeholder="Search principles..."
            className="w-full bg-[#0E1524] text-[#D8E4F2] border border-[#1C2840] focus:border-[#D4A030] rounded px-4 py-2 text-xs outline-none transition-colors font-mono"
          />
          {principlesQuery && (
            <button
              onClick={() => setPrinciplesQuery('')}
              className="absolute right-3 top-2.5 text-[#4A6080] hover:text-[#D8E4F2] text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>
      </header>

      {/* Thread Bar Navigation */}
      <div id="threadBar" className="flex flex-wrap gap-2 mb-8 border border-[#1C2840] p-4 bg-[#0E1524]/50 rounded">
        <span className="text-[10px] text-[#4A6080] uppercase tracking-wider self-center mr-2 font-mono">
          Jump to:
        </span>
        {PRINCIPLES.map((p, idx) => (
          <button
            key={p.num}
            onClick={() => setSelectedPrinciple(selectedPrinciple === p.num ? null : p.num)}
            className={`px-3 py-1 text-[10px] font-mono border rounded transition-all duration-200 cursor-pointer ${
              selectedPrinciple === p.num
                ? 'bg-[#D4A030]/20 text-[#E8B84B] border-[#D4A030]'
                : 'border-[#1C2840] text-[#4A6080] hover:border-[#4A6080] hover:text-[#8EA8C8]'
            }`}
          >
            <span className="font-bold mr-1" style={{ color: p.color }}>
              {p.num}
            </span>
            {SOVEREIGNTY_WORDS[idx]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPrinciples.map((p) => {
          const isSelected = selectedPrinciple === p.num;
          return (
            <article
              key={p.num}
              id={`principle-card-${p.num}`}
              className={`border transition-all duration-300 p-6 rounded-md relative flex flex-col ${
                isSelected
                  ? 'bg-[#0E1524] border-[#D4A030] shadow-[0_0_15px_rgba(212,160,48,0.15)] scale-[1.01]'
                  : 'border-[#1C2840] bg-white/[0.01] hover:bg-white/[0.02]'
              }`}
            >
              <div className="absolute top-4 right-4 text-[10px] text-[#4A6080] font-mono uppercase tracking-widest">
                P·{p.num}
              </div>
              <div className="font-mono text-[11px] mb-2 font-semibold tracking-wider" style={{ color: p.color }}>
                PRINCIPLE {p.num}
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#E8B84B] mb-2 font-normal">
                {p.title}
              </h3>
              <div className="text-[10px] text-[#4A6080] italic mb-4 font-mono tracking-wide">
                ↳ {p.sovereignty} · {p.refinement}
              </div>
              <p className="text-xs text-[#8EA8C8] leading-relaxed mb-6 font-mono">
                {p.body}
              </p>
              <div className="mt-auto border-t border-[#1C2840]/60 pt-4 bg-[#0A0E1A]/40 -mx-6 -mb-6 p-6 rounded-b-md">
                <div className="text-[9px] text-[#4A6080] font-bold uppercase tracking-wider mb-2 font-mono">
                  What this means for DigitalMe
                </div>
                <p className="text-[11px] text-[#D8E4F2] leading-relaxed font-serif italic">
                  "{p.implication}"
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {p.roots.map((r) => (
                    <span
                      key={r}
                      className="text-[9px] bg-white/[0.03] text-[#4D6A94] border border-[#1C2840] px-2 py-0.5 rounded font-mono"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}

        {filteredPrinciples.length === 0 && (
          <div className="col-span-full border border-dashed border-[#1C2840] p-12 text-center text-[#4A6080] font-mono text-xs">
            No principles match your search criteria. Try another keyword.
          </div>
        )}
      </div>
    </div>
  );
}
