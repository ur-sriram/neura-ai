import React from 'react';
import { Truck, ShieldAlert, RotateCcw, Play, Pause, FastForward, Activity } from 'lucide-react';
import { VehicleClass } from '../types';

interface HeaderProps {
  vclass: VehicleClass;
  setVclass: (v: VehicleClass) => void;
  simHour: number;
  isClockRunning: boolean;
  onToggleClock: () => void;
  onSetSpeed: (speed: number) => void;
  onReset: () => void;
  onRunDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vclass,
  setVclass,
  simHour,
  isClockRunning,
  onToggleClock,
  onSetSpeed,
  onReset,
  onRunDemo
}) => {
  const formatSimTime = (h: number) => {
    const day = Math.floor(h / 24) + 1;
    const hour = (6 + (h % 24)) % 24;
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    return `Day ${day}, ${timeStr} Sim Time`;
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-800 px-4 py-2.5 flex items-center justify-between shadow-xl">
      {/* Brand & Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              NE-Setu
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
              SIH26002 MVP
            </span>
          </div>
          <p className="text-xs text-gray-400">Adaptive Logistics & Accessibility Intelligence</p>
        </div>
      </div>

      {/* Center: Vehicle Class Toggle (Signature Interaction) */}
      <div className="flex items-center bg-gray-900/80 p-1 rounded-xl border border-gray-800 shadow-inner">
        <span className="text-xs font-semibold text-gray-400 px-2.5 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          Class:
        </span>
        {(['heavy', 'mini', '4x4', 'special'] as VehicleClass[]).map((cls) => (
          <button
            key={cls}
            onClick={() => setVclass(cls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              vclass === cls
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {cls.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Simulation Clock & Actions */}
      <div className="flex items-center space-x-4">
        {/* Clock Controls */}
        <div className="flex items-center space-x-2 bg-gray-900/90 px-3 py-1.5 rounded-xl border border-gray-800">
          <button
            onClick={onToggleClock}
            className="p-1 rounded-lg hover:bg-gray-800 text-blue-400 transition"
            title={isClockRunning ? 'Pause Sim Clock' : 'Play Sim Clock'}
          >
            {isClockRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onSetSpeed(20)}
            className="p-1 rounded-lg hover:bg-gray-800 text-purple-400 transition"
            title="Fast Forward (20x)"
          >
            <FastForward className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold text-emerald-400 px-1">
            {formatSimTime(simHour)}
          </span>
        </div>

        {/* Action Buttons */}
        <button
          onClick={onRunDemo}
          className="px-3.5 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
        >
          <ShieldAlert className="w-4 h-4" />
          Run SCN-01 Demo
        </button>

        <button
          onClick={onReset}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition border border-gray-800"
          title="Reset Demo State (06:00)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
