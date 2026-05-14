/**
 * Compute Engine — Safe expression evaluator with variables, functions, constants.
 * Recursive-descent parser; NO eval(). Handles:
 *   numbers (int/float), +, -, *, /, %, ^, parens, unary -,
 *   functions: sin cos tan asin acos atan sinh cosh tanh ln log log2 sqrt cbrt abs floor ceil round exp,
 *   constants: pi, e, tau, phi,
 *   variables (a..z), assignment with =, factorial !.
 *
 * Angle mode: 'rad' | 'deg' affects trig functions.
 */

export type AngleMode = 'rad' | 'deg';

interface Token {
  type: 'num' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'assign' | 'bang';
  value: string;
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

const FUNCTIONS: Record<string, (args: number[], mode: AngleMode) => number> = {
  sin:   ([x], m) => Math.sin(toRad(x, m)),
  cos:   ([x], m) => Math.cos(toRad(x, m)),
  tan:   ([x], m) => Math.tan(toRad(x, m)),
  asin:  ([x], m) => fromRad(Math.asin(x), m),
  acos:  ([x], m) => fromRad(Math.acos(x), m),
  atan:  ([x], m) => fromRad(Math.atan(x), m),
  sinh:  ([x]) => Math.sinh(x),
  cosh:  ([x]) => Math.cosh(x),
  tanh:  ([x]) => Math.tanh(x),
  ln:    ([x]) => Math.log(x),
  log:   ([x]) => Math.log10(x),
  log2:  ([x]) => Math.log2(x),
  sqrt:  ([x]) => Math.sqrt(x),
  cbrt:  ([x]) => Math.cbrt(x),
  abs:   ([x]) => Math.abs(x),
  floor: ([x]) => Math.floor(x),
  ceil:  ([x]) => Math.ceil(x),
  round: ([x]) => Math.round(x),
  exp:   ([x]) => Math.exp(x),
  min:   args => Math.min(...args),
  max:   args => Math.max(...args),
  pow:   ([a, b]) => Math.pow(a, b),
  mod:   ([a, b]) => a - b * Math.floor(a / b),
};

const FUNC_NAMES = new Set(Object.keys(FUNCTIONS));

function toRad(x: number, mode: AngleMode): number { return mode === 'deg' ? (x * Math.PI) / 180 : x; }
function fromRad(x: number, mode: AngleMode): number { return mode === 'deg' ? (x * 180) / Math.PI : x; }

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '(') { tokens.push({ type: 'lparen', value: c }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'rparen', value: c }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma', value: c }); i++; continue; }
    if (c === '!') { tokens.push({ type: 'bang', value: c }); i++; continue; }
    if (c === '=') { tokens.push({ type: 'assign', value: c }); i++; continue; }
    if ('+-*/%^'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < input.length && ((input[j] >= '0' && input[j] <= '9') || input[j] === '.')) j++;
      // scientific notation
      if (j < input.length && (input[j] === 'e' || input[j] === 'E')) {
        j++;
        if (j < input.length && (input[j] === '+' || input[j] === '-')) j++;
        while (j < input.length && input[j] >= '0' && input[j] <= '9') j++;
      }
      tokens.push({ type: 'num', value: input.slice(i, j) });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i;
      while (j < input.length && ((input[j] >= 'a' && input[j] <= 'z') || (input[j] >= 'A' && input[j] <= 'Z') || input[j] === '_' || (input[j] >= '0' && input[j] <= '9'))) j++;
      tokens.push({ type: 'ident', value: input.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    throw new Error(`Unbekanntes Zeichen: "${c}"`);
  }
  return tokens;
}

function factorial(n: number): number {
  if (n < 0 || n !== Math.floor(n)) throw new Error('Fakultät benötigt nicht-negative Ganzzahl');
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

class Parser {
  pos = 0;
  constructor(private tokens: Token[], private vars: Record<string, number>, private mode: AngleMode) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token | undefined { return this.tokens[this.pos++]; }
  private expect(type: Token['type'], value?: string): Token {
    const t = this.consume();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Erwartet ${value ?? type}, gefunden "${t?.value ?? 'Ende'}"`);
    }
    return t;
  }

  parseAll(): number {
    // Optional assignment: ident = expr
    if (this.tokens.length >= 2 && this.tokens[0].type === 'ident' && this.tokens[1].type === 'assign' && !FUNC_NAMES.has(this.tokens[0].value) && !(this.tokens[0].value in CONSTANTS)) {
      const name = this.tokens[0].value;
      this.pos = 2;
      const v = this.parseExpr();
      if (this.pos < this.tokens.length) throw new Error('Unerwartete Tokens nach Ausdruck');
      this.vars[name] = v;
      return v;
    }
    const v = this.parseExpr();
    if (this.pos < this.tokens.length) throw new Error(`Unerwartetes Token "${this.peek()?.value}"`);
    return v;
  }

  // Pratt-ish: + - have low precedence; * / % medium; ^ high (right-assoc); unary highest.
  parseExpr(): number { return this.parseAddSub(); }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume()!.value;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '*' || this.peek()!.value === '/' || this.peek()!.value === '%')) {
      const op = this.consume()!.value;
      const right = this.parsePower();
      if (op === '*') left = left * right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division durch null');
        left = left / right;
      } else left = left % right;
    }
    return left;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === 'op' && this.peek()!.value === '^') {
      this.consume();
      const exp = this.parsePower(); // right-assoc
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'op' && this.peek()!.value === '-') { this.consume(); return -this.parseUnary(); }
    if (this.peek()?.type === 'op' && this.peek()!.value === '+') { this.consume(); return this.parseUnary(); }
    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let v = this.parseAtom();
    while (this.peek()?.type === 'bang') { this.consume(); v = factorial(v); }
    return v;
  }

  private parseAtom(): number {
    const t = this.consume();
    if (!t) throw new Error('Unerwartetes Ende');
    if (t.type === 'num') return parseFloat(t.value);
    if (t.type === 'lparen') {
      const v = this.parseExpr();
      this.expect('rparen', ')');
      return v;
    }
    if (t.type === 'ident') {
      // function call?
      if (this.peek()?.type === 'lparen' && FUNC_NAMES.has(t.value)) {
        this.consume(); // (
        const args: number[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpr());
          while (this.peek()?.type === 'comma') { this.consume(); args.push(this.parseExpr()); }
        }
        this.expect('rparen', ')');
        return FUNCTIONS[t.value](args, this.mode);
      }
      if (t.value in CONSTANTS) return CONSTANTS[t.value];
      if (t.value in this.vars) return this.vars[t.value];
      throw new Error(`Unbekannte Variable: "${t.value}"`);
    }
    throw new Error(`Unerwartetes Token: "${t.value}"`);
  }
}

export interface ComputeResult {
  ok: boolean;
  value?: number;
  formatted?: string;
  error?: string;
}

export function compute(input: string, vars: Record<string, number>, mode: AngleMode): ComputeResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: '' };
  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) return { ok: false, error: '' };
    const parser = new Parser(tokens, vars, mode);
    const value = parser.parseAll();
    return { ok: true, value, formatted: formatNumber(value) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Wertet einen Ausdruck f(x) für einen konkreten x-Wert aus.
 * Wirft KEINE Exception bei Fehlern, liefert NaN.
 */
export function evaluateAt(expr: string, x: number, mode: AngleMode = 'rad'): number {
  try {
    const tokens = tokenize(expr.trim());
    if (tokens.length === 0) return NaN;
    const parser = new Parser(tokens, { x, ans: 0 }, mode);
    const v = parser.parseAll();
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return n.toString();
  if (Math.abs(n) < 1e-10 && n !== 0) return n.toExponential(6);
  if (Math.abs(n) >= 1e15) return n.toExponential(10);
  // Trim trailing zeros after decimal
  const fixed = n.toFixed(10);
  return parseFloat(fixed).toString();
}
