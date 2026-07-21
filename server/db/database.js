import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = join(DATA_DIR, 'cybershop.db');

let rawDb;
let SQL;

function wrapDb(database) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          database.run(sql, params);
          const lastId = database.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
          return { lastInsertRowid: lastId, changes: database.getRowsModified() };
        },
        get(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            rows.push(row);
          }
          stmt.free();
          return rows;
        }
      };
    },
    exec(sql) {
      database.run(sql);
    },
    pragma(str) {
      try { database.run(`PRAGMA ${str}`); } catch {}
    }
  };
}

export async function getDb() {
  if (rawDb) return wrapDb(rawDb);
  
  SQL = await initSqlJs();
  
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    rawDb = new SQL.Database(buffer);
  } else {
    rawDb = new SQL.Database();
  }
  
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  rawDb.run(schema);
  
  saveDb();
  
  return wrapDb(rawDb);
}

export function saveDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function closeDb() {
  if (rawDb) {
    saveDb();
    rawDb.close();
    rawDb = null;
  }
}

process.on('exit', () => closeDb());
process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });
