export type VoutInputMode = 'voltage' | 'resistors';
export type SoftStartInputMode = 'time' | 'capacitor';
export type UvloInputMode = 'voltage' | 'resistors';
export type FswInputMode = 'frequency' | 'resistor';
export type ModeInputMode = 'mode' | 'resistor';
export type CompInputMode = 'auto' | 'manual';
export type VsnsInputMode = 'auto' | 'manual';
export type BootInputMode = 'standard' | 'custom';
export type ChipModel = 'SiC461' | 'SiC462' | 'SiC463' | 'SiC464';
export type OperatingMode = 1 | 2 | 3 | 4;

export interface CalculatorInputs {
  chipModel: ChipModel;
  operatingMode: OperatingMode;
  ultrasonicEnabled: boolean;
  vinNom: number;
  vinMin: number;
  vinMax: number;
  vout: number;
  ioutMax: number;
  fswKhz: number;
  kind: number;
  voutRippleMaxMv: number;
  loadStepA: number;
  voltageOvershootMv: number;
  tssMs: number;
  vinStartUvlo: number;
  vinStopUvlo?: number;
  voutInputMode: VoutInputMode;
  softStartInputMode: SoftStartInputMode;
  uvloInputMode: UvloInputMode;
  fswInputMode: FswInputMode;
  modeInputMode: ModeInputMode;
  compInputMode: CompInputMode;
  vsnsInputMode: VsnsInputMode;
  bootInputMode: BootInputMode;
  rfb1Kohm: number;
  rfb2Kohm: number;
  cssNf: number;
  ren1Kohm: number;
  ren2Kohm: number;
  rfswKohm: number;
  rmodeKohm: number;
  rcompKohm: number;
  ccompPf: number;
  rxKohm: number;
  cxNf: number;
  cyNf: number;
  rbootOhm: number;
  cbootNf: number;
  cvdrvUf: number;
  vdrvExtVoltage: number;
  rvcinOhm: number;
  cvcinUf: number;
  cvddUf: number;
  rpgoodKohm: number;
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
  deltaIL: number;
  lCalcUh: number;
  lNominal: StandardComponent;
  actualDeltaIL: number;
  actualKind: number;
  iPeak: number;
  iValley: number;
  iRms: number;
  coutRippleMinUf: number;
  coutTransientMinUf: number;
  coutEffectiveMinUf: number;
  coutRecommendedUf: StandardComponent;
  coutQty: number;
  coutSingleUf: number;
  actualRippleMv: number;
  cinRmsA: number;
  cinMinUf: number;
  cinRecommendedUf: StandardComponent;
  cinQty: number;
  cinSingleUf: number;
  vref: number;
  rfbBottom: StandardComponent;
  rfbTop: StandardComponent;
  voutActual: number;
  voutErrorPercent: number;
  rfswKohm: StandardComponent;
  actualFswKhz: number;
  rmodeKohm: StandardComponent;
  modeDescription: string;
  detectedMode: OperatingMode;
  rxKohm: StandardComponent;
  cxNf: StandardComponent;
  cyNf: StandardComponent;
  vrampMv: number;
  vrampMinMv: number;
  vrampMaxMv: number; // <-- ДОБАВЛЕНО
  vrampWarning: boolean;
  rcompKohm: StandardComponent;
  ccompPf: StandardComponent;
  crossoverFreqKhz: number;
  lcPoleFreqKhz: number;
  cssNf: StandardComponent;
  actualTssMs: number;
  klimValue: number;
  rlimKohm: StandardComponent;
  ilimNominalA: number;
  renTopKohm: StandardComponent;
  renBottomKohm: StandardComponent;
  actualVinStart: number;
  actualVinStop: number;
  cbootNf: StandardComponent;
  rbootOhm: StandardComponent;
  cvdrvUf: StandardComponent;
  vdrvSupplySource: string;
  vdrvPowerLossW: number;
  cvcinUf: StandardComponent;
  rvcinOhm: StandardComponent;
  cddUf: StandardComponent;
  rpgoodKohm: StandardComponent;
  ruSonicOhm: StandardComponent;
  estimatedEfficiency: number;
  estimatedPowerLossW: number;
  conductionLossW: number;
  switchingLossW: number;
  inductorDcrLossW: number;
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