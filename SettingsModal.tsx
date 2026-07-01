import React from 'react';
import { motion } from 'motion/react';

interface SettingsModalProps {
  uiScale: 'normal' | 'large';
  setUiScale: (val: 'normal' | 'large') => void;
  colorblindMode: 'normal' | 'protanopia' | 'tritanopia';
  setColorblindMode: (val: 'normal' | 'protanopia' | 'tritanopia') => void;
  screenShakeEnabled: boolean;
  setScreenShakeEnabled: (val: boolean) => void;
  flashEffectsEnabled: boolean;
  setFlashEffectsEnabled: (val: boolean) => void;
  onClose: () => void;
}

export default function SettingsModal({
  uiScale,
  setUiScale,
  colorblindMode,
  setColorblindMode,
  screenShakeEnabled,
  setScreenShakeEnabled,
  flashEffectsEnabled,
  setFlashEffectsEnabled,
  onClose,
}: SettingsModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-sky-400 font-mono uppercase tracking-wider">
              ⚙️ SETTINGS & ACCESSIBILITY
            </h2>
            <p className="text-[10px] text-slate-400">Configure visual features and comfort controls.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Settings options content */}
        <div className="p-4 space-y-4 text-xs">
          
          {/* Sizing scale */}
          <div className="space-y-1.5">
            <span className="font-mono text-slate-300 font-semibold block uppercase text-[10px] tracking-wide text-sky-500">
              ♿ HUD UI Scaling
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUiScale('normal')}
                className={`py-2 rounded font-mono border text-[10px] cursor-pointer transition-all ${
                  uiScale === 'normal'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500 shadow-sm'
                    : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                STANDARD (100%)
              </button>
              <button
                onClick={() => setUiScale('large')}
                className={`py-2 rounded font-mono border text-[10px] cursor-pointer transition-all ${
                  uiScale === 'large'
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500 shadow-sm'
                    : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                LARGE FONTS (135%)
              </button>
            </div>
          </div>

          {/* Color assist */}
          <div className="space-y-1.5">
            <span className="font-mono text-slate-300 font-semibold block uppercase text-[10px] tracking-wide text-sky-500">
              🎨 Colorblindness Assist
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['normal', 'protanopia', 'tritanopia'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColorblindMode(mode)}
                  className={`py-1.5 rounded font-mono border text-[9px] cursor-pointer uppercase transition-all ${
                    colorblindMode === mode
                      ? 'bg-sky-500/15 text-sky-400 border-sky-500'
                      : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {mode === 'normal' ? 'Normal' : mode === 'protanopia' ? 'Protanopia' : 'Tritanopia'}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              Adjusts key UI cues, target lines, and status colors for high visual-contrast.
            </p>
          </div>

          {/* Graphics toggles */}
          <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
            {/* Screen Shake */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={screenShakeEnabled}
                onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                className="w-4 h-4 text-sky-500 bg-slate-950 border-slate-800 rounded focus:ring-sky-500 focus:ring-2 cursor-pointer"
              />
              <div>
                <span className="font-mono font-bold text-slate-200 group-hover:text-white transition-colors">
                  Camera Screen Shake
                </span>
                <span className="block text-[9px] text-slate-400 leading-none mt-0.5">
                  Vibrates screen during heavy impacts & explosions.
                </span>
              </div>
            </label>

            {/* Flash effects */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={flashEffectsEnabled}
                onChange={(e) => setFlashEffectsEnabled(e.target.checked)}
                className="w-4 h-4 text-sky-500 bg-slate-950 border-slate-800 rounded focus:ring-sky-500 focus:ring-2 cursor-pointer"
              />
              <div>
                <span className="font-mono font-bold text-slate-200 group-hover:text-white transition-colors">
                  Full-Screen Red Hit Flash
                </span>
                <span className="block text-[9px] text-slate-400 leading-none mt-0.5">
                  Displays full-screen red warning vignette on damage.
                </span>
              </div>
            </label>
          </div>

        </div>

        {/* Modal Footer Close */}
        <div className="bg-slate-950 p-3 text-center border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-1.5 bg-sky-500 hover:bg-sky-450 text-white font-mono font-bold text-xs rounded transition-all cursor-pointer active:scale-95"
          >
            APPLY & RESUME PLAY
          </button>
        </div>
      </div>
    </div>
  );
}
