import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Save, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [path, setPath] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings/path')
        .then(res => res.json())
        .then(data => setPath(data.path))
        .catch(() => {});
        
      fetch('/api/settings/apikey')
        .then(res => res.json())
        .then(data => {
          if (data.hasKey) setApiKey(data.key);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async () => {
    setStatus('saving');
    try {
      // Save Path
      const pathRes = await fetch('/api/settings/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const pathData = await pathRes.json();
      
      // Save API Key if changed (and not masked)
      if (apiKey && !apiKey.includes('***')) {
        await fetch('/api/settings/apikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        });
      }
      
      if (pathData.success) {
        setStatus('success');
        setMessage('Configuración guardada exitosamente');
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
          onClose();
        }, 1500);
      } else {
        setStatus('error');
        setMessage(pathData.error || 'Error al guardar configuración');
      }
    } catch (e) {
      setStatus('error');
      setMessage('Error de red');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Configuración</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ruta de Consultas Guardadas
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Carpeta local donde se guardarán tus consultas SQL.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="C:/Usuarios/Nombre/Documentos/Consultas"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gemini API Key
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Requerido para las funciones de Generación de Consultas IA.
            </p>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="AIzaSy..."
              />
            </div>
            <div className="mt-2 flex justify-end">
               <button
                onClick={async () => {
                  setStatus('saving');
                  setMessage('Probando conexión...');
                  try {
                    // First save the key
                    if (apiKey && !apiKey.includes('***')) {
                        await fetch('/api/settings/apikey', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ apiKey }),
                        });
                    }
                    
                    // Then test it
                    const res = await fetch('/api/test-ai', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        setStatus('success');
                        setMessage('✅ Conexión exitosa! La IA está lista.');
                    } else {
                        setStatus('error');
                        setMessage('❌ Error: ' + data.error);
                    }
                  } catch (e) {
                    setStatus('error');
                    setMessage('❌ Error de red durante la prueba');
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Probar Conexión
              </button>
            </div>
          </div>

          {message && (
            <div className={`text-sm p-3 rounded-lg ${
              status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
