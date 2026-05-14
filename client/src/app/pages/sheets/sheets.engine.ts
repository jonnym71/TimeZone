/**
 * Sheets Engine — Formula parser & evaluator with cell references.
 * Supports: =A1+B1, =SUM(A1:A10), =AVG(B2:B5), comparison ops, IF, etc.
 * Pure, no eval(). Recursive descent parser.
 */

export interface CellAddr { col: number; row: number; }

export type CellValueRaw = string;     // what user typed (incl. formulas with =)
export type CellValueComputed = number | string | boolean;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bg?: string;
  format?: 'number' | 'currency' | 'percent' | 'date' | 'text';
  decimals?: number;
}

export interface Cell {
  raw: string;
  style?: CellStyle;
}

export type CellMap = Record<string, Cell>; // key = "A1"

/* ===== Address conversion ===== */
export function colToLetters(col: number): string {
  let s = '';
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function lettersToCol(s: string): number {
  let n = 0;
  for (const c of s.toUpperCase()) {
    if (c < 'A' || c > 'Z') return -1;
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function addrToKey(col: number, row: number): string { return colToLetters(col) + (row + 1); }
export function keyToAddr(key: string): CellAddr | null {
  const m = /^([A-Z]+)(\d+)$/.exec(key.toUpperCase());
  if (!m) return null;
  return { col: lettersToCol(m[1]), row: parseInt(m[2], 10) - 1 };
}

/* ===== Tokenizer ===== */
type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string }
  | { t: 'range'; a: string; b: string }
  | { t: 'fn'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' }
  | { t: 'bool'; v: boolean };

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
    if (c === ',') { out.push({ t: 'comma' }); i++; continue; }
    if (c === '"') {
      let j = i + 1;
      let str = '';
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\' && j + 1 < s.length) { str += s[j + 1]; j += 2; }
        else { str += s[j]; j++; }
      }
      out.push({ t: 'str', v: str });
      i = j + 1;
      continue;
    }
    if ('+-*/%^&'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    // Comparison operators
    if (c === '=' || c === '<' || c === '>') {
      if (s[i + 1] === '=') { out.push({ t: 'op', v: c + '=' }); i += 2; continue; }
      if (c === '<' && s[i + 1] === '>') { out.push({ t: 'op', v: '<>' }); i += 2; continue; }
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c >= '0' && c <= '9' || c === '.') {
      let j = i;
      while (j < s.length && (s[j] >= '0' && s[j] <= '9' || s[j] === '.')) j++;
      if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
        j++;
        if (j < s.length && (s[j] === '+' || s[j] === '-')) j++;
        while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      }
      out.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_') {
      let j = i;
      while (j < s.length && ((s[j] >= 'A' && s[j] <= 'Z') || (s[j] >= 'a' && s[j] <= 'z') || (s[j] >= '0' && s[j] <= '9') || s[j] === '_')) j++;
      const ident = s.slice(i, j).toUpperCase();
      // Check if cell ref like A1, AB12
      const refMatch = /^([A-Z]+)(\d+)$/.exec(ident);
      if (refMatch) {
        // Range like A1:B5?
        if (s[j] === ':') {
          let k = j + 1;
          while (k < s.length && ((s[k] >= 'A' && s[k] <= 'Z') || (s[k] >= 'a' && s[k] <= 'z') || (s[k] >= '0' && s[k] <= '9'))) k++;
          const b = s.slice(j + 1, k).toUpperCase();
          if (/^[A-Z]+\d+$/.test(b)) {
            out.push({ t: 'range', a: ident, b });
            i = k;
            continue;
          }
        }
        out.push({ t: 'ref', v: ident });
        i = j;
        continue;
      }
      if (ident === 'TRUE') { out.push({ t: 'bool', v: true }); i = j; continue; }
      if (ident === 'FALSE') { out.push({ t: 'bool', v: false }); i = j; continue; }
      // Function name (must be followed by `(`)
      if (s[j] === '(' || (s[j] === ' ' && s[j + 1] === '(')) {
        out.push({ t: 'fn', v: ident });
        i = j;
        continue;
      }
      throw new Error('Unbekannter Identifikator: ' + ident);
    }
    throw new Error('Unbekanntes Zeichen: ' + c);
  }
  return out;
}

/* ===== Functions ===== */
type FnImpl = (args: CellValueComputed[][]) => CellValueComputed;
const FUNCTIONS: Record<string, FnImpl> = {
  SUM: (a) => flat(a).map(toNum).reduce((s, x) => s + x, 0),
  AVERAGE: (a) => { const xs = flat(a).map(toNum); return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; },
  AVG: (a) => FUNCTIONS['AVERAGE'](a),
  MIN: (a) => Math.min(...flat(a).map(toNum)),
  MAX: (a) => Math.max(...flat(a).map(toNum)),
  COUNT: (a) => flat(a).filter(x => typeof x === 'number' && Number.isFinite(x)).length,
  COUNTA: (a) => flat(a).filter(x => x !== '' && x !== null && x !== undefined).length,
  ROUND: (a) => { const x = toNum(a[0][0]); const d = a[1] ? toNum(a[1][0]) : 0; const f = Math.pow(10, d); return Math.round(x * f) / f; },
  ABS: (a) => Math.abs(toNum(a[0][0])),
  SQRT: (a) => Math.sqrt(toNum(a[0][0])),
  POWER: (a) => Math.pow(toNum(a[0][0]), toNum(a[1][0])),
  EXP: (a) => Math.exp(toNum(a[0][0])),
  LN: (a) => Math.log(toNum(a[0][0])),
  LOG: (a) => Math.log10(toNum(a[0][0])),
  LOG10: (a) => Math.log10(toNum(a[0][0])),
  PI: () => Math.PI,
  E: () => Math.E,
  MOD: (a) => toNum(a[0][0]) % toNum(a[1][0]),
  CEIL: (a) => Math.ceil(toNum(a[0][0])),
  CEILING: (a) => Math.ceil(toNum(a[0][0])),
  FLOOR: (a) => Math.floor(toNum(a[0][0])),
  INT: (a) => Math.trunc(toNum(a[0][0])),
  TRUNC: (a) => Math.trunc(toNum(a[0][0])),
  SIN: (a) => Math.sin(toNum(a[0][0])),
  COS: (a) => Math.cos(toNum(a[0][0])),
  TAN: (a) => Math.tan(toNum(a[0][0])),
  IF: (a) => toBool(a[0][0]) ? a[1][0] : (a[2] ? a[2][0] : false),
  AND: (a) => flat(a).every(toBool),
  OR: (a) => flat(a).some(toBool),
  NOT: (a) => !toBool(a[0][0]),
  CONCAT: (a) => flat(a).map(x => String(x ?? '')).join(''),
  CONCATENATE: (a) => flat(a).map(x => String(x ?? '')).join(''),
  LEN: (a) => String(a[0][0] ?? '').length,
  UPPER: (a) => String(a[0][0] ?? '').toUpperCase(),
  LOWER: (a) => String(a[0][0] ?? '').toLowerCase(),
  TRIM: (a) => String(a[0][0] ?? '').trim(),
  LEFT: (a) => String(a[0][0] ?? '').slice(0, toNum(a[1][0])),
  RIGHT: (a) => { const s = String(a[0][0] ?? ''); const n = toNum(a[1][0]); return s.slice(-n); },
  MID: (a) => String(a[0][0] ?? '').slice(toNum(a[1][0]) - 1, toNum(a[1][0]) - 1 + toNum(a[2][0])),
  NOW: () => new Date().toLocaleString(),
  TODAY: () => new Date().toLocaleDateString(),
  COUNTIF: (a) => {
    const range = flat([a[0]]);
    const crit = a[1][0];
    return range.filter(v => matchCriteria(v, crit)).length;
  },
  SUMIF: (a) => {
    const range = flat([a[0]]);
    const crit = a[1][0];
    return range.filter(v => matchCriteria(v, crit)).map(toNum).reduce((s, x) => s + x, 0);
  },
};

function matchCriteria(value: CellValueComputed, crit: CellValueComputed): boolean {
  if (typeof crit === 'string' && /^[<>=!]/.test(crit.trim())) {
    const m = /^([<>=!]+)(.*)$/.exec(crit.trim());
    if (m) {
      const op = m[1];
      const target = isNaN(+m[2]) ? m[2] : +m[2];
      if (op === '>') return toNum(value) > toNum(target);
      if (op === '<') return toNum(value) < toNum(target);
      if (op === '>=') return toNum(value) >= toNum(target);
      if (op === '<=') return toNum(value) <= toNum(target);
      if (op === '<>' || op === '!=') return value !== target;
      if (op === '=') return value === target;
    }
  }
  return value === crit;
}

function flat(args: CellValueComputed[][]): CellValueComputed[] {
  const out: CellValueComputed[] = [];
  for (const a of args) for (const v of a) out.push(v);
  return out;
}

function toNum(v: CellValueComputed): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return 0;
    const n = parseFloat(t);
    if (!isNaN(n)) return n;
  }
  return 0;
}

function toBool(v: CellValueComputed): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0 && v.toLowerCase() !== 'false';
  return false;
}

/* ===== Parser & Evaluator ===== */
class Parser {
  i = 0;
  constructor(private toks: Tok[], private getCell: (key: string) => CellValueComputed) {}
  peek(): Tok | undefined { return this.toks[this.i]; }
  next(): Tok | undefined { return this.toks[this.i++]; }

  parse(): CellValueComputed {
    const v = this.parseCompare();
    if (this.i < this.toks.length) throw new Error('Unerwartetes Token');
    return v;
  }

  parseCompare(): CellValueComputed {
    let l = this.parseConcat();
    while (this.peek()?.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes((this.peek() as { v: string }).v)) {
      const op = (this.next() as { v: string }).v;
      const r = this.parseConcat();
      l = compare(l, r, op);
    }
    return l;
  }

  parseConcat(): CellValueComputed {
    let l = this.parseAddSub();
    while (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '&') {
      this.next();
      const r = this.parseAddSub();
      l = String(l ?? '') + String(r ?? '');
    }
    return l;
  }

  parseAddSub(): CellValueComputed {
    let l = this.parseMulDiv();
    while (this.peek()?.t === 'op' && ((this.peek() as { v: string }).v === '+' || (this.peek() as { v: string }).v === '-')) {
      const op = (this.next() as { v: string }).v;
      const r = this.parseMulDiv();
      l = op === '+' ? toNum(l) + toNum(r) : toNum(l) - toNum(r);
    }
    return l;
  }

  parseMulDiv(): CellValueComputed {
    let l = this.parsePower();
    while (this.peek()?.t === 'op' && ['*', '/', '%'].includes((this.peek() as { v: string }).v)) {
      const op = (this.next() as { v: string }).v;
      const r = this.parsePower();
      if (op === '*') l = toNum(l) * toNum(r);
      else if (op === '/') { if (toNum(r) === 0) throw new Error('#DIV/0!'); l = toNum(l) / toNum(r); }
      else l = toNum(l) % toNum(r);
    }
    return l;
  }

  parsePower(): CellValueComputed {
    const b = this.parseUnary();
    if (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '^') {
      this.next();
      const e = this.parsePower();
      return Math.pow(toNum(b), toNum(e));
    }
    return b;
  }

  parseUnary(): CellValueComputed {
    if (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '-') { this.next(); return -toNum(this.parseUnary()); }
    if (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '+') { this.next(); return this.parseUnary(); }
    return this.parsePostfix();
  }

  parsePostfix(): CellValueComputed {
    let v = this.parseAtom();
    while (this.peek()?.t === 'op' && (this.peek() as { v: string }).v === '%') {
      this.next();
      v = toNum(v) / 100;
    }
    return v;
  }

  parseAtom(): CellValueComputed {
    const t = this.next();
    if (!t) throw new Error('Unerwartetes Ende');
    if (t.t === 'num') return t.v;
    if (t.t === 'str') return t.v;
    if (t.t === 'bool') return t.v;
    if (t.t === 'ref') return this.getCell(t.v);
    if (t.t === 'lp') { const v = this.parseCompare(); if (this.next()?.t !== 'rp') throw new Error('Klammer fehlt'); return v; }
    if (t.t === 'fn') {
      if (this.next()?.t !== 'lp') throw new Error('"(" erwartet');
      const args: CellValueComputed[][] = [];
      if (this.peek()?.t !== 'rp') {
        args.push(this.parseArg());
        while (this.peek()?.t === 'comma') { this.next(); args.push(this.parseArg()); }
      }
      if (this.next()?.t !== 'rp') throw new Error('")" erwartet');
      const fn = FUNCTIONS[t.v];
      if (!fn) throw new Error('Unbekannte Funktion: ' + t.v);
      return fn(args);
    }
    if (t.t === 'range') {
      // Standalone Range in einer skalaren Position: nimm den ersten Wert
      const expanded = this.expandRange(t.a, t.b);
      return expanded[0] ?? '';
    }
    throw new Error('Unerwartetes Token');
  }

  parseArg(): CellValueComputed[] {
    const tok = this.peek();
    if (tok?.t === 'range') {
      this.next();
      return this.expandRange((tok as { a: string; b: string }).a, (tok as { a: string; b: string }).b);
    }
    return [this.parseCompare() as CellValueComputed];
  }

  private expandRange(a: string, b: string): CellValueComputed[] {
    const ra = keyToAddr(a); const rb = keyToAddr(b);
    if (!ra || !rb) return [];
    const c1 = Math.min(ra.col, rb.col), c2 = Math.max(ra.col, rb.col);
    const r1 = Math.min(ra.row, rb.row), r2 = Math.max(ra.row, rb.row);
    const out: CellValueComputed[] = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push(this.getCell(addrToKey(c, r)));
    return out;
  }
}

function compare(a: CellValueComputed, b: CellValueComputed, op: string): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    switch (op) {
      case '=': return a === b;
      case '<>': return a !== b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
    }
  }
  const sa = String(a), sb = String(b);
  switch (op) {
    case '=': return sa === sb;
    case '<>': return sa !== sb;
    case '<': return sa < sb;
    case '>': return sa > sb;
    case '<=': return sa <= sb;
    case '>=': return sa >= sb;
  }
  return false;
}

/* ===== Public API ===== */
export interface EvalResult {
  ok: boolean;
  value?: CellValueComputed;
  error?: string;
}

export function evaluateFormula(formula: string, cells: CellMap, currentKey: string): EvalResult {
  const stack = new Set<string>();
  const cache: Record<string, CellValueComputed> = {};

  const getCellValue = (key: string): CellValueComputed => {
    if (key === currentKey) throw new Error('#REF! Selbstbezug');
    if (stack.has(key)) throw new Error('#CYCLE!');
    if (cache[key] !== undefined) return cache[key];

    const cell = cells[key];
    if (!cell) { cache[key] = 0; return 0; }
    const raw = cell.raw ?? '';
    if (!raw.startsWith('=')) {
      const num = parseFloat(raw);
      cache[key] = !isNaN(num) && /^-?\d+(\.\d+)?$/.test(raw.trim()) ? num : raw;
      return cache[key];
    }
    stack.add(key);
    try {
      const v = evalExpr(raw.slice(1), getCellValue);
      cache[key] = v;
      return v;
    } finally {
      stack.delete(key);
    }
  };

  try {
    const v = evalExpr(formula, getCellValue);
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function evalExpr(expr: string, getCell: (key: string) => CellValueComputed): CellValueComputed {
  const toks = tokenize(expr);
  if (toks.length === 0) return '';
  const parser = new Parser(toks, getCell);
  return parser.parse();
}

export function computeCell(key: string, cells: CellMap): EvalResult {
  const c = cells[key];
  if (!c) return { ok: true, value: '' };
  const raw = c.raw ?? '';
  if (!raw.startsWith('=')) {
    const num = parseFloat(raw);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(raw.trim())) return { ok: true, value: num };
    return { ok: true, value: raw };
  }
  return evaluateFormula(raw.slice(1), cells, key);
}

export function formatComputed(v: CellValueComputed, style?: CellStyle): string {
  if (v === '' || v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    const decimals = style?.decimals;
    if (style?.format === 'currency') {
      return v.toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals ?? 2, maximumFractionDigits: decimals ?? 2 });
    }
    if (style?.format === 'percent') {
      return (v * 100).toLocaleString(undefined, { minimumFractionDigits: decimals ?? 1, maximumFractionDigits: decimals ?? 2 }) + ' %';
    }
    if (decimals !== undefined) return v.toFixed(decimals);
    // Default: trim long floats
    const fixed = v.toFixed(10);
    return parseFloat(fixed).toString();
  }
  return String(v);
}
