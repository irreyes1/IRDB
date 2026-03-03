import React, { useState } from 'react';
import { AlertCircle, Download, Clipboard, Check } from 'lucide-react';

interface ResultsTableProps {
  data: any[];
  error: string | null;
  loading: boolean;
}

export function ResultsTable({ data, error, loading }: ResultsTableProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data || data.length === 0) return;
    
    // Create TSV string
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).join('\t')).join('\n');
    const text = `${headers}\n${rows}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Ejecutando consulta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 rounded-xl border border-red-100">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-red-800 font-medium mb-1">Error de Consulta</h3>
          <p className="text-red-600 text-sm font-mono bg-red-100 p-3 rounded-lg break-all">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
        <p className="text-slate-400 text-sm">No hay resultados para mostrar</p>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados</span>
          <span className="text-xs text-slate-400 font-mono">{data.length} filas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
            Copiar
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap bg-slate-50"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap font-mono">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
