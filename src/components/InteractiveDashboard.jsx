import React, { useState, useEffect } from 'react';
import { DOMAINS, CONNECTIONS_MAP, BUS_SIGNALS } from '../data';

export default function InteractiveDashboard() {
  const [activeNode, setActiveNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Live Telemetry Sync State
  const [telemetry, setTelemetry] = useState(null);
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('digitalme_api_token') || '');
  const [isTokenSaved, setIsTokenSaved] = useState(() => !!localStorage.getItem('digitalme_api_token'));
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryError, setTelemetryError] = useState(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const fetchTelemetry = async () => {
    setLoadingTelemetry(true);
    setTelemetryError(null);
    try {
      const res = await fetch('https://digital-me-ingest.shane-logan.workers.dev/api/telemetry/summary', {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Unauthorized: Invalid API Token');
        }
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setTelemetry(json.data);
      } else {
        throw new Error(json.error || 'Failed to load telemetry');
      }
    } catch (err) {
      console.error(err);
      setTelemetryError(err.message);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    if (isTokenSaved && apiToken) {
      fetchTelemetry();
    }
  }, [isTokenSaved, apiToken]);

  const handleNodeClick = (num) => {
    if (activeNode === num) {
      setActiveNode(null);
    } else {
      setActiveNode(num);
      // Scroll corresponding card into view
      const cardEl = document.getElementById(`domain-card-${num}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const getCardBorderColor = (d) => {
    const isHighlighted = activeNode === d.num || hoveredNode === d.num;
    if (isHighlighted) {
      return d.color;
    }
    return '#1C2840';
  };

  const getCardShadow = (d) => {
    const isHighlighted = activeNode === d.num || hoveredNode === d.num;
    if (isHighlighted) {
      return `0 0 15px rgba(${d.hsl.split(',')[0]}, ${d.hsl.split(',')[1]}, 0.15)`;
    }
    return 'none';
  };

  // Separate bus nodes into top and bottom rows for visualizer
  const topBusNodes = DOMAINS.filter(d => !d.isCore && parseInt(d.num) <= 6);
  const bottomBusNodes = DOMAINS.filter(d => !d.isCore && parseInt(d.num) > 6);

  const getBusNodeColorClass = (num) => {
    const isActive = activeNode === num;
    const isHovered = hoveredNode === num;
    const isConnected = activeNode && CONNECTIONS_MAP[activeNode]?.includes(num);

    if (isActive) return 'opacity-100 border-[#D4A030] bg-[#D4A030]/10 scale-105';
    if (isHovered) return 'opacity-100 border-white bg-white/5 scale-105';
    if (isConnected) return 'opacity-85 border-dashed scale-100';
    return 'opacity-60 border-[#1C2840] scale-100';
  };

  const getBusLineColor = (num) => {
    const d = DOMAINS.find(x => x.num === num);
    const isActive = activeNode === num || hoveredNode === num;
    const isConnected = activeNode && CONNECTIONS_MAP[activeNode]?.includes(num);

    if (isActive) return d.color;
    if (isConnected) return 'rgba(212,160,48,0.5)';
    return '#1C2840';
  };

  return (
    <div className="w-full flex-1 flex flex-col font-sans select-none p-8 sm:p-12 max-w-6xl mx-auto">
      <style>{`
        @keyframes pulseBus {
          0%, 100% { opacity: 0.25; transform: scaleY(0.95); }
          50% { opacity: 0.6; transform: scaleY(1.05); }
        }
        @keyframes flowSignal {
          0% { left: -10px; }
          100% { left: calc(100% + 10px); }
        }
        .animate-bus-pulse {
          animation: pulseBus 3s infinite ease-in-out;
        }
        .animate-signal-flow-1 {
          animation: flowSignal 4s infinite linear;
        }
        .animate-signal-flow-2 {
          animation: flowSignal 6s infinite linear 2s;
        }
      `}</style>

      <header className="mb-12 border-b border-[#1C2840] pb-8">
        <div className="text-[10px] text-[#4A6080] tracking-widest uppercase mb-2 font-mono">
          Digital Me · Architecture · Version 2.0
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-light mb-2">
          The <em className="italic text-[#E8B84B] font-normal font-serif">13 Domains</em>
        </h1>
        <p className="font-mono text-xs text-[#4A6080] tracking-widest uppercase">
          14 agents · 1 shared data bus · 1 sovereign commander
        </p>
      </header>

      {/* ── API TOKEN SETTINGS ── */}
      <div className="mb-6 p-4 border border-[#1C2840] bg-[#0E1524]/20 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-[11px] select-text">
        <div className="flex items-center gap-2">
          <span className="text-[#D4A030]">•</span>
          <span className="text-[#8EA8C8] uppercase tracking-wider">Cloudflare Ingestion API Sync:</span>
          {isTokenSaved ? (
            <span className="text-[#10B981] font-semibold uppercase">Connected</span>
          ) : (
            <span className="text-[#F43F5E] font-semibold uppercase">Disconnected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isTokenSaved ? (
            <>
              <span className="text-[#4A6080]">Token: ••••••••••••</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('digitalme_api_token');
                  setIsTokenSaved(false);
                  setTelemetry(null);
                }}
                className="text-[#F43F5E] hover:underline cursor-pointer bg-transparent border-none outline-none font-semibold uppercase tracking-wider"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <input 
                type="password" 
                placeholder="Enter AUTH_SECRET" 
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="bg-[#0A0E1A] border border-[#1C2840] text-[#D8E4F2] px-3 py-1 rounded outline-none w-48 focus:border-[#D4A030] transition-colors"
              />
              <button 
                onClick={() => {
                  localStorage.setItem('digitalme_api_token', apiToken);
                  setIsTokenSaved(true);
                }}
                className="bg-[#D4A030] text-[#090D16] px-3 py-1 rounded font-semibold hover:bg-[#E8B84B] transition-colors cursor-pointer uppercase tracking-wider"
              >
                Connect
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        {/* ORBIT GRAPHICS PANEL */}
        <div className="lg:col-span-6 border border-[#1C2840] bg-[#0E1524]/20 p-6 rounded flex flex-col items-center">
          <div className="text-[11px] text-[#4A6080] uppercase tracking-widest mb-6 font-semibold font-mono">
            Orbit Visualizer (Click Orbit Node)
          </div>

          <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px]">
            <svg id="orbitSvg" className="w-full h-full" viewBox="0 0 520 520">
              <circle cx="260" cy="260" r="220" fill="none" stroke="#1C2840" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="260" cy="260" r="150" fill="none" stroke="#1C2840" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* spokes */}
              {DOMAINS.map((d, index) => {
                if (d.num === "00") return null;
                const isOuter = parseInt(d.num) <= 7;
                const r = isOuter ? 220 : 150;
                const angle = isOuter 
                  ? ((index - 1) / 7) * 2 * Math.PI - Math.PI / 2
                  : ((index - 8) / 6) * 2 * Math.PI - Math.PI / 6;
                const x = 260 + r * Math.cos(angle);
                const y = 260 + r * Math.sin(angle);
                return (
                  <line 
                    key={`spoke-${d.num}`}
                    x1="260" y1="260" x2={x} y2={y} 
                    stroke={d.color} strokeWidth="0.5" strokeOpacity="0.15" 
                  />
                );
              })}

              {/* Core node */}
              <g 
                id="domain-orbit-00"
                className="cursor-pointer group"
                onClick={() => handleNodeClick("00")}
              >
                <circle cx="260" cy="260" r="25" fill="#C8922A" fillOpacity="0.15" stroke="#C8922A" strokeWidth="1.5" />
                <circle cx="260" cy="260" r="6" fill="#C8922A" className="animate-ping" />
                <circle cx="260" cy="260" r="3" fill="#C8922A" />
                <text x="260" y="261" textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#E8B84B">✦</text>
              </g>

              {/* Orbit Nodes */}
              {DOMAINS.map((d, index) => {
                if (d.num === "00") return null;
                const isOuter = parseInt(d.num) <= 7;
                const r = isOuter ? 220 : 150;
                const angle = isOuter 
                  ? ((index - 1) / 7) * 2 * Math.PI - Math.PI / 2
                  : ((index - 8) / 6) * 2 * Math.PI - Math.PI / 6;
                const x = 260 + r * Math.cos(angle);
                const y = 260 + r * Math.sin(angle);
                const isSelected = activeNode === d.num;
                const nodeRadius = isOuter ? 16 : 14;

                return (
                  <g 
                    id={`domain-orbit-${d.num}`}
                    key={`orbit-node-${d.num}`}
                    className="cursor-pointer group"
                    onClick={() => handleNodeClick(d.num)}
                  >
                    <circle 
                      cx={x} cy={y} r={nodeRadius} 
                      fill={d.color} 
                      fillOpacity={isSelected ? 0.35 : 0.12} 
                      stroke={d.color} 
                      strokeWidth={isSelected ? 2 : 1}
                      strokeOpacity={isSelected ? 1 : 0.6}
                    />
                    <text 
                      x={x} y={y + 1} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize={isOuter ? 11 : 9.5} 
                      fill={d.color}
                    >
                      {d.icon}
                    </text>
                    <text 
                      x={x} y={y + (isOuter ? 28 : 24)} 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      fontSize="8" 
                      fontFamily="DM Mono" 
                      fill={isSelected ? '#E8B84B' : d.color}
                      fillOpacity={isSelected ? 1 : 0.75}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {d.name.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* DETAILS PANEL / FALLBACK */}
        <div className="lg:col-span-6 flex flex-col gap-6 w-full">
          {activeNode ? (
            (() => {
              const activeDomain = DOMAINS.find(d => d.num === activeNode);
              if (!activeDomain) return null;
              const tierColor = activeDomain.tier.includes('Rich') ? '#10B981' : activeDomain.tier.includes('Building') ? '#3B82F6' : '#6B7FA3';

              return (
                <div id="domain-detail-panel" className="border border-[#D4A030] bg-[#0E1524] p-6 rounded relative animate-[fadeIn_0.2s_ease-out]">
                  <button 
                    onClick={() => setActiveNode(null)}
                    className="absolute top-4 right-4 text-xs text-[#4A6080] hover:text-[#D8E4F2] font-mono cursor-pointer"
                  >
                    Close Details [×]
                  </button>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded flex items-center justify-center text-lg border"
                      style={{ backgroundColor: `${activeDomain.color}15`, borderColor: `${activeDomain.color}30`, color: activeDomain.color }}
                    >
                      {activeDomain.icon}
                    </div>
                    <div>
                      <div className="text-[10px] text-[#4A6080] font-mono uppercase tracking-widest">
                        Domain D·{activeDomain.num} {activeDomain.isCore && '· CORE'}
                      </div>
                      <h2 className="font-serif text-2xl text-[#D8E4F2] font-normal" style={{ color: activeDomain.color }}>
                        {activeDomain.name}
                      </h2>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-[#D4A030] uppercase tracking-wider mb-2">
                    ↳ {activeDomain.tagline}
                  </div>

                  <p className="text-xs text-[#8EA8C8] leading-relaxed mb-6 font-mono">
                    {activeDomain.desc}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="border border-[#1C2840] p-3 bg-[#0A0E1A]/40 rounded">
                      <div className="text-[9px] text-[#4A6080] font-bold uppercase tracking-wider mb-1 font-mono">Maturity Status</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#1C2840] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${activeDomain.maturity}%`, backgroundColor: activeDomain.color }} />
                        </div>
                        <span className="text-[10px] text-[#D8E4F2] font-mono">{activeDomain.maturity}%</span>
                      </div>
                    </div>
                    <div className="border border-[#1C2840] p-3 bg-[#0A0E1A]/40 rounded">
                      <div className="text-[9px] text-[#4A6080] font-bold uppercase tracking-wider mb-1 font-mono">Architecture Tier</div>
                      <div className="text-xs text-[#D8E4F2] font-semibold font-mono" style={{ color: tierColor }}>{activeDomain.tier}</div>
                    </div>
                  </div>

                  <div className="border-t border-[#1C2840]/60 pt-4 mb-4">
                    <div className="text-[10px] text-[#4A6080] font-bold uppercase tracking-wider mb-2 font-mono">
                      Domain Agent Functionality
                    </div>
                    <div className="text-xs text-[#D8E4F2] font-mono leading-relaxed bg-white/[0.01] p-3 border border-[#1C2840] rounded italic">
                      "{activeDomain.agent}"
                    </div>
                  </div>

                  {activeDomain.layers && (
                    <div className="border-t border-[#1C2840]/60 pt-4 mb-4">
                      <div className="text-[10px] text-[#4A6080] font-bold uppercase tracking-wider mb-2 font-mono">
                        Architecture Layers
                      </div>
                      <div className="flex flex-col gap-2">
                        {activeDomain.layers.map(layer => (
                          <div key={layer.name} className="text-xs font-mono">
                            <span className="font-semibold text-[#E8B84B]">{layer.name}: </span>
                            <span className="text-[#8EA8C8]">{layer.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#1C2840]/60 pt-4">
                    <div className="text-[10px] text-[#4A6080] font-bold uppercase tracking-wider mb-2 font-mono">
                      Telemetry &amp; Data Points
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDomain.dataItems.map(item => (
                        <span 
                          key={item} 
                          className="text-[9px] bg-white/[0.02] border border-[#1C2840] px-2 py-0.5 rounded text-[#8EA8C8] font-mono"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Telemetry Streams */}
                  {activeDomain.num === "02" && (
                    <div className="border-t border-[#1C2840]/60 pt-6 mt-6">
                      <div className="text-[10px] text-[#F43F5E] font-bold uppercase tracking-widest mb-3 font-mono">
                        📡 Live Hilo BP Telemetry Stream
                      </div>
                      {loadingTelemetry && <div className="text-xs text-[#4A6080] font-mono animate-pulse">Fetching records from D1...</div>}
                      {telemetryError && <div className="text-xs text-[#F43F5E] font-mono">Sync Error: {telemetryError}</div>}
                      {!loadingTelemetry && !telemetryError && telemetry && (
                        <div className="flex flex-col gap-3 font-mono">
                          {telemetry.hilo && telemetry.hilo.length > 0 ? (
                            <>
                              {/* BP Sparkline/Chart */}
                              <div className="bg-[#0A0E1A]/60 border border-[#1C2840] rounded p-4 flex flex-col gap-2 select-text">
                                <div className="flex justify-between text-[9px] text-[#4A6080] uppercase">
                                  <span>Recent BP Trends</span>
                                  <span>Systolic / Diastolic</span>
                                </div>
                                <div className="flex items-end justify-between h-20 px-4 pt-2 border-b border-[#1C2840]">
                                  {telemetry.hilo.slice(0, 10).reverse().map((bp, i) => {
                                    const sysPercent = Math.min(100, Math.max(10, ((bp.systolic - 90) / 60) * 100));
                                    const diaPercent = Math.min(100, Math.max(10, ((bp.diastolic - 50) / 50) * 100));
                                    return (
                                      <div key={bp.id || i} className="flex flex-col items-center gap-1 w-6 group relative">
                                        <div className="flex gap-0.5 items-end h-12 w-full justify-center">
                                          <div style={{ height: `${sysPercent}%` }} className="w-2 bg-[#F43F5E] rounded-t-sm" />
                                          <div style={{ height: `${diaPercent}%` }} className="w-2 bg-[#F43F5E]/60 rounded-t-sm" />
                                        </div>
                                        <span className="text-[8px] text-[#4A6080]">{bp.systolic}/{bp.diastolic}</span>
                                        {/* Hover Tooltip */}
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#090D16] border border-[#F43F5E]/30 text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                          {bp.date} @ {new Date(bp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}<br/>
                                          BP: {bp.systolic}/{bp.diastolic} mmHg<br/>
                                          Pulse: {bp.pulse} bpm
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="max-h-[160px] overflow-y-auto border border-[#1C2840] rounded bg-[#0A0E1A]/40 select-text">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="border-b border-[#1C2840] text-[#4A6080] uppercase tracking-wider text-[9px]">
                                      <th className="p-2">Date/Time</th>
                                      <th className="p-2">BP (mmHg)</th>
                                      <th className="p-2 text-right">Pulse (bpm)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {telemetry.hilo.map((bp) => (
                                      <tr key={bp.id} className="border-b border-[#1C2840]/30 hover:bg-white/[0.02]">
                                        <td className="p-2 text-[#8EA8C8]">
                                          {bp.date} <span className="text-[9px] text-[#4A6080]">{new Date(bp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="p-2 text-[#D8E4F2] font-semibold">{bp.systolic}/{bp.diastolic}</td>
                                        <td className="p-2 text-right text-[#8EA8C8]">{bp.pulse}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-[#4A6080] italic">No blood pressure records found.</div>
                          )}
                        </div>
                      )}
                      {!isTokenSaved && (
                        <div className="text-xs text-[#4A6080] italic">Connect your API Token above to stream live biometric records.</div>
                      )}
                    </div>
                  )}

                  {activeDomain.num === "03" && (
                    <div className="border-t border-[#1C2840]/60 pt-6 mt-6">
                      <div className="text-[10px] text-[#10B981] font-bold uppercase tracking-widest mb-3 font-mono">
                        📡 Live Wearable &amp; Weight Streams (Garmin/Withings)
                      </div>
                      {loadingTelemetry && <div className="text-xs text-[#4A6080] font-mono animate-pulse">Fetching records from D1...</div>}
                      {telemetryError && <div className="text-xs text-[#F43F5E] font-mono">Sync Error: {telemetryError}</div>}
                      {!loadingTelemetry && !telemetryError && telemetry && (
                        <div className="flex flex-col gap-4 font-mono text-xs select-text">
                          {/* Garmin stats */}
                          <div className="bg-[#0A0E1A]/40 border border-[#1C2840] rounded p-4">
                            <div className="text-[9px] text-[#10B981] uppercase tracking-wider mb-3">Garmin Connect Sleep &amp; HRV</div>
                            {telemetry.garmin && telemetry.garmin.length > 0 ? (
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="border border-[#1C2840]/60 p-2 bg-[#090D16]/50 rounded">
                                    <div className="text-[8px] text-[#4A6080] uppercase">Last Sleep Score</div>
                                    <div className="text-lg text-[#D8E4F2] font-semibold">{telemetry.garmin[0].sleep_score || '--'} <span className="text-[10px] text-[#4A6080]">/100</span></div>
                                  </div>
                                  <div className="border border-[#1C2840]/60 p-2 bg-[#090D16]/50 rounded">
                                    <div className="text-[8px] text-[#4A6080] uppercase">Last Night HRV</div>
                                    <div className="text-lg text-[#10B981] font-semibold">{telemetry.garmin[0].last_night_hrv_avg || '--'} <span className="text-[10px] text-[#4A6080]">ms</span></div>
                                  </div>
                                </div>
                                <div className="max-h-[100px] overflow-y-auto">
                                  <table className="w-full text-left text-[10px]">
                                    <thead>
                                      <tr className="text-[#4A6080] border-b border-[#1C2840]/60 uppercase text-[8px]">
                                        <th className="pb-1">Date</th>
                                        <th className="pb-1">HRV (Avg/Base)</th>
                                        <th className="pb-1 text-right">Sleep Stages</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {telemetry.garmin.map((g) => {
                                        const deepHr = (g.deep_sleep_seconds / 3600).toFixed(1);
                                        const remHr = (g.rem_sleep_seconds / 3600).toFixed(1);
                                        const lightHr = (g.light_sleep_seconds / 3600).toFixed(1);
                                        return (
                                          <tr key={g.date} className="border-b border-[#1C2840]/20">
                                            <td className="py-1 text-[#8EA8C8]">{g.date}</td>
                                            <td className="py-1 text-[#D8E4F2]">
                                              {g.last_night_hrv_avg} ms <span className="text-[#4A6080]">({g.hrv_baseline_low}-{g.hrv_baseline_high})</span>
                                            </td>
                                            <td className="py-1 text-right text-[#8EA8C8]">
                                              D: {deepHr}h / R: {remHr}h / L: {lightHr}h
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-[#4A6080] italic">No Garmin sleep/HRV records found.</div>
                            )}
                          </div>

                          {/* Withings stats */}
                          <div className="bg-[#0A0E1A]/40 border border-[#1C2840] rounded p-4">
                            <div className="text-[9px] text-[#10B981] uppercase tracking-wider mb-3">Withings Smart Scale Biometrics</div>
                            {telemetry.withings && telemetry.withings.length > 0 ? (
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="border border-[#1C2840]/60 p-2 bg-[#090D16]/50 rounded">
                                    <div className="text-[8px] text-[#4A6080] uppercase">Last Weight</div>
                                    <div className="text-lg text-[#D8E4F2] font-semibold">{telemetry.withings[0].weight_kg || '--'} <span className="text-[10px] text-[#4A6080]">kg</span></div>
                                  </div>
                                  <div className="border border-[#1C2840]/60 p-2 bg-[#090D16]/50 rounded">
                                    <div className="text-[8px] text-[#4A6080] uppercase">Muscle Mass</div>
                                    <div className="text-lg text-[#D8E4F2] font-semibold">{telemetry.withings[0].muscle_mass_pct ? `${telemetry.withings[0].muscle_mass_pct.toFixed(1)}%` : '--'}</div>
                                  </div>
                                </div>
                                <div className="max-h-[100px] overflow-y-auto">
                                  <table className="w-full text-left text-[10px]">
                                    <thead>
                                      <tr className="text-[#4A6080] border-b border-[#1C2840]/60 uppercase text-[8px]">
                                        <th className="pb-1">Date</th>
                                        <th className="pb-1">Fat / Water</th>
                                        <th className="pb-1 text-right">Vasc Age / Nerve</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {telemetry.withings.map((w) => (
                                        <tr key={w.date} className="border-b border-[#1C2840]/20">
                                          <td className="py-1 text-[#8EA8C8]">{w.date}</td>
                                          <td className="py-1 text-[#D8E4F2]">
                                            Fat: {w.visceral_fat_rating} <span className="text-[#4A6080]">| H2O: {w.extracellular_water_liters}L</span>
                                          </td>
                                          <td className="py-1 text-right text-[#8EA8C8]">
                                            VA: {w.vascular_age}y / Nerve: {w.eda_nerve_score}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-[#4A6080] italic">No Withings body composition records found.</div>
                            )}
                          </div>
                        </div>
                      )}
                      {!isTokenSaved && (
                        <div className="text-xs text-[#4A6080] italic">Connect your API Token above to stream live biometric records.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="border border-dashed border-[#1C2840] p-12 text-center text-[#4A6080] rounded">
              <div className="text-[32px] mb-2 text-[#C8922A] opacity-55">◈</div>
              <p className="text-xs leading-relaxed max-w-[360px] mx-auto font-mono">
                Click a node on the orbit visualizer or select a domain card below to load agent state and sovereignty layers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── SHARED DATA BUS VISUALIZATION ── */}
      <section className="mb-12" id="shared-data-bus-section">
        <h2 className="font-mono text-xs text-[#4A6080] tracking-widest uppercase mb-4">
          SYSTEM INTERCONNECT // SHARED DATA BUS
        </h2>

        <div className="relative bg-[#05070c]/70 border border-[#1C2840] rounded-lg p-6 overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]"></div>

          {/* Visualization Container */}
          <div className="relative flex flex-col items-stretch gap-6 w-full max-w-5xl mx-auto py-4">
            
            {/* Top Row: Nodes 01-06 */}
            <div className="flex justify-between items-center px-4 md:px-8 relative z-10">
              {topBusNodes.map(d => (
                <div key={d.num} className="flex flex-col items-center flex-1">
                  <button
                    id={`shared-bus-node-${d.num}`}
                    onClick={() => handleNodeClick(d.num)}
                    onMouseEnter={() => setHoveredNode(d.num)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ borderColor: getBusNodeColorClass(d.num).includes('border-[') ? undefined : getBusLineColor(d.num) }}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full border flex items-center justify-center font-serif text-lg md:text-xl transition-all duration-300 shadow-md outline-none cursor-pointer ${getBusNodeColorClass(d.num)}`}
                  >
                    <span style={{ color: d.color }}>{d.icon}</span>
                  </button>
                  <span className="font-mono text-[9px] mt-2 tracking-wider text-[#4A6080] hidden sm:block uppercase">
                    {d.name}
                  </span>
                  
                  {/* Vertical Connector Line pointing down to the central bus */}
                  <div 
                    style={{ backgroundColor: getBusLineColor(d.num) }}
                    className="w-[1.5px] h-6 mt-1 transition-all duration-300 opacity-60"
                  />
                </div>
              ))}
            </div>

            {/* Central Shared Bus Trunk */}
            <div className="relative h-8 flex items-center justify-center">
              <div 
                className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500/20 via-[#D4A030]/40 to-teal-500/20 shadow-[0_0_10px_rgba(212,160,48,0.2)] animate-bus-pulse"
              />
              
              {/* Signal flow animations */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#D4A030] shadow-[0_0_8px_#D4A030] animate-signal-flow-1" />
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6] animate-signal-flow-2" />
              </div>

              <div className="relative z-10 px-4 py-1 bg-[#090D16] border border-[#1C2840] rounded-full">
                <span className="font-mono text-[9px] tracking-[0.2em] text-[#E8B84B] uppercase">
                  ⚡ SHARED BUS BACKBONE ⚡
                </span>
              </div>
            </div>

            {/* Bottom Row: Nodes 07-13 */}
            <div className="flex justify-between items-center px-4 md:px-8 relative z-10">
              {bottomBusNodes.map(d => (
                <div key={d.num} className="flex flex-col items-center flex-1">
                  {/* Vertical Connector Line pointing up to the central bus */}
                  <div 
                    style={{ backgroundColor: getBusLineColor(d.num) }}
                    className="w-[1.5px] h-6 mb-1 transition-all duration-300 opacity-60"
                  />
                  
                  <button
                    id={`shared-bus-node-${d.num}`}
                    onClick={() => handleNodeClick(d.num)}
                    onMouseEnter={() => setHoveredNode(d.num)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ borderColor: getBusNodeColorClass(d.num).includes('border-[') ? undefined : getBusLineColor(d.num) }}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full border flex items-center justify-center font-serif text-lg md:text-xl transition-all duration-300 shadow-md outline-none cursor-pointer ${getBusNodeColorClass(d.num)}`}
                  >
                    <span style={{ color: d.color }}>{d.icon}</span>
                  </button>
                  <span className="font-mono text-[9px] mt-2 tracking-wider text-[#4A6080] hidden sm:block uppercase">
                    {d.name}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* Interactive Bus Signal Inspector Panel */}
          <div className="mt-6 border-t border-[#1C2840]/60 pt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-mono text-[10px] text-[#4A6080] uppercase tracking-wider mb-1">
                SIGNAL STATUS
              </div>
              <div className="min-h-[36px] flex items-center">
                {activeNode || hoveredNode ? (
                  <p className="font-mono text-xs text-[#E2EAF8] leading-relaxed transition-all duration-300">
                    <span className="font-semibold" style={{ color: (DOMAINS.find(x => x.num === (activeNode || hoveredNode)) || {}).color }}>
                      [{activeNode || hoveredNode}] { (DOMAINS.find(x => x.num === (activeNode || hoveredNode)) || {}).name } Domain:
                    </span>{' '}
                    {BUS_SIGNALS[activeNode || hoveredNode] || "Active connection established with standard sovereignty sync."}
                  </p>
                ) : (
                  <p className="font-mono text-xs text-[#4A6080] italic">
                    Hover over or click a domain node to inspect active data streams and signal routes.
                  </p>
                )}
              </div>
            </div>
            
            <div className="shrink-0 flex items-center gap-2">
              <button
                id="bus-flow-trigger"
                onClick={() => {
                  // Simulate random telemetry pulse
                  const randomNum = String(Math.floor(Math.random() * 13) + 1).padStart(2, '0');
                  handleNodeClick(randomNum);
                }}
                className="font-mono text-[9px] uppercase tracking-widest text-[#D4A030] border border-[#D4A030]/30 hover:border-[#D4A030] bg-[#D4A030]/[0.02] hover:bg-[#D4A030]/[0.08] px-3 py-1.5 rounded transition-all cursor-pointer"
              >
                PULSE TELEMETRY
              </button>
              {activeNode && (
                <button
                  id="bus-clear-trigger"
                  onClick={() => setActiveNode(null)}
                  className="font-mono text-[9px] uppercase tracking-widest text-[#4A6080] border border-[#1C2840] hover:border-slate-600 px-3 py-1.5 rounded transition-all cursor-pointer"
                >
                  CLEAR LOCK
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── DOMAIN GRID ── */}
      <section className="flex-1 flex flex-col gap-6" id="domains-grid-section">
        <h2 className="font-mono text-xs text-[#4A6080] tracking-widest uppercase">
          ARCHITECTURE CORE &amp; ORBITALS
        </h2>

        <div className="grid grid-cols-1 gap-6">
          
          {/* CORE CARD (Core 00) */}
          {DOMAINS.filter(d => d.isCore).map(d => {
            const isSelected = activeNode === d.num;
            return (
              <div
                key={d.num}
                id={`domain-card-${d.num}`}
                style={{ 
                  borderColor: getCardBorderColor(d),
                  boxShadow: getCardShadow(d)
                }}
                className="group relative bg-[#05070c]/50 hover:bg-[#070b14]/60 border rounded-lg p-6 md:p-8 transition-all duration-500 overflow-hidden backdrop-blur-md cursor-pointer"
                onClick={() => handleNodeClick(d.num)}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#C8922A]/[0.03] group-hover:bg-[#C8922A]/[0.07] rounded-bl-full pointer-events-none transition-all duration-500" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  {/* Left Column: Metadata */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-[9px] tracking-widest text-[#C8922A] px-2 py-0.5 border border-[#C8922A]/30 rounded bg-[#C8922A]/[0.03]">
                          DOMAIN {d.num} · FOUNDATION
                        </span>
                        <span className="font-mono text-[10px] text-[#4A6080] tracking-wider">
                          Maturity: {d.maturity}% ({d.tier})
                        </span>
                      </div>

                      <h3 className="font-serif text-3xl md:text-4xl font-light text-[#E2EAF8] mb-1">
                        {d.name} — <em className="text-[#E8B84B] font-normal not-italic font-serif">Star of Mind</em>
                      </h3>
                      
                      <div className="font-mono text-[11px] text-[#C8922A] tracking-wider italic mb-4">
                        {d.tagline}
                      </div>

                      <p className="font-sans text-xs md:text-sm text-[#8EA8C8] leading-relaxed mb-6 max-w-xl">
                        {d.desc}
                      </p>
                    </div>

                    <div>
                      <div className="font-mono text-[9px] text-[#4A6080] tracking-wider uppercase mb-2">
                        Core Identity Contracts
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {d.dataItems.map(item => (
                          <span 
                            key={item} 
                            className="font-mono text-[10px] text-[#D8E4F2] px-2.5 py-1 border border-[#C8922A]/10 bg-white/[0.01] rounded"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Layers & Meta-Agent */}
                  <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#1C2840]/60 pt-6 lg:pt-0 lg:pl-8">
                    <div>
                      <div className="font-mono text-[9px] text-[#4A6080] tracking-wider uppercase mb-3">
                        Star of Mind Layers
                      </div>
                      <div className="flex flex-col gap-4 mb-6">
                        {d.layers.map(layer => (
                          <div key={layer.name} className="flex flex-col">
                            <span className="font-serif text-sm font-medium text-[#E8B84B]">
                              {layer.name}
                            </span>
                            <span className="font-sans text-[11px] text-[#4A6080] leading-relaxed">
                              {layer.desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#090D16]/80 border border-[#C8922A]/15 rounded p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#C8922A] animate-ping" />
                        <span className="font-mono text-[9px] text-[#C8922A] tracking-widest uppercase">
                          META-AGENT ARBITRATOR
                        </span>
                      </div>
                      <p className="font-sans text-[11px] text-[#8EA8C8] leading-relaxed">
                        {d.agent}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ORBITAL DOMAINS GRID (01-13) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOMAINS.filter(d => !d.isCore).map(d => {
              const isSelected = activeNode === d.num;
              const tierColor = d.tier.includes('Rich') ? '#10B981' : d.tier.includes('Building') ? '#3B82F6' : '#6B7FA3';
              
              return (
                <div
                  key={d.num}
                  id={`domain-card-${d.num}`}
                  style={{ 
                    borderColor: getCardBorderColor(d),
                    boxShadow: getCardShadow(d)
                  }}
                  className="group bg-[#05070c]/50 hover:bg-[#070b14]/60 border rounded-lg p-5 md:p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md relative cursor-pointer"
                  onClick={() => handleNodeClick(d.num)}
                >
                  <div 
                    style={{ background: `radial-gradient(circle at 100% 0%, rgba(${d.hsl.split(',')[0]}, ${d.hsl.split(',')[1]}, 0.04) 0%, transparent 60%)` }}
                    className="absolute inset-0 pointer-events-none"
                  />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          style={{ borderColor: `${d.color}25`, color: d.color }}
                          className="w-10 h-10 rounded border flex items-center justify-center font-serif text-xl"
                        >
                          {d.icon}
                        </div>
                        <div>
                          <div className="font-mono text-[9px] text-[#4A6080] tracking-widest uppercase">
                            DOMAIN {d.num}
                          </div>
                          <h4 className="font-serif text-lg font-normal text-[#E2EAF8] tracking-wide">
                            {d.name}
                          </h4>
                        </div>
                      </div>
                      
                      <div 
                        style={{ color: d.color }}
                        className="font-mono text-[9px] tracking-widest opacity-40 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        // {d.name.substring(0, 3).toUpperCase()}
                      </div>
                    </div>

                    {/* Tagline */}
                    <div className="font-serif text-xs text-[#E8B84B] font-light italic mb-2 tracking-wide">
                      {d.tagline}
                    </div>

                    {/* Description */}
                    <p className="font-sans text-xs text-[#8EA8C8] leading-relaxed mb-4 min-h-[48px]">
                      {d.desc}
                    </p>

                    {/* Tags */}
                    <div className="mb-6">
                      <div className="flex flex-wrap gap-1.5">
                        {d.dataItems.map(item => (
                          <span 
                            key={item} 
                            className="font-mono text-[9px] text-[#4A6080] group-hover:text-[#8EA8C8] px-2 py-0.5 border border-[#1C2840] rounded transition-all duration-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Agent & Maturity Row */}
                  <div className="border-t border-[#1C2840]/40 pt-4 flex flex-col gap-3">
                    
                    {/* Domain Agent */}
                    <div className="flex items-start gap-2">
                      <div 
                        style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }}
                        className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" 
                      />
                      <p className="font-sans text-[10px] text-[#4A6080] group-hover:text-[#8EA8C8] leading-normal transition-colors duration-300">
                        {d.agent}
                      </p>
                    </div>

                    {/* Maturity Progress Bar */}
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-[8px] tracking-wider text-[#4A6080] uppercase">
                            Data Maturity
                          </span>
                          <span className="font-mono text-[8px] text-[#8EA8C8]">
                            {d.maturity}%
                          </span>
                        </div>
                        <div className="w-full h-[3px] bg-[#1C2840] rounded-full overflow-hidden">
                          <div 
                            style={{ 
                              width: isLoaded ? `${d.maturity}%` : '0%',
                              backgroundColor: d.color,
                              boxShadow: `0 0 6px ${d.color}`,
                              transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            className="h-full rounded-full group-hover:brightness-125"
                          />
                        </div>
                      </div>

                      <span 
                        style={{ color: tierColor }}
                        className="font-mono text-[9px] tracking-wider uppercase shrink-0"
                      >
                        {d.tier}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>
    </div>
  );
}
