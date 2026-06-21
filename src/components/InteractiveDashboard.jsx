import React, { useState, useEffect } from 'react';
import { DOMAINS, CONNECTIONS_MAP, BUS_SIGNALS } from '../data';

// Custom high-fidelity SVG Blood Pressure Chart
function BloodPressureChart({ data }) {
  const points = data.slice(0, 10).reverse();
  const [hoverIndex, setHoverIndex] = useState(null);

  if (points.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const sysMin = 80;
  const sysMax = 180;
  const diaMin = 40;
  const diaMax = 120;

  const getSysY = (val) => {
    const v = Math.min(sysMax, Math.max(sysMin, val));
    return paddingTop + chartHeight - ((v - sysMin) / (sysMax - sysMin)) * chartHeight;
  };

  const getDiaY = (val) => {
    const v = Math.min(diaMax, Math.max(diaMin, val));
    return paddingTop + chartHeight - ((v - diaMin) / (diaMax - diaMin)) * chartHeight;
  };

  const getX = (index) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  let sysPath = '';
  let diaPath = '';
  
  points.forEach((p, i) => {
    const x = getX(i);
    const ySys = getSysY(p.systolic);
    const yDia = getDiaY(p.diastolic);
    
    if (i === 0) {
      sysPath = `M ${x} ${ySys}`;
      diaPath = `M ${x} ${yDia}`;
    } else {
      sysPath += ` L ${x} ${ySys}`;
      diaPath += ` L ${x} ${yDia}`;
    }
  });

  return (
    <div className="bg-[#0A0E1A]/60 border border-[#1C2840] rounded-lg p-5 flex flex-col gap-4 font-mono select-none">
      <div className="flex justify-between items-center text-[10px] text-[#4A6080] uppercase tracking-wider">
        <span className="text-[#F43F5E] font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" /> BP Trend (Last {points.length} Readings)
        </span>
        <span className="text-right">Systolic / Diastolic (mmHg)</span>
      </div>

      <div className="relative w-full h-[180px]">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8B84B" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#E8B84B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[60, 90, 120, 150, 180].map((val) => {
            const y = getSysY(val);
            return (
              <g key={val} className="opacity-25">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1C2840" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#4A6080">{val}</text>
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, i) => {
            const x = getX(i);
            const dateStr = p.date.substring(5); // MM-DD
            return (
              <text key={i} x={x} y={height - 10} textAnchor="middle" fontSize="8" fill="#4A6080" className="opacity-80">
                {dateStr}
              </text>
            );
          })}

          {/* Area under lines */}
          {points.length > 1 && (
            <>
              <path
                d={`${sysPath} L ${getX(points.length - 1)} ${getSysY(sysMin)} L ${getX(0)} ${getSysY(sysMin)} Z`}
                fill="url(#sysGradient)"
              />
              <path
                d={`${diaPath} L ${getX(points.length - 1)} ${getDiaY(diaMin)} L ${getX(0)} ${getDiaY(diaMin)} Z`}
                fill="url(#diaGradient)"
              />
            </>
          )}

          {/* Systolic Line */}
          <path d={sysPath} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Diastolic Line */}
          <path d={diaPath} fill="none" stroke="#E8B84B" strokeWidth="1.5" strokeDasharray="3,3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Nodes */}
          {points.map((p, i) => {
            const x = getX(i);
            const ySys = getSysY(p.systolic);
            const yDia = getDiaY(p.diastolic);
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                <circle cx={x} cy={ySys} r={isHovered ? 4.5 : 3} fill="#090D16" stroke="#F43F5E" strokeWidth="2" />
                <circle cx={x} cy={yDia} r={isHovered ? 4.5 : 3} fill="#090D16" stroke="#E8B84B" strokeWidth="1.5" />
                
                <rect
                  x={x - 15}
                  y={paddingTop}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoverIndex !== null && (
          <div className="absolute top-2 right-2 bg-[#090D16]/95 border border-[#1C2840] rounded px-3 py-2 text-[9px] text-[#8EA8C8] shadow-lg leading-relaxed flex flex-col pointer-events-none z-20">
            <span className="text-[#E8B84B] font-semibold border-b border-[#1C2840] pb-0.5 mb-1">
              {points[hoverIndex].date} @ {new Date(points[hoverIndex].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            <span>Systolic: <strong className="text-[#F43F5E]">{points[hoverIndex].systolic}</strong> mmHg</span>
            <span>Diastolic: <strong className="text-[#E8B84B]">{points[hoverIndex].diastolic}</strong> mmHg</span>
            <span>Pulse: <strong className="text-[#D8E4F2]">{points[hoverIndex].pulse}</strong> bpm</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Garmin HRV Corridor Chart
function GarminHrvChart({ data }) {
  const points = data.slice(0, 10).reverse();
  const [hoverIndex, setHoverIndex] = useState(null);

  if (points.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const minVal = 20;
  const maxVal = 100;

  const getY = (val) => {
    const v = Math.min(maxVal, Math.max(minVal, val));
    return paddingTop + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;
  };

  const getX = (index) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  // Build baseline corridor polygon
  let corridorPoints = '';
  // Top edge (baseline high)
  points.forEach((p, i) => {
    corridorPoints += `${getX(i)},${getY(p.hrv_baseline_high || 65)} `;
  });
  // Bottom edge (baseline low) - backwards
  for (let i = points.length - 1; i >= 0; i--) {
    corridorPoints += `${getX(i)},${getY(points[i].hrv_baseline_low || 45)} `;
  }

  // Build nightly average path
  let avgPath = '';
  points.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.last_night_hrv_avg || 50);
    if (i === 0) {
      avgPath = `M ${x} ${y}`;
    } else {
      avgPath += ` L ${x} ${y}`;
    }
  });

  return (
    <div className="bg-[#0A0E1A]/60 border border-[#1C2840] rounded-lg p-5 flex flex-col gap-4 font-mono select-none">
      <div className="flex justify-between items-center text-[10px] text-[#4A6080] uppercase tracking-wider">
        <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Garmin HRV Status
        </span>
        <span className="text-right">Baseline Corridor vs Nightly Avg (ms)</span>
      </div>

      <div className="relative w-full h-[180px]">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[30, 50, 70, 90].map((val) => {
            const y = getY(val);
            return (
              <g key={val} className="opacity-25">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1C2840" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#4A6080">{val}</text>
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, i) => {
            const x = getX(i);
            const dateStr = p.date.substring(5); // MM-DD
            return (
              <text key={i} x={x} y={height - 10} textAnchor="middle" fontSize="8" fill="#4A6080" className="opacity-80">
                {dateStr}
              </text>
            );
          })}

          {/* Baseline Corridor Ribbon */}
          {points.length > 1 && (
            <polygon points={corridorPoints} fill="url(#corridorGrad)" stroke="#10B981" strokeWidth="0.5" strokeOpacity="0.25" />
          )}

          {/* Nightly Average Line */}
          <path d={avgPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Nodes */}
          {points.map((p, i) => {
            const x = getX(i);
            const y = getY(p.last_night_hrv_avg || 50);
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                <circle cx={x} cy={y} r={isHovered ? 5.5 : 3.5} fill="#090D16" stroke="#10B981" strokeWidth="2" />
                <rect
                  x={x - 15}
                  y={paddingTop}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverIndex !== null && (
          <div className="absolute top-2 right-2 bg-[#090D16]/95 border border-[#1C2840] rounded px-3 py-2 text-[9px] text-[#8EA8C8] shadow-lg leading-relaxed flex flex-col pointer-events-none z-20">
            <span className="text-[#10B981] font-semibold border-b border-[#1C2840] pb-0.5 mb-1">
              {points[hoverIndex].date}
            </span>
            <span>Nightly Avg: <strong className="text-[#E2EAF8]">{points[hoverIndex].last_night_hrv_avg || '--'} ms</strong></span>
            <span>Weekly Avg: <strong className="text-[#8EA8C8]">{points[hoverIndex].weekly_hrv_avg || '--'} ms</strong></span>
            <span>Baseline: <strong className="text-[#4A6080]">{points[hoverIndex].hrv_baseline_low || '--'} - {points[hoverIndex].hrv_baseline_high || '--'} ms</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

// Withings Weight & Muscle Chart
function WithingsWeightChart({ data }) {
  const points = data.slice(0, 10).reverse();
  const [hoverIndex, setHoverIndex] = useState(null);

  if (points.length === 0) return null;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const weights = points.map(w => w.weight_kg).filter(Boolean);
  const minW = Math.min(...weights) - 1.5;
  const maxW = Math.max(...weights) + 1.5;

  const muscles = points.map(w => w.muscle_mass_pct).filter(Boolean);
  const minM = Math.min(...muscles) - 1;
  const maxM = Math.max(...muscles) + 1;

  const getWeightY = (val) => {
    return paddingTop + chartHeight - ((val - minW) / (maxW - minW || 1)) * chartHeight;
  };

  const getMuscleY = (val) => {
    return paddingTop + chartHeight - ((val - minM) / (maxM - minM || 1)) * chartHeight;
  };

  const getX = (index) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  let weightPath = '';
  let musclePath = '';

  points.forEach((p, i) => {
    const x = getX(i);
    if (p.weight_kg) {
      const yW = getWeightY(p.weight_kg);
      weightPath += (weightPath === '' ? 'M' : 'L') + ` ${x} ${yW}`;
    }
    if (p.muscle_mass_pct) {
      const yM = getMuscleY(p.muscle_mass_pct);
      musclePath += (musclePath === '' ? 'M' : 'L') + ` ${x} ${yM}`;
    }
  });

  return (
    <div className="bg-[#0A0E1A]/60 border border-[#1C2840] rounded-lg p-5 flex flex-col gap-4 font-mono select-none">
      <div className="flex justify-between items-center text-[10px] text-[#4A6080] uppercase tracking-wider">
        <span className="text-[#3B82F6] font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" /> Weight &amp; Muscle Shift
        </span>
        <span className="text-right text-[#2DD4BF]">Weight (kg) vs Muscle (%)</span>
      </div>

      <div className="relative w-full h-[180px]">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const wVal = minW + p * (maxW - minW);
            const y = getWeightY(wVal);
            return (
              <g key={i} className="opacity-25">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1C2840" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="8" fill="#4A6080">{wVal.toFixed(1)}</text>
              </g>
            );
          })}

          {/* X axis labels */}
          {points.map((p, i) => {
            const x = getX(i);
            const dateStr = p.date.substring(5); // MM-DD
            return (
              <text key={i} x={x} y={height - 10} textAnchor="middle" fontSize="8" fill="#4A6080" className="opacity-80">
                {dateStr}
              </text>
            );
          })}

          {/* Weight Line */}
          {weightPath && <path d={weightPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Muscle Line */}
          {musclePath && <path d={musclePath} fill="none" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2,2" />}

          {/* Nodes */}
          {points.map((p, i) => {
            const x = getX(i);
            const yW = p.weight_kg ? getWeightY(p.weight_kg) : null;
            const yM = p.muscle_mass_pct ? getMuscleY(p.muscle_mass_pct) : null;
            const isHovered = hoverIndex === i;

            return (
              <g key={i}>
                {yW && <circle cx={x} cy={yW} r={isHovered ? 5.5 : 3.5} fill="#090D16" stroke="#3B82F6" strokeWidth="2" />}
                {yM && <circle cx={x} cy={yM} r={isHovered ? 4.5 : 2.5} fill="#090D16" stroke="#2DD4BF" strokeWidth="1.5" />}
                
                <rect
                  x={x - 15}
                  y={paddingTop}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoverIndex !== null && (
          <div className="absolute top-2 right-2 bg-[#090D16]/95 border border-[#1C2840] rounded px-3 py-2 text-[9px] text-[#8EA8C8] shadow-lg leading-relaxed flex flex-col pointer-events-none z-20">
            <span className="text-[#3B82F6] font-semibold border-b border-[#1C2840] pb-0.5 mb-1">
              {points[hoverIndex].date}
            </span>
            <span>Weight: <strong className="text-[#E2EAF8]">{points[hoverIndex].weight_kg || '--'} kg</strong></span>
            <span>Muscle Mass: <strong className="text-[#2DD4BF]">{points[hoverIndex].muscle_mass_pct ? `${points[hoverIndex].muscle_mass_pct.toFixed(2)}%` : '--'}</strong></span>
            <span>Visceral Fat: <strong className="text-[#8EA8C8]">{points[hoverIndex].visceral_fat_rating || '--'} index</strong></span>
            <span>Vascular Age: <strong className="text-[#8EA8C8]">{points[hoverIndex].vascular_age || '--'} years</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

// Garmin Sleep Donut Chart
function GarminSleepDonut({ record }) {
  if (!record) return null;

  const deep = record.deep_sleep_seconds || 0;
  const rem = record.rem_sleep_seconds || 0;
  const light = record.light_sleep_seconds || 0;
  const awake = record.awake_seconds || 0;
  const total = deep + rem + light + awake;

  if (total === 0) return null;

  const r = 50;
  const C = 2 * Math.PI * r;

  const stages = [
    { label: 'Deep', seconds: deep, color: '#1E3A8A', text: '#3B82F6' },
    { label: 'REM', seconds: rem, color: '#6D28D9', text: '#A78BFA' },
    { label: 'Light', seconds: light, color: '#047857', text: '#34D399' },
    { label: 'Awake', seconds: awake, color: '#B91C1C', text: '#F87171' }
  ];

  let cumulativeSum = 0;

  const slices = stages.map(s => {
    const pct = s.seconds / total;
    const dashLength = C * pct;
    const dashOffset = C - cumulativeSum + (C / 4);
    cumulativeSum += dashLength;

    return {
      ...s,
      pct,
      dashLength,
      dashOffset
    };
  });

  const totalHours = (total / 3600).toFixed(1);

  return (
    <div className="bg-[#0A0E1A]/60 border border-[#1C2840] rounded-lg p-4 flex flex-col sm:flex-row items-center gap-6 select-none font-mono">
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1C2840" strokeWidth="12" />
          {slices.map((slice, i) => (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth="12"
              strokeDasharray={`${slice.dashLength} ${C}`}
              strokeDashoffset={slice.dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[8px] text-[#4A6080] uppercase tracking-wider">Total</span>
          <span className="text-base font-bold text-[#E2EAF8]">{totalHours}h</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        <div className="text-[9px] text-[#4A6080] uppercase tracking-wider border-b border-[#1C2840] pb-1 mb-2">
          Sleep Stage Ratio
        </div>
        {slices.map((slice, i) => {
          const hr = (slice.seconds / 3600).toFixed(1);
          const percent = (slice.pct * 100).toFixed(0);
          return (
            <div key={i} className="flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="text-[#8EA8C8]">{slice.label}</span>
              </div>
              <span className="font-semibold text-[#D8E4F2]">
                {hr}h <span className="text-[8px] text-[#4A6080] font-normal">({percent}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InteractiveDashboard({ apiToken, isTokenSaved, onDisconnect }) {
  const [activeNode, setActiveNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Live Telemetry Sync State
  const [telemetry, setTelemetry] = useState(null);
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
    } else {
      setTelemetry(null);
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
          <span className="text-[#10B981] font-semibold uppercase">Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#4A6080]">Token: ••••••••••••</span>
          <button 
            onClick={onDisconnect}
            className="text-[#F43F5E] hover:underline cursor-pointer bg-transparent border-none outline-none font-semibold uppercase tracking-wider"
          >
            Disconnect
          </button>
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
                              {/* BP Chart */}
                              <BloodPressureChart data={telemetry.hilo} />

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
                        <div className="flex flex-col gap-6 font-mono text-xs select-text">
                          
                          {/* Sleep Stage Donut Chart */}
                          {telemetry.garmin && telemetry.garmin.length > 0 && (
                            <GarminSleepDonut record={telemetry.garmin[0]} />
                          )}

                          {/* Garmin HRV Corridor Chart */}
                          {telemetry.garmin && telemetry.garmin.length > 0 && (
                            <GarminHrvChart data={telemetry.garmin} />
                          )}

                          {/* Withings Weight Shift Chart */}
                          {telemetry.withings && telemetry.withings.length > 0 && (
                            <WithingsWeightChart data={telemetry.withings} />
                          )}

                          {/* Garmin Data Table */}
                          <div className="bg-[#0A0E1A]/40 border border-[#1C2840] rounded p-4">
                            <div className="text-[9px] text-[#10B981] uppercase tracking-wider mb-3">Garmin Sleep &amp; HRV Log</div>
                            {telemetry.garmin && telemetry.garmin.length > 0 ? (
                              <div className="max-h-[120px] overflow-y-auto">
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
                                        <tr key={g.date} className="border-b border-[#1C2840]/20 hover:bg-white/[0.02]">
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
                            ) : (
                              <div className="text-xs text-[#4A6080] italic">No Garmin records found.</div>
                            )}
                          </div>

                          {/* Withings Data Table */}
                          <div className="bg-[#0A0E1A]/40 border border-[#1C2840] rounded p-4">
                            <div className="text-[9px] text-[#10B981] uppercase tracking-wider mb-3">Withings Smart Scale Log</div>
                            {telemetry.withings && telemetry.withings.length > 0 ? (
                              <div className="max-h-[120px] overflow-y-auto">
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
                                      <tr key={w.date} className="border-b border-[#1C2840]/20 hover:bg-white/[0.02]">
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
                            ) : (
                              <div className="text-xs text-[#4A6080] italic">No Withings records found.</div>
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
