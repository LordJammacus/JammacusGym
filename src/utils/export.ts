import { db } from '@/db/database';

export interface ExportData {
  version: number;
  exportedAt: string;
  app: 'JammacusGym';
  data: Record<string, unknown[]>;
}

export async function exportAllData(): Promise<Blob> {
  const data: ExportData = await db.transaction('r', db.tables, async () => {
    const tables: Record<string, unknown[]> = {};
    for (const table of db.tables) {
      tables[table.name] = await table.toArray();
    }
    return {
      version: db.verno,
      exportedAt: new Date().toISOString(),
      app: 'JammacusGym',
      data: tables,
    };
  });

  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAsCSV(tableName: string): Promise<Blob> {
  const table = db.table(tableName);
  const rows = await table.toArray();
  if (rows.length === 0) return new Blob([''], { type: 'text/csv' });

  const headers = Object.keys(rows[0]!);
  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = (row as Record<string, unknown>)[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];

  return new Blob([csvRows.join('\n')], { type: 'text/csv' });
}
