export type VoutInputMode = 'voltage' | 'resistors';
export type SoftStartInputMode = 'time' | 'capacitor';
export type UvloInputMode = 'voltage' | 'resistors';
export type CurrentLimitInputMode = 'current' | 'resistor';
export type ModeInputMode = 'mode_fsw' | 'resistor';
export type CffInputMode = 'target_fz' | 'capacitor';
export type BootInputMode = 'standard' | 'custom';

export type ChipModel = 'MPQ8626GD' | 'IS6605A';
export type LightLoadMode = 'FCCM' | 'PulseSkip';
export type SwitchingFreqOption = 600 | 1100 | 2000;
export type VccBiasMode = 'internal' | 'external_3v3';

export interface CalculatorInputs {
  chipModel: ChipModel;
  vccBiasMode: VccBiasMode;
  lightLoadMode: LightLoadMode;
  fswKhz: SwitchingFreqOption;
  
  // Power Stage Specs
  vinNom: number;
  vinMin: number;
  vinMax: number;
  vout: number;
  ioutMax: number;
  kind: number; // Target ripple ratio (typ 0.25 - 0.40)
  voutRippleMaxMv: number;
  loadStepA: number;
  voltageOvershootMv: number;
  tssMs: number;
  vinStartUvlo: number;
  vinStopUvlo?: number;
  ilimTargetA: number;
  targetFzKhz: number;

  // Input Modes
  voutInputMode: VoutInputMode;
  softStartInputMode: SoftStartInputMode;
  uvloInputMode: UvloInputMode;
  currentLimitInputMode: CurrentLimitInputMode;
  modeInputMode: ModeInputMode;
  cffInputMode: CffInputMode;
  bootInputMode: BootInputMode;

  // Manual component overrides
  r1Kohm: number;        // Top feedback resistor (VOUT to FB)
  r2Kohm: number;        // Bottom feedback resistor (FB to AGND)
  cffPf: number;         // Feed-forward cap across R1
  crefNf: number;        // Soft-start capacitor on TRK/REF
  rupKohm: number;       // EN upper divider resistor from VIN
  rdownKohm: number;     // EN lower divider resistor to AGND
  rcsKohm: number;       // Current limit resistor on CS pin
  rmodeKohm: number;     // Resistor on MODE pin to AGND
  rbootOhm: number;      // Damping resistor in series with Cboot
  cbootNf: number;       // Bootstrap capacitor
  cvccUf: number;        // VCC decoupling capacitor
  rpgoodKohm: number;    // PGOOD pull-up resistor
  rpgFilterOhm: number;  // PGOOD filter resistor (layout guideline)
  cpgFilterNf: number;   // PGOOD filter capacitor (layout guideline)
  colNf: number;         // High-frequency output filter cap COL
}

export interface StandardComponent {
  theoretical: number;
  nominal: number;
  unit: string;
  formatted: string;
  series: 'E12' | 'E24' | 'E96';
  errorPercent: number;
  packageRecommendation?: string;
  voltageRating?: string;
  currentRating?: string;
}

export interface CalculatorResults {
  chipModel: ChipModel;
  maxRatedCurrentA: number;
  dutyNom: number;
  dutyMin: number;
  dutyMax: number;
  tonNs: number;
  toffNs: number;
  tonMinWarning: boolean;
  toffMinWarning: boolean;
  
  // Inductor
  deltaIL: number;
  lCalcUh: number;
  lNominal: StandardComponent;
  actualDeltaIL: number;
  actualKind: number;
  iPeak: number;
  iValley: number;
  iRms: number;

  // Output Capacitors
  coutRippleMinUf: number;
  coutTransientMinUf: number;
  coutStabilityMinUf: number;
  coutEffectiveMinUf: number;
  coutRecommendedUf: StandardComponent;
  coutQty: number;
  coutSingleUf: number;
  actualRippleMv: number;

  // Input Capacitors
  cinRmsA: number;
  cinMinUf: number;
  cinRecommendedUf: StandardComponent;
  cinQty: number;
  cinSingleUf: number;

  // Feedback Network & Cff
  vref: number;
  r1Top: StandardComponent;
  r2Bottom: StandardComponent;
  cff: StandardComponent;
  actualFzKhz: number;
  voutActual: number;
  voutErrorPercent: number;

  // Mode & Frequency
  modeResistor: StandardComponent;
  modePinConnection: string;
  modeDescription: string;
  detectedLightLoadMode: LightLoadMode;
  actualFswKhz: number;

  // Current Limit (CS Pin)
  rcsKohm: StandardComponent;
  ilimTargetA: number;
  actualIlimValleyA: number;
  actualIlimDcA: number;

  // Soft Start (TRK/REF Pin)
  crefNf: StandardComponent;
  actualTssMs: number;
  minInternalTssMs: number;

  // UVLO / EN Pin
  rupKohm: StandardComponent;
  rdownKohm: StandardComponent;
  actualVinStart: number;
  actualVinStop: number;
  venAtVinMax: number;
  venOvervoltageWarning: boolean;

  // Bootstrap & Ancillary Passives
  cbootNf: StandardComponent;
  rbootOhm: StandardComponent;
  cvccUf: StandardComponent;
  vccVoltageV: number;
  rpgoodKohm: StandardComponent;
  rpgFilterOhm: StandardComponent;
  cpgFilterNf: StandardComponent;
  colNf: StandardComponent;

  // Efficiency & Loss Breakdown
  estimatedEfficiency: number;
  estimatedPowerLossW: number;
  conductionLossW: number;
  switchingLossW: number;
  inductorDcrLossW: number;
  quiescentLossW: number;

  // Design Rule Check Warnings
  warnings: string[];
}

export interface BomItem {
  id: string;
  designator: string;
  pinNumber: string;
  description: string;
  category: 'IC' | 'Inductor' | 'Capacitor' | 'Resistor';
  nominalValue: string;
  calculatedValue: string;
  tolerance: string;
  minRating: string;
  recommendedFootprint: string;
  notes: string;
}

export interface PresetProfile {
  id: string;
  name: string;
  description: string;
  inputs: CalculatorInputs;
}