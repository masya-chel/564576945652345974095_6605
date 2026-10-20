import React, { useState, useRef, useMemo } from 'react';
import { CalculatorInputs, PresetProfile } from './types/calculator';
import { calculateSiC461, generateBomList } from './utils/sic461Math';
import { PRESET_PROFILES } from './utils/presets';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { SchematicView } from './components/SchematicView';
import { BomTable } from './components/BomTable';
import { WaveformChart } from './components/WaveformChart';
import { PythonExportModal } from './components/PythonExportModal';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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
  const results = useMemo(() => calculateSiC461(inputs), [inputs]);
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
    showToast('Сброшено к заводскому профилю 24В → 5В @ 10А');
  };

  // Export current design to JSON file
  const handleExportJson = () => {
    const exportData = {
      device: `Vishay ${inputs.chipModel || 'SiC461'} Synchronous Buck Regulator`,
      version: '2.0',
      timestamp: new Date().toISOString(),
      inputModes: {
        voutInputMode: inputs.voutInputMode, // 'voltage' | 'resistors'
        softStartInputMode: inputs.softStartInputMode, // 'time' | 'capacitor'
        uvloInputMode: inputs.uvloInputMode, // 'voltage' | 'resistors'
        fswInputMode: inputs.fswInputMode, // 'frequency' | 'resistor'
        modeInputMode: inputs.modeInputMode, // 'mode' | 'resistor'
        compInputMode: inputs.compInputMode, // 'auto' | 'manual'
        vsnsInputMode: inputs.vsnsInputMode, // 'auto' | 'manual'
        bootInputMode: inputs.bootInputMode, // 'standard' | 'custom'
      },
      inputComponents: {
        rfb1Kohm: inputs.rfb1Kohm,
        rfb2Kohm: inputs.rfb2Kohm,
        cssNf: inputs.cssNf,
        ren1Kohm: inputs.ren1Kohm,
        ren2Kohm: inputs.ren2Kohm,
        rfswKohm: inputs.rfswKohm,
        rmodeKohm: inputs.rmodeKohm,
        rcompKohm: inputs.rcompKohm,
        ccompPf: inputs.ccompPf,
        rxKohm: inputs.rxKohm,
        cxNf: inputs.cxNf,
        cyNf: inputs.cyNf,
        rbootOhm: inputs.rbootOhm,
        cbootNf: inputs.cbootNf,
        cvdrvUf: inputs.cvdrvUf,
      },
      inputs,
      pinConfigurations: {
        pin1_VCIN: { cvcinUf: inputs.cvcinUf, rvcinOhm: inputs.rvcinOhm },
        pin2_PGOOD: { rpgoodKohm: inputs.rpgoodKohm },
        pin3_EN: { ren1Kohm: inputs.ren1Kohm, ren2Kohm: inputs.ren2Kohm, vinStart: results.actualVinStart, vinStop: results.actualVinStop },
        pin4_BOOT: { cbootNf: results.cbootNf.nominal, rbootOhm: results.rbootOhm.nominal },
        pins5_6_PHASE: { connectedTo: 'BOOT damper loop and SW' },
        pins7_10_SW: { inductorNominalUh: results.lNominal.nominal, deltaIL: results.actualDeltaIL },
        pins11_15_PGND: { groundReturn: 'Power Ground plane' },
        pin16_VDRV: { cvdrvUf: results.cvdrvUf.nominal, supplySource: results.vdrvSupplySource },
        pins17_23_AGND: { groundReturn: 'Analog Quiet Ground' },
        pin18_ULTRASONIC: { enabled: inputs.ultrasonicEnabled, connection: inputs.ultrasonicEnabled ? '0Ω to VDD' : 'Floating' },
        pin19_SS: { cssNf: results.cssNf.nominal, actualTssMs: results.actualTssMs },
        pin20_VSNS: { rxKohm: results.rxKohm.nominal, cxNf: results.cxNf.nominal, cyNf: results.cyNf.nominal, vrampMv: results.vrampMv },
        pin21_COMP: { rcompKohm: results.rcompKohm.nominal, ccompPf: results.ccompPf.nominal, crossoverFreqKhz: results.crossoverFreqKhz },
        pin22_VFB: { rfbTopKohm: results.rfbTop.nominal, rfbBottomKohm: results.rfbBottom.nominal, voutActual: results.voutActual },
        pin24_FSW: { rfswKohm: results.rfswKohm.nominal, actualFswKhz: results.actualFswKhz },
        pin25_ILIMIT: { rlimKohm: results.rlimKohm.nominal, ilimNominalA: results.ilimNominalA },
        pin26_VDD: { cvddUf: results.cddUf.nominal },
        pin27_MODE: { rmodeKohm: results.rmodeKohm.nominal, operatingMode: results.detectedMode, description: results.modeDescription },
      },
      calculatedSummary: {
        dutyNominal: results.dutyNom,
        inductorNominalUh: results.lNominal.nominal,
        coutTotalUf: results.coutQty * results.coutSingleUf,
        cinTotalUf: results.cinQty * results.cinSingleUf,
        rfbTopKohm: results.rfbTop.nominal,
        rfbBottomKohm: results.rfbBottom.nominal,
        actualVout: results.voutActual,
        actualRippleMv: results.actualRippleMv,
        actualTssMs: results.actualTssMs,
        actualVinStart: results.actualVinStart,
        actualVinStop: results.actualVinStop,
        estimatedEfficiency: results.estimatedEfficiency,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sic461_${inputs.vout}v_${inputs.ioutMax}a_config.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Параметры всех пинов и режимы успешно выгружены в JSON файл');
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

        // Extract modes and components
        const voutMode =
          importedInputs.voutInputMode || inputModes.voutInputMode || 'voltage';
        const ssMode =
          importedInputs.softStartInputMode || inputModes.softStartInputMode || 'time';
        const uvloMode =
          importedInputs.uvloInputMode || inputModes.uvloInputMode || 'voltage';
        const fswMode =
          importedInputs.fswInputMode || inputModes.fswInputMode || 'frequency';
        const modeMode =
          importedInputs.modeInputMode || inputModes.modeInputMode || 'mode';
        const compMode =
          importedInputs.compInputMode || inputModes.compInputMode || 'auto';
        const vsnsMode =
          importedInputs.vsnsInputMode || inputModes.vsnsInputMode || 'auto';
        const bootMode =
          importedInputs.bootInputMode || inputModes.bootInputMode || 'standard';

        let rfb1 = Number(importedInputs.rfb1Kohm ?? inputComponents.rfb1Kohm ?? 52.5);
        let rfb2 = Number(importedInputs.rfb2Kohm ?? inputComponents.rfb2Kohm ?? 10.0);
        let vout = Number(importedInputs.vout ?? 5.0);
        if (voutMode === 'resistors') {
          vout = Number((0.800 * (1 + rfb1 / rfb2)).toFixed(3));
        } else {
          rfb1 = Number((rfb2 * (vout / 0.800 - 1)).toFixed(2));
        }

        let css = Number(importedInputs.cssNf ?? inputComponents.cssNf ?? 31.25);
        let tss = Number(importedInputs.tssMs ?? 5.0);
        if (ssMode === 'capacitor') {
          tss = Number(((css * 0.8) / 5).toFixed(3));
        } else {
          css = Number(((tss * 5) / 0.8).toFixed(2));
        }

        let ren1 = Number(importedInputs.ren1Kohm ?? inputComponents.ren1Kohm ?? 127.5);
        let ren2 = Number(importedInputs.ren2Kohm ?? inputComponents.ren2Kohm ?? 10.0);
        let vinStart = Number(importedInputs.vinStartUvlo ?? 16.5);
        if (uvloMode === 'resistors') {
          vinStart = Number((1.20 * (1 + ren1 / ren2)).toFixed(2));
        } else {
          ren1 = Number((ren2 * (vinStart / 1.20 - 1)).toFixed(2));
        }

        let fswKhz = Number(importedInputs.fswKhz ?? 500);
        let rfsw = Number(importedInputs.rfswKohm ?? inputComponents.rfswKohm ?? 52.6);
        if (fswMode === 'resistor') {
          fswKhz = Number((vout / (1.9e-10 * (rfsw * 1000) * 1000)).toFixed(1));
        } else {
          rfsw = Number((vout / (1.9e-10 * (fswKhz * 1000) * 1000)).toFixed(2));
        }

        let opMode = Number(importedInputs.operatingMode ?? 1);
        let rmode = Number(importedInputs.rmodeKohm ?? inputComponents.rmodeKohm ?? 2.0);
        if (modeMode === 'resistor') {
          if (rmode <= 10) opMode = 1;
          else if (rmode <= 400) opMode = 2;
          else if (rmode <= 750) opMode = 3;
          else opMode = 4;
        }

        setInputs({
          chipModel: importedInputs.chipModel ?? 'SiC461',
          operatingMode: opMode as any,
          ultrasonicEnabled: Boolean(importedInputs.ultrasonicEnabled ?? true),
          vinNom: Number(importedInputs.vinNom ?? 24),
          vinMin: Number(importedInputs.vinMin ?? 18),
          vinMax: Number(importedInputs.vinMax ?? 32),
          vout,
          ioutMax: Number(importedInputs.ioutMax ?? 10),
          fswKhz,
          kind: Number(importedInputs.kind ?? 0.3),
          voutRippleMaxMv: Number(importedInputs.voutRippleMaxMv ?? 30),
          loadStepA: Number(importedInputs.loadStepA ?? 5),
          voltageOvershootMv: Number(importedInputs.voltageOvershootMv ?? 150),
          tssMs: tss,
          vinStartUvlo: vinStart,
          vinStopUvlo: Number((1.10 * (1 + ren1 / ren2)).toFixed(2)),
          voutInputMode: voutMode,
          softStartInputMode: ssMode,
          uvloInputMode: uvloMode,
          fswInputMode: fswMode,
          modeInputMode: modeMode,
          compInputMode: compMode,
          vsnsInputMode: vsnsMode,
          bootInputMode: bootMode,
          rfb1Kohm: rfb1,
          rfb2Kohm: rfb2,
          cssNf: css,
          ren1Kohm: ren1,
          ren2Kohm: ren2,
          rfswKohm: rfsw,
          rmodeKohm: rmode,
          rcompKohm: Number(importedInputs.rcompKohm ?? inputComponents.rcompKohm ?? 13.7),
          ccompPf: Number(importedInputs.ccompPf ?? inputComponents.ccompPf ?? 1200),
          rxKohm: Number(importedInputs.rxKohm ?? inputComponents.rxKohm ?? 51.1),
          cxNf: Number(importedInputs.cxNf ?? inputComponents.cxNf ?? 2.2),
          cyNf: Number(importedInputs.cyNf ?? inputComponents.cyNf ?? 2.7),
          rbootOhm: Number(importedInputs.rbootOhm ?? inputComponents.rbootOhm ?? 3.3),
          cbootNf: Number(importedInputs.cbootNf ?? inputComponents.cbootNf ?? 100),
          cvdrvUf: Number(importedInputs.cvdrvUf ?? inputComponents.cvdrvUf ?? 4.7),
          vdrvExtVoltage: Number(importedInputs.vdrvExtVoltage ?? 5.0),
          rvcinOhm: Number(importedInputs.rvcinOhm ?? 0),
          cvcinUf: Number(importedInputs.cvcinUf ?? 0.1),
          cvddUf: Number(importedInputs.cvddUf ?? 1.0),
          rpgoodKohm: Number(importedInputs.rpgoodKohm ?? 102),
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
            projectName={`SiC461_${inputs.vout}V_${inputs.ioutMax}A`}
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
