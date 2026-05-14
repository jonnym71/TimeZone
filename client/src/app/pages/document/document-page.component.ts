import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const STORAGE_KEY = 'tz-document-v1';
const DEFAULT_HTML = '';

interface SavedDoc {
  title: string;
  html: string;
}

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", "Fira Code", monospace' },
];

const FONT_SIZE_PT = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

@Component({
  selector: 'app-document-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './document-page.component.html',
})
export class DocumentPageComponent implements AfterViewInit {
  readonly overlay = inject(OverlayService);

  @ViewChild('editor') editorRef?: ElementRef<HTMLDivElement>;

  readonly fontOptions = FONT_OPTIONS;
  readonly fontSizeOptions = FONT_SIZE_PT;

  readonly title = signal('Untitled Document');
  readonly currentFont = signal(FONT_OPTIONS[0].value);
  readonly currentSize = signal(16);
  readonly bold = signal(false);
  readonly italic = signal(false);
  readonly underline = signal(false);
  readonly align = signal<'left' | 'center' | 'right' | 'justify'>('left');
  readonly savedHint = signal('');

  private saveTimer: number | null = null;

  readonly wordCount = signal(0);
  readonly charCount = signal(0);

  constructor() {
    // Auto-close: nothing required
    effect(() => {
      if (!this.overlay.documentOpen()) {
        // ensure save before close
        this.persist();
      }
    });
  }

  ngAfterViewInit(): void {
    const saved = this.load();
    this.title.set(saved.title);
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = saved.html;
      this.updateCounts();
    }
  }

  private load(): SavedDoc {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedDoc;
        if (parsed && typeof parsed.html === 'string') return parsed;
      }
    } catch {}
    return { title: 'Untitled Document', html: DEFAULT_HTML };
  }

  private persist(): void {
    if (!this.editorRef) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ title: this.title(), html: this.editorRef.nativeElement.innerHTML } as SavedDoc),
      );
      this.savedHint.set('✓');
      window.clearTimeout(this.saveTimer ?? 0);
      this.saveTimer = window.setTimeout(() => this.savedHint.set(''), 1500);
    } catch {}
  }

  private debouncePersist(): void {
    window.clearTimeout(this.saveTimer ?? 0);
    this.saveTimer = window.setTimeout(() => this.persist(), 600);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
    this.debouncePersist();
  }

  onEditorInput(): void {
    this.updateCounts();
    this.debouncePersist();
  }

  private updateCounts(): void {
    const text = this.editorRef?.nativeElement.innerText ?? '';
    this.charCount.set(text.length);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    this.wordCount.set(text.trim() ? words : 0);
  }

  /* ===== Formatting via execCommand ===== */

  private exec(command: string, value?: string): void {
    this.focusEditor();
    document.execCommand(command, false, value);
    this.syncToolbarFromSelection();
    this.debouncePersist();
  }

  private focusEditor(): void {
    if (!this.editorRef) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.editorRef.nativeElement.focus();
    }
  }

  setFont(value: string): void {
    this.currentFont.set(value);
    this.exec('fontName', value);
  }

  setSize(pt: number): void {
    this.currentSize.set(pt);
    this.focusEditor();
    // execCommand fontSize uses 1-7. Workaround: wrap with span style="font-size:Xpt"
    document.execCommand('fontSize', false, '7');
    const editor = this.editorRef?.nativeElement;
    if (editor) {
      editor.querySelectorAll('font[size="7"]').forEach(node => {
        const span = document.createElement('span');
        span.style.fontSize = pt + 'pt';
        span.innerHTML = (node as HTMLElement).innerHTML;
        node.replaceWith(span);
      });
    }
    this.debouncePersist();
  }

  toggleBold(): void { this.exec('bold'); }
  toggleItalic(): void { this.exec('italic'); }
  toggleUnderline(): void { this.exec('underline'); }
  toggleStrike(): void { this.exec('strikeThrough'); }

  setAlign(value: 'left' | 'center' | 'right' | 'justify'): void {
    this.align.set(value);
    const cmd = value === 'left' ? 'justifyLeft' : value === 'right' ? 'justifyRight' : value === 'center' ? 'justifyCenter' : 'justifyFull';
    this.exec(cmd);
  }

  setColor(color: string): void { this.exec('foreColor', color); }
  setBg(color: string): void { this.exec('hiliteColor', color); }

  insertOrderedList(): void { this.exec('insertOrderedList'); }
  insertUnorderedList(): void { this.exec('insertUnorderedList'); }
  outdent(): void { this.exec('outdent'); }
  indent(): void { this.exec('indent'); }

  insertHeading(level: number): void {
    if (level === 0) this.exec('formatBlock', 'p');
    else this.exec('formatBlock', 'h' + level);
  }

  insertLink(): void {
    const url = prompt('URL eingeben:');
    if (url) this.exec('createLink', url);
  }

  insertHorizontalRule(): void { this.exec('insertHorizontalRule'); }

  undo(): void { this.exec('undo'); }
  redo(): void { this.exec('redo'); }

  removeFormat(): void { this.exec('removeFormat'); }

  /* ===== Selection sync ===== */

  syncToolbarFromSelection(): void {
    try {
      this.bold.set(document.queryCommandState('bold'));
      this.italic.set(document.queryCommandState('italic'));
      this.underline.set(document.queryCommandState('underline'));
      if (document.queryCommandState('justifyCenter')) this.align.set('center');
      else if (document.queryCommandState('justifyRight')) this.align.set('right');
      else if (document.queryCommandState('justifyFull')) this.align.set('justify');
      else this.align.set('left');
      const f = document.queryCommandValue('fontName');
      if (f) this.currentFont.set(f.replace(/['"]/g, ''));
    } catch {}
  }

  /* ===== Reset / Export ===== */

  resetDoc(): void {
    if (!confirm('Dokument wirklich verwerfen und neu starten?')) return;
    this.title.set('Untitled Document');
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = DEFAULT_HTML;
      this.updateCounts();
    }
    this.persist();
  }

  downloadDoc(): void {
    if (!this.editorRef) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(this.title())}</title></head><body>${this.editorRef.nativeElement.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (this.title() || 'document') + '.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  printDoc(): void {
    if (!this.editorRef) return;
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(this.title())}</title>
      <style>body { font-family: Inter, system-ui, sans-serif; max-width: 800px; margin: 2cm auto; padding: 0 1cm; color: #1a1a1a; }</style>
      </head><body><h1 style="border-bottom:1px solid #ccc;padding-bottom:.4em;">${this.escapeHtml(this.title())}</h1>${this.editorRef.nativeElement.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  close(): void { this.overlay.closeDocument(); }

  /* ===== Keyboard shortcuts ===== */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.documentOpen()) return;
    const target = event.target as HTMLElement | null;
    const inEditor = !!target && (target.isContentEditable || target.tagName === 'INPUT');

    if ((event.ctrlKey || event.metaKey) && inEditor) {
      const k = event.key.toLowerCase();
      if (k === 's') { event.preventDefault(); this.persist(); }
    }
  }
}
