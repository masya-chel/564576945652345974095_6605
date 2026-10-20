import React, { useState, useRef, useEffect } from 'react';
import { CalculatorInputs, CalculatorResults } from '../types/calculator';
import {
  Info,
  CheckCircle2,
  Cpu,
  Zap,
  Activity,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Layers,
} from 'lucide-react';

interface SchematicViewProps {
  inputs: CalculatorInputs;
  results: CalculatorResults;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  inputs,
  results,
}) => {
  const [selectedPinOrPart, setSelectedPinOrPart] = useState<string>('MODE');
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    hasMoved: boolean;
  }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
    hasMoved: false,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(prevScale * zoomFactor, 0.5), 3.5);
        const ratio = nextScale / prevScale;
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * ratio,
          y: mouseY - (mouseY - prevPan.y) * ratio,
        }));
        return Number(nextScale.toFixed(2));
      });
    };
    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      dragStartRef.current.hasMoved = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleItemClick = (key: string) => {
    if (dragStartRef.current.hasMoved) return;
    setSelectedPinOrPart(key);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev * 1.25).toFixed(2)), 3.5));
  };
  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev * 0.8).toFixed(2)), 0.5));
  };
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const getPinOrPartDetail = (id: string) => {
    switch (id) {
      case 'MODE':
      case 'PIN_12':
        return {
          pin: 'Пин 12: MODE',
          title: 'Конфигурация частоты fSW и режима Light-Load',
          value: results.modePinConnection,
          detail: results.modeDescription,
          table: [
            { mode: 'Forced CCM', fsw: '1100 кГц (1.1 МГц)', res: 'AGND (0 Ω)', desc: 'Прямое подключение к AGND' },
            { mode: 'Forced CCM', fsw: '2000 кГц (2.0 МГц)', res: '30.1 kΩ (±20%)', desc: 'Резистор 30.1 кОм 1% на AGND' },
            { mode: 'Forced CCM', fsw: '600 кГц', res: '60.4 kΩ (±20%)', desc: 'Резистор 60.4 кОм 1% на AGND' },
            { mode: 'Pulse Skip', fsw: '600 кГц', res: '121 kΩ (±20%)', desc: 'Резистор 121 кОм 1% на AGND' },
            { mode: 'Pulse Skip', fsw: '2000 кГц (2.0 МГц)', res: '243 kΩ (±20%)', desc: 'Резистор 243 кОм 1% на AGND' },
            { mode: 'Pulse Skip', fsw: '1100 кГц (1.1 МГц)', res: 'VCC (3V/3.3V)', desc: 'Прямое подключение к шине VCC' },
          ],
          layoutNote: 'Трассировать резистор R_MODE непосредственно к выводу 12 и тихой аналоговой земле AGND (вывод 7). Защитить экранированием от импульсного узла SW.',
        };
      case 'CS':
      case 'PIN_4':
        return {
          pin: 'Пин 4: CS (Current Sense & Limit)',
          title: 'Программирование токового предела (Valley OCP)',
          value: `R_CS = ${results.rcsKohm.formatted} → Ivalley = ${results.actualIlimValleyA} А (Ilim_dc ≈ ${results.actualIlimDcA} А)`,
          formula: 'Rcs = Vocp / (Gcs · Ivalley) | Vocp = 1.20В, Gcs = 40 µA/A',
          detail: `Встроенный датчик отслеживает ток через нижний ключ LS-FET во время его открытого состояния и зеркалирует его на вывод CS с коэффициентом Gcs = 40 мкА/А. Порог срабатывания Vocp = 1.2 В. Впадина тока Ivalley = ${results.actualIlimValleyA} А, с учетом размаха ΔIL = ${results.actualDeltaIL} А средний ток отсечки Ilim_dc ≈ ${results.actualIlimDcA} А.`,
          layoutNote: 'Резистор R_CS подключается между выводом 4 и AGND (вывод 7). Не прокладывать рядом с цепями переключения.',
        };
      case 'FB':
      case 'PIN_6':
      case 'CFF':
        return {
          pin: 'Пин 6: FB & Feedforward Cff',
          title: 'Делитель обратной связи и конденсатор опережения по фазе',
          value: `R1 = ${results.r1Top.formatted}, R2 = ${results.r2Bottom.formatted}, C_FF = ${results.cff.formatted}`,
          formula: 'Vout = Vref · (1 + R1/R2), Vref = 0.600В | fz = 1 / (2π · R1 · Cff)',
          detail: `Опорное напряжение Vref = 0.600 В (точность ±0.5% при 0..70°C). Фактический Vout = ${results.voutActual} В (${results.voutErrorPercent > 0 ? '+' : ''}${results.voutErrorPercent}%). Конденсатор C_FF формирует дополнительный нуль передаточной функции на частоте fz = ${results.actualFzKhz} кГц (рекомендация даташита: 5..40 кГц), существенно улучшая фазовый запас и скорость отклика при скачках нагрузки.`,
          layoutNote: 'КРИТИЧНО ДЛЯ ШУМА: Размещать делитель R1/R2 максимально близко к выводу FB. Трассу FB вести как можно короче, избегая переходных отверстий (vias) и удалив от силового узла SW.',
        };
      case 'TRK_REF':
      case 'PIN_8':
        return {
          pin: 'Пин 8: TRK/REF (Soft-Start & Tracking)',
          title: 'Плавный пуск и внешнее слежение за напряжением',
          value: `C_REF = ${results.crefNf.formatted} → Tss = ${results.actualTssMs} мс`,
          formula: `Cref(nF) = Tss(ms) · ${inputs.chipModel === 'MPQ8626GD' ? '10' : '12'}µA / 0.6V (при Tss > ${results.minInternalTssMs} мс)`,
          detail: `Внутренний таймер обеспечивает базовое время софт-старта ${results.minInternalTssMs} мс. Для увеличения времени плавного пуска между выводом TRK/REF и AGND подключается конденсатор C_REF. Для стабилизации внутреннего источника опорного напряжения обязательна минимальная емкость (${inputs.chipModel === 'MPQ8626GD' ? '3.3 .. 33 нФ' : '22 .. 220 нФ'}). Вывод также может использоваться для трекинга внешнего напряжения (0.3В .. 1.4В).`,
          layoutNote: 'Конденсатор C_REF монтировать вплотную к выводу 8 и выводу 7 AGND.',
        };
      case 'EN':
      case 'PIN_5':
        return {
          pin: 'Пин 5: EN (Enable / UVLO)',
          title: 'Разрешение работы и программируемая защита UVLO',
          value: `R_UP = ${results.rupKohm.formatted}, R_DOWN = ${results.rdownKohm.formatted} → Vin_start = ${results.actualVinStart} В`,
          formula: 'Vin_start = 1.22В · (1 + Rup/Rdown), Vin_stop = 1.02В · (1 + Rup/Rdown)',
          detail: `Порог включения компаратора VIHEN = 1.22 В с гистерезисом 200 мВ (порог отключения 1.02 В). Расчетные пороги: включение при ${results.actualVinStart} В, отключение при ${results.actualVinStop} В. При максимальном входе Vin_max=${inputs.vinMax}В напряжение на выводе EN составляет ${results.venAtVinMax} В (максимально допустимое по паспорту: 3.6 В). Не оставлять вывод EN плавающим!`,
          layoutNote: 'Подключать делитель к входной шине VIN и AGND.',
        };
      case 'BST':
      case 'PIN_10':
      case 'SW':
      case 'PIN_2_11':
        return {
          pin: 'Пины 10 (BST) и 2, 11 (SW)',
          title: 'Бутстрепное питание верхнего ключа и демпфирование dV/dt',
          value: `C_BST = ${results.cbootNf.formatted}, R_BST = ${results.rbootOhm.formatted}`,
          detail: `Формирует плавающее питание для драйвера верхнего силового транзистора. Керамический конденсатор 100 нФ (≥25В X7R) подключается между выводом 10 (BST) и узлом SW через демпфирующий резистор R_BST (3.3 Ω). Резистор R_BST ограничивает крутизну нарастания dV/dt и полностью устраняет звон и высокочастотный EMI шум.`,
          layoutNote: 'Конденсатор C_BST и резистор R_BST размещать как можно ближе к выводам 10 и 2/11. Ширина проводников не менее 20 mil (0.5 мм).',
        };
      case 'VCC':
      case 'PIN_13':
        return {
          pin: 'Пин 13: VCC (Внутренний LDO)',
          title: 'Питание логики управления и драйверов',
          value: `C_VCC = ${results.cvccUf.formatted} (VCC = ${results.vccVoltageV} В)`,
          detail: `Внутренний регулятор LDO формирует напряжение ${results.vccVoltageV} В для питания схемы управления и силовых драйверов. Для стабильной работы необходим керамический конденсатор не менее 1.0 µF (рекомендуется 1.0–2.2 µF X7R). При работе с низким входным напряжением (2.85В .. 4.0В) на вывод VCC может подаваться внешнее напряжение 3.3 В.`,
          layoutNote: 'КРИТИЧЕСКИ ВАЖНО: Разместить конденсатор C_VCC максимально близко к выводу 13. Точка соединения выводов AGND и PGND должна производиться именно на земляном выводе конденсатора C_VCC!',
        };
      case 'PGOOD':
      case 'PIN_9':
        return {
          pin: 'Пин 9: PGOOD (Power Good)',
          title: 'Статус исправности выходного напряжения',
          value: `R_PGOOD = ${results.rpgoodKohm.formatted} к VCC`,
          detail: 'Выход с открытым стоком (Open Drain). Переходит в активное высокое состояние через 0.8–1.0 мс после того, как напряжение обратной связи FB достигает 92.5% от Vref. При превышении 116% (OVP) или падении ниже 80% (UVP) сбрасывается в низкий уровень. Активно прижимается к 0.7В даже при обесточивании чипа.',
          layoutNote: 'Для повышенной помехоустойчивости MPS рекомендует устанавливать последовательный резистор RPG 10..49.9 Ω и шунтирующий конденсатор CPG = 1 нФ на PGND (layout step 12, стр. 19).',
        };
      case 'L1':
        return {
          pin: 'Индуктор L1 (к выводам 2, 11 SW)',
          title: 'Силовой экранированный дроссель',
          value: `L1 = ${results.lNominal.formatted} (расчетное: ${results.lCalcUh} µH)`,
          detail: `Пульсации тока дросселя ΔIL = ${results.actualDeltaIL} A (${(results.actualKind * 100).toFixed(0)}% от Iout). Пиковый ток Ipeak = ${results.iPeak} A, действующий ток Irms = ${results.iRms} A. Требования к дросселю: ток насыщения Isat ≥ ${(results.iPeak * 1.3).toFixed(1)} A, допустимый ток нагрева Irms ≥ ${(results.iRms * 1.2).toFixed(1)} A. Потери в меди DCR ≈ ${results.inductorDcrLossW} Вт.`,
          layoutNote: 'Минимизировать площадь полигона SW для уменьшения паразитной емкости и электромагнитного излучения, но обеспечить достаточную площадь меди для отвода тепла.',
        };
      case 'COUT':
        return {
          pin: 'Выходная батарея COUT',
          title: 'Выходные фильтрующие конденсаторы MLCC',
          value: `${results.coutQty} × ${results.coutSingleUf} µF (${results.coutQty * results.coutSingleUf} µF)`,
          detail: `Минимально требуемая эффективная емкость: ${results.coutEffectiveMinUf} µF (по пульсациям ${results.coutRippleMinUf} µF, по набросу тока ${results.coutTransientMinUf} µF, по критерию устойчивости COT ${results.coutStabilityMinUf} µF). С учетом DC-bias падения емкости керамики установлено ${results.coutQty * results.coutSingleUf} µF. Расчетные пульсации Vout ≈ ${results.actualRippleMv} мВ.`,
          layoutNote: 'Монтировать полигонами прямо между дросселем L1 и полигоном PGND с минимальной индуктивностью.',
        };
      case 'CIN':
        return {
          pin: 'Входная батарея CIN',
          title: 'Входные конденсаторы сглаживания импульсного тока',
          value: `${results.cinQty} × ${results.cinSingleUf} µF (${results.cinQty * results.cinSingleUf} µF) + 0.1 µF ВЧ`,
          detail: `Действующий импульсный ток через конденсаторы: Irms = ${results.cinRmsA} A. Рабочее напряжение конденсаторов ≥ 25 В (для шин 12–16В). Керамика X7R 1210 / 1206.`,
          layoutNote: 'Устанавливать конденсаторы CIN на том же слое платы вплотную к выводу 3 (VIN) и выводам 1, 14 (PGND). Добавить ВЧ шунт 0.1 µF 0402/0603.',
        };
      default:
        return null;
    }
  };

  const activeDetail = getPinOrPartDetail(selectedPinOrPart);
  const pinsList = [
    { id: 'PIN_12', label: 'Пин 12: MODE', key: 'MODE', color: 'text-cyan-400' },
    { id: 'PIN_4', label: 'Пин 4: CS (Ilim)', key: 'CS', color: 'text-amber-400' },
    { id: 'PIN_6', label: 'Пин 6: FB & Cff', key: 'FB', color: 'text-purple-400' },
    { id: 'PIN_8', label: 'Пин 8: TRK/REF', key: 'TRK_REF', color: 'text-cyan-400' },
    { id: 'PIN_5', label: 'Пин 5: EN / UVLO', key: 'EN', color: 'text-cyan-400' },
    { id: 'PIN_10', label: 'Пин 10: BST', key: 'BST', color: 'text-amber-400' },
    { id: 'PIN_2_11', label: 'Пины 2, 11: SW', key: 'SW', color: 'text-amber-400' },
    { id: 'PIN_13', label: 'Пин 13: VCC', key: 'VCC', color: 'text-emerald-400' },
    { id: 'PIN_9', label: 'Пин 9: PGOOD', key: 'PGOOD', color: 'text-slate-300' },
    { id: 'PART_L1', label: 'Дроссель L1', key: 'L1', color: 'text-amber-300' },
    { id: 'PART_COUT', label: 'Конденсаторы COUT', key: 'COUT', color: 'text-emerald-300' },
    { id: 'PART_CIN', label: 'Конденсаторы CIN', key: 'CIN', color: 'text-cyan-300' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-5 overflow-y-auto">
      {/* Top Parameter Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg mb-3 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-slate-400 block text-[11px]">Входное напряжение:</span>
            <span className="font-mono text-white font-semibold">
              {inputs.vinMin}В .. <span className="text-cyan-400">{inputs.vinNom}В</span> .. {inputs.vinMax}В
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Выходной режим:</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {results.voutActual} В @ {inputs.ioutMax} А
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Дроссель L1:</span>
            <span className="font-mono text-amber-300 font-bold text-sm">
              {results.lNominal.nominal} µH
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Частота fSW:</span>
            <span className="font-mono text-cyan-300 font-bold text-xs">
              {results.actualFswKhz} кГц ({results.detectedLightLoadMode})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Конфигурация MODE:</span>
            <span className="font-mono text-cyan-400 font-bold text-xs">
              {results.modePinConnection}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Токовый предел:</span>
            <span className="font-mono text-amber-400 font-bold text-xs">
              Ilim ≈ {results.actualIlimDcA} А ({results.rcsKohm.formatted})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">
            {inputs.chipModel || 'MPQ8626GD'} · QFN-14 (2×3 мм)
          </span>
        </div>
      </div>

      {/* Pin Quick Selector Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs">
        <span className="text-slate-400 text-[11px] font-mono shrink-0 mr-1">Пины QFN-14:</span>
        {pinsList.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPinOrPart(p.key)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono shrink-0 transition-colors border ${
              selectedPinOrPart === p.key
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Interactive SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative bg-slate-900/95 border border-slate-800 rounded-lg min-h-[550px] flex items-center justify-center overflow-hidden shadow-inner select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Floating Zoom & Pan Controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1.5 shadow-xl select-none">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            title="Уменьшить масштаб (Колесико вниз)"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
            title="Сбросить масштаб (100%)"
            className="px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 hover:bg-slate-800 rounded transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            title="Увеличить масштаб (Колесико вверх)"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
            title="Сбросить позицию и масштаб"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 px-3 py-1.5 rounded-md pointer-events-none shadow-md select-none">
          <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Колесико мыши: масштаб ({Math.round(scale * 100)}%) • Зажать ЛКМ: перемещение схемы</span>
        </div>

        {/* Scalable Schematic Canvas */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
          className="w-full h-full flex items-center justify-center pointer-events-auto"
        >
          <svg viewBox="0 0 1260 760" className="w-full max-w-[1260px] h-auto select-none font-sans">
            <defs>
              <linearGradient id="icGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0b1120" />
              </linearGradient>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              {/* VERTICAL CAPACITOR */}
              <g id="cap-v">
                <rect x="-9" y="-3.5" width="18" height="7" fill="#0b1120" />
                <line x1="0" y1="-12" x2="0" y2="-4" stroke="currentColor" strokeWidth="1.5" />
                <line x1="-8" y1="-4" x2="8" y2="-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-8" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="0" y1="4" x2="0" y2="12" stroke="currentColor" strokeWidth="1.5" />
              </g>
              {/* HORIZONTAL CAPACITOR */}
              <g id="cap-h">
                <rect x="-3.5" y="-9" width="7" height="18" fill="#0b1120" />
                <line x1="-12" y1="0" x2="-4" y2="0" stroke="currentColor" strokeWidth="1.5" />
                <line x1="-4" y1="-8" x2="-4" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="4" y1="-8" x2="4" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="4" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
              </g>
              {/* AGND SYMBOL */}
              <g id="gnd-agnd">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#64748b" strokeWidth="1.5" />
                <line x1="-8" y1="6" x2="8" y2="6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                <line x1="-5" y1="9" x2="5" y2="9" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="-2" y1="12" x2="2" y2="12" stroke="#64748b" strokeWidth="1" strokeLinecap="round" />
                <text x="0" y="21" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="JetBrains Mono">AGND</text>
              </g>
              {/* PGND SYMBOL */}
              <g id="gnd-pgnd">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#0284c7" strokeWidth="2" />
                <line x1="-10" y1="6" x2="10" y2="6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="-6" y1="9" x2="6" y2="9" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <line x1="-3" y1="12" x2="3" y2="12" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <text x="0" y="21" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontWeight="bold" fontFamily="JetBrains Mono">PGND</text>
              </g>
            </defs>

            <rect width="1260" height="760" fill="url(#smallGrid)" opacity="0.45" />

            {/* VOUT FEEDBACK TRACE FROM OUTPUT TO FB (Lower Highway y=715) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('FB')}>
              <path d="M 1120 250 L 1120 715 L 180 715 L 180 575" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.9" />
              <rect x="520" y="705" width="220" height="20" rx="4" fill="#0b1120" stroke="#c084fc" strokeWidth="1" />
              <text x="630" y="719" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="JetBrains Mono">Цепь ОС VOUT → R1 (0.6В) / Cff</text>
            </g>

            {/* IC CHIP BODY: MPQ8626GD / IS6605A (QFN-14 2mm x 3mm) */}
            <g>
              <rect x="440" y="100" width="380" height="560" rx="8" fill="url(#icGrad)" stroke="#0284c7" strokeWidth="2.5" />
              <circle cx="458" cy="118" r="4.5" fill="#38bdf8" opacity="0.9" />
              
              {/* IC Header text */}
              <text x="630" y="126" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="16" letterSpacing="0.5">
                {inputs.chipModel || 'MPQ8626GD'}
              </text>
              <text x="630" y="142" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">
                16V, 6A High Efficiency Sync Buck • QFN-14 (2×3 mm)
              </text>

              {/* Pin 3: VIN (Left Top) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('CIN')}>
                <line x1="400" y1="180" x2="440" y2="180" stroke="#38bdf8" strokeWidth="3.5" />
                <text x="450" y="184" fill="#38bdf8" fontSize="10.5" fontWeight="bold" fontFamily="JetBrains Mono">3: VIN</text>
              </g>

              {/* Pin 5: EN (Left Upper) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('EN')}>
                <line x1="400" y1="270" x2="440" y2="270" stroke="#38bdf8" strokeWidth="2" />
                <text x="450" y="274" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">5: EN / UVLO</text>
              </g>

              {/* Pin 4: CS (Left Middle) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('CS')}>
                <line x1="400" y1="365" x2="440" y2="365" stroke="#fbbf24" strokeWidth="2" />
                <text x="450" y="369" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">4: CS (Current Limit)</text>
              </g>

              {/* Pin 12: MODE (Left Lower) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
                <line x1="400" y1="470" x2="440" y2="470" stroke="#38bdf8" strokeWidth="2" />
                <text x="450" y="474" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">12: MODE (Fsw/Mode)</text>
              </g>

              {/* Pin 8: TRK/REF (Left Bottom) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('TRK_REF')}>
                <line x1="400" y1="565" x2="440" y2="565" stroke="#38bdf8" strokeWidth="2" />
                <text x="450" y="569" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">8: TRK/REF (SS)</text>
              </g>

              {/* Pin 6: FB (Bottom Center Left) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('FB')}>
                <line x1="400" y1="620" x2="440" y2="620" stroke="#c084fc" strokeWidth="2" />
                <text x="450" y="624" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">6: FB (0.600V)</text>
              </g>

              {/* COT Controller Core Block in IC center */}
              <rect x="530" y="275" width="200" height="135" rx="6" fill="#0b1120" stroke="#1e3a5f" strokeWidth="1.5" />
              <text x="630" y="295" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">Adaptive COT Controller</text>
              <line x1="545" y1="303" x2="715" y2="303" stroke="#1e3a5f" strokeWidth="1" />
              <text x="630" y="320" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="JetBrains Mono">Internal Ramp Compensation</text>
              <text x="630" y="335" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="JetBrains Mono">Vref = 0.600 В (±0.5%)</text>
              <text x="630" y="350" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.actualFswKhz} кГц • {results.detectedLightLoadMode}</text>
              <text x="630" y="365" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="JetBrains Mono">Valley OCP: {results.actualIlimValleyA}A (Iocp ≈ {results.actualIlimDcA}A)</text>
              <text x="630" y="380" textAnchor="middle" fill="#c084fc" fontSize="8" fontFamily="JetBrains Mono">Ton = {results.tonNs} нс (D = {results.dutyNom})</text>
              <text x="630" y="395" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="JetBrains Mono">HS: 22.6mΩ | LS: 8.1mΩ</text>

              {/* Pin 10: BST (Right Top) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('BST')}>
                <line x1="820" y1="180" x2="850" y2="180" stroke="#fbbf24" strokeWidth="2.5" />
                <text x="810" y="184" textAnchor="end" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">10: BST</text>
              </g>

              {/* Pins 2, 11: SW (Right Upper Power) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('SW')}>
                <line x1="820" y1="250" x2="870" y2="250" stroke="#38bdf8" strokeWidth="5" />
                <text x="810" y="254" textAnchor="end" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">2, 11: SW (Power)</text>
              </g>

              {/* Pin 9: PGOOD (Right Middle) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('PGOOD')}>
                <line x1="820" y1="400" x2="860" y2="400" stroke="#94a3b8" strokeWidth="2" />
                <text x="810" y="404" textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">9: PGOOD</text>
              </g>

              {/* Pin 13: VCC (Right Lower) */}
              <g className="cursor-pointer" onClick={() => handleItemClick('VCC')}>
                <line x1="820" y1="510" x2="860" y2="510" stroke="#34d399" strokeWidth="2.5" />
                <text x="810" y="514" textAnchor="end" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">13: VCC (3.0V/3.3V)</text>
              </g>

              {/* Bottom Ground Pins: Pin 7 (AGND) and Pins 1, 14 (PGND) */}
              <g className="cursor-pointer">
                <line x1="530" y1="660" x2="530" y2="695" stroke="#64748b" strokeWidth="2" />
                <text x="530" y="652" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">7: AGND</text>
              </g>
              <g className="cursor-pointer">
                <line x1="720" y1="660" x2="720" y2="695" stroke="#0284c7" strokeWidth="4" />
                <text x="720" y="652" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">1, 14: PGND</text>
              </g>

              {/* Star ground / Kelvin Net-Tie connection point at VCC cap */}
              <line x1="530" y1="695" x2="720" y2="695" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
              <rect x="525" y="685" width="200" height="20" rx="3" fill="#0b1120" stroke="#64748b" strokeWidth="1" />
              <text x="625" y="698" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Точка объединения AGND & PGND (у C_VCC)
              </text>
            </g>

            {/* LEFT SIDE CIRCUITS */}

            {/* 1. VIN Power Rail & Input Capacitors */}
            <line x1="40" y1="80" x2="400" y2="80" stroke="#38bdf8" strokeWidth="4" />
            <circle cx="40" cy="80" r="5" fill="#38bdf8" />
            <text x="40" y="55" fill="#38bdf8" fontSize="14" fontWeight="bold">VIN ({inputs.vinNom}В)</text>
            <text x="40" y="70" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">Диапазон: {inputs.vinMin}В .. {inputs.vinMax}В</text>

            <line x1="400" y1="80" x2="400" y2="180" stroke="#38bdf8" strokeWidth="3.5" />

            {/* Input Capacitor Bank CIN */}
            <g className="cursor-pointer" onClick={() => handleItemClick('CIN')}>
              <circle cx="100" cy="80" r="3.5" fill="#38bdf8" />
              <line x1="100" y1="80" x2="100" y2="115" stroke="#38bdf8" strokeWidth="1.5" />
              <g transform="translate(100, 127)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="100" y1="139" x2="100" y2="150" stroke="#0284c7" strokeWidth="1.5" />
              <g transform="translate(100, 150)"><use href="#gnd-pgnd" /></g>
              <text x="85" y="122" textAnchor="end" fill="#f1f5f9" fontSize="10" fontWeight="bold">CIN</text>
              <text x="85" y="135" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">{results.cinQty} × {results.cinSingleUf} µF</text>
              <text x="85" y="147" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Irms = {results.cinRmsA} A</text>

              {/* High-frequency bypass CIN_HF 0.1 µF */}
              <circle cx="160" cy="80" r="3.5" fill="#38bdf8" />
              <line x1="160" y1="80" x2="160" y2="115" stroke="#38bdf8" strokeWidth="1.5" />
              <g transform="translate(160, 127)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="160" y1="139" x2="160" y2="150" stroke="#0284c7" strokeWidth="1.5" />
              <g transform="translate(160, 150)"><use href="#gnd-pgnd" /></g>
              <text x="175" y="125" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">0.1 µF ВЧ</text>
            </g>

            {/* 2. EN / UVLO Divider (Pin 5) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('EN')}>
              <circle cx="270" cy="80" r="3.5" fill="#38bdf8" />
              <line x1="270" y1="80" x2="270" y2="135" stroke="#38bdf8" strokeWidth="1.5" />
              {/* R_UP */}
              <rect x="262" y="135" width="16" height="34" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="254" y="148" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R_UP</text>
              <text x="254" y="161" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.rupKohm.formatted}</text>
              <line x1="270" y1="169" x2="270" y2="270" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="270" cy="270" r="3.5" fill="#38bdf8" />
              {/* Tap to EN pin 5 */}
              <line x1="270" y1="270" x2="400" y2="270" stroke="#38bdf8" strokeWidth="1.5" />
              {/* R_DOWN */}
              <line x1="270" y1="270" x2="270" y2="285" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="262" y="285" width="16" height="34" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="254" y="298" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R_DOWN</text>
              <text x="254" y="311" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.rdownKohm.formatted}</text>
              <line x1="270" y1="319" x2="270" y2="330" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(270, 330)"><use href="#gnd-agnd" /></g>
              <text x="270" y="358" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Vin_start={results.actualVinStart}В | Vin_stop={results.actualVinStop}В
              </text>
            </g>

            {/* 3. Current Limit Resistor RCS (Pin 4) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('CS')}>
              <line x1="400" y1="365" x2="310" y2="365" stroke="#fbbf24" strokeWidth="1.5" />
              <rect x="255" y="356" width="55" height="18" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="282" y="369" textAnchor="middle" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono">R_CS</text>
              <line x1="255" y1="365" x2="230" y2="365" stroke="#64748b" strokeWidth="1.5" />
              <line x1="230" y1="365" x2="230" y2="385" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(230, 385)"><use href="#gnd-agnd" /></g>
              <text x="282" y="348" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                {results.rcsKohm.formatted}
              </text>
              <text x="282" y="388" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Ivalley ≈ {results.actualIlimValleyA}A (Ioc ≈ {results.actualIlimDcA}A)
              </text>
            </g>

            {/* 4. MODE Pin 12 Circuit */}
            <g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
              <line x1="400" y1="470" x2="310" y2="470" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="245" y="461" width="65" height="18" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="277" y="474" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">R_MODE</text>
              <line x1="245" y1="470" x2="215" y2="470" stroke="#64748b" strokeWidth="1.5" />
              <line x1="215" y1="470" x2="215" y2="490" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(215, 490)"><use href="#gnd-agnd" /></g>
              <text x="277" y="453" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                {results.modePinConnection}
              </text>
              <text x="277" y="495" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                {results.actualFswKhz} кГц • {results.detectedLightLoadMode}
              </text>
            </g>

            {/* 5. Soft-Start Capacitor C_REF (Pin 8) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('TRK_REF')}>
              <line x1="400" y1="565" x2="300" y2="565" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="300" y1="565" x2="300" y2="580" stroke="#38bdf8" strokeWidth="1.5" />
              <g transform="translate(300, 592)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="300" y1="604" x2="300" y2="615" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(300, 615)"><use href="#gnd-agnd" /></g>
              <text x="285" y="588" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">C_REF</text>
              <text x="285" y="601" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.crefNf.formatted}</text>
              <text x="300" y="642" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
                Tss = {results.actualTssMs} мс
              </text>
            </g>

            {/* 6. Feedback Network R1, R2 & Cff (Pin 6 FB) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('FB')}>
              <line x1="400" y1="620" x2="180" y2="620" stroke="#c084fc" strokeWidth="1.5" />
              <circle cx="180" cy="620" r="3.5" fill="#c084fc" />

              {/* R1 in parallel with Cff */}
              <line x1="180" y1="620" x2="180" y2="635" stroke="#c084fc" strokeWidth="1.5" />
              
              {/* Branch left to R1 */}
              <path d="M 180 635 L 145 635 L 145 645" fill="none" stroke="#c084fc" strokeWidth="1.5" />
              <rect x="137" y="645" width="16" height="32" rx="2" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
              <text x="128" y="658" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R1</text>
              <text x="128" y="671" textAnchor="end" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono">{results.r1Top.formatted}</text>
              <path d="M 145 677 L 145 688 L 180 688" fill="none" stroke="#c084fc" strokeWidth="1.5" />

              {/* Branch right to Cff */}
              <path d="M 180 635 L 215 635 L 215 650" fill="none" stroke="#c084fc" strokeWidth="1.5" />
              <g transform="translate(215, 661)" className="text-slate-300"><use href="#cap-v" /></g>
              <path d="M 215 673 L 215 688 L 180 688" fill="none" stroke="#c084fc" strokeWidth="1.5" />
              <text x="232" y="658" fill="#f1f5f9" fontSize="9" fontWeight="bold">C_FF</text>
              <text x="232" y="671" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono">{results.cff.formatted}</text>

              <circle cx="180" cy="688" r="3.5" fill="#c084fc" />
              <line x1="180" y1="688" x2="180" y2="715" stroke="#c084fc" strokeWidth="1.5" />

              {/* R2 (from FB node to AGND) */}
              <line x1="180" y1="620" x2="180" y2="575" stroke="#c084fc" strokeWidth="1.5" />
              <rect x="172" y="540" width="16" height="32" rx="2" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
              <text x="164" y="553" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R2</text>
              <text x="164" y="566" textAnchor="end" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono">{results.r2Bottom.formatted}</text>
              <line x1="180" y1="540" x2="180" y2="525" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(180, 525)"><use href="#gnd-agnd" /></g>
            </g>

            {/* RIGHT SIDE CIRCUITS: POWER OUTPUT STAGE, BST, VCC, PGOOD */}

            {/* 7. Bootstrap Circuit BST (Pin 10) & RBST damping to SW */}
            <g className="cursor-pointer" onClick={() => handleItemClick('BST')}>
              <line x1="850" y1="180" x2="890" y2="180" stroke="#fbbf24" strokeWidth="2" />
              <g transform="translate(902, 180)" className="text-slate-300"><use href="#cap-h" /></g>
              <text x="902" y="165" textAnchor="middle" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono">C_BST 100nF</text>
              <line x1="914" y1="180" x2="945" y2="180" stroke="#fbbf24" strokeWidth="2" />
              {/* R_BST 3.3 Ω */}
              <rect x="945" y="172" width="36" height="16" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
              <text x="963" y="164" textAnchor="middle" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono">R_BST 3.3Ω</text>
              <line x1="981" y1="180" x2="1005" y2="180" stroke="#fbbf24" strokeWidth="2" />
              <line x1="1005" y1="180" x2="1005" y2="250" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx="1005" cy="250" r="4" fill="#38bdf8" />
            </g>

            {/* 8. Power Switch Node SW (Pins 2, 11) to Inductor L1 */}
            <g className="cursor-pointer" onClick={() => handleItemClick('L1')}>
              <line x1="870" y1="250" x2="1020" y2="250" stroke="#38bdf8" strokeWidth="5" />
              {/* Inductor L1 Symbol */}
              <rect x="1020" y="238" width="60" height="24" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
              <text x="1050" y="254" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">L1</text>
              <text x="1050" y="230" textAnchor="middle" fill="#fbbf24" fontSize="10.5" fontWeight="bold" fontFamily="JetBrains Mono">
                {results.lNominal.nominal} µH
              </text>
              <line x1="1080" y1="250" x2="1200" y2="250" stroke="#34d399" strokeWidth="4" />
              <circle cx="1200" cy="250" r="5" fill="#34d399" />
              <text x="1200" y="225" fill="#34d399" fontSize="14" fontWeight="bold">VOUT ({results.voutActual}В)</text>
              <text x="1200" y="240" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">@ {inputs.ioutMax} А</text>
            </g>

            {/* 9. Output Capacitors COUT & High-Freq COL */}
            <g className="cursor-pointer" onClick={() => handleItemClick('COUT')}>
              <circle cx="1120" cy="250" r="3.5" fill="#34d399" />
              <line x1="1120" y1="250" x2="1120" y2="290" stroke="#34d399" strokeWidth="1.5" />
              <g transform="translate(1120, 302)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="1120" y1="314" x2="1120" y2="330" stroke="#0284c7" strokeWidth="1.5" />
              <g transform="translate(1120, 330)"><use href="#gnd-pgnd" /></g>
              <text x="1135" y="298" fill="#f1f5f9" fontSize="10" fontWeight="bold">COUT</text>
              <text x="1135" y="311" fill="#34d399" fontSize="9" fontFamily="JetBrains Mono">{results.coutQty} × {results.coutSingleUf} µF</text>
              <text x="1135" y="323" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Ripple ≈ {results.actualRippleMv} мВ</text>

              {/* High-frequency noise suppression capacitor COL 10 nF */}
              <circle cx="1170" cy="250" r="3" fill="#34d399" />
              <line x1="1170" y1="250" x2="1170" y2="290" stroke="#34d399" strokeWidth="1.5" />
              <g transform="translate(1170, 302)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="1170" y1="314" x2="1170" y2="330" stroke="#0284c7" strokeWidth="1.5" />
              <g transform="translate(1170, 330)"><use href="#gnd-pgnd" /></g>
              <text x="1175" y="298" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">COL 10nF</text>
            </g>

            {/* 10. PGOOD Open-Drain Pull-up (Pin 9) & Noise Filter */}
            <g className="cursor-pointer" onClick={() => handleItemClick('PGOOD')}>
              <line x1="860" y1="400" x2="940" y2="400" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="940" cy="400" r="3.5" fill="#94a3b8" />
              {/* Pull-up RPG to VCC */}
              <line x1="940" y1="400" x2="940" y2="365" stroke="#94a3b8" strokeWidth="1.5" />
              <rect x="932" y="335" width="16" height="30" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="924" y="348" textAnchor="end" fill="#f1f5f9" fontSize="8.5" fontWeight="bold">R_PG</text>
              <text x="924" y="360" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">{results.rpgoodKohm.formatted}</text>
              <line x1="940" y1="335" x2="940" y2="320" stroke="#34d399" strokeWidth="1.5" />
              <text x="940" y="313" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="JetBrains Mono">к VCC (3.0V)</text>

              {/* Output PGOOD pin */}
              <line x1="940" y1="400" x2="1030" y2="400" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="1030" cy="400" r="4" fill="#94a3b8" />
              <text x="1040" y="404" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">PGOOD Out</text>
            </g>

            {/* 11. VCC Decoupling Capacitor C_VCC (Pin 13) */}
            <g className="cursor-pointer" onClick={() => handleItemClick('VCC')}>
              <line x1="860" y1="510" x2="930" y2="510" stroke="#34d399" strokeWidth="2" />
              <circle cx="930" cy="510" r="3.5" fill="#34d399" />
              <line x1="930" y1="510" x2="930" y2="535" stroke="#34d399" strokeWidth="1.5" />
              <g transform="translate(930, 547)" className="text-slate-300"><use href="#cap-v" /></g>
              <line x1="930" y1="559" x2="930" y2="575" stroke="#64748b" strokeWidth="1.5" />
              <g transform="translate(930, 575)"><use href="#gnd-agnd" /></g>
              <text x="945" y="542" fill="#f1f5f9" fontSize="9" fontWeight="bold">C_VCC</text>
              <text x="945" y="555" fill="#34d399" fontSize="8.5" fontFamily="JetBrains Mono">{results.cvccUf.formatted}</text>
              <text x="930" y="500" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">
                VCC = {results.vccVoltageV}В
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Selected Element Datasheet Inspector Card */}
      {activeDetail && (
        <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3 animate-fade-in text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
                {activeDetail.pin}
              </span>
              <h4 className="text-sm font-bold text-white">{activeDetail.title}</h4>
            </div>
            {activeDetail.value && (
              <span className="font-mono text-emerald-400 font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {activeDetail.value}
              </span>
            )}
          </div>

          {activeDetail.formula && (
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-cyan-300 text-xs">
              Формула: {activeDetail.formula}
            </div>
          )}

          <p className="text-slate-300 leading-relaxed font-sans">{activeDetail.detail}</p>

          {activeDetail.table && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <th className="p-1.5 border-b border-slate-800">Режим</th>
                    <th className="p-1.5 border-b border-slate-800">Частота fSW</th>
                    <th className="p-1.5 border-b border-slate-800">Подключение MODE</th>
                    <th className="p-1.5 border-b border-slate-800">Описание</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                  {activeDetail.table.map((row: any, idx: number) => (
                    <tr key={idx} className={results.actualFswKhz === parseInt(row.fsw) ? 'bg-cyan-950/40 text-cyan-200' : ''}>
                      <td className="p-1.5 font-bold">{row.mode}</td>
                      <td className="p-1.5">{row.fsw}</td>
                      <td className="p-1.5 text-amber-300">{row.res}</td>
                      <td className="p-1.5 font-sans text-slate-400">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeDetail.layoutNote && (
            <div className="p-2.5 bg-blue-950/30 border border-blue-800/60 rounded text-[11px] text-blue-200 flex items-start gap-2">
              <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Рекомендация по трассировке PCB:</strong> {activeDetail.layoutNote}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};