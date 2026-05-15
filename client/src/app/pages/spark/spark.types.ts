export type TextRegion = 'title' | 'body';

export type BulletStyle = 'none' | 'bullet' | 'number';
export type SlideTransition = 'none' | 'fade' | 'slide-left' | 'slide-up' | 'zoom';

export interface SlideRegion {
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  bulletStyle?: BulletStyle;
}

export type ElementType =
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'image'
  | 'icon'
  | 'table'
  | 'chart'
  | 'calc';

export type ChartType = 'bar' | 'pie' | 'line';

export interface SlideElement {
  id: string;
  type: ElementType;
  x: number;     // % of canvas width (0-100)
  y: number;     // % of canvas height
  w: number;     // % width
  h: number;     // % height
  zIndex: number;
  // text-only
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  bulletStyle?: BulletStyle;
  // shape-only
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // image / icon
  src?: string;
  iconChar?: string;        // einzelner Unicode-/Emoji-Glyph
  // table
  tableRows?: string[][];   // 2D Array
  tableHeader?: boolean;
  // chart
  chartType?: ChartType;
  chartData?: { label: string; value: number }[];
  chartTitle?: string;
  // calc
  calcExpr?: string;        // Eingabe-Ausdruck, das Ergebnis wird live berechnet
}

export interface Slide {
  id: string;
  background: string;
  title: SlideRegion;
  body: SlideRegion;
  elements?: SlideElement[];      // optional → backward compatible
  transition?: SlideTransition;   // optional
  themeId?: string;               // optional → Reference auf SLIDE_THEMES
}

export interface SparkDoc {
  id: string;
  title: string;
  slides: Slide[];
}

export interface SlideTheme {
  id: string;
  name: string;
  background: string;
  titleColor: string;
  bodyColor: string;
  titleFont: string;
  bodyFont: string;
  titleBold: boolean;
}

export const DEFAULT_FONT = 'Inter, system-ui, sans-serif';
export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", "Fira Code", monospace' },
];

export const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96, 128];

export const SLIDE_BG_PRESETS = [
  '#ffffff',
  '#f5f1eb',
  '#1a1410',
  '#0d0a08',
  '#FB542B',
  '#FA7250',
  '#2c1a14',
  '#1f4f7f',
  '#0f3057',
  '#2d5016',
];

/** Vordefinierte Folien-Designs (Theme-Picker / "Entwurf"). */
export const SLIDE_THEMES: SlideTheme[] = [
  { id: 'clean',    name: 'Clean',    background: '#ffffff', titleColor: '#1a1410', bodyColor: '#444444', titleFont: 'Inter, system-ui, sans-serif',   bodyFont: 'Inter, system-ui, sans-serif',   titleBold: true },
  { id: 'paper',    name: 'Papier',   background: '#f5f1eb', titleColor: '#2c1a14', bodyColor: '#5b4a3e', titleFont: 'Georgia, serif',                    bodyFont: 'Georgia, serif',                    titleBold: true },
  { id: 'midnight', name: 'Mitternacht', background: '#0d0a18', titleColor: '#ffffff', bodyColor: '#c8b8ff', titleFont: 'Inter, system-ui, sans-serif',  bodyFont: 'Inter, system-ui, sans-serif',   titleBold: true },
  { id: 'sunset',   name: 'Sonnenuntergang', background: '#FB542B', titleColor: '#ffffff', bodyColor: '#fff2ec', titleFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', titleBold: true },
  { id: 'ocean',    name: 'Ozean',    background: '#0f3057', titleColor: '#ffffff', bodyColor: '#a8d0e8', titleFont: 'Inter, system-ui, sans-serif',   bodyFont: 'Inter, system-ui, sans-serif',   titleBold: true },
  { id: 'forest',   name: 'Wald',     background: '#2d5016', titleColor: '#ffffff', bodyColor: '#cfe8b6', titleFont: 'Georgia, serif',                    bodyFont: 'Inter, system-ui, sans-serif',   titleBold: true },
  { id: 'violet',   name: 'Violett',  background: '#2a1b4d', titleColor: '#ffffff', bodyColor: '#c8b8ff', titleFont: 'Inter, system-ui, sans-serif',   bodyFont: 'Inter, system-ui, sans-serif',   titleBold: true },
  { id: 'mono',     name: 'Mono',     background: '#1a1a1a', titleColor: '#fafafa', bodyColor: '#bdbdbd', titleFont: '"JetBrains Mono", monospace',     bodyFont: '"JetBrains Mono", monospace',     titleBold: true },
];

/** Übergänge zwischen Folien (Animation beim Wechsel im Präsentationsmodus). */
export const SLIDE_TRANSITIONS: { id: SlideTransition; label: string }[] = [
  { id: 'none',       label: 'Kein' },
  { id: 'fade',       label: 'Überblendung' },
  { id: 'slide-left', label: 'Schieben' },
  { id: 'slide-up',   label: 'Hoch' },
  { id: 'zoom',       label: 'Zoom' },
];

/** Piktogramme (Unicode/Emoji-Glyphen — funktioniert ohne Bibliothek). */
export const PICTOGRAMS: string[] = [
  '★', '☆', '♥', '♦', '♣', '♠', '✓', '✗', '✦', '✧', '☀', '☁', '☂', '☃', '⚡',
  '⭐', '🔥', '💡', '🎯', '🚀', '🏆', '🎉', '📊', '📈', '📉', '📝', '📌', '🔧', '🔍', '💼',
  '🏠', '🚗', '✈', '⛵', '🌍', '🌐', '☎', '✉', '🔒', '🔓', '🔑', '🛡', '⚙', '🎓', '💎',
];

/** Mathematische / wissenschaftliche Symbole. */
export const MATH_SYMBOLS: string[] = [
  '±', '×', '÷', '√', '∞', '≈', '≠', '≤', '≥', 'π', 'Σ', 'Δ', 'Ω', 'α', 'β',
  'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω', '∫', '∂', '∇', '∀', '∃',
  '∈', '∉', '⊂', '⊃', '∪', '∩', '⇒', '⇔', '→', '←', '↑', '↓', '°', '′', '″',
];

/** Alle gängigen Welt-Währungen mit ISO-Code, Symbol und Name (Auswahl der wichtigsten ~50). */
export interface CurrencyInfo { code: string; symbol: string; name: string; }
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'USD', symbol: '$',    name: 'US-Dollar' },
  { code: 'GBP', symbol: '£',    name: 'Britisches Pfund' },
  { code: 'CHF', symbol: 'CHF',  name: 'Schweizer Franken' },
  { code: 'JPY', symbol: '¥',    name: 'Japanischer Yen' },
  { code: 'CNY', symbol: '¥',    name: 'Chinesischer Yuan' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hongkong-Dollar' },
  { code: 'KRW', symbol: '₩',    name: 'Südkoreanischer Won' },
  { code: 'INR', symbol: '₹',    name: 'Indische Rupie' },
  { code: 'AUD', symbol: 'A$',   name: 'Australischer Dollar' },
  { code: 'CAD', symbol: 'C$',   name: 'Kanadischer Dollar' },
  { code: 'NZD', symbol: 'NZ$',  name: 'Neuseeland-Dollar' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapur-Dollar' },
  { code: 'SEK', symbol: 'kr',   name: 'Schwedische Krone' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegische Krone' },
  { code: 'DKK', symbol: 'kr',   name: 'Dänische Krone' },
  { code: 'ISK', symbol: 'kr',   name: 'Isländische Krone' },
  { code: 'PLN', symbol: 'zł',   name: 'Polnischer Złoty' },
  { code: 'CZK', symbol: 'Kč',   name: 'Tschechische Krone' },
  { code: 'HUF', symbol: 'Ft',   name: 'Ungarischer Forint' },
  { code: 'RON', symbol: 'lei',  name: 'Rumänischer Leu' },
  { code: 'BGN', symbol: 'лв',   name: 'Bulgarischer Lew' },
  { code: 'HRK', symbol: 'kn',   name: 'Kroatische Kuna' },
  { code: 'RUB', symbol: '₽',    name: 'Russischer Rubel' },
  { code: 'UAH', symbol: '₴',    name: 'Ukrainische Hrywnja' },
  { code: 'TRY', symbol: '₺',    name: 'Türkische Lira' },
  { code: 'ILS', symbol: '₪',    name: 'Israelischer Schekel' },
  { code: 'AED', symbol: 'د.إ',  name: 'VAE-Dirham' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi-Riyal' },
  { code: 'QAR', symbol: 'ر.ق',  name: 'Katar-Riyal' },
  { code: 'EGP', symbol: '£',    name: 'Ägyptisches Pfund' },
  { code: 'ZAR', symbol: 'R',    name: 'Südafrikanischer Rand' },
  { code: 'NGN', symbol: '₦',    name: 'Nigerianische Naira' },
  { code: 'KES', symbol: 'KSh',  name: 'Kenia-Schilling' },
  { code: 'MAD', symbol: 'د.م.', name: 'Marokkanischer Dirham' },
  { code: 'BRL', symbol: 'R$',   name: 'Brasilianischer Real' },
  { code: 'ARS', symbol: '$',    name: 'Argentinischer Peso' },
  { code: 'MXN', symbol: '$',    name: 'Mexikanischer Peso' },
  { code: 'CLP', symbol: '$',    name: 'Chilenischer Peso' },
  { code: 'COP', symbol: '$',    name: 'Kolumbianischer Peso' },
  { code: 'PEN', symbol: 'S/',   name: 'Peruanischer Sol' },
  { code: 'VES', symbol: 'Bs.',  name: 'Venezolanischer Bolívar' },
  { code: 'THB', symbol: '฿',    name: 'Thailändischer Baht' },
  { code: 'VND', symbol: '₫',    name: 'Vietnamesischer Đồng' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesische Rupiah' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysischer Ringgit' },
  { code: 'PHP', symbol: '₱',    name: 'Philippinischer Peso' },
  { code: 'TWD', symbol: 'NT$',  name: 'Taiwan-Dollar' },
  { code: 'PKR', symbol: '₨',    name: 'Pakistanische Rupie' },
  { code: 'BDT', symbol: '৳',    name: 'Bangladesch-Taka' },
];

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function makeElement(type: ElementType, overrides: Partial<SlideElement> = {}): SlideElement {
  const defaults: Record<ElementType, Partial<SlideElement>> = {
    text:    { w: 40, h: 12, fontFamily: DEFAULT_FONT, fontSize: 24, color: '#1a1410', align: 'left', text: '', bulletStyle: 'none' },
    rect:    { w: 25, h: 18, fill: '#FB542B', stroke: '#1a1410', strokeWidth: 0 },
    ellipse: { w: 22, h: 22, fill: '#FA7250', stroke: '#1a1410', strokeWidth: 0 },
    line:    { w: 30, h: 1, stroke: '#1a1410', strokeWidth: 2 },
    arrow:   { w: 30, h: 1, stroke: '#1a1410', strokeWidth: 2 },
    image:   { w: 30, h: 30 },
    icon:    { w: 8,  h: 12, iconChar: '★', color: '#FB542B', fontSize: 64, align: 'center' },
    table:   {
      w: 50, h: 28,
      tableRows: [
        ['Spalte A', 'Spalte B', 'Spalte C'],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
      ],
      tableHeader: true,
      fontSize: 16,
      color: '#1a1410',
    },
    chart:   {
      w: 45, h: 35,
      chartType: 'bar',
      chartTitle: '',
      chartData: [
        { label: 'A', value: 30 },
        { label: 'B', value: 45 },
        { label: 'C', value: 22 },
        { label: 'D', value: 38 },
      ],
      color: '#1a1410',
    },
    calc:    {
      w: 26, h: 12,
      calcExpr: '2 + 2',
      color: '#1a1410',
      fontSize: 18,
    },
  };
  return {
    id: makeId(),
    type,
    x: 30, y: 35,
    w: 25, h: 15,
    zIndex: 0,
    ...defaults[type],
    ...overrides,
  } as SlideElement;
}

export function createSlide(): Slide {
  return {
    id: makeId(),
    background: '#ffffff',
    elements: [],
    transition: 'fade',
    themeId: 'clean',
    title: {
      text: '',
      fontFamily: DEFAULT_FONT,
      fontSize: 56,
      bold: true,
      italic: false,
      underline: false,
      color: '#1a1410',
      align: 'left',
      bulletStyle: 'none',
    },
    body: {
      text: '',
      fontFamily: DEFAULT_FONT,
      fontSize: 24,
      bold: false,
      italic: false,
      underline: false,
      color: '#444444',
      align: 'left',
      bulletStyle: 'none',
    },
  };
}

export function createDoc(): SparkDoc {
  return {
    id: makeId(),
    title: 'Untitled',
    slides: [createSlide()],
  };
}
