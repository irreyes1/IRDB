import React from 'react';
import { Columns, Table, Type, Key } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface TableSchema {
  name: string;
  columns: Column[];
}

interface RightSidebarProps {
  selectedTable: TableSchema | null;
  onInsertText: (text: string) => void;
}

export function RightSidebar({ selectedTable, onInsertText }: RightSidebarProps) {
  const handleDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
  };

  if (!selectedTable) {
    return (
      <div className="w-64 bg-slate-50 border-l border-slate-200 p-4 flex flex-col items-center justify-center text-slate-400">
        <Table className="w-12 h-12 mb-2 opacity-20" />
        <p className="text-sm text-center">Selecciona una tabla para ver su esquema</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <Table className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-slate-800 truncate" title={selectedTable.name}>
            {selectedTable.name}
          </h2>
        </div>
        <p className="text-xs text-slate-500">{selectedTable.columns.length} columnas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {selectedTable.columns.map((col) => (
            <div
              key={col.name}
              draggable
              onDragStart={(e) => handleDragStart(e, col.name)}
              onDoubleClick={() => onInsertText(col.name)}
              className="group flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer select-none"
              title="Doble-click para insertar nombre de columna"
            >
              <div className="min-w-[20px]">
                {col.name.toLowerCase() === 'id' ? (
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Columns className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate" title={col.name}>
                  {col.name}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Type className="w-3 h-3" />
                  <span className="truncate">{col.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
