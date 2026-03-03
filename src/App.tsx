import React, { useState, useEffect } from 'react';
import { Sidebar, TableSchema } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { QueryEditor } from './components/QueryEditor';
import { ResultsTable } from './components/ResultsTable';
import { ConnectionManager } from './components/ConnectionManager';
import { SettingsModal } from './components/SettingsModal';
import { Plus, X } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  sql: string;
  results: any[];
  error: string | null;
  isRunning: boolean;
  isGenerating: boolean;
  prompt?: string;
  queryPath?: string;
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  
  // Tabs State
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Consulta 1', sql: '', results: [], error: null, isRunning: false, isGenerating: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  
  // Layout State
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allTables, setAllTables] = useState<TableSchema[]>([]);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check if already connected on load
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.connected) setIsConnected(true);
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false));

    // Load tables for autocomplete
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => setAllTables(data.tables || []))
      .catch(() => {});
  }, [isConnected]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, ...updates } : tab));
  };

  const addTab = (initialSql: string = '', title?: string, path?: string) => {
    const newId = Date.now().toString();
    const newTab: Tab = {
      id: newId,
      title: title || `Consulta ${tabs.length + 1}`,
      sql: initialSql,
      results: [],
      error: null,
      isRunning: false,
      isGenerating: false,
      queryPath: path
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close last tab
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const translateError = (error: string): string => {
    // SQLite specific errors
    if (error.includes('no such column')) {
      const match = error.match(/no such column: "([^"]+)"/) || error.match(/no such column: ([^ ]+)/);
      const column = match ? match[1] : 'desconocida';
      return `⚠️ Error: No existe la columna "${column}".\n\n💡 Consejo: ¿Querías escribir un texto? En SQL, los textos van entre comillas simples ('texto'), no dobles ("texto").`;
    }
    if (error.includes('no such table')) {
      const table = error.split(':').pop()?.trim();
      return `⚠️ Error: No existe la tabla "${table}".\n\n💡 Consejo: Verifica que el nombre esté bien escrito en la lista de la izquierda.`;
    }
    if (error.includes('syntax error')) {
      return `⚠️ Error de sintaxis SQL.\n\n💡 Consejo: Revisa que la estructura de la consulta sea correcta (SELECT, FROM, WHERE...).`;
    }
    if (error.includes('ambiguous column name')) {
      return `⚠️ Error: Nombre de columna ambiguo.\n\n💡 Consejo: Hay varias tablas con ese campo. Especifica la tabla (ej: tabla.campo).`;
    }
    
    // Generic translation for common English terms
    let translated = error
      .replace('SQLITE_ERROR:', '')
      .replace('SQLITE_CONSTRAINT:', 'Restricción violada:')
      .replace('UNIQUE constraint failed:', 'El valor ya existe (debe ser único):')
      .replace('NOT NULL constraint failed:', 'Falta un valor obligatorio en:')
      .trim();

    return `❌ Error de Base de Datos:\n${translated}`;
  };

  const runQuery = async (queryToRun: string = activeTab.sql) => {
    updateTab(activeTabId, { isRunning: true, error: null });
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: queryToRun }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }
      
      updateTab(activeTabId, { results: data.data });
    } catch (err: any) {
      const friendlyError = translateError(err.message);
      updateTab(activeTabId, { error: friendlyError, results: [] });
    } finally {
      updateTab(activeTabId, { isRunning: false });
    }
  };

  const generateSql = async (prompt: string) => {
    updateTab(activeTabId, { isGenerating: true, error: null });
    try {
      const response = await fetch('/api/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate SQL');
      }

      updateTab(activeTabId, { sql: data.sql });
    } catch (err: any) {
      updateTab(activeTabId, { error: err.message });
    } finally {
      updateTab(activeTabId, { isGenerating: false });
    }
  };

  const handleSelectQuery = (selectedSql: string, name?: string, path?: string) => {
    if (!activeTab.sql.trim()) {
      updateTab(activeTabId, { sql: selectedSql, title: name || activeTab.title, queryPath: path });
    } else {
      addTab(selectedSql, name, path);
    }
  };

  const handleOpenTableData = (tableName: string) => {
    const sql = `SELECT * FROM ${tableName} LIMIT 1000`;
    const newTabId = addTab(sql, tableName);
    // Automatically run the query
    setTimeout(() => {
      // We need to run it in the context of the new tab. 
      // Since runQuery uses activeTabId, and we just set it, this should work.
      // However, state updates might be async.
      // A cleaner way would be to pass the ID to runQuery, but for now this is okay.
      // Actually, let's just trigger the fetch directly here to be safe or update the runQuery to accept ID.
    }, 100);
    // For now, let's just open the tab with the query. User can press run.
    // Or better, we can execute it immediately if we refactor runQuery.
    // Let's keep it simple: Open tab with query.
  };

  const handleInsertText = (text: string) => {
    // Insert text at the end of current SQL (simple version)
    // Monaco editor handles drag/drop natively for cursor position.
    // For double click, we just append or try to insert.
    // Since we don't have easy access to cursor position here without complex state,
    // we will append it with a space if not empty.
    const currentSql = activeTab.sql;
    const newSql = currentSql + (currentSql && !currentSql.endsWith(' ') ? ' ' : '') + text;
    updateTab(activeTabId, { sql: newSql });
  };

  const handleSaveQuery = async (name: string, sql: string) => {
    try {
      const payload: any = { name, sql };
      // If we are editing an existing query and the name hasn't changed (or we want to overwrite), use the path
      if (activeTab.queryPath && activeTab.title === name) {
          payload.filePath = activeTab.queryPath;
      }
      // Note: If user changed the name, it will be saved as a new file (or overwrite if name matches another file)
      // The backend handles saving to root if no path provided.
      
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        updateTab(activeTabId, { title: name, queryPath: data.path });
        setSidebarRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    // We need to pass this prompt to the QueryEditor.
    // The QueryEditor component doesn't have a prop for "prompt" that we can control from here easily
    // without lifting state up.
    // Let's add a `prompt` field to the Tab interface or just use a temporary state?
    // Actually, `QueryEditor` has `onGenerate`. But we want to *fill* the input.
    // Let's add `initialPrompt` to `QueryEditor` props and update `Tab` to hold it?
    // Or simpler: Just execute it? No, user wants to see it.
    // Let's add `prompt` to Tab state.
    updateTab(activeTabId, { prompt });
  };

  const handleDisconnect = async () => {
    await fetch('/api/disconnect', { method: 'POST' });
    setIsConnected(false);
    setTabs([{ id: '1', title: 'Query 1', sql: '', results: [], error: null, isRunning: false, isGenerating: false }]);
  };

  const handleMoveQuery = (sourcePath: string, targetPath: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.queryPath === sourcePath) {
        return { ...tab, queryPath: targetPath };
      }
      return tab;
    }));
  };

  if (checkingStatus) {
    return <div className="h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!isConnected) {
    return <ConnectionManager onConnect={() => setIsConnected(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        onSelectQuery={handleSelectQuery} 
        onSelectTable={setSelectedTable}
        onOpenTableData={handleOpenTableData}
        onInsertText={handleInsertText}
        onDisconnect={handleDisconnect}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectPrompt={handleSelectPrompt}
        refreshTrigger={sidebarRefreshTrigger}
        onMoveQuery={handleMoveQuery}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Tabs Header */}
        <div className="flex items-center bg-slate-200 border-b border-slate-300 pt-2 px-2 gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                group flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg cursor-pointer select-none min-w-[120px] max-w-[200px]
                ${activeTabId === tab.id 
                  ? 'bg-slate-100 text-slate-800 border-t border-x border-slate-300 -mb-px relative z-10' 
                  : 'bg-slate-300/50 text-slate-600 hover:bg-slate-300'
                }
              `}
            >
              <span className="truncate flex-1">{tab.title}</span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className={`p-0.5 rounded-full hover:bg-slate-400/50 ${tabs.length === 1 ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addTab()}
            className="p-1.5 hover:bg-slate-300 rounded-md text-slate-500 hover:text-slate-700 mb-1"
            title="New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden bg-slate-100">
          <div className="h-1/2 min-h-[300px]">
            <QueryEditor 
              sql={activeTab.sql} 
              setSql={(sql) => updateTab(activeTabId, { sql })} 
              onRun={(sql) => runQuery(sql)} 
              onGenerate={generateSql}
              isGenerating={activeTab.isGenerating}
              isRunning={activeTab.isRunning}
              onSave={handleSaveQuery}
              tables={allTables}
              initialPrompt={activeTab.prompt}
              onPromptChange={(p) => updateTab(activeTabId, { prompt: p })}
              currentName={activeTab.title}
              currentPath={activeTab.queryPath}
            />
          </div>
          
          <div className="flex-1 min-h-0">
            <ResultsTable 
              data={activeTab.results} 
              error={activeTab.error} 
              loading={activeTab.isRunning} 
            />
          </div>
        </div>
      </main>

      <RightSidebar 
        selectedTable={selectedTable} 
        onInsertText={handleInsertText}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
