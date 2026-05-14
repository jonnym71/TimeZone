import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const SAMUEL_TRIGGERS = ['sam', 'samu', 'samue', 'samuel'];
const CUSTOM_TABLES_KEY = 'tz-custom-tables';

interface CustomTable {
  id: string;
  title: string;
  image: string;
}

@Component({
  selector: 'app-tabellen-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe, AdminAddButtonComponent],
  templateUrl: './tabellen-page.component.html',
})
export class TabellenPageComponent {
  readonly overlay = inject(OverlayService);
  readonly auth = inject(AuthService);
  private language = inject(LanguageService);

  readonly searchValue = signal('');
  /** Last query the user actually submitted via Enter/↵ button. Drives the displayed result. */
  readonly submittedSearch = signal('');
  readonly samuelShown = computed(() => {
    const v = this.submittedSearch().trim().toLowerCase();
    return SAMUEL_TRIGGERS.includes(v);
  });
  readonly hasSubmittedSearch = computed(() => this.submittedSearch().trim().length > 0);

  readonly customTables = signal<CustomTable[]>(this.loadCustomTables());

  readonly matchedTable = computed<CustomTable | null>(() => {
    const q = this.submittedSearch().trim().toLowerCase();
    if (!q) return null;
    return this.customTables().find(t => t.title.toLowerCase().includes(q)) ?? null;
  });

  readonly showDefaultChart = computed(() => !this.hasSubmittedSearch());
  readonly showNotFound = computed(() => this.hasSubmittedSearch() && !this.matchedTable() && !this.samuelShown());

  readonly animateTick = signal(0);

  readonly showAddForm = signal(false);
  readonly newTitle = signal('');
  readonly newImage = signal<string | null>(null);
  readonly newFileName = signal<string | null>(null);

  readonly addItems = [
    { action: 'tabelle', label: this.language.t('tabellen.admin.add') },
  ];

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.tabellenOpen();
      if (open && !prevOpen) {
        this.animateTick.update(v => v + 1);
        document.documentElement.style.overflow = 'hidden';
      } else if (!open && prevOpen) {
        document.documentElement.style.overflow = '';
        this.closeAddForm();
      }
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeTabellen();
  }

  onEnterClick(): void {
    this.submittedSearch.set(this.searchValue());
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submittedSearch.set(this.searchValue());
    }
  }

  onSearchInput(value: string): void {
    this.searchValue.set(value);
    // When the field is cleared, also clear the submitted query so the default chart shows again
    if (value.trim().length === 0) this.submittedSearch.set('');
  }

  deleteTable(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const list = this.customTables().filter(t => t.id !== id);
    this.customTables.set(list);
    this.persistCustomTables(list);
  }

  onAddItemClick(action: string): void {
    if (action === 'tabelle') this.openAddForm();
  }

  openAddForm(): void {
    this.newTitle.set('');
    this.newImage.set(null);
    this.newFileName.set(null);
    this.showAddForm.set(true);
  }

  closeAddForm(): void {
    this.showAddForm.set(false);
    this.newTitle.set('');
    this.newImage.set(null);
    this.newFileName.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.newImage.set(reader.result as string);
      this.newFileName.set(file.name);
    };
    reader.readAsDataURL(file);
  }

  saveNewTable(event: Event): void {
    event.preventDefault();
    const title = this.newTitle().trim();
    const image = this.newImage();
    if (!title || !image) return;
    const table: CustomTable = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      title,
      image,
    };
    const list = [...this.customTables(), table];
    this.customTables.set(list);
    this.persistCustomTables(list);
    this.closeAddForm();
  }

  onFormBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeAddForm();
  }

  private loadCustomTables(): CustomTable[] {
    try {
      const raw = localStorage.getItem(CUSTOM_TABLES_KEY);
      return raw ? (JSON.parse(raw) as CustomTable[]) : [];
    } catch {
      return [];
    }
  }

  private persistCustomTables(list: CustomTable[]): void {
    try {
      localStorage.setItem(CUSTOM_TABLES_KEY, JSON.stringify(list));
    } catch {
      // ignore quota errors
    }
  }
}
