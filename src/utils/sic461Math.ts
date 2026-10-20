import {
  CalculatorInputs,
  CalculatorResults,
  BomItem,
  StandardComponent,
  ChipModel,
  OperatingMode,
} from '../types/calculator';
import {
  findNearestESeries,
  findCeilESeries,
} from './eSeries';

export const CHIP_DATA: Record<
  ChipModel,
  {
    maxCurrentA: number;
    klim: number;
    rBootMinOhm: number;
    marking: string;
    description: string;
  }
> = {
  SiC461: {
    maxCurrentA: 10.0,
    klim: 780,
    rBootMinOhm: 3.3,
    marking: 'SiC461ED-T1-GE3',
    description: '10 A, 4.5 V to 60 V Synchronous Buck Regulator',
  },
  SiC462: {
    maxCurrentA: 6.0,
    klim: 480,
    rBootMinOhm: 3.3,
    marking: 'SiC462ED-T1-GE3',
    description: '6 A, 4.5 V to 60 V Synchronous Buck Regulator',
  },
  SiC463: {
    maxCurrentA: 4.0,
    klim: 240,
    rBootMinOhm: 4.7,
    marking: 'SiC463ED-T1-GE3',
    description: '4 A, 4.5 V to 60 V Synchronous Buck Regulator',
  },
  SiC464: {
    maxCurrentA: 2.0,
    klim: 240,
    rBootMinOhm: 4.7,
    marking: 'SiC464ED-T1-GE3',
    description: '2 A, 4.5 V to 60 V Synchronous Buck Regulator',
  },
};

export const SIC46X_LIMITS = {
  VIN_MIN: 4.5,
  VIN_MAX: 60.0,
  VREF: 0.800,
  VEN_RISING: 1.35,
  VEN_FALLING: 1.20,
  VEN_HYST: 0.15,
  ISS_UA: 5.0,
  GM_US: 300,
  TON_MIN_NS: 90,
  TOFF_MIN_NS: 190,
  RDS_ON_HIGH_MOHM: 27,
  RDS_ON_LOW_MOHM: 12,
  VRAMP_MIN_MV: 100,
  VRAMP_MAX_MV: 900,
};

export function calculateSiC461(inputs: CalculatorInputs): CalculatorResults {
  const warnings: string[] = [];
  const chip = CHIP_DATA[inputs.chipModel || 'SiC461'];

  const {
    vinNom,
    vinMin,
    vinMax,
    vout,
    ioutMax,
    fswKhz,
    kind,
    voutRippleMaxMv,
    loadStepA,
    voltageOvershootMv,
    tssMs,
    vinStartUvlo,
    operatingMode,
    ultrasonicEnabled,
    rfb2Kohm,
    ren2Kohm,
  } = inputs;

  const fsw = fswKhz * 1000;

  if (vinMin < SIC46X_LIMITS.VIN_MIN) {
    warnings.push(`Входное напряжение ${vinMin}В ниже порога SiC46x (4.5В).`);
  }
  if (vinMax > SIC46X_LIMITS.VIN_MAX) {
    warnings.push(`Входное напряжение ${vinMax}В выше абсолютного максимума (60В).`);
  }
  if (vout < SIC46X_LIMITS.VREF) {
    warnings.push(`Выходное напряжение ${vout}В не может быть ниже Vref (0.8В).`);
  }
  if (ioutMax > chip.maxCurrentA) {
    warnings.push(`Ток нагрузки ${ioutMax}А превышает паспортный номинал ${inputs.chipModel} (${chip.maxCurrentA}А).`);
  }

  const estEfficiency = 0.92;
  const dutyNom = Math.min(0.95, vout / (vinNom * estEfficiency));
  const dutyMin = Math.min(0.95, vout / (vinMax * estEfficiency));
  const dutyMax = Math.min(0.95, vout / (vinMin * estEfficiency));

  const tswNs = (1 / fsw) * 1e9;
  const tonNs = (vout / (vinMax * fsw)) * 1e9;
  const toffNs = tswNs - tonNs;

  const tonMinWarning = tonNs < SIC46X_LIMITS.TON_MIN_NS;
  const toffMinWarning = toffNs < SIC46X_LIMITS.TOFF_MIN_NS;

  if (tonMinWarning) {
    warnings.push(`Время t_on (${tonNs.toFixed(1)} нс) меньше паспортного минимума 90 нс. Уменьшите Fsw.`);
  }
  if (toffMinWarning) {
    warnings.push(`Время t_off (${toffNs.toFixed(1)} нс) меньше паспортного минимума 190 нс.`);
  }

  const tonSec = vout / (vinMax * fsw);
  const lCalcH = ((vinMax - vout) * tonSec) / (ioutMax * kind);
  const lCalcUh = lCalcH * 1e6;

  const lStandard = findNearestESeries(lCalcUh, 'E24');
  const lNominalUh = lStandard.nominal;
  const lNominalH = lNominalUh * 1e-6;

  const actualDeltaIL = ((vinMax - vout) * tonSec) / lNominalH;
  const actualKind = actualDeltaIL / ioutMax;
  const iPeak = ioutMax + actualDeltaIL / 2;
  const iValley = Math.max(0.1, ioutMax - actualDeltaIL / 2);
  const iRms = Math.sqrt(Math.pow(ioutMax, 2) + Math.pow(actualDeltaIL, 2) / 12);

  const lComponent: StandardComponent = {
    theoretical: Number(lCalcUh.toFixed(2)),
    nominal: lNominalUh,
    unit: 'µH',
    formatted: `${lNominalUh} µH`,
    series: 'E24',
    errorPercent: lStandard.errorPercent,
    currentRating: `Isat ≥ ${(iPeak * 1.3).toFixed(1)} A, Irms ≥ ${(iRms * 1.15).toFixed(1)} A`,
    packageRecommendation: 'Экранированный индуктор Vishay IHLP',
  };

  const voutRippleV = voutRippleMaxMv / 1000;
  const coutRippleMinF = actualDeltaIL / (8 * fsw * voutRippleV);
  const coutRippleMinUf = coutRippleMinF * 1e6;

  const vOvershootV = voltageOvershootMv / 1000;
  const coutTransientMinF = (lNominalH * Math.pow(loadStepA, 2)) / (2 * vout * vOvershootV);
  const coutTransientMinUf = coutTransientMinF * 1e6;

  const coutEffectiveMinUf = Math.max(coutRippleMinUf, coutTransientMinUf);
  const coutNominalTargetUf = coutEffectiveMinUf / 0.60;
  const coutStandard = findCeilESeries(coutNominalTargetUf, 'E24');

  let singleCoutUf = 22;
  if (coutStandard.nominal > 80) singleCoutUf = 47;
  if (coutStandard.nominal > 200) singleCoutUf = 64;
  const coutQty = Math.max(2, Math.ceil(coutStandard.nominal / singleCoutUf));
  const totalCoutActualUf = coutQty * singleCoutUf;

  const actualRippleMv = (actualDeltaIL / (8 * fsw * (totalCoutActualUf * 0.65 * 1e-6))) * 1000;

  const coutComponent: StandardComponent = {
    theoretical: Number(coutEffectiveMinUf.toFixed(1)),
    nominal: totalCoutActualUf,
    unit: 'µF',
    formatted: `${coutQty} × ${singleCoutUf} µF (${totalCoutActualUf} µF)`,
    series: 'E24',
    errorPercent: Number((((totalCoutActualUf - coutEffectiveMinUf) / coutEffectiveMinUf) * 100).toFixed(1)),
    voltageRating: `≥ ${Math.max(10, Math.ceil(vout * 1.6))} V`,
    packageRecommendation: 'Керамика MLCC X7R 1210 / 1206',
  };

  const cinRmsA = ioutMax * Math.sqrt(dutyNom * (1 - dutyNom));
  const deltaVinRippleTarget = Math.max(0.1, vinMin * 0.02);
  const cinMinF = (ioutMax * dutyNom * (1 - dutyNom)) / (fsw * deltaVinRippleTarget);
  const cinMinUf = cinMinF * 1e6;

  const cinTargetUf = cinMinUf / 0.50;
  const cinStandard = findCeilESeries(cinTargetUf, 'E24');
  let singleCinUf = 10;
  if (cinStandard.nominal > 40) singleCinUf = 22;
  if (cinStandard.nominal > 80) singleCinUf = 47;
  const cinQty = Math.max(2, Math.ceil(cinStandard.nominal / singleCinUf));
  const totalCinUf = cinQty * singleCinUf;

  const cinComponent: StandardComponent = {
    theoretical: Number(cinMinUf.toFixed(1)),
    nominal: totalCinUf,
    unit: 'µF',
    formatted: `${cinQty} × ${singleCinUf} µF + 0.1 µF ВЧ`,
    series: 'E24',
    errorPercent: Number((((totalCinUf - cinMinUf) / cinMinUf) * 100).toFixed(1)),
    voltageRating: `≥ ${Math.ceil(vinMax * 1.35)} V`,
    packageRecommendation: 'Керамика MLCC X7R 1210',
  };

  const rfswCalcOhm = vout / (1.9e-10 * fsw);
  const rfswCalcKohm = rfswCalcOhm / 1000;
  const rfswStd = findNearestESeries(
    inputs.fswInputMode === 'resistor' && inputs.rfswKohm > 0 ? inputs.rfswKohm : rfswCalcKohm,
    'E96'
  );
  const actualFswKhz = Number((vout / (1.9e-10 * (rfswStd.nominal * 1000) * 1000)).toFixed(1));

  const rfswComponent: StandardComponent = {
    theoretical: Number(rfswCalcKohm.toFixed(2)),
    nominal: rfswStd.nominal,
    unit: 'kΩ',
    formatted: `${rfswStd.nominal} kΩ`,
    series: 'E96',
    errorPercent: rfswStd.errorPercent,
    packageRecommendation: '0603 1% от вывода 24 к AGND',
  };

  let detectedMode: OperatingMode = operatingMode || 1;
  let rmodeNom = 2.0;

  if (inputs.modeInputMode === 'resistor') {
    const rVal = inputs.rmodeKohm;
    if (rVal <= 10) { detectedMode = 1; rmodeNom = 2.0; }
    else if (rVal <= 400) { detectedMode = 2; rmodeNom = 301.0; }
    else if (rVal <= 750) { detectedMode = 3; rmodeNom = 499.0; }
    else { detectedMode = 4; rmodeNom = 1000.0; }
  } else {
    detectedMode = operatingMode;
    if (detectedMode === 1) rmodeNom = 2.0;
    else if (detectedMode === 2) rmodeNom = 301.0;
    else if (detectedMode === 3) rmodeNom = 499.0;
    else if (detectedMode === 4) rmodeNom = 1000.0;
  }

  let modeDesc = 'Mode 1: Power Save Mode (PSM) вкл., внутренний LDO VDRV 5V';
  if (detectedMode === 2) modeDesc = 'Mode 2: Forced Continuous Conduction (FCCM), внутренний LDO VDRV 5V';
  else if (detectedMode === 3) modeDesc = 'Mode 3: FCCM, внешний VDRV 5V (внутренний LDO выключен)';
  else if (detectedMode === 4) modeDesc = 'Mode 4: PSM вкл., внешний VDRV 5V (внутренний LDO выключен)';

  const rmodeComponent: StandardComponent = {
    theoretical: rmodeNom,
    nominal: rmodeNom,
    unit: 'kΩ',
    formatted: `${rmodeNom} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% от вывода 27 к AGND',
  };

  // 8. Ripple Injection Network (VSNS Pin 20) — ПО ДАТАШИТУ Vishay SiC46x, стр. 7-8
  // Формула: Vramp = (Vin - Vout) * Vout / (Vin * fsw * Cx * Rx)
  // Vramp растёт с ростом Vin → проверяем диапазон при VIN_MIN, VIN_NOM, VIN_MAX
  const prxMax = 0.025;
  const vrampMaxV = SIC46X_LIMITS.VRAMP_MAX_MV / 1000;

  const rxCalcOhm = (vinMax * vout * (1 - dutyMin)) / prxMax;
  const rxCalcKohm = rxCalcOhm / 1000;
  const rxStd = findNearestESeries(
    inputs.vsnsInputMode === 'manual' && inputs.rxKohm > 0 ? inputs.rxKohm : rxCalcKohm,
    'E96'
  );
  const rxUsedOhm = rxStd.nominal * 1000;

  const cxMinF = prxMax / (vinMax * fsw * vrampMaxV);
  const cxMinNf = cxMinF * 1e9;

  const cxMinUsedF = cxMinNf * 1e-9;
  const vrampMinCalcV = ((vinMin - vout) * vout) / (vinMin * fsw * cxMinUsedF * rxUsedOhm);
  const vrampMinCalcMv = vrampMinCalcV * 1000;

  let cxTargetNf: number;
  if (vrampMinCalcMv > 200) {
    cxTargetNf = cxMinNf;
  } else {
    cxTargetNf = cxMinNf * (vrampMinCalcMv / 200);
  }

  let cxStd = findNearestESeries(
    inputs.vsnsInputMode === 'manual' && inputs.cxNf > 0 ? inputs.cxNf : cxTargetNf,
    'E24'
  );

  const cyCalcF = 1 / (820 * fsw);
  const cyCalcNf = cyCalcF * 1e9;
  const cyStd = findNearestESeries(
    inputs.vsnsInputMode === 'manual' && inputs.cyNf > 0 ? inputs.cyNf : cyCalcNf,
    'E24'
  );

  // ИТЕРАТИВНАЯ КОРРЕКТИРОВКА: гарантируем попадание Vramp в 100..900 мВ при всех Vin
  const calcVrampMv = (vin: number, cxF: number): number => {
    return (((vin - vout) * vout) / (vin * fsw * cxF * rxUsedOhm)) * 1000;
  };

  let cxUsedF = cxStd.nominal * 1e-9;
  let vrampMinMv = calcVrampMv(vinMin, cxUsedF);
  let vrampNomMv = calcVrampMv(vinNom, cxUsedF);
  let vrampMaxMv = calcVrampMv(vinMax, cxUsedF);

  if (inputs.vsnsInputMode !== 'manual') {
    const e24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
    const decade = Math.pow(10, Math.floor(Math.log10(cxStd.nominal)));
    const baseIdx = e24.indexOf(cxStd.nominal / decade);

    let idx = baseIdx >= 0 ? baseIdx : 0;
    let currentDecade = decade;

    while (vrampMaxMv > SIC46X_LIMITS.VRAMP_MAX_MV && idx < e24.length - 1) {
      idx++;
      const newCx = e24[idx] * currentDecade;
      cxUsedF = newCx * 1e-9;
      vrampMinMv = calcVrampMv(vinMin, cxUsedF);
      vrampNomMv = calcVrampMv(vinNom, cxUsedF);
      vrampMaxMv = calcVrampMv(vinMax, cxUsedF);
    }

    while (vrampMaxMv > SIC46X_LIMITS.VRAMP_MAX_MV) {
      currentDecade *= 10;
      idx = 0;
      const newCx = e24[idx] * currentDecade;
      cxUsedF = newCx * 1e-9;
      vrampMinMv = calcVrampMv(vinMin, cxUsedF);
      vrampNomMv = calcVrampMv(vinNom, cxUsedF);
      vrampMaxMv = calcVrampMv(vinMax, cxUsedF);
      if (currentDecade > 1e6) break;
    }

    while (vrampMinMv < SIC46X_LIMITS.VRAMP_MIN_MV && idx > 0) {
      idx--;
      const newCx = e24[idx] * currentDecade;
      cxUsedF = newCx * 1e-9;
      vrampMinMv = calcVrampMv(vinMin, cxUsedF);
      vrampNomMv = calcVrampMv(vinNom, cxUsedF);
      vrampMaxMv = calcVrampMv(vinMax, cxUsedF);
    }

    cxStd = { nominal: cxUsedF * 1e9, errorPercent: 0 };
  }

  vrampMinMv = Number(vrampMinMv.toFixed(0));
  vrampNomMv = Number(vrampNomMv.toFixed(0));
  vrampMaxMv = Number(vrampMaxMv.toFixed(0));

  const vrampWarning = vrampMinMv < SIC46X_LIMITS.VRAMP_MIN_MV || vrampMaxMv > SIC46X_LIMITS.VRAMP_MAX_MV;
  if (vrampWarning) {
    warnings.push(`Амплитуда пилы Vramp (${vrampMinMv}..${vrampMaxMv} мВ) выходит за диапазон ${SIC46X_LIMITS.VRAMP_MIN_MV}–${SIC46X_LIMITS.VRAMP_MAX_MV} мВ. Попробуйте изменить Cx или Rx вручную.`);
  }

  const rxComp: StandardComponent = {
    theoretical: Number(rxCalcKohm.toFixed(2)),
    nominal: rxStd.nominal,
    unit: 'kΩ',
    formatted: `${rxStd.nominal} kΩ`,
    series: 'E96',
    errorPercent: rxStd.errorPercent,
    packageRecommendation: '0603 1%, Pdiss ≤ 25 mW (узел SW к узлу пилы)',
  };

  const cxComp: StandardComponent = {
    theoretical: Number(cxTargetNf.toFixed(2)),
    nominal: cxStd.nominal,
    unit: 'nF',
    formatted: `${cxStd.nominal} nF`,
    series: 'E24',
    errorPercent: cxStd.errorPercent,
    voltageRating: '≥ 25V',
    packageRecommendation: '0603 X7R (узел пилы к VOUT)',
  };

  const cyComp: StandardComponent = {
    theoretical: Number(cyCalcNf.toFixed(2)),
    nominal: cyStd.nominal,
    unit: 'nF',
    formatted: `${cyStd.nominal} nF`,
    series: 'E24',
    errorPercent: cyStd.errorPercent,
    voltageRating: '≥ 50V',
    packageRecommendation: '0603 C0G/X7R (к выводу 20 VSNS)',
  };

  const lcPoleFreqKhz = Number((1 / (2 * Math.PI * Math.sqrt(lNominalH * (totalCoutActualUf * 1e-6))) / 1000).toFixed(1));
  const crossoverFreqKhz = Number((fswKhz / 10).toFixed(1));
  const rfbRatio = SIC46X_LIMITS.VREF / vout;
  const gm = SIC46X_LIMITS.GM_US * 1e-6;
  const ghEst = 1.8;
  const rcompCalcOhm = 1 / (ghEst * gm * rfbRatio);
  const rcompCalcKohm = rcompCalcOhm / 1000;
  const rcompStd = findNearestESeries(
    inputs.compInputMode === 'manual' && inputs.rcompKohm > 0 ? inputs.rcompKohm : rcompCalcKohm,
    'E96'
  );

  const ccompCalcF = (5 * Math.sqrt(lNominalH * (totalCoutActualUf * 1e-6))) / (rcompStd.nominal * 1000);
  const ccompCalcPf = ccompCalcF * 1e12;
  const ccompStd = findNearestESeries(
    inputs.compInputMode === 'manual' && inputs.ccompPf > 0 ? inputs.ccompPf : ccompCalcPf,
    'E24'
  );

  const rcompComp: StandardComponent = {
    theoretical: Number(rcompCalcKohm.toFixed(1)),
    nominal: rcompStd.nominal,
    unit: 'kΩ',
    formatted: `${rcompStd.nominal} kΩ`,
    series: 'E96',
    errorPercent: rcompStd.errorPercent,
    packageRecommendation: '0603 1% (COMP вывод 21 к Ccomp)',
  };

  const ccompComp: StandardComponent = {
    theoretical: Number(ccompCalcPf.toFixed(0)),
    nominal: ccompStd.nominal,
    unit: 'pF',
    formatted: `${ccompStd.nominal} pF`,
    series: 'E24',
    errorPercent: ccompStd.errorPercent,
    packageRecommendation: '0603 C0G/NP0 (после Rcomp к AGND)',
  };

  const rlimCalcKohm = chip.klim / iValley;
  const rlimStd = findNearestESeries(rlimCalcKohm, 'E96');
  const ilimNominalA = Number((chip.klim / rlimStd.nominal).toFixed(1));

  const rlimComp: StandardComponent = {
    theoretical: Number(rlimCalcKohm.toFixed(1)),
    nominal: rlimStd.nominal,
    unit: 'kΩ',
    formatted: `${rlimStd.nominal} kΩ`,
    series: 'E96',
    errorPercent: rlimStd.errorPercent,
    packageRecommendation: '0603 1% (ILIMIT вывод 25 к AGND)',
  };

  const cssCalcF = (SIC46X_LIMITS.ISS_UA * 1e-6 * (tssMs * 1e-3)) / SIC46X_LIMITS.VREF;
  const cssCalcNf = cssCalcF * 1e9;
  const cssStd = findNearestESeries(
    inputs.softStartInputMode === 'capacitor' && inputs.cssNf > 0 ? inputs.cssNf : cssCalcNf,
    'E24'
  );
  const actualTssMs = Number(((cssStd.nominal * 1e-9 * SIC46X_LIMITS.VREF) / (SIC46X_LIMITS.ISS_UA * 1e-6) * 1000).toFixed(2));

  const cssComponent: StandardComponent = {
    theoretical: Number(cssCalcNf.toFixed(2)),
    nominal: cssStd.nominal,
    unit: 'nF',
    formatted: `${cssStd.nominal} nF`,
    series: 'E24',
    errorPercent: cssStd.errorPercent,
    voltageRating: '≥ 16V',
    packageRecommendation: '0603 X7R (SS вывод 19 к AGND)',
  };

  const rfbBottomValK = rfb2Kohm || 10.0;
  const rfbTopCalcK = rfbBottomValK * (vout / SIC46X_LIMITS.VREF - 1);
  const rfbTopStd = findNearestESeries(
    inputs.voutInputMode === 'resistors' && inputs.rfb1Kohm > 0 ? inputs.rfb1Kohm : rfbTopCalcK,
    'E96'
  );

  const rfbBottomComp: StandardComponent = {
    theoretical: rfbBottomValK,
    nominal: rfbBottomValK,
    unit: 'kΩ',
    formatted: `${rfbBottomValK} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% (VFB вывод 22 к AGND)',
  };

  const rfbTopComp: StandardComponent = {
    theoretical: Number(rfbTopCalcK.toFixed(2)),
    nominal: rfbTopStd.nominal,
    unit: 'kΩ',
    formatted: `${rfbTopStd.nominal} kΩ`,
    series: 'E96',
    errorPercent: rfbTopStd.errorPercent,
    packageRecommendation: '0603 1% (VOUT к VFB вывод 22)',
  };

  const voutActual = Number((SIC46X_LIMITS.VREF * (1 + rfbTopStd.nominal / rfbBottomComp.nominal)).toFixed(3));
  const voutErrorPercent = Number((((voutActual - vout) / vout) * 100).toFixed(2));

  const renBottomK = inputs.ren2Kohm > 0 ? inputs.ren2Kohm : 10.0;
  const renTopCalcK = renBottomK * (vinStartUvlo / SIC46X_LIMITS.VEN_RISING - 1);
  const renTopStd = findNearestESeries(
    inputs.uvloInputMode === 'resistors' && inputs.ren1Kohm > 0 ? inputs.ren1Kohm : renTopCalcK,
    'E96'
  );

  const isManualUvloResistors = inputs.uvloInputMode === 'resistors';
  const renTopNom = isManualUvloResistors && inputs.ren1Kohm > 0 ? inputs.ren1Kohm : renTopStd.nominal;
  const renBottomNom = isManualUvloResistors && inputs.ren2Kohm > 0 ? inputs.ren2Kohm : renBottomK;

  const actualVinStart = Number((SIC46X_LIMITS.VEN_RISING * (1 + renTopNom / renBottomNom)).toFixed(2));
  const actualVinStop = Number((SIC46X_LIMITS.VEN_FALLING * (1 + renTopNom / renBottomNom)).toFixed(2));

  const renTopComp: StandardComponent = {
    theoretical: Number(renTopCalcK.toFixed(2)),
    nominal: renTopNom,
    unit: 'kΩ',
    formatted: `${renTopNom} kΩ`,
    series: 'E96',
    errorPercent: isManualUvloResistors ? 0 : renTopStd.errorPercent,
    voltageRating: `≥ ${Math.ceil(vinMax)} V`,
    packageRecommendation: '0805 / 0603 1% (VIN к EN вывод 3)',
  };

  const renBottomComp: StandardComponent = {
    theoretical: renBottomNom,
    nominal: renBottomNom,
    unit: 'kΩ',
    formatted: `${renBottomNom} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% (EN вывод 3 к AGND)',
  };

  const rbootVal = inputs.bootInputMode === 'custom' && inputs.rbootOhm > 0 ? inputs.rbootOhm : chip.rBootMinOhm;
  const cbootVal = inputs.bootInputMode === 'custom' && inputs.cbootNf > 0 ? inputs.cbootNf : 100;

  const cbootComp: StandardComponent = {
    theoretical: cbootVal,
    nominal: cbootVal,
    unit: 'nF',
    formatted: `${cbootVal} nF (0.1 µF)`,
    series: 'E12',
    errorPercent: 0,
    voltageRating: '≥ 25V',
    packageRecommendation: '0603 X7R от BOOT (вывод 4) к RBOOT',
  };

  const rbootComp: StandardComponent = {
    theoretical: rbootVal,
    nominal: rbootVal,
    unit: 'Ω',
    formatted: `${rbootVal} Ω`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 между CBOOT и PHASE1/2 (выводы 5, 6)',
  };

  const cvdrvComp: StandardComponent = {
    theoretical: 4.7,
    nominal: inputs.cvdrvUf || 4.7,
    unit: 'µF',
    formatted: `${inputs.cvdrvUf || 4.7} µF`,
    series: 'E12',
    errorPercent: 0,
    voltageRating: '≥ 10V',
    packageRecommendation: '0805 X7R (VDRV вывод 16 к PGND)',
  };

  const isExternalVdrv = detectedMode === 3 || detectedMode === 4;
  const vdrvSupplySource = isExternalVdrv
    ? 'Внешний источник 5.0В (внутренний LDO отключен для макс. КПД)'
    : 'Внутренний регулятор LDO 5.0В';

  const igateA = 40e-9 * fsw;
  const vdrvPowerLossW = isExternalVdrv ? 0 : Number(((vinNom - 5.0) * igateA).toFixed(3));

  const cvcinComp: StandardComponent = {
    theoretical: 0.1,
    nominal: inputs.cvcinUf || 0.1,
    unit: 'µF',
    formatted: '0.1 µF (100 nF)',
    series: 'E12',
    errorPercent: 0,
    voltageRating: `≥ ${Math.ceil(vinMax * 1.35)} V`,
    packageRecommendation: '0603 X7R (VCIN вывод 1 к AGND)',
  };

  const rvcinComp: StandardComponent = {
    theoretical: 0,
    nominal: inputs.rvcinOhm || 0,
    unit: 'Ω',
    formatted: `${inputs.rvcinOhm || 0} Ω`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 фильтр между VIN и VCIN (вывод 1)',
  };

  const cddComp: StandardComponent = {
    theoretical: 1.0,
    nominal: inputs.cvddUf || 1.0,
    unit: 'µF',
    formatted: `${inputs.cvddUf || 1.0} µF`,
    series: 'E12',
    errorPercent: 0,
    voltageRating: '≥ 10V',
    packageRecommendation: '0603 X7R (VDD вывод 26 к AGND)',
  };

  const rpgoodComp: StandardComponent = {
    theoretical: 102,
    nominal: inputs.rpgoodKohm || 102,
    unit: 'kΩ',
    formatted: `${inputs.rpgoodKohm || 102} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 подтяжка PGOOD (вывод 2) к VDD',
  };

  const ruSonicComp: StandardComponent = {
    theoretical: 0,
    nominal: 0,
    unit: 'Ω',
    formatted: ultrasonicEnabled ? '0 Ω (к VDD)' : 'Open (Float / AGND)',
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: ultrasonicEnabled ? '0603 перемычка к VDD' : 'Не устанавливать (Float)',
  };

  const rHighOhm = SIC46X_LIMITS.RDS_ON_HIGH_MOHM * 1e-3;
  const rLowOhm = SIC46X_LIMITS.RDS_ON_LOW_MOHM * 1e-3;
  const conductionLossW = Math.pow(iRms, 2) * (dutyNom * rHighOhm + (1 - dutyNom) * rLowOhm);
  const switchingLossW = 0.5 * vinNom * ioutMax * 20e-9 * fsw;
  const inductorDcrOhm = 0.005;
  const inductorDcrLossW = Math.pow(iRms, 2) * inductorDcrOhm;
  const quiescentLossW = 0.15;
  const totalLossW = conductionLossW + switchingLossW + inductorDcrLossW + quiescentLossW + vdrvPowerLossW;
  const pOutW = vout * ioutMax;
  const estimatedEfficiency = Number(((pOutW / (pOutW + totalLossW)) * 100).toFixed(1));

  return {
    chipModel: inputs.chipModel || 'SiC461',
    maxRatedCurrentA: chip.maxCurrentA,
    dutyNom: Number(dutyNom.toFixed(3)),
    dutyMin: Number(dutyMin.toFixed(3)),
    dutyMax: Number(dutyMax.toFixed(3)),
    tonNs: Number(tonNs.toFixed(1)),
    toffNs: Number(toffNs.toFixed(1)),
    tonMinWarning,
    toffMinWarning,
    deltaIL: Number(actualDeltaIL.toFixed(2)),
    lCalcUh: Number(lCalcUh.toFixed(2)),
    lNominal: lComponent,
    actualDeltaIL: Number(actualDeltaIL.toFixed(2)),
    actualKind: Number(actualKind.toFixed(2)),
    iPeak: Number(iPeak.toFixed(2)),
    iValley: Number(iValley.toFixed(2)),
    iRms: Number(iRms.toFixed(2)),
    coutRippleMinUf: Number(coutRippleMinUf.toFixed(1)),
    coutTransientMinUf: Number(coutTransientMinUf.toFixed(1)),
    coutEffectiveMinUf: Number(coutEffectiveMinUf.toFixed(1)),
    coutRecommendedUf: coutComponent,
    coutQty,
    coutSingleUf: singleCoutUf,
    actualRippleMv: Number(actualRippleMv.toFixed(1)),
    cinRmsA: Number(cinRmsA.toFixed(2)),
    cinMinUf: Number(cinMinUf.toFixed(1)),
    cinRecommendedUf: cinComponent,
    cinQty,
    cinSingleUf: singleCinUf,
    vref: SIC46X_LIMITS.VREF,
    rfbBottom: rfbBottomComp,
    rfbTop: rfbTopComp,
    voutActual,
    voutErrorPercent,
    rfswKohm: rfswComponent,
    actualFswKhz,
    rmodeKohm: rmodeComponent,
    modeDescription: modeDesc,
    detectedMode,
    rxKohm: rxComp,
    cxNf: cxComp,
    cyNf: cyComp,
    vrampMv: vrampNomMv,
    vrampMinMv,
    vrampMaxMv, // <-- ДОБАВЛЕНО
    vrampWarning,
    rcompKohm: rcompComp,
    ccompPf: ccompComp,
    crossoverFreqKhz,
    lcPoleFreqKhz,
    cssNf: cssComponent,
    actualTssMs,
    klimValue: chip.klim,
    rlimKohm: rlimComp,
    ilimNominalA,
    renTopKohm: renTopComp,
    renBottomKohm: renBottomComp,
    actualVinStart,
    actualVinStop,
    cbootNf: cbootComp,
    rbootOhm: rbootComp,
    cvdrvUf: cvdrvComp,
    vdrvSupplySource,
    vdrvPowerLossW,
    cvcinUf: cvcinComp,
    rvcinOhm: rvcinComp,
    cddUf: cddComp,
    rpgoodKohm: rpgoodComp,
    ruSonicOhm: ruSonicComp,
    estimatedEfficiency,
    estimatedPowerLossW: Number(totalLossW.toFixed(2)),
    conductionLossW: Number(conductionLossW.toFixed(2)),
    switchingLossW: Number(switchingLossW.toFixed(2)),
    inductorDcrLossW: Number(inductorDcrLossW.toFixed(2)),
    warnings,
  };
}

export function generateBomList(inputs: CalculatorInputs, results: CalculatorResults): BomItem[] {
  const chip = CHIP_DATA[inputs.chipModel || 'SiC461'];

  return [
    { id: 'U1', designator: 'U1', pinNumber: 'Пины 1-27', description: `Синхронный понижающий DC-DC регулятор Vishay ${inputs.chipModel}`, category: 'IC', nominalValue: chip.marking, calculatedValue: `${inputs.chipModel} (${chip.maxCurrentA}A, 4.5V-60V)`, tolerance: '—', minRating: 'Vin = 60V, Tj = -40..+125°C', recommendedFootprint: 'PowerPAK MLP55-27L (5×5 мм)', notes: chip.description },
    { id: 'L1', designator: 'L1', pinNumber: 'Пины 7, 8, 9, 10 (SW)', description: 'Силовой экранированный дроссель индуктивности', category: 'Inductor', nominalValue: `${results.lNominal.nominal} µH`, calculatedValue: `${results.lCalcUh} µH`, tolerance: '±20%', minRating: results.lNominal.currentRating || '—', recommendedFootprint: 'SMD Vishay IHLP-5050 / IHLP-4040', notes: `Низкое DCR (< 10 мОм). Пульсации тока ΔIL = ${results.actualDeltaIL} A.` },
    { id: 'COUT', designator: `C_OUT (x${results.coutQty})`, pinNumber: 'VOUT к PGND (Пины 11-15)', description: 'Выходная батарея сглаживающих керамических конденсаторов', category: 'Capacitor', nominalValue: `${results.coutQty} × ${results.coutSingleUf} µF (${results.coutQty * results.coutSingleUf} µF)`, calculatedValue: `Ceff ≥ ${results.coutEffectiveMinUf} µF`, tolerance: '±10% / ±20%', minRating: results.coutRecommendedUf.voltageRating || '≥ 16V', recommendedFootprint: 'SMD 1210 / 1206 MLCC X7R', notes: `Учтено 35-40% падение емкости под DC смещением. Пульсации: ~${results.actualRippleMv} мВ.` },
    { id: 'CIN', designator: `C_IN (x${results.cinQty})`, pinNumber: 'VIN к PGND (Пины 11-15)', description: 'Входная батарея фильтрующих конденсаторов', category: 'Capacitor', nominalValue: `${results.cinQty} × ${results.cinSingleUf} µF`, calculatedValue: `${results.cinMinUf} µF`, tolerance: '±10% / ±20%', minRating: results.cinRecommendedUf.voltageRating || '≥ 50V', recommendedFootprint: 'SMD 1210 MLCC X7R', notes: `Устанавливать максимально близко к выводам VIN и PGND. RMS ток: ${results.cinRmsA} A.` },
    { id: 'R_FSW', designator: 'R_FSW', pinNumber: 'Пин 24 (fSW)', description: 'Резистор задания рабочей частоты переключения', category: 'Resistor', nominalValue: `${results.rfswKohm.nominal} kΩ`, calculatedValue: `${results.rfswKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/16 W, 50V', recommendedFootprint: 'SMD 0603', notes: `Задает fsw = ${results.actualFswKhz} кГц (формула Rfsw = Vout / (fsw · 1.9e-10)).` },
    { id: 'R_MODE', designator: 'R_MODE', pinNumber: 'Пин 27 (MODE)', description: 'Резистор выбора конфигурации и режима работы', category: 'Resistor', nominalValue: `${results.rmodeKohm.nominal} kΩ`, calculatedValue: `${results.rmodeKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/16 W, 50V', recommendedFootprint: 'SMD 0603', notes: results.modeDescription },
    { id: 'R_BOOT', designator: 'R_BOOT', pinNumber: 'Пины 5, 6 (PHASE1, PHASE2) к BOOT', description: 'Резистор демпфирования фронтов dV/dt бутстрепа', category: 'Resistor', nominalValue: `${results.rbootOhm.nominal} Ω`, calculatedValue: `${results.rbootOhm.theoretical} Ω`, tolerance: '±5%', minRating: '1/10 W', recommendedFootprint: 'SMD 0603', notes: 'Ограничивает звон и EMI узла SW, защищает цепь питания верхнего ключа.' },
    { id: 'C_BOOT', designator: 'C_BOOT', pinNumber: 'Пин 4 (BOOT)', description: 'Керамический конденсатор бутстрепного питания', category: 'Capacitor', nominalValue: `${results.cbootNf.nominal} nF`, calculatedValue: '100 nF', tolerance: '±10%', minRating: '≥ 25V X7R', recommendedFootprint: 'SMD 0603', notes: 'Включается последовательно с R_BOOT между выводами BOOT и PHASE1/2.' },
    { id: 'C_VDRV', designator: 'C_VDRV', pinNumber: 'Пин 16 (VDRV)', description: 'Блокировочный конденсатор питания драйверов затворов', category: 'Capacitor', nominalValue: `${results.cvdrvUf.nominal} µF`, calculatedValue: '4.7 µF', tolerance: '±10%', minRating: '≥ 10V X7R', recommendedFootprint: 'SMD 0805', notes: `${results.vdrvSupplySource}. Монтировать прямо у вывода 16 и PGND.` },
    { id: 'R_FB1', designator: 'R_FB1 (R_FB_H)', pinNumber: 'Пин 22 (VFB)', description: 'Верхний резистор делителя цепи обратной связи', category: 'Resistor', nominalValue: `${results.rfbTop.nominal} kΩ`, calculatedValue: `${results.rfbTop.theoretical} kΩ`, tolerance: '±1% (E96)', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: `Фактический Vout = ${results.voutActual} В (погрешность ${results.voutErrorPercent > 0 ? '+' : ''}${results.voutErrorPercent}%).` },
    { id: 'R_FB2', designator: 'R_FB2 (R_FB_L)', pinNumber: 'Пин 22 (VFB)', description: 'Нижний резистор делителя цепи обратной связи к AGND', category: 'Resistor', nominalValue: `${results.rfbBottom.nominal} kΩ`, calculatedValue: `${results.rfbBottom.theoretical} kΩ`, tolerance: '±1% (E96)', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: 'Подключается к аналоговой земле AGND (вывод 17/23).' },
    { id: 'R_COMP', designator: 'R_COMP', pinNumber: 'Пин 21 (COMP)', description: 'Резистор частотной коррекции петли транскондуктивного ОУ', category: 'Resistor', nominalValue: `${results.rcompKohm.nominal} kΩ`, calculatedValue: `${results.rcompKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: `Задает полосу среза контура fc ≈ ${results.crossoverFreqKhz} кГц (gm = 300 µS).` },
    { id: 'C_COMP', designator: 'C_COMP', pinNumber: 'Пин 21 (COMP)', description: 'Конденсатор интегратора петли компенсации', category: 'Capacitor', nominalValue: `${results.ccompPf.nominal} pF`, calculatedValue: `${results.ccompPf.theoretical} pF`, tolerance: '±5%', minRating: '≥ 25V C0G / NP0', recommendedFootprint: 'SMD 0603', notes: 'Последовательно с R_COMP на AGND. Компенсирует полюс выходного LC фильтра.' },
    { id: 'R_X', designator: 'R_X', pinNumber: 'Цепь SW / пилы', description: 'Резистор цепи инжекции пилообразного напряжения', category: 'Resistor', nominalValue: `${results.rxKohm.nominal} kΩ`, calculatedValue: `${results.rxKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/10 W (0603), Pdiss ≤ 25 мВт', recommendedFootprint: 'SMD 0603', notes: `Формирует наклон пилы для устойчивости COT. Vramp = ${results.vrampMinMv}..${results.vrampMaxMv} мВ (норма: 100–900 мВ).` },
    { id: 'C_X', designator: 'C_X', pinNumber: 'Цепь VOUT', description: 'Интегрирующий конденсатор цепи инжекции пилы', category: 'Capacitor', nominalValue: `${results.cxNf.nominal} nF`, calculatedValue: `${results.cxNf.theoretical} nF`, tolerance: '±10%', minRating: '≥ 25V X7R', recommendedFootprint: 'SMD 0603', notes: 'Подключается между узлом пилы и шиной VOUT.' },
    { id: 'C_Y', designator: 'C_Y', pinNumber: 'Пин 20 (VSNS)', description: 'Конденсатор связи цепи инжекции пилообразного напряжения', category: 'Capacitor', nominalValue: `${results.cyNf.nominal} nF`, calculatedValue: `${results.cyNf.theoretical} nF`, tolerance: '±10%', minRating: '≥ 50V C0G / X7R', recommendedFootprint: 'SMD 0603', notes: 'Подключается непосредственно к выводу 20 (VSNS) микросхемы для развязки по постоянному току.' },
    { id: 'C_SS', designator: 'C_SS', pinNumber: 'Пин 19 (SS)', description: 'Конденсатор программирования времени софт-старта', category: 'Capacitor', nominalValue: `${results.cssNf.nominal} nF`, calculatedValue: `${results.cssNf.theoretical} nF`, tolerance: '±10%', minRating: '≥ 16V X7R', recommendedFootprint: 'SMD 0603', notes: `Ток заряда 5 мкА. Время плавного старта Tss = ${results.actualTssMs} мс.` },
    { id: 'R_LIM', designator: 'R_LIM', pinNumber: 'Пин 25 (ILIMIT)', description: 'Резистор программирования токового предела', category: 'Resistor', nominalValue: `${results.rlimKohm.nominal} kΩ`, calculatedValue: `${results.rlimKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: `Устанавливает порог защиты нижнего ключа Ivalley ≈ ${results.ilimNominalA} А (Klim = ${results.klimValue}k).` },
    { id: 'R_EN1', designator: 'R_EN1 (R_EN_H)', pinNumber: 'Пин 3 (EN)', description: 'Верхний резистор делителя UVLO от шины VIN', category: 'Resistor', nominalValue: `${results.renTopKohm.nominal} kΩ`, calculatedValue: `${results.renTopKohm.theoretical} kΩ`, tolerance: '±1%', minRating: `≥ ${Math.ceil(inputs.vinMax)} V (0805)`, recommendedFootprint: 'SMD 0805', notes: `Порог включения Vin_start = ${results.actualVinStart} В.` },
    { id: 'R_EN2', designator: 'R_EN2 (R_EN_L)', pinNumber: 'Пин 3 (EN)', description: 'Нижний резистор делителя UVLO к AGND', category: 'Resistor', nominalValue: `${results.renBottomKohm.nominal} kΩ`, calculatedValue: `${results.renBottomKohm.theoretical} kΩ`, tolerance: '±1%', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: `Порог отключения Vin_stop = ${results.actualVinStop} В (гистерезис 150 мВ на EN).` },
    { id: 'C_VCIN', designator: 'C_VCIN', pinNumber: 'Пин 1 (VCIN)', description: 'Развязывающий конденсатор питания внутренней схемы', category: 'Capacitor', nominalValue: `${results.cvcinUf.nominal} µF`, calculatedValue: '0.1 µF', tolerance: '±10%', minRating: `≥ ${Math.ceil(inputs.vinMax * 1.35)} V`, recommendedFootprint: 'SMD 0603 X7R', notes: 'Устанавливать вплотную к выводу VCIN (1) и AGND.' },
    { id: 'R_VCIN', designator: 'R_VCIN', pinNumber: 'Пин 1 (VCIN)', description: 'Резистор фильтра питания микросхемы от VIN', category: 'Resistor', nominalValue: `${results.rvcinOhm.nominal} Ω`, calculatedValue: '0 Ω (до 2.2 Ω)', tolerance: '±5%', minRating: '1/10 W', recommendedFootprint: 'SMD 0603', notes: 'Перемычка 0 Ом или RC фильтр 2.2 Ом + 0.1 µF.' },
    { id: 'C_VDD', designator: 'C_VDD', pinNumber: 'Пин 26 (VDD)', description: 'Конденсатор внутреннего стабилизатора VDD (5.0V)', category: 'Capacitor', nominalValue: `${results.cddUf.nominal} µF`, calculatedValue: '1.0 µF', tolerance: '±10%', minRating: '≥ 10V X7R', recommendedFootprint: 'SMD 0603', notes: 'Стабилизирует внутреннюю шину смещения логики.' },
    { id: 'R_PGOOD', designator: 'R_PGOOD', pinNumber: 'Пин 2 (PGOOD)', description: 'Подтягивающий резистор статуса Power Good', category: 'Resistor', nominalValue: `${results.rpgoodKohm.nominal} kΩ`, calculatedValue: '102 kΩ', tolerance: '±5%', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: 'Выход открытый сток. Подтягивается к VDD или внешней шине 3.3В / 5В.' },
    { id: 'R_USONIC', designator: 'R_USONIC', pinNumber: 'Пин 18 (ULTRASONIC)', description: 'Конфигурация ультразвукового режима ограничения частоты', category: 'Resistor', nominalValue: results.ruSonicOhm.nominal === 0 && inputs.ultrasonicEnabled ? '0 Ω' : 'Open', calculatedValue: inputs.ultrasonicEnabled ? '0 Ω к VDD' : 'Open', tolerance: '—', minRating: '1/16 W', recommendedFootprint: 'SMD 0603', notes: inputs.ultrasonicEnabled ? 'Подключен к VDD: частота холостого хода ограничена снизу > 25 кГц для исключения акустического шума.' : 'Не монтируется: стандартный режим PSM с максимальным КПД на малых нагрузках.' },
  ];
}