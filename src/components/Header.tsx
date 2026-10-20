import React from 'react';
import { Download, Upload, FileCode2, RotateCcw } from 'lucide-react';
import { PresetProfile } from '../types/calculator';
import { PRESET_PROFILES } from '../utils/presets';

interface HeaderProps {
  activeTab: 'schematic' | 'bom' | 'analysis';
  setActiveTab: (tab: 'schematic' | 'bom' | 'analysis') => void;
  selectedPresetId: string;
  onSelectPreset: (preset: PresetProfile) => void;
  onOpenPythonModal: () => void;
  onExportJson: () => void;
  onImportJsonClick: () => void;
  onResetDefaults: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedPresetId,
  onSelectPreset,
  onOpenPythonModal,
  onExportJson,
  onImportJsonClick,
  onResetDefaults,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm tracking-wider text-white shadow-sm">
          SiC
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block leading-tight">
            Vishay SiC461 Lab
          </span>
          <span className="text-xs text-slate-400 font-mono block leading-none">
            Synchronous Buck 4.5V-60V · 10A
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links & Presets */}
      <div className="hidden lg:flex items-center gap-6">
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('schematic')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'schematic'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Схема и номиналы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bom')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'bom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Спецификация BOM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Пульсации и КПД
          </button>
        </div>

        {/* Quick Presets Dropdown */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="whitespace-nowrap">Пресет:</span>
          <select
            value={selectedPresetId}
            onChange={(e) => {
              const p = PRESET_PROFILES.find((x) => x.id === e.target.value);
              if (p) onSelectPreset(p);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {PRESET_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zone 3: Primary Action & Quick Tools */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onImportJsonClick}
          title="Загрузить параметры из внешнего JSON файла"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap border border-slate-700"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Загрузить JSON</span>
        </button>

        <button
          type="button"
          onClick={onExportJson}
          title="Выгрузить параметры во внешний JSON файл"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap border border-slate-700"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Сохранить JSON</span>
        </button>

        <button
          type="button"
          onClick={onOpenPythonModal}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shadow-sm"
        >
          <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Python скрипт</span>
        </button>

        <a
          href="/sic461-calculator.zip"
          download="sic461-calculator.zip"
          title="Скачать полный проект в ZIP архиве для локального запуска"
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Скачать ZIP архив</span>
        </a>

        <button
          type="button"
          onClick={onResetDefaults}
          title="Сбросить к исходным настройкам"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
