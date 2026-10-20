import React, { useState, useRef, useEffect } from 'react';
import { CalculatorInputs, CalculatorResults } from '../types/calculator';
import {
  Info,
  CheckCircle2,
  Cpu,
  Zap,
  Activity,
  ShieldCheck,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Maximize2,
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
  const touchStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    dist: number;
    startScale: number;
  }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
    dist: 0,
    startScale: 1,
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
        hasMoved: false,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        panX: pan.x,
        panY: pan.y,
        dist,
        startScale: scale,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        dragStartRef.current.hasMoved = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / (touchStartRef.current.dist || 1);
      const nextScale = Math.min(Math.max(touchStartRef.current.startScale * ratio, 0.5), 3.5);
      setScale(Number(nextScale.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
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
      case 'PIN_27':
        return {
          pin: 'Пин 27: MODE',
          title: 'Выбор режима работы и питания драйвера',
          value: `R_MODE = ${results.rmodeKohm.formatted} (E96 1%)`,
          modeText: results.modeDescription,
          detail: 'Резистор R_MODE, подключенный между выводом 27 (MODE) и аналоговой землей AGND, конфигурирует режим работы внутреннего ШИМ-контроллера и источника питания драйверов затворов (Таблица 1, стр. 9 даташита):',
          table: [
            { mode: 'Mode 1', res: '2.0 kΩ (или AGND)', desc: 'Power Save Mode (PSM) включен, внутренний регулятор VDRV 5V включен.' },
            { mode: 'Mode 2', res: '301 kΩ (1%)', desc: 'Forced Continuous Conduction (FCCM) непрерывный режим, внутренний VDRV 5V включен.' },
            { mode: 'Mode 3', res: '499 kΩ (1%)', desc: 'FCCM непрерывный режим, внутренний LDO выключен, питание VDRV от внешней шины 5V.' },
            { mode: 'Mode 4', res: '1000 kΩ (1 MΩ, 1%)', desc: 'PSM энергосберегающий режим, внутренний LDO выключен, питание VDRV от внешней 5V.' },
          ],
          layoutNote: 'Трассировать резистор R_MODE непосредственно к выводу 27 и тихой земле AGND (вывод 17/23). Не прокладывать рядом с импульсным узлом SW.',
        };
      case 'FSW':
      case 'PIN_24':
        return {
          pin: 'Пин 24: fSW',
          title: 'Программирование частоты переключения',
          value: `R_FSW = ${results.rfswKohm.formatted} → Fsw = ${results.actualFswKhz} кГц`,
          formula: 'Rfsw = Vout / (fsw · 1.9e-10)',
          detail: `Задает время открытого состояния верхнего ключа ton, пропорциональное выходному напряжению Vout. Для fsw = ${results.actualFswKhz} кГц и Vout = ${results.voutActual} В расчетное значение Rfsw = ${results.rfswKohm.theoretical} кОм. Ближайший стандарт E96 — ${results.rfswKohm.nominal} кОм.`,
          layoutNote: 'Резистор R_FSW подключается между выводом 24 и AGND. Трассировка должна быть минимальной длины в экранированном слое.',
        };
      case 'PHASE':
      case 'PIN_5_6':
      case 'BOOT': 
      case 'PIN_4':
        return {
          pin: 'Пины 4 (BOOT) и 5, 6 (PHASE1, PHASE2)',
          title: 'Бутстрепная накачка и демпфирование dV/dt',
          value: `C_BOOT = ${results.cbootNf.formatted}, R_BOOT = ${results.rbootOhm.formatted}`,
          detail: 'Питает плавающий драйвер верхнего силового MOSFET. Керамический конденсатор C_BOOT (100 нФ X7R ≥25В) включается последовательно с резистором R_BOOT (3.3 Ω для SiC461/462, 4.7 Ω для SiC463/464) между выводом BOOT и выводами PHASE1/PHASE2.',
          layoutNote: 'КРИТИЧНО ДЛЯ EMI: Резистор R_BOOT демпфирует крутизну фронтов переключения dV/dt и гасит звон в узле фазы. Возвратный проводник от C_BOOT/R_BOOT должен подключаться строго к выводам PHASE1/2 (5, 6), а не к силовым выводам SW (7-10)!',
        };
      case 'VDRV':
      case 'PIN_16':
        return {
          pin: 'Пин 16: VDRV',
          title: 'Питание драйверов силовых ключей',
          value: `C_VDRV = ${results.cvdrvUf.formatted}`,
          detail: `Напряжение шины питания затворов (5.0 В). ${results.vdrvSupplySource}. Потери в кристалле: ${results.vdrvPowerLossW} Вт. В режимах Mode 3 и 4 при питании VDRV от внешней шины 5В (или от выхода Vout, если Vout=5В) полностью исключаются потери в линейном стабилизаторе, что дает выигрыш в КПД до 3-5% и снижает нагрев кристалла.`,
          layoutNote: 'Керамический конденсатор C_VDRV = 4.7 µF (X7R 10V+) монтируется прямо у вывода 16 и вывода 15 PGND с минимальной паразитной индуктивностью контура.',
        };
      case 'COMP': 
      case 'PIN_21':
        return {
          pin: 'Пин 21: COMP',
          title: 'Частотная коррекция транскондуктивного усилителя ошибки',
          value: `R_COMP = ${results.rcompKohm.formatted}, C_COMP = ${results.ccompPf.formatted}`,
          formula: 'fc ≈ fsw / 10, gm = 300 µS',
          detail: `Внутренний транскондуктивный усилитель ошибки (gm = 300 µS) стабилизирует выходное напряжение. Расчетная частота среза петли fc = ${results.crossoverFreqKhz} кГц. Двойной LC-полюс выходного фильтра расположен на частоте f_LC = ${results.lcPoleFreqKhz} кГц. Последовательная RC-цепочка R_COMP + C_COMP формирует нуль компенсации.`,
          layoutNote: 'Подключается к выводу COMP (21) и возвращается на аналоговую землю AGND. Должна быть удалена от силовых трасс SW и дросселя.',
        };
      case 'VSNS':
      case 'PIN_20':
        return {
          pin: 'Пин 20: VSNS',
          title: 'Инжекция пилы для устойчивости COT (Constant On-Time)',
          value: `Rx = ${results.rxKohm.formatted}, Cy = ${results.cyNf.formatted}, Cx = ${results.cxNf.formatted} → Vramp = ${results.vrampMinMv}..${results.vrampMaxMv} мВ`,
          formula: 'Vramp = ((Vin - Vout) · Vout) / (Vin · fsw · Cx · Rx)',
          detail: `Поскольку современные керамические конденсаторы MLCC имеют сверхнизкий ESR, естественной пилы на выходе недостаточно для работы компаратора COT. Цепь Rx (от узла SW) и Cx (к шине VOUT) синтезирует пилу напряжения. Конденсатор Cy подключается непосредственно к выводу 20 (VSNS), передавая пилу и отсекая постоянную составляющую. Рекомендуемый диапазон амплитуды: 100..900 мВ. Текущий диапазон: ${results.vrampMinMv}..${results.vrampMaxMv} мВ (при Vin = ${inputs.vinMin}..${inputs.vinMax} В).`,
          layoutNote: 'Конденсатор Cy подключается непосредственно к выводу 20 (VSNS) микросхемы. Резистор Rx рассеивает до 25 мВт (типоразмер 0603). Сигнал VSNS снимается кельвиновским подключением.',
        };
      case 'L1':
      case 'SW':
      case 'PIN_7_10':
        return {
          pin: 'Пины 7, 8, 9, 10: SW',
          title: 'Силовой импульсный узел переключения и дроссель L1',
          value: `L1 = ${results.lNominal.formatted} (расчетное: ${results.lCalcUh} µH)`,
          detail: `Рейтинг дросселя: Isat ≥ ${(results.iPeak * 1.3).toFixed(1)} A, Irms ≥ ${(results.iRms * 1.15).toFixed(1)} A. Размах пульсаций тока дросселя ΔIL = ${results.actualDeltaIL} A (${(results.actualKind * 100).toFixed(0)}% от Iout). Потери в активном сопротивлении меди DCR ≈ ${results.inductorDcrLossW} Вт.`,
          layoutNote: 'Полигон SW должен иметь минимально необходимую площадь для уменьшения емкостной связи и EMI излучения, но достаточную медь для отвода тепла (минимум 2 oz).',
        };
      case 'VFB':
      case 'PIN_22':
        return {
          pin: 'Пин 22: VFB',
          title: 'Вход обратной связи по напряжению',
          value:  `R_FB_H = ${results.rfbTop.formatted}, R_FB_L = ${results.rfbBottom.formatted}` ,
          formula: 'Vout = Vref · (1 + R_FB_H / R_FB_L), Vref = 0.800 В',
          detail:  `Фактическое выходное напряжение: ${results.voutActual} В (погрешность ${results.voutErrorPercent > 0 ? '+' : ''}${results.voutErrorPercent}%). Делитель задаёт Vout = Vref · (1 + R_FB_H / R_FB_L).` ,
          layoutNote: 'Вывод VFB является высокоомным чувствительным узлом. Дорожка от делителя к выводу 22 должна быть максимально короткой и экранирована земляным полигоном.',
        };
      case 'SS':
      case 'PIN_19':
        return {
          pin: 'Пин 19: SS',
          title: 'Программирование плавного пуска (Soft-Start)',
          value: `C_SS = ${results.cssNf.formatted} (E24) → Tss = ${results.actualTssMs} мс`,
          formula: 'Tss = (Css · 0.8В) / 5.0 µA',
          detail: `Внутренний источник тока 5 мкА заряжает конденсатор CSS, обеспечивая плавное монотонное нарастание выходного напряжения без бросков пускового тока.`,
          layoutNote: 'Конденсатор монтируется между выводом 19 и AGND.',
        };
      case 'EN':
	  case 'PIN_3':
	    return {
		  pin: 'Пин 3: EN',
	  	  title: 'Разрешение работы и настраиваемая защита UVLO',
		  value: `REN1 = ${results.renTopKohm.formatted}, REN2 = ${results.renBottomKohm.formatted} → Vin_start = ${results.actualVinStart}В`,
		  formula: 'Vin_start = 1.35В · (1 + REN1/REN2), Vin_stop = 1.20В · (1 + REN1/REN2)',
		  detail: `Порог включения: Vin_start = ${results.actualVinStart} В. Порог отключения: Vin_stop = ${results.actualVinStop} В. Встроенный гистерезис компаратора EN равен 150 мВ (стр. 5 даташита). Для гарантированного включения требуется сигнал > 1.4В.`,
		  layoutNote: 'Резистор REN1 подключается к шине VIN, REN2 — к AGND. Внутренний pull-down 5-9 МОм предотвращает ложное включение.',
	    };
      case 'ILIMIT':
      case 'PIN_25':
        return {
          pin: 'Пин 25: ILIMIT',
          title: 'Программирование токового предела нижнего ключа',
          value: `R_LIM = ${results.rlimKohm.formatted} → Ivalley ≈ ${results.ilimNominalA} А / Iocp ≈ ${(results.ilimNominalA + results.actualDeltaIL / 2).toFixed(1)} А`,
          formula: `Rlim (kΩ) = Klim / Ivalley | Iocp = Ivalley + ΔIL / 2`,
          detail: `Поцикловая защита от перегрузки по току нижнего MOSFET (Valley Current Sensing). Порог впадины тока Ivalley = ${results.ilimNominalA} А соответствует среднему выходному току отсечки Iocp ≈ ${(results.ilimNominalA + results.actualDeltaIL / 2).toFixed(1)} А с учётом размаха пульсаций дросселя ΔIL = ${results.actualDeltaIL} А.`,
          layoutNote: 'Резистор R_LIM подключается между выводом 25 и AGND.',
        };
      case 'VCIN':
      case 'PIN_1':
        return {
          pin: 'Пин 1: VCIN',
          title: 'Питание управляющей схемы микросхемы',
          value: `C_VCIN = ${results.cvcinUf.formatted}, R_VCIN = ${results.rvcinOhm.formatted}`,
          detail: 'Подает входное напряжение 4.5В .. 60В на внутренние линейные стабилизаторы логики. Развязывается RC-фильтром (0..2.2 Ω и 0.1 µF к AGND) для подавления импульсных помех с силовой шины VIN.',
          layoutNote: 'Конденсатор C_VCIN ставить вплотную к выводу 1 и тихой земле.',
        };
      case 'VDD':
      case 'PIN_26':
        return {
          pin: 'Пин 26: VDD',
          title: 'Внутренняя шина питания логики 5.0В',
          value: `C_VDD = ${results.cddUf.formatted}`,
          detail: 'Выход внутреннего линейного регулятора 5В для питания аналоговых блоков и компараторов. Требует локального керамического конденсатора 1.0 µF к AGND.',
          layoutNote: 'Не нагружать внешними потребителями тока более 5 мА.',
        };
      case 'PGOOD':
      case 'PIN_2':
        return {
          pin: 'Пин 2: PGOOD',
          title: 'Сигнал исправности выходного напряжения (Power Good)',
          value: 'Открытый сток (без резистора)',
          detail: 'Выход с открытым стоком (Open Drain). Сигнал переходит в высокоимпедансное состояние (HIGH-Z), когда выходное напряжение Vout находится в пределах 90% .. 110% от номинала. Резистор подтяжки на схеме не установлен (при необходимости подтягивается к внешней шине 3.3В / 5В или VDD).',
          layoutNote: 'Может объединяться по схеме "монтажное ИЛИ" с сигналами PGOOD других стабилизаторов или подключаться к супервизору.',
        };
      case 'CIN':
        return {
          pin: 'Входная батарея CIN',
          title: 'Входные конденсаторы подавления ВЧ пульсаций',
          value: `${results.cinQty} × ${results.cinSingleUf} µF (${results.cinQty * results.cinSingleUf} µF)`,
          detail: `Суммарный RMS ток через конденсаторы: ${results.cinRmsA} A. Рабочее напряжение ≥ ${Math.ceil(inputs.vinMax * 1.35)} В.`,
          layoutNote: 'Устанавливать непосредственно между силовыми полигонами VIN и выводами 11-15 PGND с минимальной паразитной индуктивностью контура импульсного тока.',
        };
      case 'COUT': 
        return {
          pin: 'Выходная батарея COUT',
          title: 'Выходные сглаживающие конденсаторы',
          value: `${results.coutQty} × ${results.coutSingleUf} µF (${results.coutQty * results.coutSingleUf} µF)`,
          detail: `Мин. эффективная емкость: ${results.coutEffectiveMinUf} µF (по пульсациям ${results.coutRippleMinUf} µF, по набросу тока ${results.coutTransientMinUf} µF). Расчетные пульсации Vout ≈ ${results.actualRippleMv} мВ.`,
          layoutNote: 'Монтировать полигоном к выходу дросселя L1 и силовым полигонам PGND.',
        };
      default:
        return null;
    }
  };

  const activeDetail = getPinOrPartDetail(selectedPinOrPart);
  const pinsList = [
    { id: 'PIN_27', label: 'Пин 27: MODE', key: 'MODE', color: 'text-cyan-400' },
    { id: 'PIN_24', label: 'Пин 24: fSW', key: 'FSW', color: 'text-cyan-400' },
    { id: 'PIN_5_6', label: 'Пины 5,6: PHASE', key: 'PHASE', color: 'text-amber-400' },
    { id: 'PIN_4', label: 'Пин 4: BOOT', key: 'BOOT', color: 'text-amber-400' },
    { id: 'PIN_16', label: 'Пин 16: VDRV', key: 'VDRV', color: 'text-purple-400' },
    { id: 'PIN_21', label: 'Пин 21: COMP', key: 'COMP', color: 'text-emerald-400' },
    { id: 'PIN_20', label: 'Пин 20: VSNS', key: 'VSNS', color: 'text-cyan-400' },
    { id: 'PIN_7_10', label: 'Пины 7-10: SW', key: 'SW', color: 'text-amber-400' },
    { id: 'PIN_22', label: 'Пин 22: VFB', key: 'VFB', color: 'text-purple-400' },
    { id: 'PIN_19', label: 'Пин 19: SS', key: 'SS', color: 'text-cyan-400' },
    { id: 'PIN_3', label: 'Пин 3: EN', key: 'EN', color: 'text-cyan-400' },
    { id: 'PIN_25', label: 'Пин 25: ILIMIT', key: 'ILIMIT', color: 'text-amber-400' },
    { id: 'PIN_1', label: 'Пин 1: VCIN', key: 'VCIN', color: 'text-slate-300' },
    { id: 'PIN_26', label: 'Пин 26: VDD', key: 'VDD', color: 'text-slate-300' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-5 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg mb-3 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-slate-400 block text-[11px]">Входное напряжение: </span>
            <span className="font-mono text-white font-semibold">
              {inputs.vinMin}В .. <span className="text-cyan-400">{inputs.vinNom}В</span> .. {inputs.vinMax}В
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Выходной режим: </span>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {results.voutActual} В @ {inputs.ioutMax} А
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Дроссель L1: </span>
            <span className="font-mono text-amber-300 font-bold text-sm">
              {results.lNominal.nominal} µH
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Конфигурация MODE: </span>
            <span className="font-mono text-cyan-300 font-bold text-xs">
              Mode {results.detectedMode} ({results.rmodeKohm.formatted})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Частота fSW: </span>
            <span className="font-mono text-cyan-400 font-bold text-xs">
              {results.actualFswKhz} кГц ({results.rfswKohm.formatted})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">
            Схема из даташита (стр. 10, Рис. 10)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs">
        <span className="text-slate-400 text-[11px] font-mono shrink-0 mr-1">Пины SiC46x:</span>
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

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-slate-900/95 border border-slate-800 rounded-lg min-h-[540px] flex items-center justify-center overflow-hidden shadow-inner select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
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

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
          className="w-full h-full flex items-center justify-center pointer-events-auto"
        >
        <svg viewBox="0 0 1320 800" className="w-full max-w-[1320px] h-auto select-none font-sans">
		  <defs>
			<linearGradient id="icGrad" x1="0" y1="0" x2="0" y2="1">
			  <stop offset="0%" stopColor="#1e293b" />
			  <stop offset="100%" stopColor="#0b1120" />
			</linearGradient>
			<pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
			  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
			</pattern>
			{/* ВЕРТИКАЛЬНЫЙ КОНДЕНСАТОР */}
			<g id="cap-v">
			  <rect x="-9" y="-3.5" width="18" height="7" fill="#0b1120" />
			  <line x1="0" y1="-12" x2="0" y2="-4" stroke="currentColor" strokeWidth="1.5" />
			  <line x1="-8" y1="-4" x2="8" y2="-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
			  <line x1="-8" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
			  <line x1="0" y1="4" x2="0" y2="12" stroke="currentColor" strokeWidth="1.5" />
			</g>
			{/* ГОРИЗОНТАЛЬНЫЙ КОНДЕНСАТОР */}
			<g id="cap-h">
			  <rect x="-3.5" y="-9" width="7" height="18" fill="#0b1120" />
			  <line x1="-12" y1="0" x2="-4" y2="0" stroke="currentColor" strokeWidth="1.5" />
			  <line x1="-4" y1="-8" x2="-4" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
			  <line x1="4" y1="-8" x2="4" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
			  <line x1="4" y1="0" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" />
			</g>
			{/* СИМВОЛ АНАЛОГОВОЙ ЗЕМЛИ (AGND) */}
			<g id="gnd-agnd">
			  <line x1="0" y1="0" x2="0" y2="6" stroke="#64748b" strokeWidth="1.5" />
			  <line x1="-8" y1="6" x2="8" y2="6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
			  <line x1="-5" y1="9" x2="5" y2="9" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
			  <line x1="-2" y1="12" x2="2" y2="12" stroke="#64748b" strokeWidth="1" strokeLinecap="round" />
			  <text x="0" y="21" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="JetBrains Mono">AGND</text>
			</g>
			{/* СИМВОЛ СИЛОВОЙ ЗЕМЛИ (PGND) */}
			<g id="gnd-pgnd">
			  <line x1="0" y1="0" x2="0" y2="6" stroke="#0284c7" strokeWidth="2" />
			  <line x1="-10" y1="6" x2="10" y2="6" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
			  <line x1="-6" y1="9" x2="6" y2="9" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
			  <line x1="-3" y1="12" x2="3" y2="12" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
			  <text x="0" y="21" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontWeight="bold" fontFamily="JetBrains Mono">PGND</text>
			</g>
		  </defs>

		  <rect width="1320" height="800" fill="url(#smallGrid)" opacity="0.45" />

		  {/* ТРАССЫ СВЯЗИ ВЕРХНЕГО И НИЖНЕГО УРОВНЕЙ */}
		  {/* 1. Трасса инжекции SW пульсаций в цепь VSNS (по верхнему коридору y=30) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VSNS')}>
			<path d="M 848 270 L 848 30 L 65 30 L 65 400 L 80 400" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
			<rect x="340" y="20" width="230" height="20" rx="4" fill="#0b1120" stroke="#38bdf8" strokeWidth="1" />
			<text x="455" y="34" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">SW импульсный узел → Rx (VSNS COT)</text>
		  </g>

		  {/* 2. Трасса обратной связи VOUT в делитель VFB и Cx (по нижнему коридору y=755) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VFB')}>
			<path d="M 1170 270 L 1170 755 L 135 755 L 135 520" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
			<rect x="500" y="745" width="280" height="20" rx="4" fill="#0b1120" stroke="#c084fc" strokeWidth="1" />
			<text x="640" y="759" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="JetBrains Mono">Обратная связь VOUT → RFB1 (0.8В) / Cx</text>
		  </g>

		  {/* КОРПУС МИКРОСХЕМЫ (SiC461 MLP55-27L) */}
		  <g>
			<rect x="465" y="85" width="370" height="605" rx="8" fill="url(#icGrad)" stroke="#0284c7" strokeWidth="2.5" />
			<circle cx="482" cy="100" r="4.5" fill="#38bdf8" opacity="0.9" />
			{/* Заголовок чипа вверху корпуса (свободная зона над пинами) */}
			<text x="650" y="106" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="15" letterSpacing="0.5">Vishay {inputs.chipModel || 'SiC461'}</text>
			<text x="650" y="121" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">microBUCK® 60V {results.maxRatedCurrentA}A • PowerPAK® MLP55-27L</text>

			{/* Левые выводы микросхемы */}
			<g className="cursor-pointer" onClick={() => handleItemClick('VCIN')}>
			  <line x1="430" y1="130" x2="465" y2="130" stroke="#94a3b8" strokeWidth="2" />
			  <text x="475" y="134" fill="#94a3b8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">1: VCIN</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('EN')}>
			  <line x1="430" y1="230" x2="465" y2="230" stroke="#38bdf8" strokeWidth="2" />
			  <text x="475" y="234" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">3: EN / UVLO</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
			  <line x1="430" y1="285" x2="465" y2="285" stroke="#94a3b8" strokeWidth="2" />
			  <text x="475" y="289" fill="#94a3b8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">18: ULTRASONIC</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('SS')}>
			  <line x1="430" y1="340" x2="465" y2="340" stroke="#38bdf8" strokeWidth="2" />
			  <text x="475" y="344" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">19: SS (5µA)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('VSNS')}>
			  <line x1="430" y1="400" x2="465" y2="400" stroke="#38bdf8" strokeWidth="2" />
			  <text x="475" y="404" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">20: VSNS (Пила)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('COMP')}>
			  <line x1="430" y1="460" x2="465" y2="460" stroke="#34d399" strokeWidth="2" />
			  <text x="475" y="464" fill="#34d399" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">21: COMP (gm)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('VFB')}>
			  <line x1="430" y1="520" x2="465" y2="520" stroke="#c084fc" strokeWidth="2" />
			  <text x="475" y="524" fill="#c084fc" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">22: VFB (0.8V)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('FSW')}>
			  <line x1="430" y1="575" x2="465" y2="575" stroke="#38bdf8" strokeWidth="2" />
			  <text x="475" y="579" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">24: fSW (Частота)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('ILIMIT')}>
			  <line x1="430" y1="620" x2="465" y2="620" stroke="#fbbf24" strokeWidth="2" />
			  <text x="475" y="624" fill="#fbbf24" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">25: ILIMIT</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
			  <line x1="430" y1="660" x2="465" y2="660" stroke="#38bdf8" strokeWidth="2" />
			  <text x="475" y="664" fill="#38bdf8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">27: MODE</text>
			</g>

			{/* Внутреннее ядро управления COT (компактный блок в центре, не наезжающий на пины) */}
			<rect x="575" y="310" width="150" height="74" rx="5" fill="#0b1120" stroke="#1e3a5f" strokeWidth="1.5" />
			<text x="650" y="327" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">COT Controller Core</text>
			<line x1="590" y1="334" x2="710" y2="334" stroke="#1e3a5f" strokeWidth="1" />
			<text x="650" y="348" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">Mode {results.detectedMode} • {results.actualFswKhz} кГц</text>
			<text x="650" y="361" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="JetBrains Mono">Vref = 0.800В</text>
			<text x="650" y="373" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontFamily="JetBrains Mono">Ivalley ≈ {results.ilimNominalA}А / Iocp ≈ {(results.ilimNominalA + results.actualDeltaIL / 2).toFixed(1)}А</text>

			{/* Правые выводы микросхемы */}
			<g className="cursor-pointer" onClick={() => handleItemClick('BOOT')}>
			  <line x1="835" y1="140" x2="850" y2="140" stroke="#fbbf24" strokeWidth="2.5" />
			  <text x="825" y="144" textAnchor="end" fill="#fbbf24" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">4: BOOT</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('PHASE')}>
			  <line x1="835" y1="195" x2="850" y2="195" stroke="#fbbf24" strokeWidth="2.5" />
			  <text x="825" y="199" textAnchor="end" fill="#fbbf24" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">5,6: PHASE1, 2</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('SW')}>
			  <line x1="835" y1="270" x2="860" y2="270" stroke="#38bdf8" strokeWidth="4.5" />
			  <text x="825" y="274" textAnchor="end" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">7-10: SW (Power)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('VDRV')}>
			  <line x1="835" y1="450" x2="860" y2="450" stroke="#c084fc" strokeWidth="2.5" />
			  <text x="825" y="454" textAnchor="end" fill="#c084fc" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">16: VDRV (5V Gate)</text>
			</g>
			<g className="cursor-pointer" onClick={() => handleItemClick('VDD')}>
			  <line x1="835" y1="560" x2="860" y2="560" stroke="#94a3b8" strokeWidth="2" />
			  <text x="825" y="564" textAnchor="end" fill="#94a3b8" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">26: VDD (5V Bias)</text>
			</g>

			{/* Нижние выводы микросхемы */}
			<g className="cursor-pointer">
			  <line x1="585" y1="690" x2="585" y2="720" stroke="#64748b" strokeWidth="2" />
			  <text x="585" y="682" textAnchor="middle" fill="#64748b" fontSize="8.5" fontWeight="bold" fontFamily="JetBrains Mono">17, 23: AGND</text>
			</g>
			<g className="cursor-pointer">
			  <line x1="715" y1="690" x2="715" y2="720" stroke="#0284c7" strokeWidth="4" />
			  <text x="715" y="682" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono">11-15: PGND</text>
			</g>
			{/* Точка соединения Star Ground */}
			<line x1="585" y1="720" x2="715" y2="720" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
			<rect x="565" y="710" width="170" height="20" rx="3" fill="#0b1120" stroke="#64748b" strokeWidth="1" />
			<text x="650" y="723" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="JetBrains Mono">Точка объединения AGND / PGND (Net-Tie)</text>
		  </g>

		  {/* ЛЕВАЯ ЧАСТЬ СХЕМЫ: ВХОД, UVLO, КОНТРОЛЬНЫЕ ВЫВОДЫ */}

		  {/* Входная шина VIN */}
		  <line x1="50" y1="60" x2="420" y2="60" stroke="#38bdf8" strokeWidth="3.5" />
		  <circle cx="50" cy="60" r="5" fill="#38bdf8" />
		  <text x="50" y="40" fill="#38bdf8" fontSize="13" fontWeight="bold">VIN ({inputs.vinNom}В)</text>
		  <text x="50" y="53" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">{inputs.vinMin}В .. {inputs.vinMax}В</text>

		  {/* Батарея входных конденсаторов CIN */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('CIN')}>
			<circle cx="120" cy="60" r="3.5" fill="#38bdf8" />
			<line x1="120" y1="60" x2="120" y2="100" stroke="#38bdf8" strokeWidth="1.5" />
			<g transform="translate(120, 112)" className="text-slate-300"><use href="#cap-v" /></g>
			<line x1="120" y1="124" x2="120" y2="135" stroke="#0284c7" strokeWidth="1.5" />
			<g transform="translate(120, 135)"><use href="#gnd-pgnd" /></g>
			<text x="105" y="106" textAnchor="end" fill="#f1f5f9" fontSize="10" fontWeight="bold">CIN</text>
			<text x="105" y="119" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">{results.cinQty} × {results.cinSingleUf} µF</text>
			<text x="105" y="131" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">Irms = {results.cinRmsA} A</text>
		  </g>

		  {/* RC-фильтр питания логики VCIN (Пин 1) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VCIN')}>
			<circle cx="350" cy="60" r="3.5" fill="#38bdf8" />
			<line x1="350" y1="60" x2="350" y2="130" stroke="#94a3b8" strokeWidth="1.5" />
			<line x1="350" y1="130" x2="365" y2="130" stroke="#94a3b8" strokeWidth="1.5" />
			{/* R_VCIN */}
			<rect x="365" y="122" width="32" height="16" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
			<text x="381" y="116" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">R={results.rvcinOhm.formatted}</text>
			<line x1="397" y1="130" x2="430" y2="130" stroke="#94a3b8" strokeWidth="1.5" />
			<circle cx="420" cy="130" r="3" fill="#94a3b8" />
			{/* C_VCIN */}
			<line x1="420" y1="130" x2="420" y2="148" stroke="#94a3b8" strokeWidth="1.5" />
			<g transform="translate(420, 160)" className="text-slate-300"><use href="#cap-v" /></g>
			<g transform="translate(420, 172)"><use href="#gnd-agnd" /></g>
			<text x="410" y="163" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">C={results.cvcinUf.formatted}</text>
		  </g>

		  {/* Делитель UVLO / EN (Пин 3) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('EN')}>
			<circle cx="230" cy="60" r="3.5" fill="#38bdf8" />
			<line x1="230" y1="60" x2="230" y2="95" stroke="#38bdf8" strokeWidth="1.5" />
			{/* Верхний резистор REN1 (R_EN_H) */}
			<rect x="222" y="95" width="16" height="32" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="214" y="106" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R_EN_H</text>
			<text x="214" y="119" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.renTopKohm.formatted}</text>
			<line x1="230" y1="127" x2="230" y2="230" stroke="#38bdf8" strokeWidth="1.5" />
			<circle cx="230" cy="230" r="3.5" fill="#38bdf8" />
			{/* Отвод на пин 3 EN */}
			<line x1="230" y1="230" x2="430" y2="230" stroke="#38bdf8" strokeWidth="1.5" />
			{/* Нижний резистор REN2 (R_EN_L) */}
			<line x1="230" y1="230" x2="230" y2="242" stroke="#38bdf8" strokeWidth="1.5" />
			<rect x="222" y="242" width="16" height="32" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="214" y="253" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">R_EN_L</text>
			<text x="214" y="266" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.renBottomKohm.formatted}</text>
			<line x1="230" y1="274" x2="230" y2="280" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(230, 280)"><use href="#gnd-agnd" /></g>
			<text x="230" y="308" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">
			  Vin_start = {results.actualVinStart}В | Vin_stop = {results.actualVinStop}В
			</text>
		  </g>

		  {/* Пин 18: ULTRASONIC */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
			<line x1="370" y1="285" x2="430" y2="285" stroke="#94a3b8" strokeWidth="1.5" />
			<rect x="260" y="275" width="110" height="20" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
			<text x="315" y="288" textAnchor="middle" fill={inputs.ultrasonicEnabled ? '#38bdf8' : '#94a3b8'} fontSize="8" fontFamily="JetBrains Mono">
			  {inputs.ultrasonicEnabled ? '→ VDD (>25кГц)' : '→ AGND (Выкл)'}
			</text>
		  </g>

		  {/* Пин 19: SS (Софт-старт) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('SS')}>
			<line x1="330" y1="340" x2="430" y2="340" stroke="#38bdf8" strokeWidth="1.5" />
			<line x1="330" y1="340" x2="330" y2="350" stroke="#38bdf8" strokeWidth="1.5" />
			<g transform="translate(330, 362)" className="text-slate-300"><use href="#cap-v" /></g>
			<g transform="translate(330, 374)"><use href="#gnd-agnd" /></g>
			<text x="318" y="356" textAnchor="end" fill="#f1f5f9" fontSize="9" fontWeight="bold">C_SS</text>
			<text x="318" y="368" textAnchor="end" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">{results.cssNf.formatted}</text>
			<text x="318" y="380" textAnchor="end" fill="#94a3b8" fontSize="7.5" fontFamily="JetBrains Mono">Tss = {results.actualTssMs}мс</text>
		  </g>

		  {/* Пин 20: VSNS (Инжекция пилы COT) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VSNS')}>
			{/* Резистор Rx */}
			<line x1="65" y1="400" x2="80" y2="400" stroke="#38bdf8" strokeWidth="1.5" />
			<rect x="80" y="392" width="30" height="16" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="95" y="386" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">Rx={results.rxKohm.formatted}</text>
			<line x1="110" y1="400" x2="135" y2="400" stroke="#38bdf8" strokeWidth="1.5" />
			<circle cx="135" cy="400" r="3" fill="#38bdf8" />

			{/* Конденсатор Cx к обратной связи VOUT */}
			<line x1="135" y1="400" x2="135" y2="415" stroke="#38bdf8" strokeWidth="1.5" />
			<g transform="translate(135, 427)" className="text-slate-300"><use href="#cap-v" /></g>
			<text x="125" y="430" textAnchor="end" fill="#c084fc" fontSize="8" fontFamily="JetBrains Mono">Cx={results.cxNf.formatted}</text>
			<line x1="135" y1="439" x2="135" y2="520" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 2" />

			{/* Конденсатор Cy к выводу 20 VSNS */}
			<line x1="135" y1="400" x2="165" y2="400" stroke="#38bdf8" strokeWidth="1.5" />
			<g transform="translate(177, 400)" className="text-slate-300"><use href="#cap-h" /></g>
			<text x="177" y="386" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">Cy={results.cyNf.formatted}</text>
			<line x1="189" y1="400" x2="430" y2="400" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="240" y="416" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
			  Vramp = {results.vrampMinMv}..{results.vrampMaxMv} мВ (COT)
			</text>
		  </g>

		  {/* Пин 21: COMP (Цепочка частотной коррекции усилителя ошибки) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('COMP')}>
			<line x1="390" y1="460" x2="430" y2="460" stroke="#34d399" strokeWidth="1.5" />
			{/* R_COMP */}
			<rect x="360" y="452" width="30" height="16" rx="2" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
			<text x="375" y="446" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="JetBrains Mono">R={results.rcompKohm.nominal}k</text>
			<line x1="330" y1="460" x2="360" y2="460" stroke="#34d399" strokeWidth="1.5" />
			{/* C_COMP */}
			<g transform="translate(318, 460)" className="text-slate-300"><use href="#cap-h" /></g>
			<text x="318" y="446" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="JetBrains Mono">C={results.ccompPf.nominal}pF</text>
			<line x1="285" y1="460" x2="306" y2="460" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(285, 460)"><use href="#gnd-agnd" /></g>
			<text x="340" y="478" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
			  fc ≈ {results.crossoverFreqKhz} кГц (gm = 300 µS)
			</text>
		  </g>

		  {/* Пин 22: VFB (Делитель обратной связи) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VFB')}>
			<line x1="250" y1="520" x2="430" y2="520" stroke="#c084fc" strokeWidth="1.5" />
			<circle cx="250" cy="520" r="3.5" fill="#c084fc" />

			{/* Нижний резистор RFB2 (R_FB_L) к AGND */}
			<line x1="250" y1="520" x2="250" y2="530" stroke="#c084fc" strokeWidth="1.5" />
			<rect x="242" y="530" width="16" height="30" rx="2" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
			<text x="264" y="548" textAnchor="start" fill="#c084fc" fontSize="8" fontFamily="JetBrains Mono">RFB2={results.rfbBottom.formatted}</text>
			<line x1="250" y1="560" x2="250" y2="565" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(250, 565)"><use href="#gnd-agnd" /></g>

			{/* Верхний резистор RFB1 (R_FB_H) к шине VOUT */}
			<line x1="195" y1="520" x2="250" y2="520" stroke="#c084fc" strokeWidth="1.5" />
			<rect x="165" y="512" width="30" height="16" rx="2" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
			<text x="180" y="506" textAnchor="middle" fill="#c084fc" fontSize="8" fontFamily="JetBrains Mono">RFB1={results.rfbTop.formatted}</text>
			<line x1="135" y1="520" x2="165" y2="520" stroke="#c084fc" strokeWidth="1.5" />
			<circle cx="135" cy="520" r="3" fill="#c084fc" />
			<text x="180" y="538" textAnchor="middle" fill="#c084fc" fontSize="8" fontFamily="JetBrains Mono">
			  Vref = 0.800В
			</text>
		  </g>

		  {/* Пин 24: fSW (Задание частоты переключения) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('FSW')}>
			<line x1="410" y1="575" x2="430" y2="575" stroke="#38bdf8" strokeWidth="1.5" />
			<rect x="380" y="567" width="30" height="16" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="395" y="561" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">R_fsw={results.rfswKohm.formatted}</text>
			<line x1="350" y1="575" x2="380" y2="575" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(350, 575)"><use href="#gnd-agnd" /></g>
			<text x="395" y="593" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">
			  Fsw = {results.actualFswKhz} кГц
			</text>
		  </g>

		  {/* Пин 25: ILIMIT (Токовый порог нижнего ключа) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('ILIMIT')}>
			<line x1="410" y1="620" x2="430" y2="620" stroke="#fbbf24" strokeWidth="1.5" />
			<rect x="380" y="612" width="30" height="16" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
			<text x="395" y="606" textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="JetBrains Mono">R_lim={results.rlimKohm.formatted}</text>
			<line x1="350" y1="620" x2="380" y2="620" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(350, 620)"><use href="#gnd-agnd" /></g>
			<text x="395" y="638" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontFamily="JetBrains Mono">
			  Ivalley ≈ {results.ilimNominalA}А (Iocp ≈ {(results.ilimNominalA + results.actualDeltaIL / 2).toFixed(1)}А)
			</text>
		  </g>

		  {/* Пин 27: MODE (Конфигурация режимов) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('MODE')}>
			<line x1="410" y1="660" x2="430" y2="660" stroke="#38bdf8" strokeWidth="1.5" />
			<rect x="380" y="652" width="30" height="16" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
			<text x="395" y="646" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">R_mode={results.rmodeKohm.formatted}</text>
			<line x1="350" y1="660" x2="380" y2="660" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(350, 660)"><use href="#gnd-agnd" /></g>
			<text x="395" y="678" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">
			  Mode {results.detectedMode}
			</text>
		  </g>

		  {/* ПРАВАЯ ЧАСТЬ СХЕМЫ: СИЛОВОЙ ВЫХОД, ДРОССЕЛЬ, BOOT, VDRV, VDD */}

		  {/* Бутстрепный контур BOOT - PHASE (Пины 4 и 5,6) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('BOOT')}>
			{/* Провод от вывода 4 BOOT к левой обкладке C_BOOT */}
			<line x1="850" y1="140" x2="863" y2="140" stroke="#fbbf24" strokeWidth="2" />
			{/* Конденсатор C_BOOT */}
			<g transform="translate(875, 140)" className="text-slate-300"><use href="#cap-h" /></g>
			<text x="875" y="125" textAnchor="middle" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono">C_BOOT=100nF</text>
			{/* Провод от правой обкладки C_BOOT к верхнему выводу R_BOOT */}
			<path d="M 887 140 L 930 140 L 930 157" fill="none" stroke="#fbbf24" strokeWidth="2" />
			{/* Резистор R_BOOT */}
			<rect x="922" y="157" width="16" height="24" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
			<text x="946" y="172" textAnchor="start" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono">R_BOOT={results.rbootOhm.formatted}</text>
			{/* Провод от нижнего вывода R_BOOT обратно к выводам 5,6 PHASE */}
			<path d="M 930 181 L 930 195 L 850 195" fill="none" stroke="#fbbf24" strokeWidth="2" />
		  </g>

		  {/* Силовой узел SW и дроссель L1 */}
		  <line x1="860" y1="270" x2="920" y2="270" stroke="#38bdf8" strokeWidth="4.5" />
		  <circle cx="848" cy="270" r="3.5" fill="#38bdf8" />

		  <g className="cursor-pointer" onClick={() => handleItemClick('L1')}>
			<rect
			  x="920"
			  y="245"
			  width="120"
			  height="50"
			  rx="6"
			  fill={selectedPinOrPart === 'L1' ? '#0369a1' : '#1e293b'}
			  stroke="#fbbf24"
			  strokeWidth="2.5"
			/>
			{/* Обмотка дросселя (4 арки) */}
			<path
			  d="M 935 270 A 9 9 0 0 1 955 270 A 9 9 0 0 1 975 270 A 9 9 0 0 1 995 270 A 9 9 0 0 1 1015 270"
			  fill="none"
			  stroke="#fbbf24"
			  strokeWidth="2.5"
			/>
			<text x="980" y="238" textAnchor="middle" fill="#f1f5f9" fontSize="12" fontWeight="bold">Дроссель L1</text>
			<text x="980" y="308" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
			  {results.lNominal.nominal} µH (Isat ≥ {(results.iPeak * 1.3).toFixed(1)}А)
			</text>
		  </g>

		  {/* Выходная шина VOUT */}
		  <line x1="1040" y1="270" x2="1220" y2="270" stroke="#34d399" strokeWidth="5" />
		  <circle cx="1110" cy="270" r="4" fill="#34d399" />
		  <circle cx="1170" cy="270" r="4" fill="#34d399" />

		  {/* Терминал VOUT */}
		  <circle cx="1220" cy="270" r="8" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
		  <circle cx="1220" cy="270" r="4.5" fill="#34d399" />
		  <text x="1238" y="262" fill="#34d399" fontSize="14" fontWeight="bold">VOUT ({results.voutActual} В)</text>
		  <text x="1238" y="278" fill="#f1f5f9" fontSize="11" fontFamily="JetBrains Mono">Iout = {inputs.ioutMax} А</text>
		  <text x="1238" y="292" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">Pout = {(results.voutActual * inputs.ioutMax).toFixed(1)} Вт</text>

		  {/* Выходная батарея конденсаторов COUT */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('COUT')}>
			<line x1="1110" y1="270" x2="1110" y2="315" stroke="#34d399" strokeWidth="2" />
			<g transform="translate(1110, 327)" className="text-slate-300"><use href="#cap-v" /></g>
			<line x1="1110" y1="339" x2="1110" y2="345" stroke="#0284c7" strokeWidth="1.5" />
			<g transform="translate(1110, 345)"><use href="#gnd-pgnd" /></g>
			<text x="1126" y="322" textAnchor="start" fill="#f1f5f9" fontSize="10" fontWeight="bold">COUT</text>
			<text x="1126" y="335" textAnchor="start" fill="#34d399" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">
			  {results.coutQty} × {results.coutSingleUf} µF
			</text>
			<text x="1126" y="347" textAnchor="start" fill="#64748b" fontSize="8.5" fontFamily="JetBrains Mono">
			  Пульсации ~{results.actualRippleMv} мВ
			</text>
		  </g>

		  {/* Пин 16: VDRV (Питание затворов силовых ключей 5В) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VDRV')}>
			<line x1="860" y1="450" x2="890" y2="450" stroke="#c084fc" strokeWidth="2" />
			<line x1="890" y1="450" x2="890" y2="465" stroke="#c084fc" strokeWidth="1.5" />
			<g transform="translate(890, 477)" className="text-slate-300"><use href="#cap-v" /></g>
			<line x1="890" y1="489" x2="890" y2="495" stroke="#0284c7" strokeWidth="1.5" />
			<g transform="translate(890, 495)"><use href="#gnd-pgnd" /></g>
			<text x="906" y="472" textAnchor="start" fill="#c084fc" fontSize="9.5" fontWeight="bold">C_VDRV</text>
			<text x="906" y="485" textAnchor="start" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono">{results.cvdrvUf.formatted}</text>
			<text x="906" y="497" textAnchor="start" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">
			  {results.detectedMode >= 3 ? '+5V EXT (Внешнее)' : 'Внутренний LDO 5V'}
			</text>
		  </g>

		  {/* Пин 26: VDD (Питание аналоговых блоков и логики 5В) */}
		  <g className="cursor-pointer" onClick={() => handleItemClick('VDD')}>
			<line x1="860" y1="560" x2="890" y2="560" stroke="#94a3b8" strokeWidth="1.5" />
			<line x1="890" y1="560" x2="890" y2="575" stroke="#94a3b8" strokeWidth="1.5" />
			<g transform="translate(890, 587)" className="text-slate-300"><use href="#cap-v" /></g>
			<line x1="890" y1="599" x2="890" y2="605" stroke="#64748b" strokeWidth="1.5" />
			<g transform="translate(890, 605)"><use href="#gnd-agnd" /></g>
			<text x="906" y="584" textAnchor="start" fill="#f1f5f9" fontSize="9.5" fontWeight="bold">C_VDD</text>
			<text x="906" y="597" textAnchor="start" fill="#94a3b8" fontSize="8.5" fontFamily="JetBrains Mono">{results.cddUf.formatted}</text>
		  </g>
		</svg>
        </div>
      </div>

      {activeDetail && (
        <div className="mt-3 p-4 bg-slate-900 border border-cyan-800/60 rounded-lg text-xs space-y-2.5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono font-bold text-xs border border-cyan-800">{activeDetail.pin}</span>
              <h3 className="font-semibold text-white text-sm">{activeDetail.title}</h3>
            </div>
            <div className="font-mono text-cyan-300 font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800">{activeDetail.value}</div>
          </div>
          {activeDetail.formula && (
            <div className="p-2 bg-slate-950/70 border border-slate-800 rounded font-mono text-[11px] text-cyan-300">
              Формула из даташита: <strong className="text-white">{activeDetail.formula}</strong>
            </div>
          )}
          <p className="text-slate-300 text-[11px] leading-relaxed">{activeDetail.detail}</p>
          {activeDetail.table && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1 pr-3">Режим</th>
                    <th className="py-1 pr-3">Резистор R_MODE</th>
                    <th className="py-1">Поведение микросхемы</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {activeDetail.table.map((row, idx) => (
                    <tr key={idx} className={results.detectedMode === idx + 1 ? 'bg-cyan-950/50 text-cyan-200 font-semibold' : ''}>
                      <td className="py-1 pr-3">{row.mode}</td>
                      <td className="py-1 pr-3 text-cyan-400">{row.res}</td>
                      <td className="py-1">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetail.layoutNote && (
            <div className="flex items-start gap-2 p-2 bg-slate-950/90 border border-slate-800 rounded text-[10px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200">Рекомендация по трассировке платы (PCB Layout):</strong> {activeDetail.layoutNote}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};