import {
  CalculatorInputs,
  CalculatorResults,
  BomItem,
  StandardComponent,
  ChipModel,
  LightLoadMode,
  SwitchingFreqOption,
} from '../types/calculator';
import {
  findNearestESeries,
  findCeilESeries,
} from './eSeries';

export const CHIP_LIMITS = {
  MPQ8626GD: {
    name: 'MPQ8626GD',
    manufacturer: 'Monolithic Power Systems (MPS)',
    package: 'QFN-14 (2mm × 3mm)',
    marking: 'AWR YWW LLL',
    vinMinInternal: 4.0,
    vinMinExtBias: 2.85,
    vinMax: 16.0,
    voutMin: 0.60,
    voutMax: 6.0,
    maxDuty: 0.90,
    vref: 0.600,
    vrefTolerancePct: 0.5,
    maxCurrentA: 6.0,
    maxIocA: 8.0,
    maxPeakInductorA: 10.0,
    vccVoltage: 3.00,
    internalTssMs: 2.2,
    issChargeUa: 10.0,
    minCrefNf: 3.3,
    rdsOnHsMohm: 22.6,
    rdsOnLsMohm: 8.1,
    tonMinNs: 50,
    toffMinNs: 180,
    vocp: 1.20,
    gcsUaPerA: 40.0, // 40 µA / A
    venRising: 1.22,
    venHyst: 0.20,
    venMax: 3.60,
    dischargeResistorOhm: 80,
  },
  IS6605A: {
    name: 'IS6605A',
    manufacturer: 'Innovision Semiconductor',
    package: 'QFN-14 (2mm × 3mm)',
    marking: '6605A XXXXX YYWW',
    vinMinInternal: 4.0,
    vinMinExtBias: 2.85,
    vinMax: 16.0,
    voutMin: 0.60,
    voutMax: 5.5,
    maxDuty: 0.90,
    vref: 0.600,
    vrefTolerancePct: 0.5,
    maxCurrentA: 6.0,
    maxIocA: 8.0,
    maxPeakInductorA: 10.0,
    vccVoltage: 3.30,
    internalTssMs: 1.4,
    issChargeUa: 12.0,
    minCrefNf: 22.0,
    rdsOnHsMohm: 22.5,
    rdsOnLsMohm: 8.5,
    tonMinNs: 40,
    toffMinNs: 100,
    vocp: 1.20,
    gcsUaPerA: 40.0,
    venRising: 1.22,
    venHyst: 0.20,
    venMax: 3.60,
    dischargeResistorOhm: 110,
  },
};

// MODE Pin Table from MPQ8626 & IS6605A Datasheets
export interface ModeConfiguration {
  lightLoadMode: LightLoadMode;
  fswKhz: SwitchingFreqOption;
  pinConnection: string;
  resistorKohm: number; // 0 means tied directly to AGND or VCC
  isTiedToVcc: boolean;
  isTiedToAgnd: boolean;
  description: string;
}

export const MODE_CONFIG_TABLE: ModeConfiguration[] = [
  {
    lightLoadMode: 'FCCM',
    fswKhz: 1100,
    pinConnection: 'MODE к AGND (0 Ω)',
    resistorKohm: 0,
    isTiedToVcc: false,
    isTiedToAgnd: true,
    description: 'Forced CCM, частота 1100 кГц (1.1 МГц), прямое подключение к AGND',
  },
  {
    lightLoadMode: 'FCCM',
    fswKhz: 2000,
    pinConnection: '30.1 kΩ к AGND',
    resistorKohm: 30.1,
    isTiedToVcc: false,
    isTiedToAgnd: false,
    description: 'Forced CCM, частота 2000 кГц (2.0 МГц), резистор 30.1 кОм 1% на AGND',
  },
  {
    lightLoadMode: 'FCCM',
    fswKhz: 600,
    pinConnection: '60.4 kΩ к AGND',
    resistorKohm: 60.4,
    isTiedToVcc: false,
    isTiedToAgnd: false,
    description: 'Forced CCM, частота 600 кГц, резистор 60.4 кОм 1% на AGND',
  },
  {
    lightLoadMode: 'PulseSkip',
    fswKhz: 600,
    pinConnection: '121 kΩ к AGND',
    resistorKohm: 121.0,
    isTiedToVcc: false,
    isTiedToAgnd: false,
    description: 'Pulse Skip (PSM), частота 600 кГц, резистор 121 кОм 1% на AGND',
  },
  {
    lightLoadMode: 'PulseSkip',
    fswKhz: 2000,
    pinConnection: '243 kΩ к AGND',
    resistorKohm: 243.0,
    isTiedToVcc: false,
    isTiedToAgnd: false,
    description: 'Pulse Skip (PSM), частота 2000 кГц (2.0 МГц), резистор 243 кОм 1% на AGND',
  },
  {
    lightLoadMode: 'PulseSkip',
    fswKhz: 1100,
    pinConnection: 'MODE к VCC (3V/3.3V)',
    resistorKohm: 0,
    isTiedToVcc: true,
    isTiedToAgnd: false,
    description: 'Pulse Skip (PSM), частота 1100 кГц (1.1 МГц), прямое подключение к VCC',
  },
];

// Table 2 (Current Limit Threshold vs RCS in kΩ) from MPQ8626 datasheet page 15
export const RCS_TABLE_2 = [
  { ilimDc: 8.0, rcsKohm: 3.83 },
  { ilimDc: 7.5, rcsKohm: 4.02 },
  { ilimDc: 7.0, rcsKohm: 4.32 },
  { ilimDc: 6.5, rcsKohm: 4.64 },
  { ilimDc: 6.0, rcsKohm: 4.87 },
  { ilimDc: 5.5, rcsKohm: 5.49 },
  { ilimDc: 5.0, rcsKohm: 5.90 },
  { ilimDc: 4.5, rcsKohm: 6.49 },
  { ilimDc: 4.0, rcsKohm: 7.15 },
];

export function calculateMPQ8626(inputs: CalculatorInputs): CalculatorResults {
  const warnings: string[] = [];
  const chipKey = inputs.chipModel || 'MPQ8626GD';
  const chip = CHIP_LIMITS[chipKey];

  const {
    vinNom,
    vinMin,
    vinMax,
    vout,
    ioutMax,
    kind,
    voutRippleMaxMv,
    loadStepA,
    voltageOvershootMv,
    tssMs,
    vinStartUvlo,
    ilimTargetA,
    targetFzKhz,
    vccBiasMode,
    lightLoadMode,
    fswKhz,
    r1Kohm,
    r2Kohm,
    rupKohm,
    rdownKohm,
    rcsKohm,
    rmodeKohm,
    cffPf,
    crefNf,
    rbootOhm,
    cbootNf,
    cvccUf,
    rpgoodKohm,
    rpgFilterOhm,
    cpgFilterNf,
    colNf,
  } = inputs;

  // 1. Boundary & Design Rule Checks
  const minVinThreshold = vccBiasMode === 'external_3v3' ? chip.vinMinExtBias : chip.vinMinInternal;
  if (vinMin < minVinThreshold) {
    warnings.push(
      `Входное напряжение ${vinMin}В ниже порога запуска ${chip.name} (${minVinThreshold}В для ${
        vccBiasMode === 'external_3v3' ? 'внешнего смещения 3.3В' : 'внутреннего LDO'
      }).`
    );
  }
  if (vinMax > chip.vinMax) {
    warnings.push(`Входное напряжение ${vinMax}В превышает абсолютный максимум ${chip.vinMax}В.`);
  }
  if (vout < chip.voutMin) {
    warnings.push(`Выходное напряжение ${vout}В не может быть ниже опорного напряжения Vref (${chip.vref}В).`);
  }
  if (vout > chip.voutMax) {
    warnings.push(`Выходное напряжение ${vout}В превышает максимум для ${chip.name} (${chip.voutMax}В).`);
  }
  if (ioutMax > chip.maxCurrentA) {
    warnings.push(`Ток нагрузки ${ioutMax}А превышает паспортный номинал ${chip.name} (${chip.maxCurrentA}А).`);
  }

  // 2. Frequency & Mode Pin Determination
  let activeFswKhz = fswKhz;
  let activeLightLoadMode = lightLoadMode;
  let activeModeConfig: ModeConfiguration;

  if (inputs.modeInputMode === 'resistor') {
    // Mode resistor manual input
    const r = rmodeKohm;
    if (r <= 5) {
      activeModeConfig = MODE_CONFIG_TABLE[0]; // AGND -> FCCM 1100 kHz
    } else if (r <= 45) {
      activeModeConfig = MODE_CONFIG_TABLE[1]; // 30.1k -> FCCM 2000 kHz
    } else if (r <= 90) {
      activeModeConfig = MODE_CONFIG_TABLE[2]; // 60.4k -> FCCM 600 kHz
    } else if (r <= 180) {
      activeModeConfig = MODE_CONFIG_TABLE[3]; // 121k -> Pulse Skip 600 kHz
    } else if (r <= 350) {
      activeModeConfig = MODE_CONFIG_TABLE[4]; // 243k -> Pulse Skip 2000 kHz
    } else {
      activeModeConfig = MODE_CONFIG_TABLE[5]; // VCC -> Pulse Skip 1100 kHz
    }
    activeFswKhz = activeModeConfig.fswKhz;
    activeLightLoadMode = activeModeConfig.lightLoadMode;
  } else {
    // Target mode and frequency chosen
    const matched = MODE_CONFIG_TABLE.find(
      (m) => m.fswKhz === fswKhz && m.lightLoadMode === lightLoadMode
    );
    activeModeConfig = matched || MODE_CONFIG_TABLE[0];
    activeFswKhz = activeModeConfig.fswKhz;
    activeLightLoadMode = activeModeConfig.lightLoadMode;
  }

  const fsw = activeFswKhz * 1000; // Hz
  const tswNs = (1 / fsw) * 1e9;

  // 3. Duty Cycle & Switching Timing
  const estEfficiency = 0.92;
  const dutyNom = Math.min(chip.maxDuty, vout / (vinNom * estEfficiency));
  const dutyMin = Math.min(chip.maxDuty, vout / (vinMax * estEfficiency));
  const dutyMax = Math.min(chip.maxDuty, vout / (vinMin * estEfficiency));

  // Adaptive COT on-time: Ton = (Vout / Vin) * (1 / Fsw)
  const tonNs = (vout / (vinMax * fsw)) * 1e9;
  const toffNs = tswNs - tonNs;

  const tonMinWarning = tonNs < chip.tonMinNs;
  const toffMinWarning = toffNs < chip.toffMinNs;

  if (tonMinWarning) {
    warnings.push(
      `Время открытого состояния t_on (${tonNs.toFixed(1)} нс) меньше паспортного минимума ${chip.tonMinNs} нс при Vin_max=${vinMax}В. Рекомендуется снизить частоту fSW.`
    );
  }
  if (toffMinWarning) {
    warnings.push(
      `Время закрытого состояния t_off (${toffNs.toFixed(1)} нс) меньше паспортного минимума ${chip.toffMinNs} нс при Vin_min=${vinMin}В.`
    );
  }

  // 4. Inductor Selection (Datasheet Eq. 16: L = (Vout / (Fsw * ΔIL)) * (1 - Vout / VinMax))
  const targetKind = kind || 0.30;
  const targetDeltaIL = ioutMax * targetKind;
  const tonSecAtMaxVin = vout / (vinMax * fsw);
  const lCalcH = ((vinMax - vout) * tonSecAtMaxVin) / targetDeltaIL;
  const lCalcUh = lCalcH * 1e6;

  // Snap to standard E24 inductor value
  const lStandard = findNearestESeries(lCalcUh, 'E24');
  const lNominalUh = lStandard.nominal;
  const lNominalH = lNominalUh * 1e-6;

  // Recalculate actual ripple and currents with selected inductor
  const actualDeltaIL = ((vinMax - vout) * tonSecAtMaxVin) / lNominalH;
  const actualKind = actualDeltaIL / ioutMax;
  const iPeak = ioutMax + actualDeltaIL / 2;
  const iValley = Math.max(0, ioutMax - actualDeltaIL / 2);
  const iRms = Math.sqrt(Math.pow(ioutMax, 2) + Math.pow(actualDeltaIL, 2) / 12);

  if (iPeak > chip.maxPeakInductorA) {
    warnings.push(
      `Пиковый ток индуктора (${iPeak.toFixed(1)} А) превышает максимальный допустимый порог ${chip.name} (${chip.maxPeakInductorA} А).`
    );
  }

  const lComponent: StandardComponent = {
    theoretical: Number(lCalcUh.toFixed(2)),
    nominal: lNominalUh,
    unit: 'µH',
    formatted: `${lNominalUh} µH`,
    series: 'E24',
    errorPercent: lStandard.errorPercent,
    currentRating: `Isat ≥ ${(iPeak * 1.3).toFixed(1)} A, Irms ≥ ${(iRms * 1.2).toFixed(1)} A`,
    packageRecommendation: 'Экранированный силовой SMD индуктор (DCR < 8 мОм)',
  };

  // 5. Output Capacitor Selection (Datasheet Eqs. 13-15 and Stability)
  // a) Ripple requirement: Cout = ΔIL / (8 * Fsw * ΔVout)
  const voutRippleV = voutRippleMaxMv / 1000;
  const coutRippleMinF = actualDeltaIL / (8 * fsw * voutRippleV);
  const coutRippleMinUf = coutRippleMinF * 1e6;

  // b) Transient undershoot/overshoot (load release): Cout = (L * ΔI^2) / (2 * ΔV * Vout)
  const vOvershootV = voltageOvershootMv / 1000;
  const coutTransientMinF = (lNominalH * Math.pow(loadStepA, 2)) / (2 * vout * vOvershootV);
  const coutTransientMinUf = coutTransientMinF * 1e6;

  // c) COT Small-Signal Stability (from IS6605A page 17):
  // Cout_min > (tON / 2) * (8 * tau / Lout) * (Vref / Vout), where tau ≈ 1 µs
  const tauSec = 1.0e-6; // 1 µs internal ramp compensation time constant
  const coutStabilityMinF = (tonSecAtMaxVin / 2) * ((8 * tauSec) / lNominalH) * (chip.vref / vout);
  const coutStabilityMinUf = coutStabilityMinF * 1e6;

  const coutEffectiveMinUf = Math.max(coutRippleMinUf, coutTransientMinUf, coutStabilityMinUf);
  // Ceramic DC Bias derating (~40-45% reduction at nominal voltage)
  const coutNominalTargetUf = coutEffectiveMinUf / 0.55;
  const coutStandard = findCeilESeries(coutNominalTargetUf, 'E24');

  let singleCoutUf = 22;
  if (coutStandard.nominal > 40) singleCoutUf = 22;
  if (coutStandard.nominal > 80) singleCoutUf = 47;
  const coutQty = Math.max(2, Math.ceil(coutStandard.nominal / singleCoutUf));
  const totalCoutActualUf = coutQty * singleCoutUf;

  const actualRippleMv = (actualDeltaIL / (8 * fsw * (totalCoutActualUf * 0.55 * 1e-6))) * 1000;

  const coutComponent: StandardComponent = {
    theoretical: Number(coutEffectiveMinUf.toFixed(1)),
    nominal: totalCoutActualUf,
    unit: 'µF',
    formatted: `${coutQty} × ${singleCoutUf} µF (${totalCoutActualUf} µF)`,
    series: 'E24',
    errorPercent: Number((((totalCoutActualUf - coutEffectiveMinUf) / coutEffectiveMinUf) * 100).toFixed(1)),
    voltageRating: `≥ ${Math.max(6.3, Math.ceil(vout * 1.5))} V`,
    packageRecommendation: 'Керамика MLCC X7R/X5R 1206 / 1210',
  };

  // 6. Input Capacitor Selection (Datasheet Eqs. 9-12)
  // Icin_rms = Iout * sqrt(D * (1 - D)), worst case at Vin = 2*Vout -> Iout / 2
  const cinRmsA = ioutMax * Math.sqrt(dutyNom * (1 - dutyNom));
  const deltaVinRippleTarget = Math.max(0.1, vinNom * 0.015);
  const cinMinF = (ioutMax * dutyNom * (1 - dutyNom)) / (fsw * deltaVinRippleTarget);
  const cinMinUf = cinMinF * 1e6;

  const cinTargetUf = cinMinUf / 0.50; // 50% derating for ceramic 25V at 12V-16V
  const cinStandard = findCeilESeries(cinTargetUf, 'E24');
  let singleCinUf = 22;
  const cinQty = Math.max(2, Math.ceil(cinStandard.nominal / singleCinUf));
  const totalCinUf = cinQty * singleCinUf;

  const cinComponent: StandardComponent = {
    theoretical: Number(cinMinUf.toFixed(1)),
    nominal: totalCinUf,
    unit: 'µF',
    formatted: `${cinQty} × ${singleCinUf} µF (${totalCinUf} µF) + 0.1 µF ВЧ`,
    series: 'E24',
    errorPercent: Number((((totalCinUf - cinMinUf) / cinMinUf) * 100).toFixed(1)),
    voltageRating: `≥ ${Math.ceil(vinMax * 1.35)} V (рекомендуется 25V)`,
    packageRecommendation: 'Керамика MLCC X7R 1210 / 1206',
  };

  // 7. Feedback Resistor Divider (FB Pin 6) & Feedforward Capacitor (Cff)
  // Vout = Vref * (1 + R1 / R2)  =>  R2 = R1 * Vref / (Vout - Vref)
  const isManualVoutResistors = inputs.voutInputMode === 'resistors';
  let r1Nom = r1Kohm || 4.02;
  let r2Nom = r2Kohm || 2.00;

  if (!isManualVoutResistors) {
    // Select standard R1 based on Vout level (typical values: 2k, 4.02k, 8.2k)
    if (vout <= 1.1) r1Nom = 2.0;
    else if (vout <= 2.0) r1Nom = 4.02;
    else r1Nom = 8.2;

    const r2TheoreticalK = (r1Nom * chip.vref) / (vout - chip.vref);
    const r2Std = findNearestESeries(r2TheoreticalK, 'E96');
    r2Nom = r2Std.nominal;
  }

  const voutActual = Number((chip.vref * (1 + r1Nom / r2Nom)).toFixed(3));
  const voutErrorPercent = Number((((voutActual - vout) / vout) * 100).toFixed(2));

  const r1Comp: StandardComponent = {
    theoretical: r1Nom,
    nominal: r1Nom,
    unit: 'kΩ',
    formatted: `${r1Nom} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% (VOUT к пину 6 FB)',
  };

  const r2TheoreticalCalc = (r1Nom * chip.vref) / (vout - chip.vref);
  const r2Comp: StandardComponent = {
    theoretical: Number(r2TheoreticalCalc.toFixed(2)),
    nominal: r2Nom,
    unit: 'kΩ',
    formatted: `${r2Nom} kΩ`,
    series: 'E96',
    errorPercent: Number((((r2Nom - r2TheoreticalCalc) / r2TheoreticalCalc) * 100).toFixed(2)),
    packageRecommendation: '0603 1% (пин 6 FB к AGND)',
  };

  // Feedforward Capacitor Cff (across R1): fz = 1 / (2 * pi * R1 * Cff)
  // Datasheet Eq. 6: zero located around 5 kHz to 40 kHz (typical ~15 kHz)
  const targetFz = targetFzKhz || 15.0;
  const cffCalcF = 1 / (2 * Math.PI * (r1Nom * 1000) * (targetFz * 1000));
  const cffCalcPf = cffCalcF * 1e12;

  const isManualCff = inputs.cffInputMode === 'capacitor';
  const cffStd = findNearestESeries(isManualCff && cffPf > 0 ? cffPf : cffCalcPf, 'E24');
  const actualFzKhz = Number((1 / (2 * Math.PI * (r1Nom * 1000) * (cffStd.nominal * 1e-12)) / 1000).toFixed(1));

  const cffComp: StandardComponent = {
    theoretical: Number(cffCalcPf.toFixed(0)),
    nominal: cffStd.nominal,
    unit: 'pF',
    formatted: `${cffStd.nominal} pF`,
    series: 'E24',
    errorPercent: cffStd.errorPercent,
    voltageRating: '≥ 16V C0G/NP0',
    packageRecommendation: '0603 C0G/NP0 параллельно R1 (улучшает фазовый запас COT)',
  };

  // 8. Current Limit Setting (CS Pin 4)
  // Equation 4: Rcs = VOCP / [ Gcs * (ILIM - ΔIL/2) ]
  // Table 2 gives calibrated low-current offset.
  let targetIlimDc = ilimTargetA || 6.0;
  if (targetIlimDc > chip.maxIocA) targetIlimDc = chip.maxIocA;

  let rcsTheoreticalKohm: number;
  let targetIvalley = targetIlimDc - actualDeltaIL / 2;
  if (targetIvalley <= 0) targetIvalley = 1.0;

  // Exact equation with Gcs = 40 µA/A and Vocp = 1.2V
  rcsTheoreticalKohm = chip.vocp / ((chip.gcsUaPerA * 1e-6) * targetIvalley * 1000);

  const isManualRcs = inputs.currentLimitInputMode === 'resistor';
  const rcsStd = findNearestESeries(isManualRcs && rcsKohm > 0 ? rcsKohm : rcsTheoreticalKohm, 'E96');
  const actualRcsNom = rcsStd.nominal;

  // Inverse calculation: Ivalley = Vocp / (Gcs * Rcs)
  const actualIlimValleyA = Number((chip.vocp / ((chip.gcsUaPerA * 1e-6) * (actualRcsNom * 1000))).toFixed(2));
  const actualIlimDcA = Number((actualIlimValleyA + actualDeltaIL / 2).toFixed(2));

  const rcsComp: StandardComponent = {
    theoretical: Number(rcsTheoreticalKohm.toFixed(2)),
    nominal: actualRcsNom,
    unit: 'kΩ',
    formatted: `${actualRcsNom} kΩ`,
    series: 'E96',
    errorPercent: rcsStd.errorPercent,
    packageRecommendation: '0603 1% (пин 4 CS к AGND)',
  };

  // 9. Soft Start (TRK/REF Pin 8)
  // MPQ8626: internal 2.2 ms. If tss > 2.2 ms: Cref(nF) = tss(ms) * 10 µA / 0.6V
  // IS6605A: internal 1.4 ms. If tss > 1.4 ms: Cref(nF) = tss(ms) * 12 µA / 0.6V
  let crefTheoreticalNf = chip.minCrefNf;
  const minInternalTss = chip.internalTssMs;

  if (tssMs > minInternalTss) {
    crefTheoreticalNf = (tssMs * (chip.issChargeUa * 1e-3)) / chip.vref;
  }

  const isManualCref = inputs.softStartInputMode === 'capacitor';
  const crefStd = findNearestESeries(isManualCref && crefNf > 0 ? crefNf : crefTheoreticalNf, 'E24');
  const actualCrefNom = crefStd.nominal;

  let actualTssMs: number;
  if (actualCrefNom <= chip.minCrefNf) {
    actualTssMs = minInternalTss;
  } else {
    actualTssMs = Number(((actualCrefNom * chip.vref) / (chip.issChargeUa * 1e-3)).toFixed(2));
  }

  const crefComp: StandardComponent = {
    theoretical: Number(crefTheoreticalNf.toFixed(1)),
    nominal: actualCrefNom,
    unit: 'nF',
    formatted: `${actualCrefNom} nF`,
    series: 'E24',
    errorPercent: crefStd.errorPercent,
    voltageRating: '≥ 16V X7R',
    packageRecommendation: '0603 X7R (пин 8 TRK/REF к AGND)',
  };

  // 10. EN / UVLO Programming (Pin 5 EN)
  // Equation 7: Vin_start = VIHEN * (Rup + Rdown) / Rdown
  // Equation 8: Rup max current ≤ 50 µA => Rup(kΩ) = VinMax / 0.05
  // Max VEN ≤ 3.6V (Recommended limit to prevent overvoltage on EN pin)
  const isManualUvlo = inputs.uvloInputMode === 'resistors';
  let rupNom = rupKohm || 100.0;
  let rdownNom = rdownKohm || 41.2;

  if (!isManualUvlo) {
    // Choose Rdown e.g. 10k or 41.2k, then calculate Rup
    rdownNom = 10.0;
    const rupCalcK = rdownNom * (vinStartUvlo / chip.venRising - 1);
    const rupStd = findNearestESeries(Math.max(1.0, rupCalcK), 'E96');
    rupNom = rupStd.nominal;
  }

  const actualVinStart = Number((chip.venRising * (1 + rupNom / rdownNom)).toFixed(2));
  const actualVinStop = Number(((chip.venRising - chip.venHyst) * (1 + rupNom / rdownNom)).toFixed(2));
  const venAtVinMax = Number(((vinMax * rdownNom) / (rupNom + rdownNom)).toFixed(2));
  const venOvervoltageWarning = venAtVinMax > chip.venMax;

  if (venOvervoltageWarning) {
    warnings.push(
      `Напряжение на выводе EN при Vin_max=${vinMax}В достигает ${venAtVinMax}В (паспортный максимум 3.6В). Увеличьте номинал Rup или уменьшите Rdown.`
    );
  }

  const rupComp: StandardComponent = {
    theoretical: rupNom,
    nominal: rupNom,
    unit: 'kΩ',
    formatted: `${rupNom} kΩ`,
    series: 'E96',
    errorPercent: 0,
    voltageRating: `≥ ${Math.ceil(vinMax)} V`,
    packageRecommendation: '0603/0805 1% (VIN к пину 5 EN)',
  };

  const rdownComp: StandardComponent = {
    theoretical: rdownNom,
    nominal: rdownNom,
    unit: 'kΩ',
    formatted: `${rdownNom} kΩ`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% (пин 5 EN к AGND)',
  };

  // 11. Mode Resistor Standard Component
  const modeResistorComp: StandardComponent = {
    theoretical: activeModeConfig.resistorKohm,
    nominal: activeModeConfig.resistorKohm,
    unit: 'kΩ',
    formatted: activeModeConfig.isTiedToAgnd
      ? '0 Ω (AGND)'
      : activeModeConfig.isTiedToVcc
      ? '0 Ω (к VCC)'
      : `${activeModeConfig.resistorKohm} kΩ (1%)`,
    series: 'E96',
    errorPercent: 0,
    packageRecommendation: '0603 1% (пин 12 MODE к AGND / VCC)',
  };

  // 12. Ancillary Passives (Bootstrap, VCC, PGOOD, High-freq COL)
  const cbootComp: StandardComponent = {
    theoretical: 100,
    nominal: cbootNf || 100,
    unit: 'nF',
    formatted: `${cbootNf || 100} nF (0.1 µF)`,
    series: 'E12',
    errorPercent: 0,
    voltageRating: '≥ 25V X7R',
    packageRecommendation: '0603 X7R между BST (10) и RBST',
  };

  const rbootComp: StandardComponent = {
    theoretical: 3.3,
    nominal: rbootOhm || 3.3,
    unit: 'Ω',
    formatted: `${rbootOhm || 3.3} Ω`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 последовательно с CBST к SW (демпфирует звон dV/dt)',
  };

  const cvccComp: StandardComponent = {
    theoretical: 1.0,
    nominal: cvccUf || 1.0,
    unit: 'µF',
    formatted: `${cvccUf || 1.0} µF`,
    series: 'E12',
    errorPercent: 0,
    voltageRating: '≥ 10V X7R',
    packageRecommendation: '0603 X7R вплотную к выводу 13 VCC и AGND/PGND',
  };

  const rpgoodComp: StandardComponent = {
    theoretical: 10.0,
    nominal: rpgoodKohm || 10.0,
    unit: 'kΩ',
    formatted: `${rpgoodKohm || 10.0} kΩ`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 подтяжка PGOOD (9) к VCC или шине 3.3В',
  };

  const rpgFilterComp: StandardComponent = {
    theoretical: 20.0,
    nominal: rpgFilterOhm || 20.0,
    unit: 'Ω',
    formatted: `${rpgFilterOhm || 20.0} Ω`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 фильтр помех PGOOD (рекомендация PCB layout MPS, стр. 19)',
  };

  const cpgFilterComp: StandardComponent = {
    theoretical: 1.0,
    nominal: cpgFilterNf || 1.0,
    unit: 'nF',
    formatted: `${cpgFilterNf || 1.0} nF`,
    series: 'E24',
    errorPercent: 0,
    packageRecommendation: '0603 CPG фильтр помех PGOOD на PGND',
  };

  const colComp: StandardComponent = {
    theoretical: 10.0,
    nominal: colNf || 10.0,
    unit: 'nF',
    formatted: `${colNf || 10.0} nF`,
    series: 'E24',
    errorPercent: 0,
    voltageRating: '≥ 16V X7R',
    packageRecommendation: '0603 высокочастотный фильтр шума на шине VOUT (стр. 19)',
  };

  // 13. Power Loss & Thermal Estimation
  const rHsOhm = chip.rdsOnHsMohm * 1e-3;
  const rLsOhm = chip.rdsOnLsMohm * 1e-3;
  const conductionLossW = Math.pow(iRms, 2) * (dutyNom * rHsOhm + (1 - dutyNom) * rLsOhm);

  // Switching loss: 0.5 * Vin * Iout * (tr + tf) * Fsw
  const trTfTotal = 12e-9; // ~12 ns switching transition
  const switchingLossW = 0.5 * vinNom * ioutMax * trTfTotal * fsw;

  // Inductor DCR loss (assuming ~7 mΩ for modern 6A-10A power inductor)
  const inductorDcrOhm = 0.007;
  const inductorDcrLossW = Math.pow(iRms, 2) * inductorDcrOhm;

  // Quiescent & gate charge loss
  const quiescentLossW = vinNom * 0.0015 + chip.vccVoltage * 20e-9 * fsw;
  const totalPowerLossW = conductionLossW + switchingLossW + inductorDcrLossW + quiescentLossW;
  const pOutW = vout * ioutMax;
  const estimatedEfficiency = Number(((pOutW / (pOutW + totalPowerLossW)) * 100).toFixed(1));

  return {
    chipModel: chipKey,
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
    coutStabilityMinUf: Number(coutStabilityMinUf.toFixed(1)),
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
    vref: chip.vref,
    r1Top: r1Comp,
    r2Bottom: r2Comp,
    cff: cffComp,
    actualFzKhz,
    voutActual,
    voutErrorPercent,
    modeResistor: modeResistorComp,
    modePinConnection: activeModeConfig.pinConnection,
    modeDescription: activeModeConfig.description,
    detectedLightLoadMode: activeLightLoadMode,
    actualFswKhz: activeFswKhz,
    rcsKohm: rcsComp,
    ilimTargetA: targetIlimDc,
    actualIlimValleyA,
    actualIlimDcA,
    crefNf: crefComp,
    actualTssMs,
    minInternalTssMs: minInternalTss,
    rupKohm: rupComp,
    rdownKohm: rdownComp,
    actualVinStart,
    actualVinStop,
    venAtVinMax,
    venOvervoltageWarning,
    cbootNf: cbootComp,
    rbootOhm: rbootComp,
    cvccUf: cvccComp,
    vccVoltageV: chip.vccVoltage,
    rpgoodKohm: rpgoodComp,
    rpgFilterOhm: rpgFilterComp,
    cpgFilterNf: cpgFilterComp,
    colNf: colComp,
    estimatedEfficiency,
    estimatedPowerLossW: Number(totalPowerLossW.toFixed(2)),
    conductionLossW: Number(conductionLossW.toFixed(2)),
    switchingLossW: Number(switchingLossW.toFixed(2)),
    inductorDcrLossW: Number(inductorDcrLossW.toFixed(2)),
    quiescentLossW: Number(quiescentLossW.toFixed(3)),
    warnings,
  };
}

export function generateBomList(inputs: CalculatorInputs, results: CalculatorResults): BomItem[] {
  const chip = CHIP_LIMITS[inputs.chipModel || 'MPQ8626GD'];

  return [
    {
      id: 'U1',
      designator: 'U1',
      pinNumber: 'Пины 1-14',
      description: `Синхронный понижающий DC-DC конвертер ${chip.manufacturer} ${inputs.chipModel}`,
      category: 'IC',
      nominalValue: chip.marking,
      calculatedValue: `${inputs.chipModel} (16V, 6A continuous, COT, Vref=0.6V)`,
      tolerance: '—',
      minRating: 'Vin = 16V, Tj = -40..+125°C',
      recommendedFootprint: 'QFN-14 (2mm × 3mm)',
      notes: `Высокоэффективный понижающий регулятор с внутренними ключами (HS: ${chip.rdsOnHsMohm}мОм, LS: ${chip.rdsOnLsMohm}мОм), адаптивным COT и программируемым токовым пределом.`,
    },
    {
      id: 'L1',
      designator: 'L1',
      pinNumber: 'Пины 2, 11 (SW)',
      description: 'Силовой экранированный дроссель индуктивности',
      category: 'Inductor',
      nominalValue: `${results.lNominal.nominal} µH`,
      calculatedValue: `${results.lCalcUh} µH`,
      tolerance: '±20%',
      minRating: results.lNominal.currentRating || '—',
      recommendedFootprint: 'SMD Power Inductor (Wurth / Coilcraft / Vishay)',
      notes: `Низкое DCR (< 8 мОм). Пульсации тока ΔIL = ${results.actualDeltaIL} A (Kind = ${(results.actualKind * 100).toFixed(0)}%). Ipeak = ${results.iPeak} A.`,
    },
    {
      id: 'COUT',
      designator: `C_OUT (x${results.coutQty})`,
      pinNumber: 'VOUT к PGND (Пины 1, 14)',
      description: 'Выходная батарея керамических сглаживающих конденсаторов',
      category: 'Capacitor',
      nominalValue: `${results.coutQty} × ${results.coutSingleUf} µF (${results.coutQty * results.coutSingleUf} µF)`,
      calculatedValue: `Ceff ≥ ${results.coutEffectiveMinUf} µF (пульсации: ${results.coutRippleMinUf} µF, стабильность: ${results.coutStabilityMinUf} µF)`,
      tolerance: '±10% / ±20%',
      minRating: results.coutRecommendedUf.voltageRating || '≥ 10V',
      recommendedFootprint: 'SMD 1206 / 1210 MLCC X7R / X5R',
      notes: `Учтено падение емкости под DC смещением. Расчетные пульсации Vout: ~${results.actualRippleMv} мВ.`,
    },
    {
      id: 'CIN',
      designator: `C_IN (x${results.cinQty})`,
      pinNumber: 'VIN (Пин 3) к PGND (Пины 1, 14)',
      description: 'Входная батарея фильтрующих конденсаторов питания',
      category: 'Capacitor',
      nominalValue: `${results.cinQty} × ${results.cinSingleUf} µF (${results.cinQty * results.cinSingleUf} µF)`,
      calculatedValue: `${results.cinMinUf} µF`,
      tolerance: '±10% / ±20%',
      minRating: results.cinRecommendedUf.voltageRating || '≥ 25V',
      recommendedFootprint: 'SMD 1210 / 1206 MLCC X7R',
      notes: `Монтировать вплотную к выводу 3 (VIN) и выводам 1, 14 (PGND). RMS ток пульсаций: ${results.cinRmsA} A.`,
    },
    {
      id: 'CIN_HF',
      designator: 'C_IN_HF',
      pinNumber: 'Пин 3 (VIN)',
      description: 'Высокочастотный блокировочный конденсатор подавления звона',
      category: 'Capacitor',
      nominalValue: '0.1 µF (100 nF)',
      calculatedValue: '100 nF',
      tolerance: '±10%',
      minRating: '≥ 25V X7R',
      recommendedFootprint: 'SMD 0603 / 0402',
      notes: 'Критичен для минимизации паразитной индуктивности силового контура переключения.',
    },
    {
      id: 'R_CS',
      designator: 'R_CS',
      pinNumber: 'Пин 4 (CS)',
      description: 'Резистор программирования токового предела (Valley OCP)',
      category: 'Resistor',
      nominalValue: `${results.rcsKohm.nominal} kΩ`,
      calculatedValue: `${results.rcsKohm.theoretical} kΩ`,
      tolerance: '±1% (E96)',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: `Задает порог впадины тока Ivalley = ${results.actualIlimValleyA} A (эквивалентный DC предел Ilim ≈ ${results.actualIlimDcA} A). Формула: Rcs = Vocp / (Gcs · Ivalley).`,
    },
    {
      id: 'R_FB1',
      designator: 'R_FB1 (R1)',
      pinNumber: 'Пин 6 (FB)',
      description: 'Верхний резистор делителя цепи обратной связи VOUT → FB',
      category: 'Resistor',
      nominalValue: `${results.r1Top.nominal} kΩ`,
      calculatedValue: `${results.r1Top.theoretical} kΩ`,
      tolerance: '±1% (E96)',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: `Опорное напряжение Vref = ${results.vref} В. Фактический Vout = ${results.voutActual} В (погрешность ${results.voutErrorPercent > 0 ? '+' : ''}${results.voutErrorPercent}%).`,
    },
    {
      id: 'R_FB2',
      designator: 'R_FB2 (R2)',
      pinNumber: 'Пин 6 (FB)',
      description: 'Нижний резистор делителя цепи обратной связи FB → AGND',
      category: 'Resistor',
      nominalValue: `${results.r2Bottom.nominal} kΩ`,
      calculatedValue: `${results.r2Bottom.theoretical} kΩ`,
      tolerance: '±1% (E96)',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: 'Подключается к выводу 7 (AGND). Не прокладывать через переходные отверстия (vias).',
    },
    {
      id: 'C_FF',
      designator: 'C_FF',
      pinNumber: 'Параллельно R_FB1',
      description: 'Конденсатор опережения по фазе (Feed-Forward Capacitor)',
      category: 'Capacitor',
      nominalValue: `${results.cff.nominal} pF`,
      calculatedValue: `${results.cff.theoretical} pF`,
      tolerance: '±5% / ±10%',
      minRating: '≥ 16V C0G / NP0',
      recommendedFootprint: 'SMD 0603',
      notes: `Формирует нуль петли обратной связи на частоте fz = ${results.actualFzKhz} кГц (норма по даташиту: 5–40 кГц) для улучшения переходных процессов.`,
    },
    {
      id: 'R_MODE',
      designator: 'R_MODE',
      pinNumber: 'Пин 12 (MODE)',
      description: 'Резистор конфигурирования режима и частоты переключения',
      category: 'Resistor',
      nominalValue: results.modeResistor.formatted,
      calculatedValue: `${results.modeResistor.theoretical} kΩ`,
      tolerance: '±1%',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: `${results.modeDescription}. Задает частоту fsw = ${results.actualFswKhz} кГц.`,
    },
    {
      id: 'C_REF',
      designator: 'C_REF (C_SS)',
      pinNumber: 'Пин 8 (TRK/REF)',
      description: 'Конденсатор стабилизации опорного напряжения и софт-старта',
      category: 'Capacitor',
      nominalValue: `${results.crefNf.nominal} nF`,
      calculatedValue: `${results.crefNf.theoretical} nF`,
      tolerance: '±10%',
      minRating: '≥ 16V X7R',
      recommendedFootprint: 'SMD 0603',
      notes: `Время плавного пуска Tss = ${results.actualTssMs} мс (базовый внутренний таймер: ${results.minInternalTssMs} мс). Ток заряда: ${chip.issChargeUa} мкА.`,
    },
    {
      id: 'C_BST',
      designator: 'C_BST',
      pinNumber: 'Пин 10 (BST)',
      description: 'Керамический конденсатор вольтодобавки бутстрепа',
      category: 'Capacitor',
      nominalValue: `${results.cbootNf.nominal} nF`,
      calculatedValue: '100 nF',
      tolerance: '±10%',
      minRating: '≥ 25V X7R',
      recommendedFootprint: 'SMD 0603',
      notes: 'Включается между выводом 10 (BST) и R_BST (к узлу SW).',
    },
    {
      id: 'R_BST',
      designator: 'R_BST',
      pinNumber: 'Между BST и SW (2, 11)',
      description: 'Демпфирующий резистор цепи бутстрепа',
      category: 'Resistor',
      nominalValue: `${results.rbootOhm.nominal} Ω`,
      calculatedValue: '3.3 Ω',
      tolerance: '±5%',
      minRating: '1/10 W',
      recommendedFootprint: 'SMD 0603',
      notes: 'Снижает скорость нарастания dV/dt силового ключа, устраняет звон и высокочастотный EMI шум на фронтах переключения.',
    },
    {
      id: 'C_VCC',
      designator: 'C_VCC',
      pinNumber: 'Пин 13 (VCC)',
      description: 'Блокировочный конденсатор внутреннего LDO питания логики и затворов',
      category: 'Capacitor',
      nominalValue: `${results.cvccUf.nominal} µF`,
      calculatedValue: '1.0 µF (мин. 1 µF)',
      tolerance: '±10%',
      minRating: '≥ 10V X7R',
      recommendedFootprint: 'SMD 0603',
      notes: `Стабилизирует шину VCC (${results.vccVoltageV} В). Монтировать вплотную к выводу 13 и точке соединения AGND/PGND.`,
    },
    {
      id: 'R_EN1',
      designator: 'R_EN1 (R_UP)',
      pinNumber: 'Пин 5 (EN)',
      description: 'Верхний резистор делителя порога включения UVLO от шины VIN',
      category: 'Resistor',
      nominalValue: `${results.rupKohm.nominal} kΩ`,
      calculatedValue: `${results.rupKohm.theoretical} kΩ`,
      tolerance: '±1%',
      minRating: `≥ ${Math.ceil(inputs.vinMax)} V (0603 / 0805)`,
      recommendedFootprint: 'SMD 0603 / 0805',
      notes: `Порог включения Vin_start = ${results.actualVinStart} В. Напряжение на EN при Vin_max: ${results.venAtVinMax} В (макс. 3.6В).`,
    },
    {
      id: 'R_EN2',
      designator: 'R_EN2 (R_DOWN)',
      pinNumber: 'Пин 5 (EN)',
      description: 'Нижний резистор делителя UVLO на AGND',
      category: 'Resistor',
      nominalValue: `${results.rdownKohm.nominal} kΩ`,
      calculatedValue: `${results.rdownKohm.theoretical} kΩ`,
      tolerance: '±1%',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: `Порог выключения Vin_stop = ${results.actualVinStop} В (встроенный гистерезис 200 мВ).`,
    },
    {
      id: 'R_PGOOD',
      designator: 'R_PGOOD',
      pinNumber: 'Пин 9 (PGOOD)',
      description: 'Подтягивающий резистор выхода открытого стока Power Good',
      category: 'Resistor',
      nominalValue: `${results.rpgoodKohm.nominal} kΩ`,
      calculatedValue: '10 kΩ',
      tolerance: '±5%',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: 'Подтягивается к шине VCC или внешнему логическому напряжению ≤ 3.6 В.',
    },
    {
      id: 'R_PG_FILT',
      designator: 'R_PG_FILT',
      pinNumber: 'Пин 9 (PGOOD)',
      description: 'Фильтрующий резистор цепи PGOOD для помехоустойчивости',
      category: 'Resistor',
      nominalValue: `${results.rpgFilterOhm.nominal} Ω`,
      calculatedValue: '20 Ω (10–49.9 Ω)',
      tolerance: '±5%',
      minRating: '1/16 W',
      recommendedFootprint: 'SMD 0603',
      notes: 'Рекомендация MPS по трассировке печатной платы (PCB layout, стр. 19).',
    },
    {
      id: 'C_PG_FILT',
      designator: 'C_PG_FILT',
      pinNumber: 'Пин 9 (PGOOD)',
      description: 'Фильтрующий конденсатор цепи PGOOD',
      category: 'Capacitor',
      nominalValue: `${results.cpgFilterNf.nominal} nF`,
      calculatedValue: '1 nF',
      tolerance: '±10%',
      minRating: '≥ 16V X7R',
      recommendedFootprint: 'SMD 0603',
      notes: 'Подавляет наводки от силового переключения на цифровой сигнал Power Good.',
    },
    {
      id: 'C_OL',
      designator: 'C_OL',
      pinNumber: 'Шина VOUT к PGND',
      description: 'Высокочастотный блокировочный конденсатор в цепи нагрузки',
      category: 'Capacitor',
      nominalValue: `${results.colNf.nominal} nF`,
      calculatedValue: '10 nF (1–100 nF)',
      tolerance: '±10%',
      minRating: '≥ 16V X7R',
      recommendedFootprint: 'SMD 0603',
      notes: 'Рекомендация MPS по компоновке (PCB layout, стр. 19) для подавления ВЧ шума.',
    },
  ];
}

// Compatibility alias for any legacy imports
export const calculateSiC461 = calculateMPQ8626;
