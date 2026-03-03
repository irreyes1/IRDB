import React, { useState } from 'react';
import { Database, Server, Shield, Key, Globe, Loader2 } from 'lucide-react';

interface ConnectionManagerProps {
  onConnect: () => void;
}

export function ConnectionManager({ onConnect }: ConnectionManagerProps) {
  const [mode, setMode] = useState<'mysql' | 'sqlite'>('mysql');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [config, setConfig] = useState({
    host: '',
    user: '',
    password: '',
    database: '',
    port: '3306'
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          config: mode === 'mysql' ? {
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database,
            port: parseInt(config.port)
          } : {}
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      onConnect();
    } catch (err: any) {
      let errorMessage = err.message;
      
      // Add helpful hint for private IP timeouts
      if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
        const isPrivateIp = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(config.host);
        if (isPrivateIp) {
          errorMessage += ` (Nota: El servidor en la nube no puede acceder a la IP privada ${config.host}. Usa el Modo Demo o una IP pública.)`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Conectar a IRDB</h1>
            <p className="text-xs text-slate-500">Sistema de Gestión de Base de Datos</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('mysql')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'mysql' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Base de Datos Remota
            </button>
            <button
              onClick={() => setMode('sqlite')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'sqlite' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Modo Demo
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-4">
            {mode === 'mysql' ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Host</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="ej: 10.118.249.195"
                      value={config.host}
                      onChange={e => setConfig({ ...config, host: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Usuario</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Usuario"
                        value={config.user}
                        onChange={e => setConfig({ ...config, user: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Puerto</label>
                    <input
                      type="number"
                      required
                      value={config.port}
                      onChange={e => setConfig({ ...config, port: e.target.value })}
                      className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Contraseña</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={config.password}
                      onChange={e => setConfig({ ...config, password: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Base de Datos</label>
                  <div className="relative">
                    <Database className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="ej: ETLDB"
                      value={config.database}
                      onChange={e => setConfig({ ...config, database: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                <p className="font-medium mb-1">Modo Demo</p>
                <p className="opacity-80">Esto cargará una base de datos temporal en memoria con datos de ejemplo (Sitios, KPIs) para pruebas.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
