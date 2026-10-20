import React, { useState, useEffect, useRef } from 'react';
import {
  CalculatorInputs,
  CalculatorResults,
  ChipModel,
  OperatingMode,
} from '../types/calculator';
import {
  AlertTriangle,
  Sliders,
  Cpu,
  Activity,
  ShieldCheck,
  Zap,
  Radio,
  CheckCircle2,
  Layers,
  Flame,
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
    if (isNaN(parsed) || text.trim() === '' || parsed <= 0) {
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
    <div className="w-full lg:w-[410px] shrink-0 bg-slate-900 border-r border-slate-800 p-5 overflow-y-auto space-y-6 text-slate-200">
      {/* 0. Header with Chip Selector */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Параметры SiC46x
          </h2>
        </div>
        <select
          value={inputs.chipModel || 'SiC461'}
          onChange={(e) => {
            const model = e.target.value as ChipModel;
            onChange('chipModel', model);
          }}
          className="bg-slate-950 border border-cyan-700/80 text-cyan-300 text-xs font-mono font-bold rounded px-2 py-1 focus:outline-none"
        >
          <option value="SiC461">SiC461 (10A max)</option>
          <option value="SiC462">SiC462 (6A max)</option>
          <option value="SiC463">SiC463 (4A max)</option>
          <option value="SiC464">SiC464 (2A max)</option>
        </select>
      </div>

      {/* Warnings Banner if any */}
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

      {/* 1. Конфигурация MODE (Пин 27) */}
      <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>MODE (Пин 27) — Режим работы</span>
          </label>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">
            {results.rmodeKohm.formatted}
          </span>
        </div>

        {/* Radio selector for MODE input mode */}
        <div className="p-2 bg-slate-900 border border-slate-800 rounded space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ выбора режима MODE:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="modeInputMode"
                value="mode"
                checked={inputs.modeInputMode === 'mode'}
                onChange={() => onChange('modeInputMode', 'mode')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>По списку режимов</span>
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
              <span>По резистору R_mode</span>
            </label>
          </div>
        </div>

        {inputs.modeInputMode === 'mode' ? (
          <div>
            <select
              value={inputs.operatingMode}
              onChange={(e) => {
                const newMode = Number(e.target.value) as OperatingMode;
                onChange('operatingMode', newMode);
                let stdR = 2.0;
                if (newMode === 2) stdR = 301.0;
                if (newMode === 3) stdR = 499.0;
                if (newMode === 4) stdR = 1000.0;
                onChange('rmodeKohm', stdR);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value={1}>Mode 1: PSM + Внутренний LDO VDRV 5V (Rmode = 2.0 кОм)</option>
              <option value={2}>Mode 2: FCCM + Внутренний LDO VDRV 5V (Rmode = 301 кОм)</option>
              <option value={3}>Mode 3: FCCM + Внешний VDRV 5V (Rmode = 499 кОм)</option>
              <option value={4}>Mode 4: PSM + Внешний VDRV 5V (Rmode = 1000 кОм)</option>
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ManualNumericInput
              label="Резистор R_mode"
              unit="кОм"
              value={inputs.rmodeKohm}
              colorScheme="cyan"
              hint="2k (M1), 301k (M2), 499k (M3), 1M (M4)"
              onChange={(val) => {
                onChange('rmodeKohm', val);
                let detected: OperatingMode = 1;
                if (val <= 10) detected = 1;
                else if (val <= 400) detected = 2;
                else if (val <= 750) detected = 3;
                else detected = 4;
                onChange('operatingMode', detected);
              }}
            />
            <div className="text-[11px] font-mono text-slate-300 flex flex-col justify-center">
              <span className="text-slate-400 text-[10px]">Распознан:</span>
              <span className="text-emerald-400 font-bold">Mode {results.detectedMode}</span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-400 leading-tight">
          {results.modeDescription}
        </p>

        {/* Ultrasonic pin 18 */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1 border-t border-slate-800">
          <input
            type="checkbox"
            checked={inputs.ultrasonicEnabled}
            onChange={(e) => onChange('ultrasonicEnabled', e.target.checked)}
            className="accent-cyan-500 rounded cursor-pointer"
          />
          <span className="text-[11px]">
            ULTRASONIC (Пин 18): частота холостого хода &gt; 25 кГц (0 Ω к VDD)
          </span>
        </label>
      </div>

      {/* 2. Входное напряжение (VIN) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
          Входное напряжение (VIN)
        </label>
        
        <div className="grid grid-cols-3 gap-2">
          <ManualNumericInput
            label="Мин. (В)"
            value={inputs.vinMin}
            min={4.5}
            max={60}
            onChange={(val) => onChange('vinMin', val)}
          />
          <ManualNumericInput
            label="Ном. (В)"
            value={inputs.vinNom}
            min={4.5}
            max={60}
            colorScheme="cyan"
            onChange={(val) => onChange('vinNom', val)}
          />
          <ManualNumericInput
            label="Макс. (В)"
            value={inputs.vinMax}
            min={4.5}
            max={60}
            onChange={(val) => onChange('vinMax', val)}
          />
        </div>
      </div>

      {/* 3. Выходное напряжение и делитель VFB (Пин 22) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Выходная цепь и VFB (Пин 22)
          </label>
          <span className="text-[10px] font-mono text-emerald-400">
            Vref = 0.800 В
          </span>
        </div>

        {/* Radio Button Selector: Mode of Definition */}
        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания выходного напряжения:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="voutInputMode"
                value="voltage"
                checked={inputs.voutInputMode === 'voltage'}
                onChange={() => onChange('voutInputMode', 'voltage')}
                className="accent-emerald-500 cursor-pointer"
              />
              <span>По числу Vout (В)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="voutInputMode"
                value="resistors"
                checked={inputs.voutInputMode === 'resistors'}
                onChange={() => onChange('voutInputMode', 'resistors')}
                className="accent-emerald-500 cursor-pointer"
              />
              <span>По резисторам делителя</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Напряжение Vout"
            unit="В"
            value={inputs.vout}
            min={0.8}
            max={55}
            colorScheme={inputs.voutInputMode === 'voltage' ? 'emerald' : 'default'}
            disabled={inputs.voutInputMode === 'resistors'}
            hint={
              inputs.voutInputMode === 'voltage'
                ? `Стандарт E96: R_FB_H = ${results.rfbTop.nominal} кОм`
                : 'Рассчитано из R_FB_H / R_FB_L'
            }
            onChange={(val) => {
              onChange('vout', val);
              const syncedRfb1 = Number((inputs.rfb2Kohm * (val / 0.800 - 1)).toFixed(2));
              onChange('rfb1Kohm', syncedRfb1);
              const syncedRfsw = Number((val / (1.9e-10 * (inputs.fswKhz * 1000) * 1000)).toFixed(2));
              onChange('rfswKohm', syncedRfsw);
            }}
          />

          <ManualNumericInput
            label="Макс. ток Iout"
            unit="А"
            value={inputs.ioutMax}
            min={0.1}
            max={results.maxRatedCurrentA}
            colorScheme="amber"
            hint={`Лимит ${inputs.chipModel}: ${results.maxRatedCurrentA} А`}
            onChange={(val) => onChange('ioutMax', val)}
          />
        </div>

        {/* Resistor Divider RFB1 & RFB2 */}
        <div className={`p-2.5 rounded-lg border transition-colors space-y-2 ${
          inputs.voutInputMode === 'resistors'
            ? 'bg-purple-950/30 border-purple-800/80'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-slate-400">
              Делитель на выводе VFB (Пин 22):
            </span>
            {inputs.voutInputMode === 'resistors' && (
              <span className="text-[10px] font-mono text-purple-300 font-semibold px-1.5 py-0.5 rounded bg-purple-900/60">
                Задающий режим
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ManualNumericInput
              label="Верхний R_FB_H"
              unit="кОм"
              value={inputs.rfb1Kohm}
              colorScheme={inputs.voutInputMode === 'resistors' ? 'purple' : 'default'}
              disabled={inputs.voutInputMode === 'voltage'}
              hint={`Ближайший E96: ${results.rfbTop.nominal} кОм`}
              onChange={(newRfb1) => {
                onChange('rfb1Kohm', newRfb1);
                const newVout = Number((0.800 * (1 + newRfb1 / inputs.rfb2Kohm)).toFixed(3));
                onChange('vout', newVout);
              }}
            />

            <ManualNumericInput
              label="Нижний R_FB_L"
              unit="кОм"
              value={inputs.rfb2Kohm}
              colorScheme={inputs.voutInputMode === 'resistors' ? 'purple' : 'default'}
              disabled={inputs.voutInputMode === 'voltage'}
              hint="Стандартно 10.0 кОм"
              onChange={(newRfb2) => {
                onChange('rfb2Kohm', newRfb2);
                if (newRfb2 > 0) {
                  const newVout = Number((0.800 * (1 + inputs.rfb1Kohm / newRfb2)).toFixed(3));
                  onChange('vout', newVout);
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Пульсации Vout"
            unit="мВ"
            value={inputs.voutRippleMaxMv}
            min={5}
            max={500}
            hint={`${((inputs.voutRippleMaxMv / (inputs.vout * 1000)) * 100).toFixed(1)}% от Vout`}
            onChange={(val) => onChange('voutRippleMaxMv', val)}
          />

          <ManualNumericInput
            label="Шаг тока ΔIstep"
            unit="А"
            value={inputs.loadStepA}
            min={0.1}
            max={inputs.ioutMax}
            hint="Для расчета Cout"
            onChange={(val) => onChange('loadStepA', val)}
          />
        </div>
      </div>

      {/* 4. Частота FSW (Пин 24) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Частота и fSW (Пин 24)
          </label>
          <span className="text-[10px] font-mono text-cyan-400">
            Rfsw = Vout / (fsw · 1.9e-10)
          </span>
        </div>

        {/* Radio Button Selector: Frequency Mode */}
        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания частоты:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="fswInputMode"
                value="frequency"
                checked={inputs.fswInputMode === 'frequency'}
                onChange={() => onChange('fswInputMode', 'frequency')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>По частоте Fsw (кГц)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="fswInputMode"
                value="resistor"
                checked={inputs.fswInputMode === 'resistor'}
                onChange={() => onChange('fswInputMode', 'resistor')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>По резистору R_fsw (кОм)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Частота Fsw"
            unit="кГц"
            value={inputs.fswKhz}
            min={100}
            max={2000}
            colorScheme={inputs.fswInputMode === 'frequency' ? 'cyan' : 'default'}
            disabled={inputs.fswInputMode === 'resistor'}
            hint={`Ближайший E96: ${results.rfswKohm.nominal} кОм`}
            onChange={(val) => {
              onChange('fswKhz', val);
              const syncedRfsw = Number((inputs.vout / (1.9e-10 * (val * 1000) * 1000)).toFixed(2));
              onChange('rfswKohm', syncedRfsw);
            }}
          />

          <ManualNumericInput
            label="Резистор R_fsw"
            unit="кОм"
            value={inputs.rfswKohm}
            colorScheme={inputs.fswInputMode === 'resistor' ? 'cyan' : 'default'}
            disabled={inputs.fswInputMode === 'frequency'}
            hint={`Дает Fsw = ${results.actualFswKhz} кГц`}
            onChange={(newRfsw) => {
              onChange('rfswKohm', newRfsw);
              if (newRfsw > 0) {
                const newFswKhz = Number((inputs.vout / (1.9e-10 * (newRfsw * 1000) * 1000)).toFixed(1));
                onChange('fswKhz', newFswKhz);
              }
            }}
          />
        </div>

        <div>
          <ManualNumericInput
            label="Коэффициент пульсаций дросселя Kind (ΔIL / Iout)"
            value={inputs.kind}
            min={0.1}
            max={0.8}
            hint="Рекомендация: 0.2 .. 0.4 (по умолчанию 0.3)"
            onChange={(val) => onChange('kind', val)}
          />
        </div>
      </div>

      {/* 5. Бутстреп и PHASE1, PHASE2 (Пины 4, 5, 6) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            BOOT & PHASE1, PHASE2 (Пины 4, 5, 6)
          </label>
          <span className="text-[10px] font-mono text-cyan-400">
            Cboot = {results.cbootNf.formatted}
          </span>
        </div>

        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Номиналы бутстрепа:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
			  <input
				type="radio"
				name="bootInputMode"
				value="standard"
				checked={inputs.bootInputMode === 'standard'}
				onChange={() => {
				  onChange('bootInputMode', 'standard');
				  // Автоматически подставляем стандартные значения из даташита
				  const defaultRboot = (inputs.chipModel === 'SiC463' || inputs.chipModel === 'SiC464') ? 4.7 : 3.3;
				  onChange('rbootOhm', defaultRboot);
				  onChange('cbootNf', 100); // 100 нФ (0.1 мкФ)
				}}
				className="accent-cyan-500 cursor-pointer"
			  />
			  <span>Стандарт Vishay</span>
			</label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="bootInputMode"
                value="custom"
                checked={inputs.bootInputMode === 'custom'}
                onChange={() => onChange('bootInputMode', 'custom')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>Свой подбор</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Резистор R_boot"
            unit="Ω"
            value={inputs.rbootOhm}
            disabled={inputs.bootInputMode === 'standard'}
            colorScheme={inputs.bootInputMode === 'custom' ? 'cyan' : 'default'}
            hint="Демпфирование dV/dt (EMI)"
            onChange={(val) => onChange('rbootOhm', val)}
          />

          <ManualNumericInput
            label="Конденсатор C_boot"
            unit="нФ"
            value={inputs.cbootNf}
            disabled={inputs.bootInputMode === 'standard'}
            colorScheme={inputs.bootInputMode === 'custom' ? 'cyan' : 'default'}
            hint="100 нF X7R ≥25V"
            onChange={(val) => onChange('cbootNf', val)}
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Резистор R_BOOT включается между выводом BOOT (4) и выводами PHASE1/PHASE2 (5, 6) для ограничения скорости нарастания напряжения и подавления высокочастотного звона.
        </p>
      </div>

      {/* 6. Питание затворов VDRV (Пин 16) */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            VDRV (Пин 16) — Питание драйверов
          </span>
          <span className="font-mono text-cyan-400 font-bold">
            {results.cvdrvUf.formatted}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300 pt-1">
          <span className="text-slate-400">Источник VDRV:</span>
          <span className="font-semibold text-slate-200">
            {results.detectedMode === 3 || results.detectedMode === 4
              ? 'Внешний 5.0В (Mode 3/4)'
              : 'Внутренний LDO 5.0В (Mode 1/2)'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Потери в LDO регуляторе:</span>
          <span className={`font-mono font-bold ${results.vdrvPowerLossW > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {results.vdrvPowerLossW} Вт
          </span>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          Конденсатор CVDRV = 4.7 µF X7R 10V+ монтируется непосредственно между выводами 16 и PGND. В режимах Mode 3 и 4 при внешнем питании 5В потери в кристалле отсутствуют.
        </p>
      </div>

      {/* 7. Компенсация контура COMP (Пин 21) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Петля компенсации COMP (Пин 21)
          </label>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">
            fc ≈ {results.crossoverFreqKhz} кГц
          </span>
        </div>

        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания цепи COMP:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="compInputMode"
                value="auto"
                checked={inputs.compInputMode === 'auto'}
                onChange={() => onChange('compInputMode', 'auto')}
                className="accent-emerald-500 cursor-pointer"
              />
              <span>Авторасчет (gm=300µS)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="compInputMode"
                value="manual"
                checked={inputs.compInputMode === 'manual'}
                onChange={() => onChange('compInputMode', 'manual')}
                className="accent-emerald-500 cursor-pointer"
              />
              <span>Свои номиналы</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Резистор R_comp"
            unit="кОм"
            value={inputs.rcompKohm}
            disabled={inputs.compInputMode === 'auto'}
            colorScheme={inputs.compInputMode === 'manual' ? 'emerald' : 'default'}
            hint={`Расчетное: ${results.rcompKohm.nominal} кОм`}
            onChange={(val) => onChange('rcompKohm', val)}
          />

          <ManualNumericInput
            label="Конденсатор C_comp"
            unit="пФ"
            value={inputs.ccompPf}
            disabled={inputs.compInputMode === 'auto'}
            colorScheme={inputs.compInputMode === 'manual' ? 'emerald' : 'default'}
            hint={`Расчетное: ${results.ccompPf.nominal} пФ`}
            onChange={(val) => onChange('ccompPf', val)}
          />
        </div>

        <div className="p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] font-mono text-slate-300 flex justify-between">
          <span className="text-slate-400">Частота LC-полюса фильтра:</span>
          <span className="text-slate-100 font-bold">{results.lcPoleFreqKhz} кГц</span>
        </div>
      </div>

      {/* 8. Инжекция пилы VSNS (Пин 20) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Инжекция пилы VSNS (Пин 20)
          </label>
          <span className={`text-[10px] font-mono font-bold ${results.vrampWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
            Vramp = {results.vrampMinMv}..{results.vrampMaxMv} мВ
          </span>
        </div>

        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания цепи пилы:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="vsnsInputMode"
                value="auto"
                checked={inputs.vsnsInputMode === 'auto'}
                onChange={() => onChange('vsnsInputMode', 'auto')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>Авторасчет (COT норма)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="vsnsInputMode"
                value="manual"
                checked={inputs.vsnsInputMode === 'manual'}
                onChange={() => onChange('vsnsInputMode', 'manual')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>Свои номиналы Rx, Cy, Cx</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ManualNumericInput
            label="Rx (от SW)"
            unit="кОм"
            value={inputs.rxKohm}
            disabled={inputs.vsnsInputMode === 'auto'}
            colorScheme={inputs.vsnsInputMode === 'manual' ? 'cyan' : 'default'}
            hint={`E96: ${results.rxKohm.nominal}k`}
            onChange={(val) => onChange('rxKohm', val)}
          />

          <ManualNumericInput
            label="Cy (к VSNS)"
            unit="нФ"
            value={inputs.cyNf}
            disabled={inputs.vsnsInputMode === 'auto'}
            colorScheme={inputs.vsnsInputMode === 'manual' ? 'cyan' : 'default'}
            hint={`E24: ${results.cyNf.nominal}n`}
            onChange={(val) => onChange('cyNf', val)}
          />

          <ManualNumericInput
            label="Cx (к VOUT)"
            unit="нФ"
            value={inputs.cxNf}
            disabled={inputs.vsnsInputMode === 'auto'}
            colorScheme={inputs.vsnsInputMode === 'manual' ? 'cyan' : 'default'}
            hint={`E24: ${results.cxNf.nominal}n`}
            onChange={(val) => onChange('cxNf', val)}
          />
        </div>

        <p className="text-[10px] text-slate-400 font-sans leading-tight">
          Конденсатор <b>Cy</b> подключается к выводу 20 (VSNS), отсекая постоянную составляющую. Цепь <b>Rx</b> и <b>Cx</b> формирует пилу параллельно дросселю (от SW к VOUT).
        </p>
      </div>

      {/* 9. Софт-старт (SS Pin 19) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Софт-старт (SS Пин 19)
          </label>
          <span className="text-[10px] font-mono text-cyan-400">
            Iss = 5 µA · Vref = 0.8В
          </span>
        </div>

        {/* Radio Button Selector: Mode of Definition */}
        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания софт-старта:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="softStartInputMode"
                value="time"
                checked={inputs.softStartInputMode === 'time'}
                onChange={() => onChange('softStartInputMode', 'time')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>По времени Tss (мс)</span>
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
              <span>По номиналу CSS (нФ)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ManualNumericInput
            label="Время старта Tss"
            unit="мс"
            value={inputs.tssMs}
            min={0.1}
            max={100}
            colorScheme={inputs.softStartInputMode === 'time' ? 'cyan' : 'default'}
            disabled={inputs.softStartInputMode === 'capacitor'}
            hint={
              inputs.softStartInputMode === 'time'
                ? `Стандарт E24: ${results.cssNf.nominal} нФ`
                : 'Рассчитано из CSS'
            }
            onChange={(val) => {
              onChange('tssMs', val);
              const syncedCss = Number(((val * 5) / 0.8).toFixed(2));
              onChange('cssNf', syncedCss);
            }}
          />

          <ManualNumericInput
            label="Конденсатор CSS"
            unit="нФ"
            value={inputs.cssNf}
            min={0.1}
            max={1000}
            colorScheme={inputs.softStartInputMode === 'capacitor' ? 'cyan' : 'default'}
            disabled={inputs.softStartInputMode === 'time'}
            hint={
              inputs.softStartInputMode === 'capacitor'
                ? `Дает Tss = ${Number(((inputs.cssNf * 0.8) / 5).toFixed(2))} мс`
                : `Стандарт E24: ${results.cssNf.nominal} нФ`
            }
            onChange={(valNf) => {
              onChange('cssNf', valNf);
              const calculatedTss = Number(((valNf * 0.8) / 5).toFixed(3));
              onChange('tssMs', calculatedTss);
            }}
          />
        </div>
      </div>

      {/* 10. Защита по входу (UVLO / EN Pin 3) */}
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Защита по входу (UVLO / EN Пин 3)
          </label>
          <span className="text-[10px] font-mono text-cyan-400">
            Ven_rise = 1.35В · Ven_fall = 1.20В
          </span>
        </div>

        {/* Radio Button Selector: Mode of Definition */}
        <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-md space-y-1 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
            Способ задания порога включения:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 hover:text-white">
              <input
                type="radio"
                name="uvloInputMode"
                value="voltage"
                checked={inputs.uvloInputMode === 'voltage'}
                onChange={() => onChange('uvloInputMode', 'voltage')}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>По напряжению (В)</span>
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
              <span>По двум резисторам (кОм)</span>
            </label>
          </div>
        </div>

        <ManualNumericInput
          label="Порог включения Vin_start"
          unit="В"
          value={inputs.vinStartUvlo}
          min={4.5}
          colorScheme={inputs.uvloInputMode === 'voltage' ? 'cyan' : 'default'}
          disabled={inputs.uvloInputMode === 'resistors'}
          hint={
            inputs.uvloInputMode === 'voltage'
              ? `Стандарт E96: R_EN_H = ${results.renTopKohm.nominal} кОм`
              : 'Рассчитано из R_EN_H и R_EN_L'
          }
          onChange={(val) => {
            onChange('vinStartUvlo', val);
            const ren2 = inputs.ren2Kohm > 0 ? inputs.ren2Kohm : 10.0;
            const syncedRen1 = Number((ren2 * (val / 1.35 - 1)).toFixed(2));
            onChange('ren1Kohm', syncedRen1);
          }}
        />

        {/* Resistor Divider REN1 (R_EN_H) & REN2 (R_EN_L) */}
        <div className={`p-2.5 rounded-lg border transition-colors space-y-2 ${
          inputs.uvloInputMode === 'resistors'
            ? 'bg-cyan-950/30 border-cyan-700/80'
            : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-slate-400">
              Делитель на выводе EN (Пин 3):
            </span>
            {inputs.uvloInputMode === 'resistors' && (
              <span className="text-[10px] font-mono text-cyan-300 font-semibold px-1.5 py-0.5 rounded bg-cyan-900/60">
                Ручной ввод обоих резисторов
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ManualNumericInput
              label="Верхний R_EN_H"
              unit="кОм"
              value={inputs.ren1Kohm}
              colorScheme={inputs.uvloInputMode === 'resistors' ? 'cyan' : 'default'}
              disabled={inputs.uvloInputMode === 'voltage'}
              hint={
                inputs.uvloInputMode === 'resistors'
                  ? `Задано вручную: ${inputs.ren1Kohm} кОм`
                  : `E96: ${results.renTopKohm.nominal} кОм`
              }
              onChange={(newRen1) => {
                onChange('ren1Kohm', newRen1);
                const ren2 = inputs.ren2Kohm > 0 ? inputs.ren2Kohm : 10.0;
                const newVinStart = Number((1.35 * (1 + newRen1 / ren2)).toFixed(2));
                onChange('vinStartUvlo', newVinStart);
              }}
            />

            <ManualNumericInput
              label="Нижний R_EN_L"
              unit="кОм"
              value={inputs.ren2Kohm}
              colorScheme={inputs.uvloInputMode === 'resistors' ? 'cyan' : 'default'}
			  disabled={inputs.uvloInputMode === 'voltage'}
              hint={
                inputs.uvloInputMode === 'resistors'
                  ? `Задано вручную: ${inputs.ren2Kohm} кОм`
                  : 'Базовый резистор (обычно 10 кОм)'
              }
              onChange={(newRen2) => {
                onChange('ren2Kohm', newRen2);
                if (newRen2 > 0) {
                  if (inputs.uvloInputMode === 'resistors') {
                    const newVinStart = Number((1.35 * (1 + inputs.ren1Kohm / newRen2)).toFixed(2));
                    onChange('vinStartUvlo', newVinStart);
                  } else {
                    const syncedRen1 = Number((newRen2 * (inputs.vinStartUvlo / 1.35 - 1)).toFixed(2));
                    onChange('ren1Kohm', syncedRen1);
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-slate-400">
			  <span>Порог включения Vin_start (Ven=1.35В):</span>
			  <span className="text-slate-200 font-bold">{results.actualVinStart} В</span>
		  </div>
		  <div className="flex items-center justify-between text-slate-400">
			  <span>Порог отключения Vin_stop (Ven=1.20В):</span>
			  <span className="text-slate-200 font-bold">{results.actualVinStop} В</span>
		  </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Физический гистерезис:</span>
            <span className="text-emerald-400 font-bold">
              {(results.actualVinStart - results.actualVinStop).toFixed(2)} В
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Ток делителя при старте:</span>
            <span className="text-cyan-400 font-bold">
              {((results.actualVinStart / (inputs.ren1Kohm + inputs.ren2Kohm)) * 1000).toFixed(0)} мкА
            </span>
          </div>
        </div>
      </div>

      {/* 11. Токовый предел ILIMIT (Пин 25) */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Токовый порог ILIMIT (Пин 25):</span>
          <span className="text-amber-400 font-bold">{results.rlimKohm.formatted}</span>
        </div>
        <p className="text-[10px] text-slate-400 font-sans leading-tight">
          Формула Vishay: Rlim = Klim / Ivalley ({results.klimValue}k / {results.iValley}A). Порог нижнего ключа Ivalley ≈ {results.ilimNominalA} A (средний ток отсечки Iocp ≈ {(results.ilimNominalA + results.actualDeltaIL / 2).toFixed(1)} A).
        </p>
      </div>

      {/* Quick Summary Badge */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Duty Cycle (ном):</span>
          <span className="text-slate-200 font-bold">
            {(results.dutyNom * 100).toFixed(1)} %
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Время t_on (мин):</span>
          <span
            className={
              results.tonMinWarning
                ? 'text-rose-400 font-bold'
                : 'text-emerald-400 font-medium'
            }
          >
            {results.tonNs} нс
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Оценка КПД:</span>
          <span className="text-cyan-400 font-bold">
            ~ {results.estimatedEfficiency} %
          </span>
        </div>
      </div>
    </div>
  );
};
