import { db } from '@/db/database';
import type { ExportData } from './export';

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tables: { name: string; count: number }[];
  exportedAt: string | null;
}

export function validateImportData(raw: unknown): ImportValidation {
  const result: ImportValidation = {
    valid: false,
    errors: [],
    warnings: [],
    tables: [],
    exportedAt: null,
  };

  if (!raw || typeof raw !== 'object') {
    result.errors.push('Invalid JSON structure');
    return result;
  }

  const data = raw as Record<string, unknown>;

  if (data.app !== 'JammacusGym') {
    result.errors.push('Not a JammacusGym backup file');
    return result;
  }

  if (typeof data.version !== 'number') {
    result.errors.push('Missing schema version');
    return result;
  }

  if (data.version > db.verno) {
    result.errors.push(`Backup is from a newer version (v${data.version}). Update the app first.`);
    return result;
  }

  if (data.version < db.verno) {
    result.warnings.push(`Backup is from an older version (v${data.version}). Data will be migrated.`);
  }

  if (!data.data || typeof data.data !== 'object') {
    result.errors.push('No data tables found in backup');
    return result;
  }

  const tableData = data.data as Record<string, unknown>;
  const knownTables = new Set(db.tables.map(t => t.name));

  for (const [name, rows] of Object.entries(tableData)) {
    if (!Array.isArray(rows)) {
      result.warnings.push(`Table '${name}' has invalid format, will be skipped`);
      continue;
    }
    if (!knownTables.has(name)) {
      result.warnings.push(`Unknown table '${name}' will be skipped`);
      continue;
    }
    result.tables.push({ name, count: rows.length });
  }

  if (result.tables.length === 0) {
    result.errors.push('No valid tables found in backup');
    return result;
  }

  result.exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : null;
  result.valid = result.errors.length === 0;
  return result;
}

export async function importData(
  data: ExportData,
  strategy: 'replace' | 'merge',
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  const knownTables = new Set(db.tables.map(t => t.name));

  await db.transaction('rw', db.tables, async () => {
    if (strategy === 'replace') {
      for (const table of db.tables) {
        await table.clear();
      }
    }

    for (const [tableName, rows] of Object.entries(data.data)) {
      if (!Array.isArray(rows) || !knownTables.has(tableName)) {
        skipped += Array.isArray(rows) ? rows.length : 0;
        continue;
      }

      const table = db.table(tableName);

      if (strategy === 'replace') {
        await table.bulkPut(rows);
        imported += rows.length;
      } else {
        for (const row of rows) {
          const record = row as Record<string, unknown>;
          if (record.id) {
            const existing = await table.get(record.id);
            if (!existing) {
              await table.put(row);
              imported++;
            } else {
              const existingUpdated = (existing as Record<string, unknown>).updatedAt;
              const newUpdated = record.updatedAt;
              if (typeof existingUpdated === 'string' && typeof newUpdated === 'string' && newUpdated > existingUpdated) {
                await table.put(row);
                imported++;
              } else {
                skipped++;
              }
            }
          } else {
            await table.put(row);
            imported++;
          }
        }
      }
    }
  });

  return { imported, skipped };
}

export function readFileAsJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
