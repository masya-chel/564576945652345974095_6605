import React, { useState } from 'react';
import { Download, Copy, Check, X, FileCode2, Terminal } from 'lucide-react';
import { generatePythonScript } from '../utils/pythonGenerator';
import { CalculatorInputs } from '../types/calculator';

interface PythonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: CalculatorInputs;
}

export const PythonExportModal: React.FC<PythonExportModalProps> = ({
  isOpen,
  onClose,
  inputs,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = generatePythonScript(inputs);

  const handleDownload = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sic461_calculator.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-blue-600/20 text-cyan-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Автономный Python-скрипт (sic461_calculator.py)
              </h3>
              <p className="text-xs text-slate-400">
                Чистый Python 3 без сторонних зависимостей. Поддерживает работу в консоли и импорт/экспорт JSON.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal usage hint */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs flex items-center gap-3 text-slate-300">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            <span>Запуск: <code className="text-cyan-300 font-bold">python sic461_calculator.py</code></span>
            <span>С файлом JSON: <code className="text-cyan-300 font-bold">python sic461_calculator.py my_config.json</code></span>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-950/90 font-mono text-xs leading-relaxed text-slate-300">
          <pre className="select-all">{pythonCode}</pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Содержит текущие рассчитанные параметры ({inputs.vinNom}В → {inputs.vout}В @ {inputs.ioutMax}А)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Копировать код</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Скачать .py файл</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
