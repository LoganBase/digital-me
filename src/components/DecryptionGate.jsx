import React, { useState } from 'react';

export default function DecryptionGate({ onUnlock }) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vibrate, setVibrate] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter a decryption secret.');
      triggerVibrate();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate the token against the live Cloudflare Worker API
      const res = await fetch('https://digital-me-ingest.shane-logan.workers.dev/api/telemetry/summary', {
        headers: {
          'Authorization': `Bearer ${tokenInput.trim()}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Access Denied: Invalid Decryption Key');
        }
        throw new Error(`Sync Gateway Error (HTTP ${res.status})`);
      }

      const json = await res.json();
      if (json.success) {
        // Successful verification!
        localStorage.setItem('digitalme_api_token', tokenInput.trim());
        onUnlock(tokenInput.trim());
      } else {
        throw new Error(json.error || 'Decryption validation failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      triggerVibrate();
    } finally {
      setLoading(false);
    }
  };

  const triggerVibrate = () => {
    setVibrate(true);
    setTimeout(() => setVibrate(false), 500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] px-6 py-12 relative overflow-hidden select-none bg-[#090D16]">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,160,48,0.02)_0%,transparent_70%)]" />
      
      <div className={`w-full max-w-md bg-[#0E1524]/60 backdrop-blur-xl border border-[#1C2840] rounded-lg p-8 shadow-2xl relative transition-all duration-300 ${vibrate ? 'animate-shake' : ''}`}>
        
        {/* Style tag for custom animations (shake, shine, pulse) */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .animate-shake {
            animation: shake 0.4s ease-in-out;
          }
          @keyframes glowPulse {
            0%, 100% { box-shadow: 0 0 15px rgba(212, 160, 48, 0.1); }
            50% { box-shadow: 0 0 25px rgba(212, 160, 48, 0.25); }
          }
          .decryption-box {
            animation: glowPulse 4s infinite ease-in-out;
          }
        `}</style>

        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1C2840]/50 border border-[#C8922A]/30 flex items-center justify-center text-2xl text-[#C8922A] drop-shadow-[0_0_8px_rgba(200,146,42,0.4)]">
            🔐
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-light text-[#E8B84B] mb-2 tracking-wide">
            Decryption <em className="italic font-normal font-serif">Gate</em>
          </h2>
          <p className="font-mono text-[10px] text-[#4A6080] uppercase tracking-widest leading-relaxed">
            Sovereign Domain Locked · Telemetry Vault Access
          </p>
        </div>

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-mono text-[9px] text-[#8EA8C8] uppercase tracking-widest">
              Passcode or AUTH_SECRET
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Enter system AUTH_SECRET"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full bg-[#0A0D1A] border border-[#1C2840] text-[#D8E4F2] px-4 py-3 rounded outline-none focus:border-[#D4A030] text-xs font-mono tracking-wider transition-colors placeholder:text-[#2A3A55]"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-3 text-[#4A6080] hover:text-[#8EA8C8] text-xs outline-none focus:outline-none select-none transition-colors"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="font-mono text-[10px] text-[#F43F5E] bg-[#F43F5E]/5 border border-[#F43F5E]/20 rounded p-3 text-center">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded font-mono text-xs uppercase tracking-wider font-semibold select-none outline-none transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
              loading 
                ? 'bg-[#1C2840] text-[#4A6080] border border-[#1C2840]/60 cursor-not-allowed'
                : 'bg-[#D4A030] text-[#090D16] border border-[#D4A030] hover:bg-[#E8B84B] hover:border-[#E8B84B] hover:shadow-[0_0_12px_rgba(212,160,48,0.3)] hover:scale-[1.01]'
            }`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#4A6080] border-t-transparent rounded-full animate-spin" />
                Validating Secret Key...
              </>
            ) : (
              'Unlock Sovereign Vault'
            )}
          </button>
        </form>

        {/* Footer/Hint */}
        <div className="mt-8 pt-6 border-t border-[#1C2840]/40 text-center font-mono text-[9px] text-[#2A3A55] uppercase tracking-wider leading-relaxed">
          Decrypted keys are stored securely in your browser's local sandbox environment.
        </div>

      </div>
    </div>
  );
}
