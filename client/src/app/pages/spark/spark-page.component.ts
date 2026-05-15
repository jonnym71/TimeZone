import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import {
  BulletStyle,
  ChartType,
  createDoc,
  createSlide,
  CURRENCIES,
  ElementType,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  MATH_SYMBOLS,
  makeElement,
  makeId,
  PICTOGRAMS,
  SLIDE_BG_PRESETS,
  SLIDE_THEMES,
  SLIDE_TRANSITIONS,
  Slide,
  SlideElement,
  SlideRegion,
  SlideTheme,
  SlideTransition,
  SparkDoc,
  TextRegion,
} from './spark.types';
import { compute } from '../compute/compute.engine';

const STORAGE_KEY = 'tz-spark-doc-v1';

@Component({
  selector: 'app-spark-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './spark-page.component.html',
})
export class SparkPageComponent implements AfterViewInit {
  readonly overlay = inject(OverlayService);

  @ViewChild('titleEl') titleEl?: ElementRef<HTMLDivElement>;
  @ViewChild('bodyEl') bodyEl?: ElementRef<HTMLDivElement>;

  readonly fontOptions = FONT_OPTIONS;
  readonly fontSizeOptions = FONT_SIZE_OPTIONS;
  readonly bgPresets = SLIDE_BG_PRESETS;
  readonly themes = SLIDE_THEMES;
  readonly transitions = SLIDE_TRANSITIONS;
  readonly pictograms = PICTOGRAMS;
  readonly mathSymbols = MATH_SYMBOLS;
  readonly currencies = CURRENCIES;

  /** Welcher Picker-Panel ist gerade offen (Theme, Symbol, Currency)? */
  readonly openPanel = signal<'none' | 'themes' | 'transitions' | 'symbols' | 'pictograms' | 'currencies'>('none');
  readonly symbolTab = signal<'pictograms' | 'math' | 'currencies'>('pictograms');

  readonly doc = signal<SparkDoc>(this.loadOrCreate());
  readonly currentIndex = signal<number>(0);
  readonly selectedRegion = signal<TextRegion | null>(null);
  readonly selectedElementId = signal<string | null>(null);
  readonly editingElementId = signal<string | null>(null);
  readonly presentMode = signal(false);
  readonly fitScale = signal(1);

  readonly currentSlide = computed(() => {
    const d = this.doc();
    const i = this.currentIndex();
    return d.slides[Math.min(Math.max(i, 0), d.slides.length - 1)];
  });

  readonly activeRegion = computed<SlideRegion | null>(() => {
    const region = this.selectedRegion();
    if (!region) return null;
    return this.currentSlide()[region];
  });

  readonly slideElements = computed<SlideElement[]>(() => this.currentSlide()?.elements ?? []);

  readonly selectedElement = computed<SlideElement | null>(() => {
    const id = this.selectedElementId();
    if (!id) return null;
    return this.slideElements().find(e => e.id === id) ?? null;
  });

  constructor() {
    // Auto-save (debounced via microtask through effect re-evaluation)
    effect(() => {
      const d = this.doc();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      } catch {}
    });

    // Reset selection when slide changes; sync DOM to new slide
    effect(() => {
      this.currentIndex();
      this.selectedRegion.set(null);
      this.syncRegionDom();
    });

    // Auto-close present mode if overlay closes
    effect(() => {
      if (!this.overlay.sparkOpen()) {
        this.presentMode.set(false);
      }
    });
  }

  ngAfterViewInit(): void {
    this.syncRegionDom();
  }

  /**
   * Imperative DOM-Sync: schreibt Text aus dem Modell nur dann ins
   * contenteditable-Element, wenn dort schon etwas Abweichendes steht.
   * Verhindert, dass beim Tippen der Cursor an den Anfang springt
   * (Folge: rückwärts wirkendes Schreiben).
   */
  private syncRegionDom(): void {
    const s = this.currentSlide();
    if (!s) return;
    queueMicrotask(() => {
      const tEl = this.titleEl?.nativeElement;
      const bEl = this.bodyEl?.nativeElement;
      if (tEl && tEl.innerText !== s.title.text) tEl.innerText = s.title.text;
      if (bEl && bEl.innerText !== s.body.text) bEl.innerText = s.body.text;
    });
  }

  private loadOrCreate(): SparkDoc {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SparkDoc;
        if (parsed?.slides?.length) return parsed;
      }
    } catch {}
    return createDoc();
  }

  close(): void {
    this.presentMode.set(false);
    this.overlay.closeSpark();
  }

  // ===== Slide management =====

  addSlide(): void {
    this.doc.update(d => {
      const slides = [...d.slides];
      const insertAt = this.currentIndex() + 1;
      slides.splice(insertAt, 0, createSlide());
      return { ...d, slides };
    });
    this.currentIndex.update(i => i + 1);
  }

  deleteSlide(index: number): void {
    const d = this.doc();
    if (d.slides.length <= 1) return;
    this.doc.update(prev => {
      const slides = prev.slides.filter((_, i) => i !== index);
      return { ...prev, slides };
    });
    this.currentIndex.update(i => Math.min(i, this.doc().slides.length - 1));
  }

  duplicateSlide(index: number): void {
    this.doc.update(d => {
      const slides = [...d.slides];
      const copy: Slide = JSON.parse(JSON.stringify(slides[index]));
      copy.id = makeId();
      slides.splice(index + 1, 0, copy);
      return { ...d, slides };
    });
    this.currentIndex.set(index + 1);
  }

  moveSlideUp(index: number): void {
    if (index <= 0) return;
    this.doc.update(d => {
      const slides = [...d.slides];
      [slides[index - 1], slides[index]] = [slides[index], slides[index - 1]];
      return { ...d, slides };
    });
    this.currentIndex.set(index - 1);
  }

  moveSlideDown(index: number): void {
    if (index >= this.doc().slides.length - 1) return;
    this.doc.update(d => {
      const slides = [...d.slides];
      [slides[index + 1], slides[index]] = [slides[index], slides[index + 1]];
      return { ...d, slides };
    });
    this.currentIndex.set(index + 1);
  }

  selectSlide(index: number): void {
    this.currentIndex.set(index);
  }

  // ===== Region editing =====

  selectRegion(region: TextRegion): void {
    this.selectedRegion.set(region);
  }

  updateRegionText(region: TextRegion, text: string): void {
    this.updateRegion(region, { text });
  }

  updateRegion(region: TextRegion, patch: Partial<SlideRegion>): void {
    const idx = this.currentIndex();
    this.doc.update(d => {
      const slides = d.slides.map((s, i) =>
        i === idx ? { ...s, [region]: { ...s[region], ...patch } } : s,
      );
      return { ...d, slides };
    });
  }

  // ===== Toolbar actions (apply to active region) =====

  private patchActive(patch: Partial<SlideRegion>): void {
    const r = this.selectedRegion();
    if (!r) return;
    this.updateRegion(r, patch);
  }

  setFontFamily(value: string): void { this.patchActive({ fontFamily: value }); }
  setFontSize(value: number): void { this.patchActive({ fontSize: value }); }
  toggleBold(): void {
    const a = this.activeRegion();
    if (a) this.patchActive({ bold: !a.bold });
  }
  toggleItalic(): void {
    const a = this.activeRegion();
    if (a) this.patchActive({ italic: !a.italic });
  }
  toggleUnderline(): void {
    const a = this.activeRegion();
    if (a) this.patchActive({ underline: !a.underline });
  }
  setColor(value: string): void { this.patchActive({ color: value }); }
  setAlign(value: 'left' | 'center' | 'right'): void { this.patchActive({ align: value }); }

  /* ===== Slide Elements ===== */
  addElement(type: ElementType): void {
    const slide = this.currentSlide();
    if (!slide) return;
    const existing = slide.elements ?? [];
    const maxZ = existing.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = makeElement(type, { zIndex: maxZ + 1 });
    if (type === 'text') el.text = '';
    this.updateSlideElements([...existing, el]);
    this.selectedRegion.set(null);
    this.selectedElementId.set(el.id);
  }

  async addImageElement(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      alert('Bitte ein Bild auswählen.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Das Bild ist zu groß (max. 4 MB).');
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const slide = this.currentSlide();
    if (!slide) return;
    const existing = slide.elements ?? [];
    const maxZ = existing.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = makeElement('image', { src: dataUrl, zIndex: maxZ + 1, w: 35, h: 35 });
    this.updateSlideElements([...existing, el]);
    this.selectedRegion.set(null);
    this.selectedElementId.set(el.id);
  }

  onImageFileSelected(input: HTMLInputElement): void {
    const f = input.files?.[0];
    if (f) this.addImageElement(f);
    input.value = '';
  }

  selectElement(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedElementId.set(id);
    this.selectedRegion.set(null);
  }

  clearElementSelection(): void {
    this.selectedElementId.set(null);
    this.editingElementId.set(null);
  }

  startEditingElement(id: string, event: Event): void {
    event.stopPropagation();
    this.selectedElementId.set(id);
    this.editingElementId.set(id);
  }

  updateElementText(id: string, text: string): void {
    this.patchElement(id, { text });
  }

  patchElement(id: string, patch: Partial<SlideElement>): void {
    const idx = this.currentIndex();
    this.doc.update(d => {
      const slides = d.slides.map((s, i) => {
        if (i !== idx) return s;
        const elements = (s.elements ?? []).map(e => e.id === id ? { ...e, ...patch } : e);
        return { ...s, elements };
      });
      return { ...d, slides };
    });
  }

  private updateSlideElements(elements: SlideElement[]): void {
    const idx = this.currentIndex();
    this.doc.update(d => {
      const slides = d.slides.map((s, i) => i === idx ? { ...s, elements } : s);
      return { ...d, slides };
    });
  }

  deleteSelectedElement(): void {
    const id = this.selectedElementId();
    if (!id) return;
    const slide = this.currentSlide();
    if (!slide) return;
    this.updateSlideElements((slide.elements ?? []).filter(e => e.id !== id));
    this.selectedElementId.set(null);
    this.editingElementId.set(null);
  }

  bringForward(): void {
    const id = this.selectedElementId();
    if (!id) return;
    const slide = this.currentSlide();
    if (!slide) return;
    const elements = (slide.elements ?? []).slice().sort((a, b) => a.zIndex - b.zIndex);
    const idx = elements.findIndex(e => e.id === id);
    if (idx < 0 || idx >= elements.length - 1) return;
    const z1 = elements[idx].zIndex;
    const z2 = elements[idx + 1].zIndex;
    this.patchElement(elements[idx].id, { zIndex: z2 });
    this.patchElement(elements[idx + 1].id, { zIndex: z1 });
  }

  sendBackward(): void {
    const id = this.selectedElementId();
    if (!id) return;
    const slide = this.currentSlide();
    if (!slide) return;
    const elements = (slide.elements ?? []).slice().sort((a, b) => a.zIndex - b.zIndex);
    const idx = elements.findIndex(e => e.id === id);
    if (idx <= 0) return;
    const z1 = elements[idx].zIndex;
    const z2 = elements[idx - 1].zIndex;
    this.patchElement(elements[idx].id, { zIndex: z2 });
    this.patchElement(elements[idx - 1].id, { zIndex: z1 });
  }

  duplicateSelectedElement(): void {
    const sel = this.selectedElement();
    if (!sel) return;
    const slide = this.currentSlide();
    if (!slide) return;
    const existing = slide.elements ?? [];
    const maxZ = existing.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const copy: SlideElement = { ...sel, id: makeId(), x: sel.x + 3, y: sel.y + 3, zIndex: maxZ + 1 };
    this.updateSlideElements([...existing, copy]);
    this.selectedElementId.set(copy.id);
  }

  /* ===== Drag / Resize via pointer events ===== */
  private dragInfo: {
    id: string;
    type: 'move' | 'resize';
    handle?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    canvasRect: DOMRect;
    startX: number;
    startY: number;
    initial: SlideElement;
  } | null = null;

  startElementDrag(event: PointerEvent, id: string): void {
    if (event.button !== 0) return;
    // Skip if we're editing a text element — let the user select text instead
    if (this.editingElementId() === id) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = (event.currentTarget as HTMLElement).closest('.spark-canvas') as HTMLElement | null;
    if (!canvas) return;
    const el = this.slideElements().find(e => e.id === id);
    if (!el) return;
    this.dragInfo = {
      id,
      type: 'move',
      canvasRect: canvas.getBoundingClientRect(),
      startX: event.clientX,
      startY: event.clientY,
      initial: { ...el },
    };
    this.selectedElementId.set(id);
    this.selectedRegion.set(null);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  startElementResize(event: PointerEvent, id: string, handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = (event.currentTarget as HTMLElement).closest('.spark-canvas') as HTMLElement | null;
    if (!canvas) return;
    const el = this.slideElements().find(e => e.id === id);
    if (!el) return;
    this.dragInfo = {
      id,
      type: 'resize',
      handle,
      canvasRect: canvas.getBoundingClientRect(),
      startX: event.clientX,
      startY: event.clientY,
      initial: { ...el },
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragInfo) return;
    const d = this.dragInfo;
    const dxPct = ((event.clientX - d.startX) / d.canvasRect.width) * 100;
    const dyPct = ((event.clientY - d.startY) / d.canvasRect.height) * 100;
    if (d.type === 'move') {
      const x = Math.max(0, Math.min(100 - d.initial.w, d.initial.x + dxPct));
      const y = Math.max(0, Math.min(100 - d.initial.h, d.initial.y + dyPct));
      this.patchElement(d.id, { x, y });
    } else {
      let { x, y, w, h } = d.initial;
      if (d.handle?.includes('e')) w = Math.max(3, d.initial.w + dxPct);
      if (d.handle?.includes('s')) h = Math.max(2, d.initial.h + dyPct);
      if (d.handle?.includes('w')) { w = Math.max(3, d.initial.w - dxPct); x = d.initial.x + (d.initial.w - w); }
      if (d.handle?.includes('n')) { h = Math.max(2, d.initial.h - dyPct); y = d.initial.y + (d.initial.h - h); }
      // Clamp
      if (x < 0) { w += x; x = 0; }
      if (y < 0) { h += y; y = 0; }
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;
      this.patchElement(d.id, { x, y, w, h });
    }
  }

  onPointerUp(_event: PointerEvent): void {
    this.dragInfo = null;
  }

  setBackground(color: string): void {
    const idx = this.currentIndex();
    this.doc.update(d => {
      const slides = d.slides.map((s, i) => (i === idx ? { ...s, background: color } : s));
      return { ...d, slides };
    });
  }

  // ===== Present mode =====

  enterPresent(): void {
    this.currentIndex.set(0);           // Präsentation startet immer auf der ersten Folie
    this.presentMode.set(true);
    this.selectedRegion.set(null);
    this.selectedElementId.set(null);
    this.editingElementId.set(null);
  }

  exitPresent(): void {
    this.presentMode.set(false);
  }

  nextSlide(): void {
    const d = this.doc();
    this.currentIndex.update(i => Math.min(i + 1, d.slides.length - 1));
  }

  prevSlide(): void {
    this.currentIndex.update(i => Math.max(i - 1, 0));
  }

  /* ===== Bullet-Listen ===== */
  cycleBulletStyleForActive(): void {
    const region = this.selectedRegion();
    const elId = this.selectedElementId();
    const order: BulletStyle[] = ['none', 'bullet', 'number'];
    const next = (cur: BulletStyle | undefined): BulletStyle => order[(order.indexOf(cur ?? 'none') + 1) % order.length];
    if (region) {
      const cur = this.activeRegion()?.bulletStyle ?? 'none';
      this.patchActive({ bulletStyle: next(cur) });
    } else if (elId) {
      const el = this.selectedElement();
      if (el?.type === 'text') this.patchElement(elId, { bulletStyle: next(el.bulletStyle) });
    }
  }

  /** Render-Helfer: nimmt mehrzeiligen Text + bulletStyle und gibt jede Zeile mit Prefix. */
  formatBulletText(text: string | undefined, style: BulletStyle | undefined): string {
    if (!text) return '';
    if (!style || style === 'none') return text;
    const lines = text.split('\n');
    if (style === 'bullet') return lines.map(l => l.trim() ? `• ${l}` : l).join('\n');
    // number
    let n = 0;
    return lines.map(l => l.trim() ? `${++n}. ${l}` : l).join('\n');
  }

  /* ===== Themes / Entwurf ===== */
  togglePanel(panel: 'themes' | 'transitions' | 'symbols' | 'pictograms' | 'currencies'): void {
    this.openPanel.update(cur => cur === panel ? 'none' : panel);
  }
  closePanels(): void { this.openPanel.set('none'); }

  applyTheme(theme: SlideTheme, toAll = false): void {
    const apply = (s: Slide): Slide => ({
      ...s,
      background: theme.background,
      themeId: theme.id,
      title: { ...s.title, fontFamily: theme.titleFont, color: theme.titleColor, bold: theme.titleBold },
      body:  { ...s.body,  fontFamily: theme.bodyFont,  color: theme.bodyColor },
    });
    if (toAll) {
      this.doc.update(d => ({ ...d, slides: d.slides.map(apply) }));
    } else {
      const idx = this.currentIndex();
      this.doc.update(d => ({ ...d, slides: d.slides.map((s, i) => i === idx ? apply(s) : s) }));
    }
    this.closePanels();
  }

  /* ===== Übergänge ===== */
  setTransition(t: SlideTransition, toAll = false): void {
    if (toAll) {
      this.doc.update(d => ({ ...d, slides: d.slides.map(s => ({ ...s, transition: t })) }));
    } else {
      const idx = this.currentIndex();
      this.doc.update(d => ({ ...d, slides: d.slides.map((s, i) => i === idx ? { ...s, transition: t } : s) }));
    }
    this.closePanels();
  }

  /* ===== Special-Char Insert: Pictogram / Symbol / Currency → fügt Text-Element ein ===== */
  insertGlyph(glyph: string): void {
    const slide = this.currentSlide();
    if (!slide) return;
    const existing = slide.elements ?? [];
    const maxZ = existing.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = makeElement('icon', { iconChar: glyph, zIndex: maxZ + 1, x: 40, y: 38, w: 14, h: 18 });
    this.updateSlideElements([...existing, el]);
    this.selectedElementId.set(el.id);
    this.selectedRegion.set(null);
    this.closePanels();
  }

  insertCurrency(code: string, symbol: string): void {
    const slide = this.currentSlide();
    if (!slide) return;
    const existing = slide.elements ?? [];
    const maxZ = existing.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el = makeElement('text', {
      text: `${symbol} 100,00 ${code}`,
      zIndex: maxZ + 1,
      x: 35, y: 40,
      w: 30, h: 10,
      fontSize: 32, bold: true,
      color: this.currentSlide()?.title.color ?? '#1a1410',
    });
    this.updateSlideElements([...existing, el]);
    this.selectedElementId.set(el.id);
    this.selectedRegion.set(null);
    this.closePanels();
  }

  /* ===== Tabelle ===== */
  insertTable(): void { this.addElement('table'); }

  patchTableCell(elId: string, row: number, col: number, value: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'table' || !el.tableRows) return;
    const rows = el.tableRows.map((r, ri) => r.map((c, ci) => (ri === row && ci === col) ? value : c));
    this.patchElement(elId, { tableRows: rows });
  }

  addTableRow(elId: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'table' || !el.tableRows) return;
    const colCount = el.tableRows[0]?.length ?? 3;
    const newRow = Array.from({ length: colCount }, () => '');
    this.patchElement(elId, { tableRows: [...el.tableRows, newRow] });
  }

  addTableCol(elId: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'table' || !el.tableRows) return;
    const rows = el.tableRows.map(r => [...r, '']);
    this.patchElement(elId, { tableRows: rows });
  }

  removeTableRow(elId: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'table' || !el.tableRows || el.tableRows.length <= 1) return;
    this.patchElement(elId, { tableRows: el.tableRows.slice(0, -1) });
  }

  removeTableCol(elId: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'table' || !el.tableRows || (el.tableRows[0]?.length ?? 0) <= 1) return;
    this.patchElement(elId, { tableRows: el.tableRows.map(r => r.slice(0, -1)) });
  }

  /* ===== Diagramm ===== */
  insertChart(): void { this.addElement('chart'); }

  setChartType(elId: string, t: ChartType): void { this.patchElement(elId, { chartType: t }); }

  patchChartDataPoint(elId: string, idx: number, label: string, value: number): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'chart' || !el.chartData) return;
    const data = el.chartData.map((d, i) => i === idx ? { label, value } : d);
    this.patchElement(elId, { chartData: data });
  }

  addChartPoint(elId: string): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'chart') return;
    const data = [...(el.chartData ?? []), { label: 'Neu', value: 10 }];
    this.patchElement(elId, { chartData: data });
  }

  removeChartPoint(elId: string, idx: number): void {
    const el = this.slideElements().find(e => e.id === elId);
    if (!el || el.type !== 'chart' || !el.chartData || el.chartData.length <= 1) return;
    this.patchElement(elId, { chartData: el.chartData.filter((_, i) => i !== idx) });
  }

  /** SVG-Pfad-Daten für ein Tortendiagramm-Segment. */
  chartPieSegments(el: SlideElement): { d: string; color: string; label: string; value: number }[] {
    const data = el.chartData ?? [];
    const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
    const PALETTE = ['#FB542B', '#FA7250', '#7c5fff', '#5db4ff', '#2E8B7B', '#FFB45A', '#E84A8C', '#9F7FE0'];
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
      const x1 = 50 + 45 * Math.cos(angle);
      const y1 = 50 + 45 * Math.sin(angle);
      const x2 = 50 + 45 * Math.cos(angle + slice);
      const y2 = 50 + 45 * Math.sin(angle + slice);
      const large = slice > Math.PI ? 1 : 0;
      const path = `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 45 45 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      angle += slice;
      return { d: path, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value };
    });
  }

  /* ===== Rechner-Element ===== */
  insertCalc(): void { this.addElement('calc'); }

  calcResult(expr: string | undefined): string {
    if (!expr || !expr.trim()) return '';
    const r = compute(expr, {}, 'rad');
    return r.ok ? (r.formatted ?? '') : '';
  }

  patchCalcExpr(elId: string, expr: string): void {
    this.patchElement(elId, { calcExpr: expr });
  }

  // ===== Reset =====

  resetDoc(): void {
    if (!confirm('Wirklich alle Folien löschen und neu starten?')) return;
    this.doc.set(createDoc());
    this.currentIndex.set(0);
    this.selectedRegion.set(null);
  }

  // ===== Keyboard shortcuts =====

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.sparkOpen()) return;

    if (this.presentMode()) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        this.nextSlide();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        this.prevSlide();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.exitPresent();
      }
      return;
    }

    // Editor shortcuts only when not typing in inputs
    const target = event.target as HTMLElement | null;
    const inEditable =
      !!target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT');

    if (event.key === 'F5') {
      event.preventDefault();
      this.enterPresent();
      return;
    }

    // Element-Verwaltung
    if (this.selectedElementId() && !inEditable) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        this.deleteSelectedElement();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.clearElementSelection();
        return;
      }
      // Pfeile = nudge
      if (event.key.startsWith('Arrow')) {
        const step = event.shiftKey ? 5 : 1;
        const el = this.selectedElement();
        if (!el) return;
        let { x, y } = el;
        if (event.key === 'ArrowLeft') x = Math.max(0, x - step);
        else if (event.key === 'ArrowRight') x = Math.min(100 - el.w, x + step);
        else if (event.key === 'ArrowUp') y = Math.max(0, y - step);
        else if (event.key === 'ArrowDown') y = Math.min(100 - el.h, y + step);
        event.preventDefault();
        this.patchElement(el.id, { x, y });
        return;
      }
    }

    if (inEditable && (event.ctrlKey || event.metaKey)) {
      if (event.key.toLowerCase() === 'b') { event.preventDefault(); this.toggleBold(); }
      else if (event.key.toLowerCase() === 'i') { event.preventDefault(); this.toggleItalic(); }
      else if (event.key.toLowerCase() === 'u') { event.preventDefault(); this.toggleUnderline(); }
    }
  }
}
