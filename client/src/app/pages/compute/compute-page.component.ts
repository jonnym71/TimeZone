import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AngleMode, compute, evaluateAt, formatNumber } from './compute.engine';

const STORAGE_KEY = 'tz-compute-v1';

export interface HistoryItem {
  input: string;
  result: string;
  ok: boolean;
}

export interface PlotFunction {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

export interface PlotState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  yAuto: boolean;
}

interface SavedState {
  expression: string;
  mode: AngleMode;
  history: HistoryItem[];
  vars: Record<string, number>;
  plots?: PlotFunction[];
  plotState?: PlotState;
  activeTab?: 'calc' | 'plot';
}

const PLOT_COLORS = ['#FB542B', '#FA7250', '#FFB45A', '#2E8B7B', '#5B9BD5', '#9F7FE0', '#E84A8C'];

@Component({
  selector: 'app-compute-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './compute-page.component.html',
})
export class ComputePageComponent implements AfterViewInit {
  readonly overlay = inject(OverlayService);

  @ViewChild('plotCanvas') plotCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly expression = signal('');
  readonly mode = signal<AngleMode>('rad');
  readonly history = signal<HistoryItem[]>([]);
  readonly vars = signal<Record<string, number>>({});

  readonly activeTab = signal<'calc' | 'plot'>('calc');
  readonly plots = signal<PlotFunction[]>([]);
  readonly plotState = signal<PlotState>({ xMin: -10, xMax: 10, yMin: -5, yMax: 5, yAuto: true });
  readonly newPlotExpr = signal('');
  readonly hoverCoord = signal<{ x: number; y: number } | null>(null);

  readonly liveResult = computed(() => {
    const expr = this.expression();
    if (!expr.trim()) return { ok: false, formatted: '', error: '' };
    const r = compute(expr, this.vars(), this.mode());
    return { ok: r.ok, formatted: r.formatted ?? '', error: r.error ?? '' };
  });

  readonly varList = computed(() => {
    const v = this.vars();
    return Object.entries(v).map(([k, val]) => ({ name: k, value: formatNumber(val) }));
  });

  constructor() {
    this.load();
    effect(() => {
      const state: SavedState = {
        expression: this.expression(),
        mode: this.mode(),
        history: this.history().slice(0, 200),
        vars: this.vars(),
        plots: this.plots(),
        plotState: this.plotState(),
        activeTab: this.activeTab(),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    });

    // Plot neu zeichnen wenn relevante Signale sich ändern
    effect(() => {
      this.plots();
      this.plotState();
      this.mode();
      this.hoverCoord();
      if (this.activeTab() === 'plot') {
        queueMicrotask(() => this.drawPlot());
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.activeTab() === 'plot') queueMicrotask(() => this.drawPlot());
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SavedState;
      if (s.expression !== undefined) this.expression.set(s.expression);
      if (s.mode === 'deg' || s.mode === 'rad') this.mode.set(s.mode);
      if (Array.isArray(s.history)) this.history.set(s.history);
      if (s.vars && typeof s.vars === 'object') this.vars.set(s.vars);
      if (Array.isArray(s.plots)) this.plots.set(s.plots);
      if (s.plotState) this.plotState.set(s.plotState);
      if (s.activeTab === 'calc' || s.activeTab === 'plot') this.activeTab.set(s.activeTab);
    } catch {}
  }

  /* ===== Tabs ===== */
  setTab(t: 'calc' | 'plot'): void { this.activeTab.set(t); }

  /* ===== Plot management ===== */
  addPlot(): void {
    const expr = this.newPlotExpr().trim();
    if (!expr) return;
    // Sanity check: try evaluating at x=0 (won't matter if it errors)
    const next: PlotFunction = {
      id: Math.random().toString(36).slice(2, 9),
      expr,
      color: PLOT_COLORS[this.plots().length % PLOT_COLORS.length],
      visible: true,
    };
    this.plots.update(ps => [...ps, next]);
    this.newPlotExpr.set('');
  }

  removePlot(id: string): void {
    this.plots.update(ps => ps.filter(p => p.id !== id));
  }

  togglePlot(id: string): void {
    this.plots.update(ps => ps.map(p => p.id === id ? { ...p, visible: !p.visible } : p));
  }

  setPlotColor(id: string, color: string): void {
    this.plots.update(ps => ps.map(p => p.id === id ? { ...p, color } : p));
  }

  setXRange(min: number, max: number): void {
    if (min >= max || !Number.isFinite(min) || !Number.isFinite(max)) return;
    this.plotState.update(s => ({ ...s, xMin: min, xMax: max }));
  }

  setYRange(min: number, max: number): void {
    if (min >= max || !Number.isFinite(min) || !Number.isFinite(max)) return;
    this.plotState.update(s => ({ ...s, yMin: min, yMax: max, yAuto: false }));
  }

  toggleYAuto(): void {
    this.plotState.update(s => ({ ...s, yAuto: !s.yAuto }));
  }

  resetView(): void {
    this.plotState.set({ xMin: -10, xMax: 10, yMin: -5, yMax: 5, yAuto: true });
  }

  zoomIn(): void {
    this.plotState.update(s => {
      const cx = (s.xMin + s.xMax) / 2;
      const cy = (s.yMin + s.yMax) / 2;
      const xr = (s.xMax - s.xMin) / 4;
      const yr = (s.yMax - s.yMin) / 4;
      return { ...s, xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }

  zoomOut(): void {
    this.plotState.update(s => {
      const cx = (s.xMin + s.xMax) / 2;
      const cy = (s.yMin + s.yMax) / 2;
      const xr = s.xMax - s.xMin;
      const yr = s.yMax - s.yMin;
      return { ...s, xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }

  /* ===== Canvas drawing ===== */
  drawPlot(): void {
    const cvs = this.plotCanvasRef?.nativeElement;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    // Make canvas crisp for HiDPI
    const rect = cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (cvs.width !== rect.width * dpr || cvs.height !== rect.height * dpr) {
      cvs.width = Math.max(1, Math.floor(rect.width * dpr));
      cvs.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    const W = rect.width;
    const H = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute auto Y range if needed
    let { xMin, xMax, yMin, yMax, yAuto } = this.plotState();
    if (yAuto) {
      const range = this.computeAutoYRange(xMin, xMax);
      if (range) { yMin = range.min; yMax = range.max; }
    }

    // Background
    ctx.fillStyle = '#100b07';
    ctx.fillRect(0, 0, W, H);

    const xToPx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const yToPx = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
    const pxToX = (px: number) => xMin + (px / W) * (xMax - xMin);
    const pxToY = (py: number) => yMin + ((H - py) / H) * (yMax - yMin);

    // Grid + axes
    this.drawGrid(ctx, W, H, xMin, xMax, yMin, yMax, xToPx, yToPx);

    // Plots
    for (const p of this.plots()) {
      if (!p.visible) continue;
      this.drawFunction(ctx, p, W, H, xMin, xMax, yMin, yMax, xToPx, yToPx);
    }

    // Hover crosshair + readout
    const hov = this.hoverCoord();
    if (hov) {
      const px = xToPx(hov.x);
      const py = yToPx(hov.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 160, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, py); ctx.lineTo(W, py);
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
      ctx.stroke();
      ctx.setLineDash([]);
      // readout box
      const label = `x = ${formatNumber(hov.x)}   y = ${formatNumber(hov.y)}`;
      ctx.font = '12px "JetBrains Mono", monospace';
      const metrics = ctx.measureText(label);
      const padX = 8, padY = 5;
      const boxW = metrics.width + padX * 2;
      const boxH = 22;
      const bx = Math.min(W - boxW - 6, px + 10);
      const by = Math.max(6, py - boxH - 8);
      ctx.fillStyle = 'rgba(20, 16, 13, 0.92)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = 'rgba(251, 84, 43, 0.45)';
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.fillStyle = '#FB542B';
      ctx.fillText(label, bx + padX, by + boxH - padY - 1);
      ctx.restore();
    }
  }

  private computeAutoYRange(xMin: number, xMax: number): { min: number; max: number } | null {
    const visible = this.plots().filter(p => p.visible);
    if (visible.length === 0) return null;
    const samples = 400;
    let lo = Infinity, hi = -Infinity;
    for (const p of visible) {
      for (let i = 0; i <= samples; i++) {
        const x = xMin + (i / samples) * (xMax - xMin);
        const y = evaluateAt(p.expr, x, this.mode());
        if (Number.isFinite(y)) {
          if (y < lo) lo = y;
          if (y > hi) hi = y;
        }
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    return { min: lo - pad, max: hi + pad };
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    xMin: number, xMax: number, yMin: number, yMax: number,
    xToPx: (x: number) => number, yToPx: (y: number) => number,
  ): void {
    const xStep = niceStep(xMax - xMin);
    const yStep = niceStep(yMax - yMin);

    // Minor grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      const px = xToPx(x);
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      const py = yToPx(y);
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();

    // Axes
    const x0 = xToPx(0), y0 = yToPx(0);
    ctx.strokeStyle = 'rgba(255, 200, 160, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (y0 >= 0 && y0 <= H) { ctx.moveTo(0, y0); ctx.lineTo(W, y0); }
    if (x0 >= 0 && x0 <= W) { ctx.moveTo(x0, 0); ctx.lineTo(x0, H); }
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(255, 215, 195, 0.65)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      if (Math.abs(x) < xStep * 0.001) continue;
      const px = xToPx(x);
      const py = Math.min(H - 14, Math.max(2, y0 + 4));
      ctx.fillText(formatLabel(x, xStep), px, py);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      if (Math.abs(y) < yStep * 0.001) continue;
      const py = yToPx(y);
      const px = Math.max(20, Math.min(W - 4, x0 - 4));
      ctx.fillText(formatLabel(y, yStep), px, py);
    }
    // Origin "0"
    if (x0 >= 8 && x0 <= W - 8 && y0 >= 8 && y0 <= H - 14) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('0', x0 - 4, y0 + 4);
    }
  }

  private drawFunction(
    ctx: CanvasRenderingContext2D,
    plot: PlotFunction,
    W: number, _H: number,
    xMin: number, xMax: number, _yMin: number, _yMax: number,
    xToPx: (x: number) => number, yToPx: (y: number) => number,
  ): void {
    ctx.strokeStyle = plot.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let drawing = false;
    const samples = Math.max(W * 2, 600);
    let prevY = NaN;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + (i / samples) * (xMax - xMin);
      const y = evaluateAt(plot.expr, x, this.mode());
      if (!Number.isFinite(y)) { drawing = false; prevY = NaN; continue; }
      const px = xToPx(x);
      const py = yToPx(y);
      // Discontinuity heuristic: huge jump → break
      if (Number.isFinite(prevY) && Math.abs(y - prevY) > Math.abs(_yMax - _yMin) * 2) {
        drawing = false;
      }
      if (!drawing) { ctx.moveTo(px, py); drawing = true; }
      else ctx.lineTo(px, py);
      prevY = y;
    }
    ctx.stroke();
  }

  onPlotHover(event: MouseEvent): void {
    const cvs = this.plotCanvasRef?.nativeElement;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const { xMin, xMax, yMin, yMax, yAuto } = this.plotState();
    let yLo = yMin, yHi = yMax;
    if (yAuto) {
      const r = this.computeAutoYRange(xMin, xMax);
      if (r) { yLo = r.min; yHi = r.max; }
    }
    const x = xMin + (mx / rect.width) * (xMax - xMin);
    // Show y of the first visible plot at this x, else just cursor y
    const visible = this.plots().filter(p => p.visible);
    let y: number;
    if (visible.length > 0) {
      const v = evaluateAt(visible[0].expr, x, this.mode());
      y = Number.isFinite(v) ? v : (yLo + ((rect.height - my) / rect.height) * (yHi - yLo));
    } else {
      y = yLo + ((rect.height - my) / rect.height) * (yHi - yLo);
    }
    this.hoverCoord.set({ x, y });
  }

  onPlotLeave(): void { this.hoverCoord.set(null); }

  /* ===== Input handling ===== */

  press(token: string): void {
    this.expression.update(e => e + token);
  }

  clear(): void { this.expression.set(''); }
  clearAll(): void {
    if (!confirm('Verlauf, Variablen und Ausdruck wirklich löschen?')) return;
    this.expression.set('');
    this.history.set([]);
    this.vars.set({});
  }
  backspace(): void { this.expression.update(e => e.slice(0, -1)); }

  toggleSign(): void {
    const e = this.expression();
    if (e.startsWith('-(') && e.endsWith(')')) this.expression.set(e.slice(2, -1));
    else if (e.startsWith('-')) this.expression.set(e.slice(1));
    else if (e) this.expression.set('-(' + e + ')');
  }

  setMode(m: AngleMode): void { this.mode.set(m); }

  evaluate(): void {
    const input = this.expression().trim();
    if (!input) return;
    const r = compute(input, this.vars(), this.mode());
    const item: HistoryItem = {
      input,
      result: r.ok ? (r.formatted ?? '') : r.error ?? 'Fehler',
      ok: r.ok,
    };
    this.history.update(h => [item, ...h].slice(0, 200));
    if (r.ok && r.value !== undefined) {
      // Always store last result as "ans"
      this.vars.update(v => ({ ...v, ans: r.value! }));
      // Show result in expression for chaining
      this.expression.set(r.formatted ?? '');
    }
  }

  reuseHistory(item: HistoryItem): void {
    this.expression.set(item.input);
  }

  insertHistoryResult(item: HistoryItem): void {
    if (item.ok) this.expression.update(e => e + item.result);
  }

  deleteVar(name: string): void {
    this.vars.update(v => {
      const copy = { ...v };
      delete copy[name];
      return copy;
    });
  }

  insertVar(name: string): void { this.expression.update(e => e + name); }

  close(): void { this.overlay.closeCompute(); }

  /* ===== Keyboard input ===== */

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.computeOpen()) return;
    if (this.activeTab() !== 'calc') return; // Tastatur-Eingabe nur im Calc-Modus
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    const k = event.key;
    if (/^[0-9]$/.test(k) || k === '.' || k === '+' || k === '-' || k === '*' || k === '/' || k === '%' || k === '^' || k === '(' || k === ')' || k === '!' || k === ',') {
      event.preventDefault();
      this.press(k);
    } else if (k === 'Enter' || k === '=') {
      event.preventDefault();
      this.evaluate();
    } else if (k === 'Backspace') {
      event.preventDefault();
      this.backspace();
    } else if (k === 'Escape') {
      // ESC handled at app level — keep
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.activeTab() === 'plot') this.drawPlot();
  }
}

/** Findet eine "nette" Schrittweite für Grid-Linien. */
function niceStep(range: number): number {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const target = range / 10;
  const exp = Math.floor(Math.log10(target));
  const base = Math.pow(10, exp);
  const m = target / base;
  if (m < 1.5) return base;
  if (m < 3.5) return 2 * base;
  if (m < 7.5) return 5 * base;
  return 10 * base;
}

function formatLabel(v: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return v.toFixed(Math.min(6, decimals)).replace(/\.?0+$/, '');
}
