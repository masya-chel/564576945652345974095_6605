import React, { useState, useEffect, useRef } from 'react';
import {
  CalculatorInputs,
  CalculatorResults,
  ChipModel,
  LightLoadMode,
  SwitchingFreqOption,
  VccBiasMode,
} from '../types/calculator';
import {
  AlertTriangle,
  Cpu,
  Radio,
  Sliders,
  ShieldAlert,
  Clock,
  Zap,
  Gauge,
  Sparkles,
  Settings2,
} from 'lucide-react';

interface ManualNumericInputProps {
  label: string;
  value: number;
  unit?: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  colorScheme?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'default';
  disabled?: boolean;
}

const ManualNumericInput: React.FC<ManualNumericInputProps> = ({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  hint,
  colorScheme = 'default',
  disabled = false,
}) => {
  const [text, setText] = useState<string>(String(value));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setText(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const parsed = parseFloat(text);
    if (isNaN(parsed) || text.trim() === '' || parsed < 0) {
      setText(String(value));
    } else {
      setText(String(parsed));
      onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (disabled) return;
    isFocusedRef.current = true;
    e.target.select();
  };

  const getBorderColor = () => {
    if (disabled) {
      return 'border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed opacity-80';
    }
    switch (colorScheme) {
      case 'cyan':
        return 'border-cyan-700/80 focus:border-cyan-400 text-cyan-300 bg-slate-950';
      case 'emerald':
        return 'border-emerald-700/80 focus:border-emerald-400 text-emerald-400 font-bold bg-slate-950';
      case 'amber':
        return 'border-amber-700/80 focus:border-amber-400 text-amber-400 font-bold bg-slate-950';
      case 'purple':
        return 'border-purple-700/80 focus:border-purple-400 text-purple-300 font-semibold bg-slate-950';
      default:
        return 'border-slate-700 focus:border-cyan-500 text-slate-100 bg-slate-950';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] ${disabled ? 'text-slate-500' : 'text-slate-300'}`}>
          {label}
        </span>
        {unit && (
          <span className="text-[11px] font-mono text-slate-400 ml-1">
            {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full border rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors ${getBorderColor()}`}
        />
      </div>
      {hint && <span className="text-[10px] text-slate-400 block mt-0.5">{hint}</span>}
    </div>
  );
};

interface InputPanelProps {
  inputs: CalculatorInputs;
  results: CalculatorResults;
  onChange: <K extends keyof CalculatorInputs>(field: K, value: CalculatorInputs[K]) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  inputs,
  results,
  onChange,
}) => {
  return (
    <div className="w-full lg:w-[420px] shrink-0 bg-slate-900 border-r border-slate-800 p-5 overflow-y-auto space-y-5 text-slate-200">
      {/* 0. Header with Chip Selector and VCC Bias Mode */}
      <div className="space-y-3 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
              Чип и режим питания
            </h2>
          </div>
          <select
            value={inputs.chipModel || 'MPQ8626GD'}
            onChange={(e) => {
              const model = e.target.value as ChipModel;
              onChange('chipModel', model);
              if (model === 'IS6605A' && inputs.tssMs === 2.2) {
                onChange('tssMs', 1.4);
              } else if (model === 'MPQ8626GD' && inputs.tssMs === 1.4) {
                onChange('tssMs', 2.2);
              }
            }}
            className="bg-slate-950 border border-cyan-700/80 text-cyan-300 text-xs font-mono font-bold rounded px-2 py-1 focus:outline-none"
          >
            <option value="MPQ8626GD">MPQ8626GD (MPS, 16V 6A)</option>
            <option value="IS6605A">IS6605A (Innovision, 16V 6A)</option>
          </select>
        </div>

        {/* VCC Bias Selection */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onChange('vccBiasMode', 'internal')}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-medium text-left transition-colors ${
              inputs.vccBiasMode === 'internal'
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-bold block">Внутренний LDO</span>
            <span className="text-[10px] text-slate-400">Vin = 4.0В .. 16В</span>
          </button>
          <button
            type="button"
            onClick={() => onChange('vccBiasMode', 'external_3v3')}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-medium text-left transition-colors ${
              inputs.vccBiasMode === 'external_3v3'
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-bold block">Внешний 3.3В VCC</span>
            <span className="text-[10px] text-slate-400">Vin от 2.85В (низкий вход)</span>
          </button>
        </div>
      </div>

      {/* Warnings Banner */}
      {results.warnings.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Внимание: ограничения кремния</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-amber-200/90 font-sans">
            {results.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Конфигурация MODE и частота переключения (Пин 12) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>MODE (Пин 12) — Режим и Частота</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {results.modePinConnection}
          </span>
        </div>

        {/* Input Mode Toggle */}
        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="modeInputMode"
              value="mode_fsw"
              checked={inputs.modeInputMode === 'mode_fsw'}
              onChange={() => onChange('modeInputMode', 'mode_fsw')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>Режим / Частота</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="modeInputMode"
              value="resistor"
              checked={inputs.modeInputMode === 'resistor'}
              onChange={() => onChange('modeInputMode', 'resistor')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>Резистор R_MODE</span>
          </label>
        </div>

        {inputs.modeInputMode === 'mode_fsw' ? (
          <div className="space-y-2.5">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Поведение при малых нагрузках (Light-Load):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange('lightLoadMode', 'FCCM')}
                  className={`py-1.5 px-2 text-xs rounded border text-center font-medium transition-colors ${
                    inputs.lightLoadMode === 'FCCM'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Forced CCM (Постоянная частота)
                </button>
                <button
                  type="button"
                  onClick={() => onChange('lightLoadMode', 'PulseSkip')}
                  className={`py-1.5 px-2 text-xs rounded border text-center font-medium transition-colors ${
                    inputs.lightLoadMode === 'PulseSkip'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Pulse Skip (Энергосбережение)
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                Частота переключения fSW:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {([600, 1100, 2000] as SwitchingFreqOption[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onChange('fswKhz', f)}
                    className={`py-1.5 px-2 text-xs rounded border font-mono font-bold transition-colors ${
                      inputs.fswKhz === f
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 2000 ? '2.0 МГц' : f === 1100 ? '1.1 МГц' : '600 кГц'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ManualNumericInput
              label="Резистор R_MODE"
              unit="кОм"
              value={inputs.rmodeKohm}
              colorScheme="cyan"
              onChange={(val) => onChange('rmodeKohm', val)}
              hint="0к=AGND, 30.1к, 60.4к, 121к, 243к, >350к=VCC"
            />
            <div className="text-[11px] p-2 bg-slate-900 rounded border border-slate-800 flex flex-col justify-center">
              <span className="text-slate-400">Распознано:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {results.detectedLightLoadMode} @ {results.actualFswKhz} кГц
              </span>
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800">
          {results.modeDescription}
        </div>
      </div>

      {/* 2. Основные электрические параметры (Power Stage) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Силовая ступень: Напряжения и Ток</span>
        </label>

        {/* VIN Inputs */}
        <div className="grid grid-cols-3 gap-2">
          <ManualNumericInput
            label="VIN Nom"
            unit="В"
            value={inputs.vinNom}
            onChange={(val) => onChange('vinNom', val)}
          />
          <ManualNumericInput
            label="VIN Min"
            unit="В"
            value={inputs.vinMin}
            onChange={(val) => onChange('vinMin', val)}
          />
          <ManualNumericInput
            label="VIN Max"
            unit="В"
            value={inputs.vinMax}
            onChange={(val) => onChange('vinMax', val)}
          />
        </div>

        {/* VOUT Mode Switcher */}
        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="voutInputMode"
              value="voltage"
              checked={inputs.voutInputMode === 'voltage'}
              onChange={() => onChange('voutInputMode', 'voltage')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>Напряжение VOUT</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="voutInputMode"
              value="resistors"
              checked={inputs.voutInputMode === 'resistors'}
              onChange={() => onChange('voutInputMode', 'resistors')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>Делитель R1 / R2</span>
          </label>
        </div>

        {inputs.voutInputMode === 'voltage' ? (
          <div className="grid grid-cols-2 gap-3">
            <ManualNumericInput
              label="Выходное VOUT"
              unit="В"
              value={inputs.vout}
              colorScheme="emerald"
              onChange={(val) => onChange('vout', val)}
              hint={`Vref = 0.600В (диапазон 0.6В .. ${inputs.chipModel === 'MPQ8626GD' ? '6.0В' : '5.5В'})`}
            />
            <ManualNumericInput
              label="Макс. ток IOUT"
              unit="А"
              value={inputs.ioutMax}
              colorScheme="amber"
              onChange={(val) => onChange('ioutMax', val)}
              hint="Паспортный максимум чипа: 6.0 А"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <ManualNumericInput
                label="Верхний R1 (VOUT→FB)"
                unit="кОм"
                value={inputs.r1Kohm}
                colorScheme="cyan"
                onChange={(val) => onChange('r1Kohm', val)}
                hint="Рекомендуется 2.0 .. 10.0 кОм"
              />
              <ManualNumericInput
                label="Нижний R2 (FB→AGND)"
                unit="кОм"
                value={inputs.r2Kohm}
                colorScheme="cyan"
                onChange={(val) => onChange('r2Kohm', val)}
                hint="R2 = R1 · 0.6 / (Vout - 0.6)"
              />
            </div>
            <div className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded font-mono">
              <span className="text-slate-400">Фактический Vout:</span>
              <span className="text-emerald-400 font-bold">
                {results.voutActual} В ({results.voutErrorPercent > 0 ? '+' : ''}{results.voutErrorPercent}%)
              </span>
            </div>
          </div>
        )}

        {/* Ripple & Ripple Ratio Kind */}
        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Пульсации дросселя Kind"
            unit="ΔIL/Iout"
            value={inputs.kind}
            onChange={(val) => onChange('kind', val)}
            hint="Рекомендуется 0.25 .. 0.40"
          />
          <ManualNumericInput
            label="Макс. пульсации VOUT"
            unit="мВ"
            value={inputs.voutRippleMaxMv}
            onChange={(val) => onChange('voutRippleMaxMv', val)}
            hint="Для подбора емкости COUT"
          />
        </div>

        {/* Transient Step */}
        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Ступень нагрузки ΔI"
            unit="А"
            value={inputs.loadStepA}
            onChange={(val) => onChange('loadStepA', val)}
          />
          <ManualNumericInput
            label="Допустимый выброс ΔV"
            unit="мВ"
            value={inputs.voltageOvershootMv}
            onChange={(val) => onChange('voltageOvershootMv', val)}
          />
        </div>
      </div>

      {/* 3. Ограничение тока и защита OCP (Пин 4 CS) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>CS (Пин 4) — Токовый предел</span>
          </label>
          <span className="text-[11px] font-mono text-amber-300 font-bold">
            R_CS = {results.rcsKohm.formatted}
          </span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="currentLimitInputMode"
              value="current"
              checked={inputs.currentLimitInputMode === 'current'}
              onChange={() => onChange('currentLimitInputMode', 'current')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По пределу тока (А)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="currentLimitInputMode"
              value="resistor"
              checked={inputs.currentLimitInputMode === 'resistor'}
              onChange={() => onChange('currentLimitInputMode', 'resistor')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По резистору R_CS</span>
          </label>
        </div>

        {inputs.currentLimitInputMode === 'current' ? (
          <ManualNumericInput
            label="Целевой предел тока I_OC"
            unit="А"
            value={inputs.ilimTargetA}
            colorScheme="amber"
            onChange={(val) => onChange('ilimTargetA', Math.min(8.0, val))}
            hint="Диапазон: 4.0 А .. 8.0 А (Vocp = 1.2В, Gcs = 40 мкА/А)"
          />
        ) : (
          <ManualNumericInput
            label="Резистор R_CS к AGND"
            unit="кОм"
            value={inputs.rcsKohm}
            colorScheme="amber"
            onChange={(val) => onChange('rcsKohm', val)}
            hint="Формула: Rcs = 1.2 / (40e-6 · Ivalley)"
          />
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-900 rounded border border-slate-800 font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Порог впадины:</span>
            <span className="text-amber-300 font-bold">{results.actualIlimValleyA} А</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Эквивалент Ilim_dc:</span>
            <span className="text-emerald-400 font-bold">~ {results.actualIlimDcA} А</span>
          </div>
        </div>
      </div>

      {/* 4. Плавный пуск и опорное напряжение (Пин 8 TRK/REF) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>TRK/REF (Пин 8) — Soft-Start</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            Tss = {results.actualTssMs} мс
          </span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="softStartInputMode"
              value="time"
              checked={inputs.softStartInputMode === 'time'}
              onChange={() => onChange('softStartInputMode', 'time')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По времени Tss</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="softStartInputMode"
              value="capacitor"
              checked={inputs.softStartInputMode === 'capacitor'}
              onChange={() => onChange('softStartInputMode', 'capacitor')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По емкости C_REF</span>
          </label>
        </div>

        {inputs.softStartInputMode === 'time' ? (
          <ManualNumericInput
            label="Время плавного пуска"
            unit="мс"
            value={inputs.tssMs}
            colorScheme="cyan"
            onChange={(val) => onChange('tssMs', val)}
            hint={`Внутренний таймер чипа: ${results.minInternalTssMs} мс (Cref = ${results.crefNf.formatted})`}
          />
        ) : (
          <ManualNumericInput
            label="Емкость конденсатора C_REF"
            unit="нФ"
            value={inputs.crefNf}
            colorScheme="cyan"
            onChange={(val) => onChange('crefNf', val)}
            hint="Cref от пина 8 к AGND (минимум 3.3 нФ для стабилизации)"
          />
        )}
      </div>

      {/* 5. Порог включения UVLO и разрешение (Пин 5 EN) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>EN (Пин 5) — Защита UVLO</span>
          </label>
          <span className="text-[11px] font-mono text-cyan-300 font-bold">
            Start = {results.actualVinStart} В
          </span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="uvloInputMode"
              value="voltage"
              checked={inputs.uvloInputMode === 'voltage'}
              onChange={() => onChange('uvloInputMode', 'voltage')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По порогу Vin_start</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="uvloInputMode"
              value="resistors"
              checked={inputs.uvloInputMode === 'resistors'}
              onChange={() => onChange('uvloInputMode', 'resistors')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>Делитель Rup / Rdown</span>
          </label>
        </div>

        {inputs.uvloInputMode === 'voltage' ? (
          <ManualNumericInput
            label="Порог включения Vin_start"
            unit="В"
            value={inputs.vinStartUvlo}
            onChange={(val) => onChange('vinStartUvlo', val)}
            hint="VIHEN = 1.22В (гистерезис 200 мВ)"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ManualNumericInput
              label="Верхний R_UP"
              unit="кОм"
              value={inputs.rupKohm}
              onChange={(val) => onChange('rupKohm', val)}
            />
            <ManualNumericInput
              label="Нижний R_DOWN"
              unit="кОм"
              value={inputs.rdownKohm}
              onChange={(val) => onChange('rdownKohm', val)}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-[10px] p-2 bg-slate-900 rounded border border-slate-800 font-mono">
          <div>
            <span className="text-slate-400 block">Vin_start:</span>
            <span className="text-cyan-300 font-bold">{results.actualVinStart}В</span>
          </div>
          <div>
            <span className="text-slate-400 block">Vin_stop:</span>
            <span className="text-slate-300 font-bold">{results.actualVinStop}В</span>
          </div>
          <div>
            <span className="text-slate-400 block">VEN(VinMax):</span>
            <span className={results.venOvervoltageWarning ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {results.venAtVinMax}В {results.venOvervoltageWarning && '(!)'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Feed-Forward конденсатор Cff (Пин 6 FB) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>C_FF (Параллельно R1) — Коррекция</span>
          </label>
          <span className="text-[11px] font-mono text-purple-300 font-bold">
            {results.cff.formatted}
          </span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded text-xs grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="cffInputMode"
              value="target_fz"
              checked={inputs.cffInputMode === 'target_fz'}
              onChange={() => onChange('cffInputMode', 'target_fz')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По частоте нуля fz</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
            <input
              type="radio"
              name="cffInputMode"
              value="capacitor"
              checked={inputs.cffInputMode === 'capacitor'}
              onChange={() => onChange('cffInputMode', 'capacitor')}
              className="accent-cyan-500 cursor-pointer"
            />
            <span>По емкости C_FF</span>
          </label>
        </div>

        {inputs.cffInputMode === 'target_fz' ? (
          <ManualNumericInput
            label="Целевая частота нуля fz"
            unit="кГц"
            value={inputs.targetFzKhz}
            colorScheme="purple"
            onChange={(val) => onChange('targetFzKhz', val)}
            hint="Рекомендация даташита MPS: 5 кГц .. 40 кГц (типично ~15 кГц)"
          />
        ) : (
          <ManualNumericInput
            label="Емкость конденсатора C_FF"
            unit="пФ"
            value={inputs.cffPf}
            colorScheme="purple"
            onChange={(val) => onChange('cffPf', val)}
            hint="C0G / NP0 керамика параллельно верхнему резистору R1"
          />
        )}

        <div className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded font-mono">
          <span className="text-slate-400">Фактический нуль контура:</span>
          <span className="text-purple-300 font-bold">fz = {results.actualFzKhz} кГц</span>
        </div>
      </div>

      {/* 7. Сервисные компоненты (BST, VCC, PGOOD) */}
      <div className="space-y-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
        <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span>Сервисная обвязка (BST, VCC, PGOOD)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ManualNumericInput
            label="R_BST демпфер"
            unit="Ω"
            value={inputs.rbootOhm}
            onChange={(val) => onChange('rbootOhm', val)}
            hint="Гасит звон dV/dt (3.3 Ω реком.)"
          />
          <ManualNumericInput
            label="C_BST бутстреп"
            unit="нФ"
            value={inputs.cbootNf}
            onChange={(val) => onChange('cbootNf', val)}
            hint="100 нФ ≥25В X7R"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ManualNumericInput
            label="C_VCC конденсатор"
            unit="µF"
            value={inputs.cvccUf}
            onChange={(val) => onChange('cvccUf', val)}
            hint="Мин. 1 µF к AGND/PGND"
          />
          <ManualNumericInput
            label="R_PGOOD подтяжка"
            unit="кОм"
            value={inputs.rpgoodKohm}
            onChange={(val) => onChange('rpgoodKohm', val)}
            hint="10 кОм к VCC / 3.3В"
          />
        </div>
      </div>
    </div>
  );
};
