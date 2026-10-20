import React, { useState } from 'react';
import { BomItem } from '../types/calculator';
import { Download, Copy, Check, FileSpreadsheet } from 'lucide-react';

interface BomTableProps {
  bomItems: BomItem[];
  projectName?: string;
}

export const BomTable: React.FC<BomTableProps> = ({
  bomItems,
  projectName = 'MPQ8626_Design',
}) => {
  const [copied, setCopied] = useState(false);

  const exportCsv = () => {
    const headers = [
      'Позиция (Designator)',
      'Вывод / Пин QFN-14',
      'Наименование / Описание',
      'Категория',
      'Номинал (Стандарт E24/E96)',
      'Расчетное значение',
      'Точность',
      'Требования к рейтингу (U/I)',
      'Корпус / Посадочное место',
      'Примечания инженера',
    ];

    const rows = bomItems.map((item) => [
      `"${item.designator}"`,
      `"${item.pinNumber}"`,
      `"${item.description}"`,
      `"${item.category}"`,
      `"${item.nominalValue}"`,
      `"${item.calculatedValue}"`,
      `"${item.tolerance}"`,
      `"${item.minRating}"`,
      `"${item.recommendedFootprint}"`,
      `"${item.notes}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}_BOM.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const text = bomItems
      .map(
        (i) =>
          `${i.designator}\t${i.pinNumber}\t${i.nominalValue}\t${i.minRating}\t${i.recommendedFootprint}\t${i.notes}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-5 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Спецификация компонентов (Bill of Materials)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Полный перечень элементов обвязки MPQ8626GD / IS6605A по выводам с рекомендованными рядами E24/E96 и запасами по напряжению/току
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Копировать таблицу</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт в Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* BOM Table */}
      <div className="flex-1 overflow-x-auto border border-slate-800 rounded-lg bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              <th className="p-3 whitespace-nowrap">Позиция</th>
              <th className="p-3 whitespace-nowrap">Вывод QFN-14</th>
              <th className="p-3 whitespace-nowrap">Номинал (E24/E96)</th>
              <th className="p-3 whitespace-nowrap">Расчетное</th>
              <th className="p-3 whitespace-nowrap">Точность</th>
              <th className="p-3 whitespace-nowrap">Рейтинг (U/I)</th>
              <th className="p-3 whitespace-nowrap">Корпус</th>
              <th className="p-3">Описание и рекомендации</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {bomItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                  {item.designator}
                </td>
                <td className="p-3 font-mono text-cyan-400 font-semibold whitespace-nowrap">
                  {item.pinNumber}
                </td>
                <td className="p-3 font-mono font-semibold text-emerald-400 whitespace-nowrap">
                  {item.nominalValue}
                </td>
                <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                  {item.calculatedValue}
                </td>
                <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                  {item.tolerance}
                </td>
                <td className="p-3 font-mono text-amber-300 whitespace-nowrap">
                  {item.minRating}
                </td>
                <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                  {item.recommendedFootprint}
                </td>
                <td className="p-3 font-sans text-slate-300">
                  <div className="font-medium text-white">{item.description}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
