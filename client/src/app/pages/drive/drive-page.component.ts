import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const STORAGE_KEY = 'tz-drive-v1';

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface DriveFile {
  id: string;
  name: string;
  folderId: string | null; // null = root
  type: string;
  size: number;
  dataUrl: string;
  createdAt: number;
  modifiedAt: number;
}

interface SavedState {
  folders: DriveFolder[];
  files: DriveFile[];
}

@Component({
  selector: 'app-drive-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './drive-page.component.html',
})
export class DrivePageComponent {
  readonly overlay = inject(OverlayService);

  readonly folders = signal<DriveFolder[]>([]);
  readonly files = signal<DriveFile[]>([]);
  readonly currentFolderId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly selectedId = signal<string | null>(null);

  // Path breadcrumbs (root → current)
  readonly breadcrumbs = computed<DriveFolder[]>(() => {
    const trail: DriveFolder[] = [];
    let id = this.currentFolderId();
    const all = this.folders();
    while (id) {
      const f = all.find(x => x.id === id);
      if (!f) break;
      trail.unshift(f);
      id = f.parentId;
    }
    return trail;
  });

  readonly currentFolders = computed<DriveFolder[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const parent = this.currentFolderId();
    let arr = this.folders().filter(f => f.parentId === parent);
    if (q) arr = arr.filter(f => f.name.toLowerCase().includes(q));
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly currentFiles = computed<DriveFile[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const parent = this.currentFolderId();
    let arr = this.files().filter(f => f.folderId === parent);
    if (q) arr = arr.filter(f => f.name.toLowerCase().includes(q));
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Stats
  readonly totalSize = computed(() => this.files().reduce((s, f) => s + f.size, 0));
  readonly totalFiles = computed(() => this.files().length);
  readonly totalFolders = computed(() => this.folders().length);

  constructor() {
    this.load();
    effect(() => {
      const state: SavedState = { folders: this.folders(), files: this.files() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (e) {
        // Quota exceeded — show warning
        console.warn('Drive: localStorage quota exceeded', e);
      }
    });
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SavedState;
      if (Array.isArray(s.folders)) this.folders.set(s.folders);
      if (Array.isArray(s.files)) this.files.set(s.files);
    } catch {}
  }

  /* ===== Navigation ===== */
  enterFolder(id: string): void {
    this.currentFolderId.set(id);
    this.selectedId.set(null);
  }

  goRoot(): void {
    this.currentFolderId.set(null);
    this.selectedId.set(null);
  }

  goToBreadcrumb(folder: DriveFolder | null): void {
    this.currentFolderId.set(folder ? folder.id : null);
    this.selectedId.set(null);
  }

  goUp(): void {
    const trail = this.breadcrumbs();
    if (trail.length === 0) return;
    if (trail.length === 1) this.goRoot();
    else this.currentFolderId.set(trail[trail.length - 2].id);
  }

  /* ===== Folder operations ===== */
  private newId(): string { return Math.random().toString(36).slice(2, 10); }

  createFolder(): void {
    const name = prompt('Ordnername:');
    if (!name?.trim()) return;
    const f: DriveFolder = {
      id: this.newId(),
      name: name.trim(),
      parentId: this.currentFolderId(),
      createdAt: Date.now(),
    };
    this.folders.update(arr => [...arr, f]);
  }

  renameFolder(folder: DriveFolder): void {
    const name = prompt('Neuer Name:', folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    this.folders.update(arr => arr.map(f => f.id === folder.id ? { ...f, name: name.trim() } : f));
  }

  deleteFolder(folder: DriveFolder): void {
    // Sammle alle Nachfolger
    const toDelete = new Set<string>([folder.id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of this.folders()) {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id);
          added = true;
        }
      }
    }
    const fileCount = this.files().filter(f => f.folderId && toDelete.has(f.folderId)).length;
    const folderCount = toDelete.size;
    if (!confirm(`Ordner "${folder.name}" und ${folderCount - 1} Unterordner + ${fileCount} Dateien wirklich löschen?`)) return;

    this.folders.update(arr => arr.filter(f => !toDelete.has(f.id)));
    this.files.update(arr => arr.filter(f => !f.folderId || !toDelete.has(f.folderId)));
  }

  moveFolder(folder: DriveFolder): void {
    const targetName = prompt('Zielordner-Name (leer = Hauptverzeichnis):');
    if (targetName === null) return;
    const trimmed = targetName.trim();
    if (!trimmed) {
      this.folders.update(arr => arr.map(f => f.id === folder.id ? { ...f, parentId: null } : f));
      return;
    }
    const target = this.folders().find(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (!target) { alert('Ordner nicht gefunden.'); return; }
    if (target.id === folder.id) return;
    // Verhindere Zyklen
    if (this.isDescendant(target.id, folder.id)) {
      alert('Ein Ordner kann nicht in einen seiner Unterordner verschoben werden.');
      return;
    }
    this.folders.update(arr => arr.map(f => f.id === folder.id ? { ...f, parentId: target.id } : f));
  }

  private isDescendant(maybeDescendantId: string, ancestorId: string): boolean {
    let id: string | null = maybeDescendantId;
    while (id) {
      if (id === ancestorId) return true;
      const f: DriveFolder | undefined = this.folders().find(x => x.id === id);
      id = f ? f.parentId : null;
    }
    return false;
  }

  /* ===== File operations ===== */
  async onFilesSelected(input: HTMLInputElement): Promise<void> {
    const files = input.files;
    if (!files || files.length === 0) return;
    const MAX = 8 * 1024 * 1024;
    const parent = this.currentFolderId();
    const now = Date.now();
    const toAdd: DriveFile[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX) { alert(`"${f.name}" überschreitet 8 MB.`); continue; }
      const dataUrl = await this.readDataUrl(f);
      toAdd.push({
        id: this.newId(),
        name: f.name,
        folderId: parent,
        type: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
        createdAt: now,
        modifiedAt: now,
      });
    }
    if (toAdd.length) this.files.update(arr => [...arr, ...toAdd]);
    input.value = '';
  }

  private readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  downloadFile(file: DriveFile): void {
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    a.click();
  }

  renameFile(file: DriveFile): void {
    const name = prompt('Neuer Dateiname:', file.name);
    if (!name?.trim() || name.trim() === file.name) return;
    this.files.update(arr => arr.map(f => f.id === file.id ? { ...f, name: name.trim(), modifiedAt: Date.now() } : f));
  }

  deleteFile(file: DriveFile): void {
    if (!confirm(`Datei "${file.name}" wirklich löschen?`)) return;
    this.files.update(arr => arr.filter(f => f.id !== file.id));
  }

  moveFile(file: DriveFile): void {
    const targetName = prompt('Zielordner-Name (leer = Hauptverzeichnis):');
    if (targetName === null) return;
    const trimmed = targetName.trim();
    if (!trimmed) {
      this.files.update(arr => arr.map(f => f.id === file.id ? { ...f, folderId: null, modifiedAt: Date.now() } : f));
      return;
    }
    const target = this.folders().find(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (!target) { alert('Ordner nicht gefunden.'); return; }
    this.files.update(arr => arr.map(f => f.id === file.id ? { ...f, folderId: target.id, modifiedAt: Date.now() } : f));
  }

  /* ===== Helpers ===== */
  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(2) + ' MB';
    return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  iconForFile(file: DriveFile): string {
    const t = file.type.toLowerCase();
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    if (t.includes('pdf')) return 'pdf';
    if (t.includes('zip') || t.includes('rar') || t.includes('tar') || t.includes('compressed')) return 'archive';
    if (t.includes('text') || t.includes('json') || t.includes('xml')) return 'text';
    return 'file';
  }

  isImage(file: DriveFile): boolean {
    return file.type.toLowerCase().startsWith('image/');
  }

  formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  setViewMode(m: 'grid' | 'list'): void { this.viewMode.set(m); }

  close(): void { this.overlay.closeDrive(); }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.driveOpen()) return;
    if (event.key === 'Backspace') {
      const t = event.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      this.goUp();
    }
  }
}
