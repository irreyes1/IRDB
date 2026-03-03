import React, { useEffect, useState } from 'react';
import { Database, Server, Signal, Activity, Folder, ChevronRight, ChevronDown, Search, Settings, Table, Columns, FileText, RefreshCw, ExternalLink, MessageSquare, Trash2 } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

interface SidebarProps {
  onSelectQuery: (sql: string, name?: string, path?: string) => void;
  onSelectTable: (table: TableSchema) => void;
  onOpenTableData: (tableName: string) => void;
  onInsertText: (text: string) => void;
  onDisconnect?: () => void;
  onOpenSettings: () => void;
  onSelectPrompt: (prompt: string) => void;
  refreshTrigger?: number;
  onMoveQuery?: (sourcePath: string, targetPath: string) => void;
}

export interface TableSchema {
  name: string;
  columns: { name: string; type: string }[];
}

export function Sidebar({ onSelectQuery, onSelectTable, onOpenTableData, onInsertText, onDisconnect, onOpenSettings, onSelectPrompt, refreshTrigger, onMoveQuery }: SidebarProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [savedQueries, setSavedQueries] = useState<FileNode[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState({
    tables: true,
    queries: true,
    prompts: true
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setRefreshing(true);
    // Load Tables
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => setTables(data.tables || []))
      .catch(err => console.error('Failed to load tables', err));

    // Load Queries
    fetch('/api/queries')
      .then(res => res.json())
      .then(data => setSavedQueries(data.queries || []))
      .catch(err => console.error('Failed to load queries', err));

    // Load Prompts
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => setSavedPrompts(data.prompts || []))
      .catch(err => console.error('Failed to load prompts', err))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const deletePrompt = async (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this prompt?')) return;
    
    try {
      await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteQuery = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres eliminar esta consulta?')) return;
    
    try {
      await fetch('/api/queries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleSection = (section: 'tables' | 'queries' | 'prompts') => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ path: node.path, type: node.type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTableDragStart = (e: React.DragEvent, text: string) => {
    e.dataTransfer.setData('text/plain', text);
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const { path: sourcePath, type } = JSON.parse(data);
      if (type !== 'file') return; // Only move files for now
      if (sourcePath === targetNode.path) return; // Can't move to self

      // Call API to move
      await fetch('/api/queries/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath, targetPath: targetNode.path })
      });
      
      // Calculate new path to notify parent
      // Assuming simple move to folder
      const fileName = sourcePath.split('/').pop() || sourcePath.split('\\').pop();
      // targetNode.path is the folder path. 
      // We need to handle path separators carefully, but for now assuming forward slashes from API
      const newPath = targetNode.path ? `${targetNode.path}/${fileName}` : fileName;
      
      onMoveQuery?.(sourcePath, newPath || '');

      loadData();
    } catch (err) {
      console.error('Drop failed', err);
    }
  };

  const renderFileTree = (nodes: FileNode[]) => {
    return nodes.map(node => {
      if (node.type === 'folder') {
        const isExpanded = expandedFolders[node.path];
        
        return (
          <div 
            key={node.path} 
            className="ml-2"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, node)}
          >
            <button 
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <Folder className={`w-3.5 h-3.5 ${isExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="truncate">{node.name}</span>
              {isExpanded ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
            {isExpanded && node.children && (
              <div className="border-l border-slate-800 ml-2.5 pl-1">
                {renderFileTree(node.children)}
              </div>
            )}
          </div>
        );
      } else {
        // File
        if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;
        
        return (
          <div 
            key={node.path} 
            className="group relative flex items-center ml-2"
            draggable
            onDragStart={(e) => handleDragStart(e, node)}
          >
             <button
              onClick={() => onSelectQuery(node.content || '', node.name, node.path)}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-800 hover:text-white rounded-md flex items-center gap-2 truncate pr-8"
              title={node.name}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-400 shrink-0" />
              <span className="truncate text-slate-300 group-hover:text-white">{node.name}</span>
            </button>
            <button
                onClick={(e) => deleteQuery(node.path, e)}
                className="absolute right-1 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar consulta"
            >
                <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      }
    });
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-emerald-400" />
          <h1 className="font-bold text-white tracking-tight">IRDB Manager</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tablas y consultas..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        
        {/* Database Tables Tree */}
        <div>
          <button 
            onClick={() => toggleSection('tables')}
            className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              {sections.tables ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Tablas de Base de Datos
            </div>
            <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{filteredTables.length}</span>
          </button>
          
          {sections.tables && (
            <div className="mt-1 ml-2 space-y-0.5">
              {filteredTables.map(table => (
                <div 
                  key={table.name}
                  className="group flex items-center gap-1 hover:bg-slate-800 rounded-md pr-1"
                >
                  <button
                    onClick={() => onSelectTable(table)}
                    onDoubleClick={() => onInsertText(table.name)}
                    draggable
                    onDragStart={(e) => handleTableDragStart(e, table.name)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm transition-colors text-left overflow-hidden"
                    title="Click para ver esquema, Doble-click para insertar nombre"
                  >
                    <Table className="w-4 h-4 text-blue-400/70 group-hover:text-blue-400 shrink-0" />
                    <span className="font-medium text-slate-300 group-hover:text-white truncate">{table.name}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenTableData(table.name); }}
                    className="p-1 text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Abrir Datos de Tabla"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {filteredTables.length === 0 && (
                <p className="text-xs text-slate-600 px-4 py-2 italic">No se encontraron tablas</p>
              )}
            </div>
          )}
        </div>

        {/* Saved Queries Tree */}
        <div>
          <button 
            onClick={() => toggleSection('queries')}
            className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              {sections.queries ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Consultas Guardadas
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); loadData(); }}
              className={`p-1 hover:text-white ${refreshing ? 'animate-spin' : ''}`}
              title="Actualizar"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </button>

          {sections.queries && (
            <div className="mt-1 ml-2 space-y-0.5">
              {savedQueries.length > 0 ? renderFileTree(savedQueries) : (
                <p className="text-xs text-slate-600 px-4 py-2 italic">No hay consultas guardadas</p>
              )}
            </div>
          )}
        </div>

        {/* AI Prompts Tree */}
        <div>

          <button 
            onClick={() => toggleSection('prompts')}
            className="w-full flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              {sections.prompts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Prompts IA
            </div>
          </button>

          {sections.prompts && (
            <div className="mt-1 ml-2 space-y-0.5">
              {/* Starter Prompts */}
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-600 uppercase">Ejemplos</div>
              {[
                "Sitios activos de HUA en la región Norte",
                "Top 5 sitios con mayor tráfico ayer",
                "Promedio de disponibilidad por tecnología",
                "Sitios con throughput bajo (< 10 Mbps)"
              ].filter(p => p.toLowerCase().includes(searchTerm.toLowerCase())).map((prompt, i) => (
                <button
                  key={`starter-${i}`}
                  onClick={() => onSelectPrompt(prompt)}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-800 hover:text-white rounded-md flex items-center gap-2 group"
                  title={prompt}
                >
                  <MessageSquare className="w-4 h-4 text-purple-400/70 group-hover:text-purple-400 shrink-0" />
                  <span className="truncate text-slate-300 group-hover:text-white">{prompt}</span>
                </button>
              ))}

              {/* Saved Prompts */}
              {savedPrompts.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-600 uppercase mt-2">Historial Guardado</div>
                  {savedPrompts.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase())).map((prompt, i) => (
                    <div key={`saved-${i}`} className="group relative flex items-center">
                        <button
                        onClick={() => onSelectPrompt(prompt)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-800 hover:text-white rounded-md flex items-center gap-2 truncate pr-8"
                        title={prompt}
                        >
                        <MessageSquare className="w-4 h-4 text-blue-400/70 group-hover:text-blue-400 shrink-0" />
                        <span className="truncate text-slate-300 group-hover:text-white">{prompt}</span>
                        </button>
                        <button
                            onClick={(e) => deletePrompt(prompt, e)}
                            className="absolute right-1 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 space-y-1">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-2 hover:text-white transition-colors w-full py-1.5 px-2 rounded hover:bg-slate-800"
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>
        <button 
          onClick={onDisconnect}
          className="flex items-center gap-2 hover:text-red-400 transition-colors w-full py-1.5 px-2 rounded hover:bg-slate-800"
        >
          <Server className="w-4 h-4" />
          <span>Desconectar</span>
        </button>
        <div className="flex items-center gap-2 px-2 pt-2 border-t border-slate-800/50 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Conectado
        </div>
      </div>
    </div>
  );
}

