import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Default query storage path
let queryStoragePath = path.join(__dirname, 'queries');
if (!fs.existsSync(queryStoragePath)) {
  fs.mkdirSync(queryStoragePath, { recursive: true });
}

// Config file path
const configPath = path.join(__dirname, 'config.json');

// Helper to get API Key
const getApiKey = () => {
  // Check common environment variable names
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  if (process.env.API_KEY) return process.env.API_KEY;
  
  // Check config file
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.geminiApiKey;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Database Adapter Interface
interface DBAdapter {
  query(sql: string): Promise<any[]>;
  getTables(): Promise<any[]>;
  type: 'sqlite' | 'mysql';
}

let currentDb: DBAdapter | null = null;

// SQLite Adapter
class SQLiteAdapter implements DBAdapter {
  private db: Database.Database;
  type: 'sqlite' = 'sqlite';

  constructor() {
    this.db = new Database(':memory:');
    this.seed();
  }

  seed() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        site_id TEXT PRIMARY KEY,
        name TEXT,
        vendor TEXT,
        technology TEXT,
        region TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS kpis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT,
        date TEXT,
        availability REAL,
        traffic_erlang REAL,
        throughput_mbps REAL,
        FOREIGN KEY(site_id) REFERENCES sites(site_id)
      );
    `);

    const vendors = ['ERI', 'HUA', 'ZTE'];
    const technologies = ['2G', '3G', '4G', '5G'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const statuses = ['Active', 'Maintenance', 'Planned'];

    const stmtSite = this.db.prepare('INSERT INTO sites (site_id, name, vendor, technology, region, status) VALUES (?, ?, ?, ?, ?, ?)');
    const stmtKpi = this.db.prepare('INSERT INTO kpis (site_id, date, availability, traffic_erlang, throughput_mbps) VALUES (?, ?, ?, ?, ?)');

    const generateRandom = (min: number, max: number) => Math.random() * (max - min) + min;

    this.db.transaction(() => {
      for (let i = 1; i <= 100; i++) {
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];
        const tech = technologies[Math.floor(Math.random() * technologies.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const siteId = `${vendor.substring(0, 1)}${tech.substring(0, 1)}${i.toString().padStart(4, '0')}`;
        const name = `${vendor}-${tech}-Site-${i}`;

        stmtSite.run(siteId, name, vendor, tech, region, status);

        for (let d = 0; d < 7; d++) {
          const date = new Date();
          date.setDate(date.getDate() - d);
          const dateStr = date.toISOString().split('T')[0];
          
          stmtKpi.run(
            siteId,
            dateStr,
            generateRandom(95, 100),
            generateRandom(10, 500),
            generateRandom(5, 1000)
          );
        }
      }
    })();
    console.log('SQLite Mock Database seeded');
  }

  async query(sql: string): Promise<any[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  async getTables(): Promise<any[]> {
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
    return tables.map((t) => {
      const columns = this.db.prepare(`PRAGMA table_info(${t.name})`).all() as any[];
      return {
        name: t.name,
        columns: columns.map((c) => ({ name: c.name, type: c.type }))
      };
    });
  }
}

// MySQL Adapter
class MySQLAdapter implements DBAdapter {
  private pool: mysql.Pool;
  type: 'mysql' = 'mysql';

  constructor(config: mysql.PoolOptions) {
    this.pool = mysql.createPool({
      ...config,
      // Compatibility options for legacy servers
      insecureAuth: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      connectTimeout: 10000, // 10 seconds timeout
      // Only use SSL if explicitly requested. Forcing it can cause hangs on non-SSL servers.
      ssl: config.ssl
    });
  }

  async query(sql: string): Promise<any[]> {
    const [rows] = await this.pool.query(sql);
    return rows as any[];
  }

  async getTables(): Promise<any[]> {
    const [rows] = await this.pool.query(`
      SELECT TABLE_NAME as name, COLUMN_NAME as col_name, DATA_TYPE as col_type 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    
    const tables: Record<string, any> = {};
    (rows as any[]).forEach((row) => {
      if (!tables[row.name]) {
        tables[row.name] = { name: row.name, columns: [] };
      }
      tables[row.name].columns.push({ name: row.col_name, type: row.col_type });
    });

    return Object.values(tables);
  }
}

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', connected: !!currentDb, type: currentDb?.type });
});

app.post('/api/connect', async (req, res) => {
  try {
    const { type, config } = req.body;
    
    if (type === 'sqlite') {
      currentDb = new SQLiteAdapter();
    } else if (type === 'mysql') {
      currentDb = new MySQLAdapter(config);
      // Test connection
      await currentDb.query('SELECT 1');
    } else {
      return res.status(400).json({ error: 'Invalid database type' });
    }
    
    res.json({ status: 'connected', type });
  } catch (error: any) {
    console.error('Connection failed:', error);
    currentDb = null;
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/disconnect', (req, res) => {
  currentDb = null;
  res.json({ status: 'disconnected' });
});

app.post('/api/query', async (req, res) => {
  if (!currentDb) return res.status(400).json({ error: 'Database not connected' });
  
  try {
    const { sql } = req.body;
    // Allow any query for now, but be careful
    const data = await currentDb.query(sql);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tables', async (req, res) => {
  if (!currentDb) return res.json({ tables: [] });

  try {
    const tables = await currentDb.getTables();
    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings API
app.get('/api/settings/path', (req, res) => {
  res.json({ path: queryStoragePath });
});

app.post('/api/settings/path', (req, res) => {
  const { path: newPath } = req.body;
  if (newPath && fs.existsSync(newPath)) {
    queryStoragePath = newPath;
    res.json({ success: true, path: queryStoragePath });
  } else {
    // Try to create it
    try {
      fs.mkdirSync(newPath, { recursive: true });
      queryStoragePath = newPath;
      res.json({ success: true, path: queryStoragePath });
    } catch (e) {
      res.status(400).json({ error: 'Invalid path or permission denied' });
    }
  }
});

app.get('/api/settings/apikey', (req, res) => {
  const key = getApiKey();
  // Return masked key if exists
  res.json({ hasKey: !!key, key: key ? '****************' : '' });
});

app.post('/api/settings/apikey', (req, res) => {
  const { apiKey } = req.body;
  try {
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    config.geminiApiKey = apiKey;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Saved Queries API
const ensureDefaultFolders = () => {
  const vendors = ['Ericsson', 'Huawei', 'ZTE'];
  const technologies = ['2G', '3G', '4G', '5G'];
  
  vendors.forEach(vendor => {
    const vendorPath = path.join(queryStoragePath, vendor);
    if (!fs.existsSync(vendorPath)) {
      fs.mkdirSync(vendorPath, { recursive: true });
    }
    technologies.forEach(tech => {
      const techPath = path.join(vendorPath, tech);
      if (!fs.existsSync(techPath)) {
        fs.mkdirSync(techPath, { recursive: true });
      }
    });
  });
  
  // Also ensure the other requested folders exist
  const otherFolders = ['Consultas Multivendor', 'Consultas Multitecnologia'];
  otherFolders.forEach(folder => {
    const folderPath = path.join(queryStoragePath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  });
};

// Helper to recursively get files
const getFilesRecursively = (dir: string, relativePath = ''): any[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'folder',
        children: getFilesRecursively(fullPath, relPath)
      });
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'file',
        content: fs.readFileSync(fullPath, 'utf-8')
      });
    }
  }
  return nodes;
};

app.get('/api/queries', (req, res) => {
  try {
    ensureDefaultFolders();
    const queries = getFilesRecursively(queryStoragePath);
    res.json({ queries });
  } catch (e) {
    res.json({ queries: [] });
  }
});

app.post('/api/queries/move', (req, res) => {
  const { sourcePath, targetPath } = req.body;
  try {
    const fullSource = path.join(queryStoragePath, sourcePath);
    const fullTarget = path.join(queryStoragePath, targetPath);
    
    // Check if source exists
    if (!fs.existsSync(fullSource)) {
      return res.status(404).json({ error: 'Source file not found' });
    }

    // Determine final destination path
    let finalDest = fullTarget;
    
    // If target is a directory, we are moving the file INTO it
    if (fs.existsSync(fullTarget) && fs.lstatSync(fullTarget).isDirectory()) {
      finalDest = path.join(fullTarget, path.basename(fullSource));
    } else {
       // If target doesn't exist, we might be renaming or moving to a new path
       // But for drag and drop to folder, the targetPath sent from frontend will likely be the folder path.
       // Let's assume targetPath is the folder we dropped onto.
       // If the frontend sends the full new path, we use it.
       // Let's assume the frontend sends the FOLDER path as targetPath.
       finalDest = path.join(fullTarget, path.basename(fullSource));
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(finalDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.renameSync(fullSource, finalDest);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/queries', (req, res) => {
  const { name, sql, filePath } = req.body;
  try {
    // If filePath is provided, we are overwriting/saving to a specific location
    // If only name is provided, we save to root (legacy behavior support)
    
    let targetPath;
    if (filePath) {
       targetPath = path.join(queryStoragePath, filePath);
    } else {
       const fileName = name.endsWith('.sql') ? name : `${name}.sql`;
       targetPath = path.join(queryStoragePath, fileName);
    }

    // Ensure directory exists if saving to a nested path
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, sql);
    res.json({ success: true, path: path.relative(queryStoragePath, targetPath) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/queries', (req, res) => {
  const { filePath } = req.body;
  try {
    const targetPath = path.join(queryStoragePath, filePath);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Saved Prompts API
const promptsPath = path.join(__dirname, 'prompts.json');

app.get('/api/prompts', (req, res) => {
  try {
    if (fs.existsSync(promptsPath)) {
      const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
      res.json({ prompts });
    } else {
      res.json({ prompts: [] });
    }
  } catch (e) {
    res.json({ prompts: [] });
  }
});

app.post('/api/prompts', (req, res) => {
  const { prompt } = req.body;
  try {
    let prompts: string[] = [];
    if (fs.existsSync(promptsPath)) {
      prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
    }
    if (!prompts.includes(prompt)) {
      prompts.push(prompt);
      fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    }
    res.json({ success: true, prompts });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/prompts', (req, res) => {
  const { prompt } = req.body;
  try {
    let prompts: string[] = [];
    if (fs.existsSync(promptsPath)) {
      prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
    }
    prompts = prompts.filter(p => p !== prompt);
    fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2));
    res.json({ success: true, prompts });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/generate-sql', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = getApiKey();
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured. Please set it in Settings.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const schemaContext = `
      You are a SQL expert. Convert the user's natural language request into a SQL query.
      The database is SQLite.
      
      Schema:
      CREATE TABLE sites (
        site_id TEXT PRIMARY KEY,
        name TEXT,
        vendor TEXT, -- Values: 'ERI', 'HUA', 'ZTE'
        technology TEXT, -- Values: '2G', '3G', '4G', '5G'
        region TEXT, -- Values: 'North', 'South', 'East', 'West', 'Central'
        status TEXT -- Values: 'Active', 'Maintenance', 'Planned'
      );

      CREATE TABLE kpis (
        id INTEGER PRIMARY KEY,
        site_id TEXT, -- Foreign key to sites.site_id
        date TEXT, -- Format: YYYY-MM-DD
        availability REAL, -- Percentage 0-100
        traffic_erlang REAL,
        throughput_mbps REAL
      );
      
      Return ONLY the SQL query. Do not use markdown formatting like \`\`\`sql.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { role: 'user', parts: [{ text: schemaContext }] },
        { role: 'user', parts: [{ text: `Generate SQL for: ${prompt}` }] }
      ]
    });

    const sql = result.text?.replace(/```sql/g, '').replace(/```/g, '').trim();
    res.json({ sql });

  } catch (error: any) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Server Setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from dist
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // Handle SPA fallback
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
