import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const STORAGE_KEY = 'tz-inbox-v1';

export interface Contact {
  id: string;
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Draft {
  id: string;
  recipientName: string;
  recipientEmail: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments?: Attachment[];
  updatedAt: number;
  sentAt?: number;
}

interface SavedState {
  contacts: Contact[];
  drafts: Draft[];
  sent: Draft[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './inbox-page.component.html',
})
export class InboxPageComponent {
  readonly overlay = inject(OverlayService);

  readonly contacts = signal<Contact[]>([]);
  readonly drafts = signal<Draft[]>([]);
  readonly sent = signal<Draft[]>([]);

  // Active draft fields
  readonly recipientName = signal('');
  readonly recipientEmail = signal('');
  readonly cc = signal('');
  readonly bcc = signal('');
  readonly subject = signal('');
  readonly body = signal('');
  readonly attachments = signal<Attachment[]>([]);
  readonly activeDraftId = signal<string | null>(null);

  readonly currentFolder = signal<'compose' | 'drafts' | 'sent'>('compose');

  // Contact form
  readonly contactName = signal('');
  readonly contactEmail = signal('');

  readonly emailValid = computed(() => EMAIL_RE.test(this.recipientEmail().trim()));
  readonly canSend = computed(() => this.emailValid() && !!this.subject().trim() && !!this.body().trim());

  readonly savedHint = signal('');

  constructor() {
    this.load();

    // Auto-save state
    effect(() => {
      const state: SavedState = {
        contacts: this.contacts(),
        drafts: this.drafts(),
        sent: this.sent(),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    });

    // Auto-save current draft (debounced via effect re-evaluation)
    effect(() => {
      const name = this.recipientName();
      const email = this.recipientEmail();
      const cc = this.cc();
      const bcc = this.bcc();
      const subj = this.subject();
      const body = this.body();
      const atts = this.attachments();
      const hasContent = !!(name || email || subj || body || atts.length);
      if (!hasContent) return;
      this.persistActiveDraft({ recipientName: name, recipientEmail: email, cc, bcc, subject: subj, body, attachments: atts });
    });
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SavedState;
      if (Array.isArray(s.contacts)) this.contacts.set(s.contacts);
      if (Array.isArray(s.drafts)) this.drafts.set(s.drafts);
      if (Array.isArray(s.sent)) this.sent.set(s.sent);
    } catch {}
  }

  /* ===== Folder switching ===== */
  setFolder(f: 'compose' | 'drafts' | 'sent'): void {
    this.currentFolder.set(f);
  }

  /* ===== Draft management ===== */
  private newDraftId(): string { return Math.random().toString(36).slice(2, 10); }

  private persistActiveDraft(d: Omit<Draft, 'id' | 'updatedAt'>): void {
    const id = this.activeDraftId() ?? this.newDraftId();
    const updatedAt = Date.now();
    const draft: Draft = { id, updatedAt, ...d };
    this.drafts.update(arr => {
      const without = arr.filter(x => x.id !== id);
      return [draft, ...without].slice(0, 100);
    });
    this.activeDraftId.set(id);
    this.savedHint.set('✓');
    setTimeout(() => this.savedHint.set(''), 1500);
  }

  newCompose(): void {
    this.activeDraftId.set(null);
    this.recipientName.set('');
    this.recipientEmail.set('');
    this.cc.set('');
    this.bcc.set('');
    this.subject.set('');
    this.body.set('');
    this.attachments.set([]);
    this.setFolder('compose');
  }

  loadDraft(d: Draft): void {
    this.activeDraftId.set(d.id);
    this.recipientName.set(d.recipientName);
    this.recipientEmail.set(d.recipientEmail);
    this.cc.set(d.cc);
    this.bcc.set(d.bcc);
    this.subject.set(d.subject);
    this.body.set(d.body);
    this.attachments.set(d.attachments ?? []);
    this.setFolder('compose');
  }

  /* ===== Attachments ===== */
  async onFilesSelected(input: HTMLInputElement): Promise<void> {
    const files = input.files;
    if (!files || files.length === 0) return;
    const MAX_PER_FILE = 8 * 1024 * 1024; // 8 MB pro Datei
    const toAdd: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_PER_FILE) {
        alert(`"${f.name}" ist zu groß (max. 8 MB).`);
        continue;
      }
      const dataUrl = await this.readAsDataUrl(f);
      toAdd.push({
        id: this.newDraftId(),
        name: f.name,
        type: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
      });
    }
    if (toAdd.length) this.attachments.update(a => [...a, ...toAdd]);
    input.value = '';
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  removeAttachment(id: string): void {
    this.attachments.update(a => a.filter(x => x.id !== id));
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  totalAttachmentSize(): number {
    return this.attachments().reduce((s, a) => s + a.size, 0);
  }

  downloadAttachment(att: Attachment): void {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.name;
    a.click();
  }

  deleteDraft(id: string): void {
    this.drafts.update(arr => arr.filter(d => d.id !== id));
    if (this.activeDraftId() === id) this.activeDraftId.set(null);
  }

  /* ===== Send ===== */
  send(): void {
    if (!this.canSend()) return;
    const atts = this.attachments();

    // Anhänge zuerst herunterladen, damit der Nutzer sie im Mail-Client anhängen kann
    if (atts.length > 0) {
      for (const a of atts) {
        const link = document.createElement('a');
        link.href = a.dataUrl;
        link.download = a.name;
        link.click();
      }
    }

    const params: string[] = [];
    let bodyText = this.body();
    if (atts.length > 0) {
      const list = atts.map(a => '• ' + a.name + ' (' + this.formatBytes(a.size) + ')').join('\n');
      bodyText = bodyText + '\n\n---\n[' + atts.length + ' Anhang/Anhänge wurden separat heruntergeladen — bitte im Mail-Client manuell anhängen:]\n' + list;
    }
    if (this.subject().trim()) params.push('subject=' + encodeURIComponent(this.subject().trim()));
    if (bodyText.trim()) params.push('body=' + encodeURIComponent(bodyText));
    if (this.cc().trim()) params.push('cc=' + encodeURIComponent(this.cc().trim()));
    if (this.bcc().trim()) params.push('bcc=' + encodeURIComponent(this.bcc().trim()));
    const mailto = 'mailto:' + encodeURIComponent(this.recipientEmail().trim()) + (params.length ? '?' + params.join('&') : '');

    // Mail-Client öffnen
    window.location.href = mailto;

    // In "Gesendet" speichern + Kontakt anlegen
    const id = this.activeDraftId() ?? this.newDraftId();
    const sentItem: Draft = {
      id,
      recipientName: this.recipientName().trim(),
      recipientEmail: this.recipientEmail().trim(),
      cc: this.cc().trim(),
      bcc: this.bcc().trim(),
      subject: this.subject().trim(),
      body: this.body(),
      attachments: atts,
      updatedAt: Date.now(),
      sentAt: Date.now(),
    };
    this.sent.update(arr => [sentItem, ...arr].slice(0, 200));
    this.drafts.update(arr => arr.filter(d => d.id !== id));

    this.maybeAddContact(sentItem.recipientName, sentItem.recipientEmail);

    this.savedHint.set('→');
    setTimeout(() => this.savedHint.set(''), 2000);

    this.newCompose();
  }

  private maybeAddContact(name: string, email: string): void {
    if (!EMAIL_RE.test(email)) return;
    const exists = this.contacts().some(c => c.email.toLowerCase() === email.toLowerCase());
    if (exists) return;
    this.contacts.update(arr => [{ id: this.newDraftId(), name, email }, ...arr]);
  }

  /* ===== Contacts ===== */
  addContact(): void {
    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    if (!EMAIL_RE.test(email)) return;
    this.contacts.update(arr => {
      const existing = arr.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (existing) return arr.map(c => c.id === existing.id ? { ...c, name: name || c.name } : c);
      return [{ id: this.newDraftId(), name, email }, ...arr];
    });
    this.contactName.set('');
    this.contactEmail.set('');
  }

  deleteContact(id: string): void {
    this.contacts.update(arr => arr.filter(c => c.id !== id));
  }

  pickContact(c: Contact): void {
    this.recipientName.set(c.name);
    this.recipientEmail.set(c.email);
    this.setFolder('compose');
  }

  /* ===== Helpers ===== */
  formatDate(ts: number): string {
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString();
  }

  close(): void { this.overlay.closeInbox(); }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.overlay.inboxOpen()) return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && this.canSend()) {
      event.preventDefault();
      this.send();
    }
  }
}
