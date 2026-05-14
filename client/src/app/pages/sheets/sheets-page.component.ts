import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  Cell,
  CellMap,
  CellStyle,
  addrToKey,
  colToLetters,
  computeCell,
  formatComputed,
  keyToAddr,
} from './sheets.engine';

const STORAGE_KEY = 'tz-sheets-v1';
const DEFAULT_COLS = 26;  // A..Z
const DEFAULT_ROWS = 100;

export interface Sheet {
  id: string;
  name: string;
  cells: CellMap;
  cols: number;
  rows: number;
}

export interface Workbook {
  sheets: Sheet[];
  activeSheetId: string;
}

@Component({
  selector: 'app-sheets-page',
  standalone: true,
  imports: [FormsModule, NgStyle, TranslatePipe],
  templateUrl: './sheets-page.component.html',
})
export class SheetsPageComponent {
  readonly overlay = inject(OverlayService);

  // Expose engine helpers to template
  readonly addrToKey = addrToKey;
  readonly keyToAddr = keyToAddr;
  readonly Math = Math;

  @ViewChild('formulaInput') formulaInputRef?: ElementRef<HTMLInputElement>;

  readonly workbook = signal<Workbook>(this.loadOrCreate());
  readonly selected = signal<string>('A1'); // active cell key
  readonly editing = signal<string | null>(null); // cell being edited
  readonly editValue = signal<string>('');

  // Selection range (for multi-cell selection)
  readonly selectionAnchor = signal<string | null>(null); // start of selection
  readonly selectionEnd = signal<string | null>(null);    // end of selection

  readonly activeSheet = computed<Sheet>(() => {
    const wb = this.workbook();
    return wb.sheets.find(s => s.id === wb.activeSheetId) ?? wb.sheets[0];
  });

  readonly cols = computed(() => Array.from({ length: this.activeSheet().cols }, (_, i) => colToLetters(i)));
  readonly rows = computed(() => Array.from({ length: this.activeSheet().rows }, (_, i) => i + 1));

  // Compute all cell values (cached per change of workbook + activeSheet)
  readonly computedCells = computed<Record<string, string>>(() => {
    const s = this.activeSheet();
    const out: Record<string, string> = {};
    for (const key of Object.keys(s.cells)) {
      const r = computeCell(key, s.cells);
      if (r.ok) out[key] = formatComputed(r.value!, s.cells[key]?.style);
      else out[key] = r.error ?? '#ERR';
    }
    return out;
  });

  readonly currentRaw = computed(() => {
    const s = this.activeSheet();
    return s.cells[this.selected()]?.raw ?? '';
  });

  readonly currentStyle = computed<CellStyle>(() => {
    return this.activeSheet().cells[this.selected()]?.style ?? {};
  });

  readonly selectedRange = computed<string[]>(() => {
    const anchor = this.selectionAnchor();
    const end = this.selectionEnd();
    if (!anchor || !end || anchor === end) return [this.selected()];
    const a = keyToAddr(anchor)!;
    const b = keyToAddr(end)!;
    const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
    const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
    const out: string[] = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push(addrToKey(c, r));
    return out;
  });

  readonly selectedRangeSet = computed(() => new Set(this.selectedRange()));

  // Status bar stats for selected range
  readonly stats = computed(() => {
    const range = this.selectedRange();
    const s = this.activeSheet();
    let sum = 0, count = 0, numCount = 0, min = Infinity, max = -Infinity;
    for (const key of range) {
      const r = computeCell(key, s.cells);
      if (r.ok && typeof r.value === 'number') {
        sum += r.value;
        if (r.value < min) min = r.value;
        if (r.value > max) max = r.value;
        numCount++;
      }
      if (s.cells[key]?.raw) count++;
    }
    return {
      count,
      numCount,
      sum,
      avg: numCount > 0 ? sum / numCount : 0,
      min: numCount > 0 ? min : 0,
      max: numCount > 0 ? max : 0,
    };
  });

  constructor() {
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workbook())); } catch {}
    });
  }

  private loadOrCreate(): Workbook {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const wb = JSON.parse(raw) as Workbook;
        if (wb.sheets?.length) return wb;
      }
    } catch {}
    const id = Math.random().toString(36).slice(2, 9);
    return {
      sheets: [{ id, name: 'Tabelle 1', cells: {}, cols: DEFAULT_COLS, rows: DEFAULT_ROWS }],
      activeSheetId: id,
    };
  }

  /* ===== Cell selection ===== */
  selectCell(key: string, shift = false): void {
    if (this.editing()) this.commitEdit();
    this.selected.set(key);
    if (shift && this.selectionAnchor()) {
      this.selectionEnd.set(key);
    } else {
      this.selectionAnchor.set(key);
      this.selectionEnd.set(key);
    }
  }

  startEdit(key: string, initialValue?: string): void {
    this.selected.set(key);
    this.selectionAnchor.set(key);
    this.selectionEnd.set(key);
    this.editing.set(key);
    this.editValue.set(initialValue !== undefined ? initialValue : (this.activeSheet().cells[key]?.raw ?? ''));
  }

  commitEdit(): void {
    const key = this.editing();
    if (!key) return;
    const raw = this.editValue();
    this.updateCellRaw(key, raw);
    this.editing.set(null);
  }

  cancelEdit(): void { this.editing.set(null); }

  updateCellRaw(key: string, raw: string): void {
    this.workbook.update(wb => {
      const sheets = wb.sheets.map(s => {
        if (s.id !== wb.activeSheetId) return s;
        const cells = { ...s.cells };
        if (raw === '') {
          if (cells[key] && !cells[key].style) delete cells[key];
          else if (cells[key]) cells[key] = { ...cells[key], raw: '' };
        } else {
          cells[key] = { ...cells[key], raw };
        }
        return { ...s, cells };
      });
      return { ...wb, sheets };
    });
  }

  private applyStyleToRange(patch: Partial<CellStyle>): void {
    const keys = this.selectedRange();
    this.workbook.update(wb => {
      const sheets = wb.sheets.map(s => {
        if (s.id !== wb.activeSheetId) return s;
        const cells = { ...s.cells };
        for (const k of keys) {
          const cur: Cell = cells[k] ?? { raw: '' };
          cells[k] = { ...cur, style: { ...(cur.style ?? {}), ...patch } };
        }
        return { ...s, cells };
      });
      return { ...wb, sheets };
    });
  }

  /* ===== Formatting ===== */
  toggleBold(): void { this.applyStyleToRange({ bold: !this.currentStyle().bold }); }
  toggleItalic(): void { this.applyStyleToRange({ italic: !this.currentStyle().italic }); }
  toggleUnderline(): void { this.applyStyleToRange({ underline: !this.currentStyle().underline }); }
  setAlign(a: 'left' | 'center' | 'right'): void { this.applyStyleToRange({ align: a }); }
  setColor(c: string): void { this.applyStyleToRange({ color: c }); }
  setBg(c: string): void { this.applyStyleToRange({ bg: c }); }
  setFormat(f: CellStyle['format']): void { this.applyStyleToRange({ format: f }); }
  setDecimals(d: number): void { this.applyStyleToRange({ decimals: Math.max(0, Math.min(10, d)) }); }
  clearFormat(): void { this.applyStyleToRange({ bold: false, italic: false, underline: false, color: undefined, bg: undefined, format: undefined, decimals: undefined, align: undefined }); }
  clearContents(): void {
    const keys = this.selectedRange();
    for (const k of keys) this.updateCellRaw(k, '');
  }
  deleteCells(): void { this.clearContents(); }

  /* ===== Rows/Cols management ===== */
  addRow(): void {
    this.workbook.update(wb => {
      const sheets = wb.sheets.map(s => s.id === wb.activeSheetId ? { ...s, rows: s.rows + 10 } : s);
      return { ...wb, sheets };
    });
  }

  addCol(): void {
    this.workbook.update(wb => {
      const sheets = wb.sheets.map(s => s.id === wb.activeSheetId ? { ...s, cols: Math.min(s.cols + 5, 100) } : s);
      return { ...wb, sheets };
    });
  }

  /* ===== Sheet tabs ===== */
  addSheet(): void {
    const id = Math.random().toString(36).slice(2, 9);
    this.workbook.update(wb => {
      const name = 'Tabelle ' + (wb.sheets.length + 1);
      return { sheets: [...wb.sheets, { id, name, cells: {}, cols: DEFAULT_COLS, rows: DEFAULT_ROWS }], activeSheetId: id };
    });
    this.selected.set('A1');
    this.selectionAnchor.set('A1');
    this.selectionEnd.set('A1');
  }

  switchSheet(id: string): void {
    this.workbook.update(wb => ({ ...wb, activeSheetId: id }));
    this.selected.set('A1');
    this.selectionAnchor.set('A1');
    this.selectionEnd.set('A1');
  }

  renameSheet(sheet: Sheet): void {
    const name = prompt('Neuer Tabellenname:', sheet.name);
    if (!name?.trim() || name.trim() === sheet.name) return;
    this.workbook.update(wb => ({ ...wb, sheets: wb.sheets.map(s => s.id === sheet.id ? { ...s, name: name.trim() } : s) }));
  }

  deleteSheet(sheet: Sheet): void {
    if (this.workbook().sheets.length <= 1) return;
    if (!confirm(`Tabelle "${sheet.name}" wirklich löschen?`)) return;
    this.workbook.update(wb => {
      const sheets = wb.sheets.filter(s => s.id !== sheet.id);
      const activeId = wb.activeSheetId === sheet.id ? sheets[0].id : wb.activeSheetId;
      return { sheets, activeSheetId: activeId };
    });
  }

  /* ===== CSV ===== */
  exportCsv(): void {
    const s = this.activeSheet();
    const lines: string[] = [];
    for (let r = 0; r < s.rows; r++) {
      const row: string[] = [];
      let hasContent = false;
      for (let c = 0; c < s.cols; c++) {
        const key = addrToKey(c, r);
        const v = this.computedCells()[key] ?? s.cells[key]?.raw ?? '';
        if (v) hasContent = true;
        const escaped = v.includes('"') || v.includes(',') || v.includes('\n')
          ? '"' + v.replace(/"/g, '""') + '"'
          : v;
        row.push(escaped);
      }
      if (hasContent || r < 5) lines.push(row.join(','));
    }
    // Trim trailing empty rows
    while (lines.length > 1 && lines[lines.length - 1].split(',').every(x => x === '')) lines.pop();
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = s.name + '.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  importCsv(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCsv(text);
      this.workbook.update(wb => {
        const sheets = wb.sheets.map(s => {
          if (s.id !== wb.activeSheetId) return s;
          const cells: CellMap = {};
          let maxCol = s.cols, maxRow = s.rows;
          for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
              const v = rows[r][c];
              if (v !== '') cells[addrToKey(c, r)] = { raw: v };
              if (c + 1 > maxCol) maxCol = c + 1;
              if (r + 1 > maxRow) maxRow = r + 1;
            }
          }
          return { ...s, cells, cols: Math.max(s.cols, maxCol), rows: Math.max(s.rows, maxRow) };
        });
        return { ...wb, sheets };
      });
      input.value = '';
    };
    reader.readAsText(file);
  }

  /* ===== Keyboard ===== */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.sheetsOpen()) return;
    const target = event.target as HTMLElement | null;
    const inFormulaBar = target === this.formulaInputRef?.nativeElement;
    if (inFormulaBar) return;

    if (this.editing()) {
      if (event.key === 'Enter') { event.preventDefault(); this.commitEdit(); this.moveSelection(1, 0); }
      else if (event.key === 'Escape') { event.preventDefault(); this.cancelEdit(); }
      else if (event.key === 'Tab') { event.preventDefault(); this.commitEdit(); this.moveSelection(0, event.shiftKey ? -1 : 1); }
      return;
    }

    const k = event.key;
    if ((event.ctrlKey || event.metaKey) && k.toLowerCase() === 'b') { event.preventDefault(); this.toggleBold(); return; }
    if ((event.ctrlKey || event.metaKey) && k.toLowerCase() === 'i') { event.preventDefault(); this.toggleItalic(); return; }
    if ((event.ctrlKey || event.metaKey) && k.toLowerCase() === 'u') { event.preventDefault(); this.toggleUnderline(); return; }

    if (k === 'ArrowUp') { event.preventDefault(); this.moveSelection(-1, 0, event.shiftKey); }
    else if (k === 'ArrowDown') { event.preventDefault(); this.moveSelection(1, 0, event.shiftKey); }
    else if (k === 'ArrowLeft') { event.preventDefault(); this.moveSelection(0, -1, event.shiftKey); }
    else if (k === 'ArrowRight' || k === 'Tab') { event.preventDefault(); this.moveSelection(0, k === 'Tab' && event.shiftKey ? -1 : 1, event.shiftKey && k !== 'Tab'); }
    else if (k === 'Enter') { event.preventDefault(); this.startEdit(this.selected()); }
    else if (k === 'F2') { event.preventDefault(); this.startEdit(this.selected()); }
    else if (k === 'Delete' || k === 'Backspace') { event.preventDefault(); this.clearContents(); }
    else if (k.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.startEdit(this.selected(), k);
    }
  }

  private moveSelection(dr: number, dc: number, extend = false): void {
    const a = keyToAddr(this.selected())!;
    const s = this.activeSheet();
    const newRow = Math.max(0, Math.min(s.rows - 1, a.row + dr));
    const newCol = Math.max(0, Math.min(s.cols - 1, a.col + dc));
    const next = addrToKey(newCol, newRow);
    this.selected.set(next);
    if (extend) this.selectionEnd.set(next);
    else { this.selectionAnchor.set(next); this.selectionEnd.set(next); }
  }

  /* ===== Helpers ===== */
  cellStyleObj(key: string): Record<string, string> {
    const cell = this.activeSheet().cells[key];
    const style = cell?.style;
    if (!style) return {};
    const obj: Record<string, string> = {};
    if (style.bold) obj['font-weight'] = '700';
    if (style.italic) obj['font-style'] = 'italic';
    if (style.underline) obj['text-decoration'] = 'underline';
    if (style.align) obj['text-align'] = style.align;
    if (style.color) obj['color'] = style.color;
    if (style.bg) obj['background'] = style.bg;
    return obj;
  }

  displayValue(key: string): string {
    const c = this.activeSheet().cells[key];
    if (!c) return '';
    if (c.raw.startsWith('=')) return this.computedCells()[key] ?? '';
    return formatComputed(c.raw, c.style);
  }

  formatNum(n: number): string {
    if (!Number.isFinite(n)) return '—';
    return parseFloat(n.toFixed(8)).toString();
  }

  close(): void { this.overlay.closeSheets(); }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}
