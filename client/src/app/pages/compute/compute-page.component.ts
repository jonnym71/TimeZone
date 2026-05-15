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
  activeTab?: 'calc' | 'plot' | 'formulas' | 'coord';
  coordPoints?: CoordPoint[];
  coordShapes?: CoordShape[];
  coordView?: CoordView;
  coordSnap?: boolean;
}

export interface CoordPoint {
  id: string;
  x: number;
  y: number;
}

export type CoordShapeType = 'line' | 'polygon' | 'circle' | 'rect';

export interface CoordShape {
  id: string;
  type: CoordShapeType;
  pointIds: string[];   // line/rect: 2 pts | polygon: n pts | circle: 2 pts (center, edge)
  color: string;
}

export type CoordTool = 'point' | 'line' | 'polygon' | 'circle' | 'rect' | 'delete';

export interface CoordView {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface FormulaCard {
  id: string;
  title: string;
  formula: string;
  template: string;       // Inserted into expression (with sample numbers)
  description: string;
}

export const FORMULA_CARDS: FormulaCard[] = [
  { id: 'pythagoras', title: 'Pythagoras', formula: 'c = √(a² + b²)',
    template: 'hypot(3, 4)', description: 'Hypotenuse aus zwei Katheten' },
  { id: 'distance', title: 'Distanz 2D', formula: 'd = √((x₂−x₁)² + (y₂−y₁)²)',
    template: 'dist(0, 0, 3, 4)', description: 'Abstand zweier Punkte' },
  { id: 'quadratic-p', title: 'Quadratisch (+)', formula: 'x = (−b + √(b²−4ac)) / 2a',
    template: 'quadp(1, -3, 2)', description: 'ax² + bx + c = 0, +Lösung' },
  { id: 'quadratic-m', title: 'Quadratisch (−)', formula: 'x = (−b − √(b²−4ac)) / 2a',
    template: 'quadm(1, -3, 2)', description: 'ax² + bx + c = 0, −Lösung' },
  { id: 'disc', title: 'Diskriminante', formula: 'D = b² − 4ac',
    template: 'disc(1, -3, 2)', description: 'Bestimmt Anzahl Lösungen' },
  { id: 'lin', title: 'Lineare Gleichung', formula: 'ax + b = 0',
    template: 'linsolve(2, -6)', description: 'Lösung x = −b/a' },
  { id: 'circle-area', title: 'Kreisfläche', formula: 'A = π · r²',
    template: 'area(5)', description: 'Fläche aus Radius' },
  { id: 'circle-circ', title: 'Kreisumfang', formula: 'U = 2π · r',
    template: 'circ(5)', description: 'Umfang aus Radius' },
  { id: 'log-base', title: 'Logarithmus (Basis)', formula: 'logₐ(x) = ln x / ln a',
    template: 'logb(2, 8)', description: 'log zur beliebigen Basis' },
  { id: 'log10', title: 'Zehnerlogarithmus', formula: 'log₁₀(x)',
    template: 'log10(1000)', description: 'Basis 10' },
  { id: 'log2', title: 'Zweierlogarithmus', formula: 'log₂(x)',
    template: 'log2(64)', description: 'Basis 2 (Informatik)' },
  { id: 'percent', title: 'Prozent', formula: 'p% von X',
    template: 'pct(15, 200)', description: '15% von 200 = 30' },
  { id: 'pctof', title: 'Anteil in %', formula: 'p = Teil / Ganzes · 100',
    template: 'pctof(30, 200)', description: 'wieviel % ist 30 von 200' },
  { id: 'compound', title: 'Zinseszins', formula: 'K = K₀ · (1 + p/100)ⁿ',
    template: 'compound(1000, 5, 10)', description: '1000 €, 5%, 10 Jahre' },
  { id: 'ncr', title: 'Kombinationen', formula: 'C(n,r) = n! / (r!·(n−r)!)',
    template: 'ncr(49, 6)', description: 'z. B. Lotto 6 aus 49' },
  { id: 'npr', title: 'Permutationen', formula: 'P(n,r) = n! / (n−r)!',
    template: 'npr(10, 3)', description: 'geordnete Anordnungen' },
  { id: 'gcd', title: 'ggT', formula: 'größter gemeinsamer Teiler',
    template: 'gcd(48, 18)', description: 'Euklidischer Algorithmus' },
  { id: 'lcm', title: 'kgV', formula: 'kleinstes gemeinsames Vielfaches',
    template: 'lcm(4, 6)', description: 'aus Zahlenmenge' },
  { id: 'mean', title: 'Mittelwert', formula: 'x̄ = Σx / n',
    template: 'mean(2, 4, 6, 8)', description: 'arithmetisches Mittel' },
  { id: 'median', title: 'Median', formula: 'mittlerer Wert',
    template: 'median(1, 3, 5, 7, 9)', description: 'sortierte Mitte' },
  { id: 'sd', title: 'Standardabweichung', formula: 'σ = √(Σ(x−x̄)² / n)',
    template: 'sd(2, 4, 6, 8)', description: 'Streuung um Mittelwert' },
];

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
  @ViewChild('coordCanvas') coordCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly expression = signal('');
  readonly mode = signal<AngleMode>('rad');
  readonly history = signal<HistoryItem[]>([]);
  readonly vars = signal<Record<string, number>>({});

  readonly activeTab = signal<'calc' | 'plot' | 'formulas' | 'coord'>('calc');
  readonly formulas = FORMULA_CARDS;
  readonly plots = signal<PlotFunction[]>([]);
  readonly plotState = signal<PlotState>({ xMin: -10, xMax: 10, yMin: -5, yMax: 5, yAuto: true });
  readonly newPlotExpr = signal('');
  readonly hoverCoord = signal<{ x: number; y: number } | null>(null);

  // === Koordinatensystem (Punkte & Formen) ===
  readonly coordPoints = signal<CoordPoint[]>([]);
  readonly coordShapes = signal<CoordShape[]>([]);
  readonly coordTool = signal<CoordTool>('point');
  readonly coordPending = signal<string[]>([]);      // IDs der schon gewählten Punkte beim Shape-Bau
  readonly coordView = signal<CoordView>({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  readonly coordSnap = signal<boolean>(true);
  readonly coordCursor = signal<{ x: number; y: number } | null>(null);
  readonly newPointX = signal('');
  readonly newPointY = signal('');

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
        coordPoints: this.coordPoints(),
        coordShapes: this.coordShapes(),
        coordView: this.coordView(),
        coordSnap: this.coordSnap(),
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

    // Koordinatensystem neu zeichnen
    effect(() => {
      this.coordPoints();
      this.coordShapes();
      this.coordView();
      this.coordPending();
      this.coordCursor();
      this.coordTool();
      if (this.activeTab() === 'coord') {
        queueMicrotask(() => this.drawCoord());
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.activeTab() === 'plot') queueMicrotask(() => this.drawPlot());
    if (this.activeTab() === 'coord') queueMicrotask(() => this.drawCoord());
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
      if (s.activeTab === 'calc' || s.activeTab === 'plot' || s.activeTab === 'formulas' || s.activeTab === 'coord') this.activeTab.set(s.activeTab);
      if (Array.isArray(s.coordPoints)) this.coordPoints.set(s.coordPoints);
      if (Array.isArray(s.coordShapes)) this.coordShapes.set(s.coordShapes);
      if (s.coordView) this.coordView.set(s.coordView);
      if (typeof s.coordSnap === 'boolean') this.coordSnap.set(s.coordSnap);
    } catch {}
  }

  /* ===== Tabs ===== */
  setTab(t: 'calc' | 'plot' | 'formulas' | 'coord'): void { this.activeTab.set(t); }

  /* ===== Formeln einfügen ===== */
  insertFormula(card: FormulaCard): void {
    this.expression.set(card.template);
    this.activeTab.set('calc');
  }

  applyFormula(card: FormulaCard): void {
    this.expression.set(card.template);
    this.evaluate();
    this.activeTab.set('calc');
  }

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

    // Background – Brave Welcome glass (semi-transparent, lets parent gradient bleed through)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15, 8, 30, 0.35)';
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

    // Achsen-Labels "x" und "y" an Achsenenden
    const x0 = xToPx(0), y0 = yToPx(0);
    ctx.fillStyle = '#9b80ff';
    ctx.font = 'italic 600 13px "Inter", system-ui, sans-serif';
    if (y0 >= 0 && y0 <= H) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('x', W - 6, Math.max(12, y0 - 8));
    }
    if (x0 >= 0 && x0 <= W) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('y', Math.min(W - 12, x0 + 6), 4);
    }

    // Hover crosshair + readout
    const hov = this.hoverCoord();
    if (hov) {
      const px = xToPx(hov.x);
      const py = yToPx(hov.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(155, 128, 255, 0.55)';
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
      ctx.fillStyle = 'rgba(20, 12, 40, 0.92)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = 'rgba(155, 128, 255, 0.55)';
      ctx.strokeRect(bx, by, boxW, boxH);
      ctx.fillStyle = '#c8b8ff';
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

    // Minor grid (hell, dezent auf dunklem Glas)
    ctx.strokeStyle = 'rgba(155, 128, 255, 0.16)';
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

    // Achsen (kräftiger, hell auf dunkel)
    const x0 = xToPx(0), y0 = yToPx(0);
    ctx.strokeStyle = 'rgba(200, 184, 255, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (y0 >= 0 && y0 <= H) { ctx.moveTo(0, y0); ctx.lineTo(W, y0); }
    if (x0 >= 0 && x0 <= W) { ctx.moveTo(x0, 0); ctx.lineTo(x0, H); }
    ctx.stroke();

    // Pfeilspitzen an Achsenenden
    ctx.fillStyle = 'rgba(200, 184, 255, 0.9)';
    if (y0 >= 0 && y0 <= H) {
      ctx.beginPath();
      ctx.moveTo(W, y0); ctx.lineTo(W - 8, y0 - 4); ctx.lineTo(W - 8, y0 + 4);
      ctx.closePath(); ctx.fill();
    }
    if (x0 >= 0 && x0 <= W) {
      ctx.beginPath();
      ctx.moveTo(x0, 0); ctx.lineTo(x0 - 4, 8); ctx.lineTo(x0 + 4, 8);
      ctx.closePath(); ctx.fill();
    }

    // Tick-Beschriftung
    ctx.fillStyle = 'rgba(220, 210, 255, 0.7)';
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

  /* ===== Koordinatensystem: Tools & Aktionen ===== */
  setCoordTool(tool: CoordTool): void {
    this.coordTool.set(tool);
    this.coordPending.set([]);
  }

  private genId(): string { return Math.random().toString(36).slice(2, 9); }
  private snapVal(v: number): number {
    if (!this.coordSnap()) return v;
    return Math.round(v);
  }

  private addPointAt(x: number, y: number): CoordPoint {
    const p: CoordPoint = { id: this.genId(), x: this.snapVal(x), y: this.snapVal(y) };
    this.coordPoints.update(ps => [...ps, p]);
    return p;
  }

  addPointManual(): void {
    const x = parseFloat(this.newPointX());
    const y = parseFloat(this.newPointY());
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.coordPoints.update(ps => [...ps, { id: this.genId(), x, y }]);
    this.newPointX.set(''); this.newPointY.set('');
  }

  private nextShapeColor(): string {
    return PLOT_COLORS[this.coordShapes().length % PLOT_COLORS.length];
  }

  private commitShape(type: CoordShapeType, pointIds: string[]): void {
    this.coordShapes.update(ss => [...ss, {
      id: this.genId(), type, pointIds, color: this.nextShapeColor(),
    }]);
    this.coordPending.set([]);
  }

  finishPolygon(): void {
    const ids = this.coordPending();
    if (ids.length >= 3 && this.coordTool() === 'polygon') {
      this.commitShape('polygon', ids);
    }
  }

  cancelPending(): void {
    this.coordPending.set([]);
  }

  onCoordCanvasClick(event: MouseEvent): void {
    const cvs = this.coordCanvasRef?.nativeElement;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const v = this.coordView();
    const x = v.xMin + (mx / rect.width) * (v.xMax - v.xMin);
    const y = v.yMin + ((rect.height - my) / rect.height) * (v.yMax - v.yMin);

    const tool = this.coordTool();
    if (tool === 'delete') {
      const hit = this.findPointAt(x, y);
      if (hit) {
        this.coordPoints.update(ps => ps.filter(p => p.id !== hit.id));
        this.coordShapes.update(ss => ss.filter(s => !s.pointIds.includes(hit.id)));
      }
      return;
    }
    if (tool === 'point') {
      this.addPointAt(x, y);
      return;
    }
    // Shape-Tools: existing point oder neuen Punkt erzeugen
    let pid: string;
    const hit = this.findPointAt(x, y);
    if (hit) pid = hit.id;
    else pid = this.addPointAt(x, y).id;

    this.coordPending.update(arr => [...arr, pid]);
    const pending = this.coordPending();
    if (tool === 'line' && pending.length === 2) {
      this.commitShape('line', pending);
    } else if (tool === 'rect' && pending.length === 2) {
      this.commitShape('rect', pending);
    } else if (tool === 'circle' && pending.length === 2) {
      this.commitShape('circle', pending);
    }
    // polygon: explizit über "Abschließen"-Button
  }

  onCoordCanvasMove(event: MouseEvent): void {
    const cvs = this.coordCanvasRef?.nativeElement;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const v = this.coordView();
    const x = v.xMin + (mx / rect.width) * (v.xMax - v.xMin);
    const y = v.yMin + ((rect.height - my) / rect.height) * (v.yMax - v.yMin);
    this.coordCursor.set({ x: this.snapVal(x), y: this.snapVal(y) });
  }

  onCoordCanvasLeave(): void { this.coordCursor.set(null); }

  private findPointAt(x: number, y: number): CoordPoint | undefined {
    const v = this.coordView();
    const range = Math.max(v.xMax - v.xMin, v.yMax - v.yMin);
    const tol = range * 0.025;   // 2.5% des Bereichs
    return this.coordPoints().find(p => Math.hypot(p.x - x, p.y - y) <= tol);
  }

  deleteCoordPoint(id: string): void {
    this.coordPoints.update(ps => ps.filter(p => p.id !== id));
    this.coordShapes.update(ss => ss.filter(s => !s.pointIds.includes(id)));
    this.coordPending.update(ids => ids.filter(i => i !== id));
  }

  deleteCoordShape(id: string): void {
    this.coordShapes.update(ss => ss.filter(s => s.id !== id));
  }

  clearCoord(): void {
    if (!confirm('Alle Punkte und Formen löschen?')) return;
    this.coordPoints.set([]);
    this.coordShapes.set([]);
    this.coordPending.set([]);
  }

  toggleCoordSnap(): void { this.coordSnap.update(s => !s); }

  coordZoomIn(): void {
    this.coordView.update(v => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const xr = (v.xMax - v.xMin) / 4;
      const yr = (v.yMax - v.yMin) / 4;
      return { xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }
  coordZoomOut(): void {
    this.coordView.update(v => {
      const cx = (v.xMin + v.xMax) / 2;
      const cy = (v.yMin + v.yMax) / 2;
      const xr = v.xMax - v.xMin;
      const yr = v.yMax - v.yMin;
      return { xMin: cx - xr, xMax: cx + xr, yMin: cy - yr, yMax: cy + yr };
    });
  }
  coordResetView(): void {
    this.coordView.set({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
  }

  /* ===== Koordinatensystem: Zeichnen ===== */
  drawCoord(): void {
    const cvs = this.coordCanvasRef?.nativeElement;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const rect = cvs.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (cvs.width !== rect.width * dpr || cvs.height !== rect.height * dpr) {
      cvs.width = Math.max(1, Math.floor(rect.width * dpr));
      cvs.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    const W = rect.width;
    const H = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const v = this.coordView();
    const xToPx = (x: number) => ((x - v.xMin) / (v.xMax - v.xMin)) * W;
    const yToPx = (y: number) => H - ((y - v.yMin) / (v.yMax - v.yMin)) * H;

    // Background – Brave Welcome glass
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(15, 8, 30, 0.35)';
    ctx.fillRect(0, 0, W, H);

    this.drawGrid(ctx, W, H, v.xMin, v.xMax, v.yMin, v.yMax, xToPx, yToPx);

    // Achsen-Labels
    const x0 = xToPx(0), y0 = yToPx(0);
    ctx.fillStyle = '#c8b8ff';
    ctx.font = 'italic 600 13px "Inter", system-ui, sans-serif';
    if (y0 >= 0 && y0 <= H) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('x', W - 6, Math.max(12, y0 - 8));
    }
    if (x0 >= 0 && x0 <= W) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('y', Math.min(W - 12, x0 + 6), 4);
    }

    // Shapes zeichnen
    const points = this.coordPoints();
    const ptMap = new Map(points.map(p => [p.id, p]));
    for (const s of this.coordShapes()) {
      this.drawShape(ctx, s, ptMap, xToPx, yToPx);
    }

    // Pending shape (Vorschau)
    const pending = this.coordPending();
    if (pending.length > 0) {
      const pendingPts = pending.map(id => ptMap.get(id)!).filter(Boolean);
      const cursor = this.coordCursor();
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 184, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      const tool = this.coordTool();
      if (tool === 'polygon' || tool === 'line') {
        ctx.beginPath();
        if (pendingPts.length > 0) {
          ctx.moveTo(xToPx(pendingPts[0].x), yToPx(pendingPts[0].y));
          for (let i = 1; i < pendingPts.length; i++) {
            ctx.lineTo(xToPx(pendingPts[i].x), yToPx(pendingPts[i].y));
          }
          if (cursor) ctx.lineTo(xToPx(cursor.x), yToPx(cursor.y));
        }
        ctx.stroke();
      } else if (tool === 'rect' && pendingPts.length === 1 && cursor) {
        const ax = xToPx(pendingPts[0].x), ay = yToPx(pendingPts[0].y);
        const bx = xToPx(cursor.x), by = yToPx(cursor.y);
        ctx.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
      } else if (tool === 'circle' && pendingPts.length === 1 && cursor) {
        const cx = xToPx(pendingPts[0].x), cy = yToPx(pendingPts[0].y);
        const rx = xToPx(cursor.x), ry = yToPx(cursor.y);
        const rPx = Math.hypot(rx - cx, ry - cy);
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Punkte zeichnen
    for (const p of points) {
      const px = xToPx(p.x), py = yToPx(p.y);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#c8b8ff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      // Shadow für bessere Lesbarkeit auf bunter Aurora
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText(`(${formatNumber(p.x)}, ${formatNumber(p.y)})`, px + 7, py - 6);
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }

    // Cursor-Snap-Indikator
    const cursor = this.coordCursor();
    if (cursor) {
      const px = xToPx(cursor.x), py = yToPx(cursor.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 184, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, py); ctx.lineTo(W, py);
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
      ctx.stroke();
      ctx.setLineDash([]);
      // Tool-spezifisches Vorschau-Symbol
      if (this.coordTool() === 'point') {
        ctx.fillStyle = 'rgba(200, 184, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawShape(
    ctx: CanvasRenderingContext2D,
    shape: CoordShape,
    ptMap: Map<string, CoordPoint>,
    xToPx: (x: number) => number,
    yToPx: (y: number) => number,
  ): void {
    const pts = shape.pointIds.map(id => ptMap.get(id)!).filter(Boolean);
    if (pts.length === 0) return;
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color + '22';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';

    if (shape.type === 'line' && pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(xToPx(pts[0].x), yToPx(pts[0].y));
      ctx.lineTo(xToPx(pts[1].x), yToPx(pts[1].y));
      ctx.stroke();
    } else if (shape.type === 'polygon' && pts.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(xToPx(pts[0].x), yToPx(pts[0].y));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(xToPx(pts[i].x), yToPx(pts[i].y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (shape.type === 'rect' && pts.length >= 2) {
      const ax = xToPx(pts[0].x), ay = yToPx(pts[0].y);
      const bx = xToPx(pts[1].x), by = yToPx(pts[1].y);
      const rx = Math.min(ax, bx), ry = Math.min(ay, by);
      const rw = Math.abs(bx - ax), rh = Math.abs(by - ay);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (shape.type === 'circle' && pts.length >= 2) {
      const cx = xToPx(pts[0].x), cy = yToPx(pts[0].y);
      const rx = xToPx(pts[1].x), ry = yToPx(pts[1].y);
      const rPx = Math.hypot(rx - cx, ry - cy);
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

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
    if (this.activeTab() === 'coord') this.drawCoord();
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
