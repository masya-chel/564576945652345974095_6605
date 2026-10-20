import React from 'react';
import { CalculatorInputs, CalculatorResults } from '../types/calculator';
import { Activity, Flame, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface WaveformChartProps {
  inputs: CalculatorInputs;
  results: CalculatorResults;
}

export const WaveformChart: React.FC<WaveformChartProps> = ({
  inputs,
  results,
}) => {
  // SVG points for 2 cycles of inductor current triangle wave
  // Cycle 1: (0, valley) -> (ton, peak) -> (Tsw, valley)
  // Cycle 2: (Tsw, valley) -> (Tsw + ton, peak) -> (2*Tsw, valley)
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxScaleCurrent = Math.max(12, results.iPeak * 1.25);
  const minScaleCurrent = 0;

  const getY = (val: number) => {
    const norm = (val - minScaleCurrent) / (maxScaleCurrent - minScaleCurrent);
    return padTop + plotH - norm * plotH;
  };

  const periodW = plotW / 2;
  const tonW = periodW * results.dutyNom;
  const toffW = periodW - tonW;

  const yPeak = getY(results.iPeak);
  const yValley = getY(results.iValley);
  const yAvg = getY(inputs.ioutMax);

  const wavePath = `
    M ${padLeft} ${yValley}
    L ${padLeft + tonW} ${yPeak}
    L ${padLeft + periodW} ${yValley}
    L ${padLeft + periodW + tonW} ${yPeak}
    L ${padLeft + 2 * periodW} ${yValley}
  `;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-5 overflow-y-auto space-y-6">
      {/* Top Telemetry strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-[11px] text-slate-400 block uppercase font-mono">
            Пиковый ток дросселя Ipeak
          </span>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
            {results.iPeak} <span className="text-xs text-slate-400">А</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Мин. ток Ivalley = {results.iValley} А
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-[11px] text-slate-400 block uppercase font-mono">
            Пульсации тока дросселя ΔIL
          </span>
          <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
            {results.actualDeltaIL} <span className="text-xs text-slate-400">А</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Ratio Kind: {(results.actualKind * 100).toFixed(0)}% (цель: {(inputs.kind * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-[11px] text-slate-400 block uppercase font-mono">
            Длительность импульса t_on
          </span>
          <div
            className={`text-2xl font-mono font-bold mt-1 ${
              results.tonMinWarning ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {results.tonNs} <span className="text-xs text-slate-400">нс</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Лимит SiC461: ≥ 60 нс
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-[11px] text-slate-400 block uppercase font-mono">
            Ориентировочный КПД
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {results.estimatedEfficiency} <span className="text-xs text-slate-400">%</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Потери мощности: ~ {results.estimatedPowerLossW} Вт
          </span>
        </div>
      </div>

      {/* Inductor Current Waveform Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Форма тока дросселя IL(t) за 2 периода коммутации
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Fsw = {inputs.fswKhz} кГц (T = {(1000 / inputs.fswKhz).toFixed(2)} мкс)
          </span>
        </div>

        <div className="w-full overflow-x-auto flex justify-center">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-[700px] h-auto select-none">
            {/* Grid Lines */}
            <line x1={padLeft} y1={padTop} x2={svgWidth - padRight} y2={padTop} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={padLeft} y1={yAvg} x2={svgWidth - padRight} y2={yAvg} stroke="#334155" strokeDasharray="4,4" />
            <line x1={padLeft} y1={padTop + plotH} x2={svgWidth - padRight} y2={padTop + plotH} stroke="#334155" />

            {/* Y Axis Labels */}
            <text x={padLeft - 10} y={yPeak + 4} textAnchor="end" fill="#f59e0b" fontSize="11" fontFamily="JetBrains Mono">
              {results.iPeak}A
            </text>
            <text x={padLeft - 10} y={yAvg + 4} textAnchor="end" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono">
              {inputs.ioutMax}A (DC)
            </text>
            <text x={padLeft - 10} y={yValley + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
              {results.iValley}A
            </text>
            <text x={padLeft - 10} y={padTop + plotH + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono">
              0A
            </text>

            {/* Shaded Area under triangle */}
            <path
              d={`${wavePath} L ${padLeft + 2 * periodW} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`}
              fill="#0284c7"
              opacity="0.12"
            />

            {/* Waveform Line */}
            <path d={wavePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

            {/* Peak and Valley Dots */}
            <circle cx={padLeft + tonW} cy={yPeak} r="4" fill="#f59e0b" />
            <circle cx={padLeft + periodW + tonW} cy={yPeak} r="4" fill="#f59e0b" />
            <circle cx={padLeft} cy={yValley} r="4" fill="#38bdf8" />
            <circle cx={padLeft + periodW} cy={yValley} r="4" fill="#38bdf8" />

            {/* Timing markers */}
            <line x1={padLeft} y1={padTop + plotH + 8} x2={padLeft + tonW} y2={padTop + plotH + 8} stroke="#10b981" strokeWidth="2" />
            <text x={padLeft + tonW / 2} y={padTop + plotH + 24} textAnchor="middle" fill="#10b981" fontSize="11" fontFamily="JetBrains Mono">
              ton ({results.tonNs}ns)
            </text>

            <line x1={padLeft + tonW} y1={padTop + plotH + 8} x2={padLeft + periodW} y2={padTop + plotH + 8} stroke="#64748b" strokeWidth="2" />
            <text x={padLeft + tonW + toffW / 2} y={padTop + plotH + 24} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">
              toff ({results.toffNs}ns)
            </text>
          </svg>
        </div>
      </div>

      {/* Power Dissipation & Thermal Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Баланс потерь мощности и тепловой режим
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-950 rounded border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Потери проводимости (MOSFETs)</span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {results.conductionLossW} Вт
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Rds(on) верхнего 27 мОм, нижнего 12 мОм
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Динамические потери переключения</span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {results.switchingLossW} Вт
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Зависят от Vin, Iout и частоты Fsw ({inputs.fswKhz} кГц)
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Потери в меди дросселя (DCR)</span>
            <span className="text-lg font-mono font-bold text-slate-200">
              {results.inductorDcrLossW} Вт
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              При типовом сопротивлении обмотки DCR ≈ 12 мОм
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded text-xs text-slate-300 flex items-center gap-3">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            При суммарном рассеянии <strong className="text-white">{results.estimatedPowerLossW} Вт</strong> в корпусе PowerPAK MLP55-27L (θJA ≈ 25 °C/Вт при грамотной разводке полигонов меди платы) перегрев кристалла над средой составит всего <strong className="text-emerald-400">~ {(results.estimatedPowerLossW * 25).toFixed(0)} °C</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
