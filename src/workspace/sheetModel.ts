import type { Sheet, CellWithRowAndCol } from '@fortune-sheet/core';
import type { SheetBook, SheetCell } from './workspaceApi';

/** What a cell holds as the user typed it: the formula text (starts with "=") when it has one, else the value. */
export type Input = string | number | boolean;
/** (sheet name, row, column) -> input. Rows and columns are 1-based, like the API. */
export type CellMap = Map<string, Input>;
/** Edits relative to a baseline: the new input, or null when the cell was cleared. */
export type Edits = Map<string, Input | null>;

const SEP = '\u0001';
export const cellKey = (sheet: string, row: number, col: number) => `${sheet}${SEP}${row}${SEP}${col}`;
export function parseKey(key: string) {
  const [sheet, row, col] = key.split(SEP);
  return { sheet, row: Number(row), col: Number(col) };
}

export function columnName(col: number): string {
  let s = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
export const addressOf = (row: number, col: number) => `${columnName(col)}${row}`;

function inputOfServerCell(cell: SheetCell | undefined): Input | undefined {
  if (!cell) return undefined;
  if (cell.f) return cell.f;
  const v = cell.v;
  return v === null || v === undefined || v === '' ? undefined : v;
}

export function bookToMap(book: SheetBook): CellMap {
  const map: CellMap = new Map();
  for (const sheet of book.sheets) {
    for (const [row, cols] of Object.entries(sheet.rows)) {
      for (const [col, cell] of Object.entries(cols)) {
        const input = inputOfServerCell(cell);
        if (input !== undefined) map.set(cellKey(sheet.name, Number(row), Number(col)), input);
      }
    }
  }
  return map;
}

/** The book with the edits laid over it (used to show unsaved edits again after a reload). */
export function applyEdits(book: SheetBook, edits: Edits): SheetBook {
  const copy: SheetBook = JSON.parse(JSON.stringify(book));
  for (const [key, value] of edits) {
    const { sheet, row, col } = parseKey(key);
    const tab = copy.sheets.find(s => s.name === sheet);
    if (!tab) continue;
    if (value === null) {
      delete tab.rows[row]?.[col];
      if (tab.rows[row] && Object.keys(tab.rows[row]).length === 0) delete tab.rows[row];
    } else {
      (tab.rows[row] ??= {})[col] = typeof value === 'string' && value.length > 1 && value.startsWith('=') ? { f: value } : { v: value };
    }
  }
  return copy;
}

// ---------- server model -> grid ----------

function toGridCell(cell: SheetCell): Record<string, unknown> {
  const f = cell.f || undefined;
  const v = cell.v;
  if (typeof v === 'number') return { v, m: String(v), ct: { fa: 'General', t: 'n' }, f };
  if (typeof v === 'boolean') return { v, m: v ? 'TRUE' : 'FALSE', ct: { fa: 'General', t: 'b' }, f };
  if (typeof v === 'string') return { v, m: v, ct: { fa: 'General', t: 's' }, f };
  return { f };
}

export function bookToGrid(book: SheetBook): { sheets: Sheet[]; needsCalc: boolean } {
  let needsCalc = false;
  const sheets = book.sheets.map((tab, index) => {
    const celldata: CellWithRowAndCol[] = [];
    let maxRow = 0;
    let maxCol = 0;
    for (const [row, cols] of Object.entries(tab.rows)) {
      for (const [col, cell] of Object.entries(cols)) {
        const r = Number(row);
        const c = Number(col);
        if (cell.f && (cell.v === null || cell.v === undefined)) needsCalc = true; // a formula typed in by someone has no result yet
        celldata.push({ r: r - 1, c: c - 1, v: toGridCell(cell) } as unknown as CellWithRowAndCol);
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      }
    }
    return {
      name: tab.name,
      id: `s${index}`,
      order: index,
      status: index === 0 ? 1 : 0,
      row: Math.max(100, maxRow + 30),
      column: Math.max(26, maxCol + 6),
      celldata,
    } as Sheet;
  });
  return { sheets, needsCalc };
}

// ---------- grid -> map ----------

function inputOfGridCell(cell: any): Input | undefined {
  if (!cell) return undefined;
  if (typeof cell.f === 'string' && cell.f.length > 0) return cell.f.startsWith('=') ? cell.f : `=${cell.f}`;
  let v = cell.v;
  if (cell.ct?.t === 'inlineStr' && Array.isArray(cell.ct.s)) v = cell.ct.s.map((x: { v?: string }) => x.v ?? '').join('');
  // the grid keeps what was typed as text and marks the type in ct.t, so convert back
  if (typeof v === 'string' && cell.ct?.t === 'n' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  if (typeof v === 'string' && cell.ct?.t === 'b' && /^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v === '' ? undefined : v;
  return undefined;
}

/** Flattens what the grid currently holds, whether it hands over a matrix (data) or a cell list (celldata). */
export function gridToMap(sheets: Sheet[]): CellMap {
  const map: CellMap = new Map();
  for (const sheet of sheets) {
    if (sheet.data) {
      sheet.data.forEach((row, r) => row?.forEach((cell, c) => {
        const input = inputOfGridCell(cell);
        if (input !== undefined) map.set(cellKey(sheet.name, r + 1, c + 1), input);
      }));
    } else if (sheet.celldata) {
      for (const item of sheet.celldata) {
        const input = inputOfGridCell((item as any).v);
        if (input !== undefined) map.set(cellKey(sheet.name, item.r + 1, item.c + 1), input);
      }
    }
  }
  return map;
}

export function diffMaps(base: CellMap, current: CellMap): Edits {
  const edits: Edits = new Map();
  for (const [key, value] of current) if (base.get(key) !== value) edits.set(key, value);
  for (const key of base.keys()) if (!current.has(key)) edits.set(key, null);
  return edits;
}

/**
 * Lays my unsaved edits over a freshly loaded sheet. An edit is kept when the cell is unchanged on the server since my
 * baseline (or I chose to keep mine); otherwise somebody else changed that cell, so it is dropped and reported.
 */
export function rebase(edits: Edits, oldBase: CellMap, newBase: CellMap, keepMine: Set<string> = new Set()): { kept: Edits; dropped: string[] } {
  const kept: Edits = new Map();
  const dropped: string[] = [];
  for (const [key, value] of edits) {
    const theirs = newBase.get(key);
    const same = (value ?? undefined) === theirs;
    if (same) continue; // the server already holds what I typed
    if (keepMine.has(key) || theirs === oldBase.get(key)) kept.set(key, value);
    else dropped.push(key);
  }
  return { kept, dropped };
}
