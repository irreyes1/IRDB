import React, { useState, useRef, useEffect } from 'react';
import { Play, Sparkles, Loader2, Copy, Check, Save } from 'lucide-react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { TableSchema } from './Sidebar';

interface QueryEditorProps {
  sql: string;
  setSql: (sql: string) => void;
  onRun: (sql?: string) => void;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  isRunning: boolean;
  onSave?: (name: string, sql: string) => void;
  tables: TableSchema[];
  initialPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  currentName?: string;
  currentPath?: string;
}

export function QueryEditor({ sql, setSql, onRun, onGenerate, isGenerating, isRunning, onSave, tables, initialPrompt, onPromptChange, currentName, currentPath }: QueryEditorProps) {
  const [prompt, setPrompt] = React.useState(initialPrompt || '');
  const [copied, setCopied] = React.useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedPrompt, setSavedPrompt] = useState(false);
  const editorRef = useRef<any>(null);
  const onRunRef = useRef(onRun);

  // ... (useEffect for prompt and onRunRef remain same)

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrompt = e.target.value;
    setPrompt(newPrompt);
    onPromptChange?.(newPrompt);
  };

  const handleSavePrompt = async () => {
    if (!prompt.trim()) return;
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      setSavedPrompt(true);
      setTimeout(() => setSavedPrompt(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveClick = () => {
    if (currentPath && onSave && currentName) {
      // Direct save (overwrite)
      onSave(currentName, sql);
      // Show a small feedback?
    } else {
      // New save
      setSaveName(currentName || '');
      setShowSaveInput(true);
    }
  };

  const handleSaveInputConfirm = () => {
    if (saveName.trim() && onSave) {
      onSave(saveName, sql);
      setShowSaveInput(false);
      setSaveName('');
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add F9 Keybinding
    editor.addCommand(monaco.KeyCode.F9, () => {
      // Pass the current editor value to ensure we run what's on screen
      onRunRef.current(editor.getValue());
    });

    // Register Autocomplete
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Add Tables
        tables.forEach(table => {
          suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            range: range,
            detail: 'Table'
          });

          // Add Columns
          table.columns.forEach(col => {
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              range: range,
              detail: `${table.name} (${col.type})`
            });
          });
        });

        // Add Keywords (Basic set)
        const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'IS', 'NULL'];
        keywords.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range: range
          });
        });

        return { suggestions };
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* AI Prompt Section */}
      <div className="bg-slate-50 p-4 border-b border-slate-200">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Generador de Consultas IA
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-purple-500" />
            <input
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              onKeyDown={(e) => e.key === 'Enter' && onGenerate(prompt)}
              placeholder="Haz una pregunta en lenguaje natural (ej: 'Muestrame los top 5 sitios con mayor tráfico en la región Sur')"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
          <button
            onClick={handleSavePrompt}
            disabled={!prompt.trim()}
            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Guardar Prompt en Historial"
          >
            {savedPrompt ? <Check className="w-5 h-5 text-emerald-500" /> : <Save className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onGenerate(prompt)}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generar
          </button>
        </div>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
          <span className="text-xs font-mono text-slate-500">EDITOR SQL (F9 para Ejecutar) {currentPath ? `• ${currentName}` : ''}</span>
          <div className="flex items-center gap-2">
            {showSaveInput ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Nombre de Consulta..."
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500 w-32"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveInputConfirm()}
                />
                <button onClick={handleSaveInputConfirm} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setShowSaveInput(false)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveClick}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
                  title={currentPath ? "Guardar cambios" : "Guardar nueva consulta"}
                >
                  <Save className="w-4 h-4" />
                  <span className="text-xs font-medium">Guardar</span>
                </button>
                {currentPath && (
                   <button
                    onClick={() => { setSaveName(currentName || ''); setShowSaveInput(true); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                    title="Guardar como..."
                   >
                     <span className="text-[10px] font-bold">...</span>
                   </button>
                )}
              </div>
            )}
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              title="Copiar SQL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden bg-white relative">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sql}
            onChange={(value) => setSql(value || '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: '"Fira Code", "Fira Mono", monospace',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => onRun(sql)}
            disabled={isRunning || !sql.trim()}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all active:scale-95"
            title="Ejecutar Consulta (F9)"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Ejecutar Consulta
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
