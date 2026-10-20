import React, { useState, useRef, useMemo } from 'react';
import { CalculatorInputs, PresetProfile } from './types/calculator';
import { calculateMPQ8626, generateBomList } from './utils/mpq8626Math';
import { PRESET_PROFILES } from './utils/presets';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { SchematicView } from './components/SchematicView';
import { BomTable } from './components/BomTable';
import { WaveformChart } from './components/WaveformChart';
import { PythonExportModal } from './components/PythonExportModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [inputs, setInputs] = useState<CalculatorInputs>(
    PRESET_PROFILES[0].inputs
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PRESET_PROFILES[0].id
  );
  const [activeTab, setActiveTab] = useState<'schematic' | 'bom' | 'analysis'>(
    'schematic'
  );
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant real-time calculation
  const results = useMemo(() => calculateMPQ8626(inputs), [inputs]);
  const bomItems = useMemo(
    () => generateBomList(inputs, results),
    [inputs, results]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleInputChange = <K extends keyof CalculatorInputs>(
    field: K,
    value: CalculatorInputs[K]
  ) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectPreset = (preset: PresetProfile) => {
    setSelectedPresetId(preset.id);
    setInputs(preset.inputs);
    showToast(`Применен пресет: ${preset.name}`);
  };

  const handleResetDefaults = () => {
    setInputs(PRESET_PROFILES[0].inputs);
    setSelectedPresetId(PRESET_PROFILES[0].id);
    showToast('Сброшено к заводскому профилю 12В → 1.8В @ 6А (MPQ8626)');
  };

  // Export current design to JSON file
  const handleExportJson = () => {
    const exportData = {
      device: `MPS ${inputs.chipModel || 'MPQ8626GD'} / IS6605A Synchronous Buck Regulator`,
      package: 'QFN-14 (2mm x 3mm)',
      version: '2.5',
      timestamp: new Date().toISOString(),
      inputModes: {
        voutInputMode: inputs.voutInputMode,
        softStartInputMode: inputs.softStartInputMode,
        uvloInputMode: inputs.uvloInputMode,
        currentLimitInputMode: inputs.currentLimitInputMode,
        modeInputMode: inputs.modeInputMode,
        cffInputMode: inputs.cffInputMode,
        bootInputMode: inputs.bootInputMode,
      },
      inputs,
      pinConfigurations: {
        pins1_14_PGND: { groundReturn: 'Power Ground plane' },
        pins2_11_SW: { inductorNominalUh: results.lNominal.nominal, deltaIL: results.actualDeltaIL, iPeak: results.iPeak },
        pin3_VIN: { cinUf: results.cinQty * results.cinSingleUf, cinRmsA: results.cinRmsA },
        pin4_CS: { rcsKohm: results.rcsKohm.nominal, ilimValleyA: results.actualIlimValleyA, ilimDcA: results.actualIlimDcA },
        pin5_EN: { rupKohm: results.rupKohm.nominal, rdownKohm: results.rdownKohm.nominal, vinStart: results.actualVinStart, vinStop: results.actualVinStop },
        pin6_FB: { r1TopKohm: results.r1Top.nominal, r2BottomKohm: results.r2Bottom.nominal, cffPf: results.cff.nominal, fzKhz: results.actualFzKhz, voutActual: results.voutActual },
        pin7_AGND: { groundReturn: 'Analog Quiet Ground' },
        pin8_TRK_REF: { crefNf: results.crefNf.nominal, actualTssMs: results.actualTssMs },
        pin9_PGOOD: { rpgoodKohm: results.rpgoodKohm.nominal, rpgFilterOhm: results.rpgFilterOhm.nominal, cpgFilterNf: results.cpgFilterNf.nominal },
        pin10_BST: { cbootNf: results.cbootNf.nominal, rbootOhm: results.rbootOhm.nominal },
        pin12_MODE: { pinConnection: results.modePinConnection, fswKhz: results.actualFswKhz, lightLoadMode: results.detectedLightLoadMode, description: results.modeDescription },
        pin13_VCC: { cvccUf: results.cvccUf.nominal, vccVoltageV: results.vccVoltageV },
      },
      calculatedSummary: {
        dutyNominal: results.dutyNom,
        tonNs: results.tonNs,
        inductorNominalUh: results.lNominal.nominal,
        coutTotalUf: results.coutQty * results.coutSingleUf,
        cinTotalUf: results.cinQty * results.cinSingleUf,
        actualVout: results.voutActual,
        actualRippleMv: results.actualRippleMv,
        actualTssMs: results.actualTssMs,
        actualVinStart: results.actualVinStart,
        actualVinStop: results.actualVinStop,
        estimatedEfficiency: results.estimatedEfficiency,
        estimatedPowerLossW: results.estimatedPowerLossW,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mpq8626_${inputs.vout}v_${inputs.ioutMax}a_config.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Параметры всех 14 пинов и режимы успешно выгружены в JSON');
  };

  // Trigger file open dialog
  const handleImportJsonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle uploaded JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const importedInputs = parsed.inputs || parsed;
        const inputModes = parsed.inputModes || {};
        const inputComponents = parsed.inputComponents || {};

        const voutMode = importedInputs.voutInputMode || inputModes.voutInputMode || 'voltage';
        const ssMode = importedInputs.softStartInputMode || inputModes.softStartInputMode || 'time';
        const uvloMode = importedInputs.uvloInputMode || inputModes.uvloInputMode || 'voltage';
        const curMode = importedInputs.currentLimitInputMode || inputModes.currentLimitInputMode || 'current';
        const modeMode = importedInputs.modeInputMode || inputModes.modeInputMode || 'mode_fsw';
        const cffMode = importedInputs.cffInputMode || inputModes.cffInputMode || 'target_fz';
        const bootMode = importedInputs.bootInputMode || inputModes.bootInputMode || 'standard';

        let r1 = Number(importedInputs.r1Kohm ?? inputComponents.r1Kohm ?? importedInputs.rfb1Kohm ?? 4.02);
        let r2 = Number(importedInputs.r2Kohm ?? inputComponents.r2Kohm ?? importedInputs.rfb2Kohm ?? 2.0);
        let vout = Number(importedInputs.vout ?? 1.8);
        if (voutMode === 'resistors') {
          vout = Number((0.600 * (1 + r1 / r2)).toFixed(3));
        }

        let cref = Number(importedInputs.crefNf ?? inputComponents.crefNf ?? importedInputs.cssNf ?? 3.3);
        let tss = Number(importedInputs.tssMs ?? 2.2);

        let rup = Number(importedInputs.rupKohm ?? inputComponents.rupKohm ?? importedInputs.ren1Kohm ?? 71.5);
        let rdown = Number(importedInputs.rdownKohm ?? inputComponents.rdownKohm ?? importedInputs.ren2Kohm ?? 10.0);
        let vinStart = Number(importedInputs.vinStartUvlo ?? 10.0);
        if (uvloMode === 'resistors') {
          vinStart = Number((1.22 * (1 + rup / rdown)).toFixed(2));
        }

        let chipModel = importedInputs.chipModel;
        if (!chipModel || chipModel.startsWith('SiC')) {
          chipModel = 'MPQ8626GD';
        }

        setInputs({
          chipModel: chipModel as any,
          vccBiasMode: importedInputs.vccBiasMode ?? 'internal',
          lightLoadMode: importedInputs.lightLoadMode ?? 'FCCM',
          fswKhz: Number(importedInputs.fswKhz ?? 1100) as any,
          vinNom: Number(importedInputs.vinNom ?? 12),
          vinMin: Number(importedInputs.vinMin ?? 10.8),
          vinMax: Number(importedInputs.vinMax ?? 13.2),
          vout,
          ioutMax: Number(importedInputs.ioutMax ?? 6),
          kind: Number(importedInputs.kind ?? 0.35),
          voutRippleMaxMv: Number(importedInputs.voutRippleMaxMv ?? 15),
          loadStepA: Number(importedInputs.loadStepA ?? 3),
          voltageOvershootMv: Number(importedInputs.voltageOvershootMv ?? 50),
          tssMs: tss,
          vinStartUvlo: vinStart,
          vinStopUvlo: Number((1.02 * (1 + rup / rdown)).toFixed(2)),
          ilimTargetA: Number(importedInputs.ilimTargetA ?? 6.0),
          targetFzKhz: Number(importedInputs.targetFzKhz ?? 15.0),
          voutInputMode: voutMode,
          softStartInputMode: ssMode,
          uvloInputMode: uvloMode,
          currentLimitInputMode: curMode,
          modeInputMode: modeMode,
          cffInputMode: cffMode,
          bootInputMode: bootMode,
          r1Kohm: r1,
          r2Kohm: r2,
          cffPf: Number(importedInputs.cffPf ?? inputComponents.cffPf ?? 2700),
          crefNf: cref,
          rupKohm: rup,
          rdownKohm: rdown,
          rcsKohm: Number(importedInputs.rcsKohm ?? inputComponents.rcsKohm ?? 4.87),
          rmodeKohm: Number(importedInputs.rmodeKohm ?? inputComponents.rmodeKohm ?? 0),
          rbootOhm: Number(importedInputs.rbootOhm ?? inputComponents.rbootOhm ?? 3.3),
          cbootNf: Number(importedInputs.cbootNf ?? inputComponents.cbootNf ?? 100),
          cvccUf: Number(importedInputs.cvccUf ?? inputComponents.cvccUf ?? 1.0),
          rpgoodKohm: Number(importedInputs.rpgoodKohm ?? inputComponents.rpgoodKohm ?? 10.0),
          rpgFilterOhm: Number(importedInputs.rpgFilterOhm ?? 20.0),
          cpgFilterNf: Number(importedInputs.cpgFilterNf ?? 1.0),
          colNf: Number(importedInputs.colNf ?? 10.0),
        });
        setSelectedPresetId('custom');
        showToast(`Параметры и режимы успешно загружены из "${file.name}"`);
      } catch (err) {
        showToast('Ошибка при чтении JSON: неверный формат');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Hidden File Input for JSON Loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onExportJson={handleExportJson}
        onImportJsonClick={handleImportJsonClick}
        onResetDefaults={handleResetDefaults}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900 border-b border-slate-800 p-2 text-xs">
        <button
          onClick={() => setActiveTab('schematic')}
          className={`px-3 py-1 rounded ${activeTab === 'schematic' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Схема
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={`px-3 py-1 rounded ${activeTab === 'bom' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          BOM спецификация
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-3 py-1 rounded ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          Пульсации & КПД
        </button>
      </div>

      {/* Main Workspace: Split Console */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Control Column */}
        <InputPanel
          inputs={inputs}
          results={results}
          onChange={handleInputChange}
        />

        {/* Right Dynamic Stage View */}
        {activeTab === 'schematic' && (
          <SchematicView inputs={inputs} results={results} />
        )}
        {activeTab === 'bom' && (
          <BomTable
            bomItems={bomItems}
            projectName={`${inputs.chipModel || 'MPQ8626'}_${inputs.vout}V_${inputs.ioutMax}A`}
          />
        )}
        {activeTab === 'analysis' && (
          <WaveformChart inputs={inputs} results={results} />
        )}
      </div>

      {/* Standalone Python Script Modal */}
      <PythonExportModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        inputs={inputs}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-cyan-500/80 text-white text-xs rounded-lg shadow-2xl backdrop-blur-md animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
