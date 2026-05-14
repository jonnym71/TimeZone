export type TextRegion = 'title' | 'body';

export interface SlideRegion {
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
}

export type ElementType = 'text' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'image';

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
  // shape-only
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // image-only
  src?: string;
}

export interface Slide {
  id: string;
  background: string;
  title: SlideRegion;
  body: SlideRegion;
  elements?: SlideElement[]; // optional → backward compatible mit altem localStorage
}

export interface SparkDoc {
  id: string;
  title: string;
  slides: Slide[];
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

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function makeElement(type: ElementType, overrides: Partial<SlideElement> = {}): SlideElement {
  const defaults: Record<ElementType, Partial<SlideElement>> = {
    text:    { w: 40, h: 12, fontFamily: DEFAULT_FONT, fontSize: 24, color: '#1a1410', align: 'left', text: '' },
    rect:    { w: 25, h: 18, fill: '#FB542B', stroke: '#1a1410', strokeWidth: 0 },
    ellipse: { w: 22, h: 22, fill: '#FA7250', stroke: '#1a1410', strokeWidth: 0 },
    line:    { w: 30, h: 1, stroke: '#1a1410', strokeWidth: 2 },
    arrow:   { w: 30, h: 1, stroke: '#1a1410', strokeWidth: 2 },
    image:   { w: 30, h: 30 },
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
    title: {
      text: '',
      fontFamily: DEFAULT_FONT,
      fontSize: 56,
      bold: true,
      italic: false,
      underline: false,
      color: '#1a1410',
      align: 'left',
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
