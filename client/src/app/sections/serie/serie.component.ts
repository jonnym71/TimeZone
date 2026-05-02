import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { AuthService } from '../../services/auth.service';
import { LockToastService } from '../../services/lock-toast.service';
import { OverlayService } from '../../services/overlay.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface Episode {
  num: string;
  title: string;
  description: string;
  image?: string;
  /** When set, title/description are looked up via translation keys */
  titleKey?: string;
  descriptionKey?: string;
}

const PAGE_SIZE = 5;

const EPISODE_DEFAULTS: { titleKey: string; descriptionKey: string }[] = [
  { titleKey: 'ep.first.title', descriptionKey: 'ep.first.description' },
];

@Component({
  selector: 'app-serie',
  standalone: true,
  imports: [AdminAddButtonComponent, FormsModule, TranslatePipe],
  templateUrl: './serie.component.html',
})
export class SerieComponent {
  readonly auth = inject(AuthService);
  private lockToast = inject(LockToastService);
  private overlay = inject(OverlayService);
  private languageSvc = inject(LanguageService);

  episodeTitle(ep: Episode): string {
    return ep.titleKey ? this.languageSvc.t(ep.titleKey) : ep.title;
  }

  episodeDescription(ep: Episode): string {
    return ep.descriptionKey ? this.languageSvc.t(ep.descriptionKey) : ep.description;
  }

  readonly locked = computed(() => !this.auth.loggedIn());
  readonly shaking = signal<number | null>(null);

  readonly episodes = signal<Episode[]>(EPISODE_DEFAULTS.map((e, i) => ({
    num: 'EPISODE ' + String(i + 1).padStart(2, '0'),
    title: '',
    description: '',
    titleKey: e.titleKey,
    descriptionKey: e.descriptionKey,
  })));

  readonly page = signal(0);
  readonly pageCount = computed(() => Math.ceil(this.episodes().length / PAGE_SIZE));
  readonly visibleEpisodes = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.episodes().slice(start, start + PAGE_SIZE);
  });
  readonly rangeLabel = computed(() => {
    const start = this.page() * PAGE_SIZE + 1;
    const end = Math.min(this.episodes().length, (this.page() + 1) * PAGE_SIZE);
    return `${start} – ${end}`;
  });
  readonly canPrev = computed(() => this.page() > 0);
  readonly canNext = computed(() => this.page() < this.pageCount() - 1);

  private pendingImageIdx: number | null = null;
  @ViewChild('imageInput', { static: false }) imageInput?: ElementRef<HTMLInputElement>;

  readonly showEpisodeForm = signal(false);
  readonly newEpisodeTitle = signal('');
  readonly newEpisodeDescription = signal('');
  readonly editingIdx = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingIdx() !== null);

  readonly staffeln = ['Staffel 1', 'Staffel 2', 'Staffel 3', 'Staffel 4', 'Staffel 5'];

  readonly addItems = [
    { action: 'image', label: 'Bild hinzufügen' },
    { action: 'video', label: 'Video hinzufügen' },
    { action: 'episode', label: 'Folge hinzufügen' },
    { action: 'staffel', label: 'Staffel hinzufügen' },
  ];

  @ViewChild('staffelDetails', { static: false }) staffelDetails?: ElementRef<HTMLDetailsElement>;

  prevPage(): void {
    if (this.canPrev()) this.page.update(p => p - 1);
  }

  nextPage(): void {
    if (this.canNext()) this.page.update(p => p + 1);
  }

  episodeClick(globalIdx: number): void {
    if (!this.locked()) return;
    this.shaking.set(globalIdx);
    this.lockToast.show();
    setTimeout(() => this.shaking.set(null), 700);
  }

  globalIndex(localIdx: number): number {
    return this.page() * PAGE_SIZE + localIdx;
  }

  staffelClick(label: string, idx: number): void {
    const user = this.auth.user();
    if (idx === 0) {
      this.overlay.open(label, 'coming-soon');
    } else if (user?.rank === 'Eisen') {
      this.overlay.openRankRequired(label, 'Silber');
    } else {
      this.overlay.open(label, 'not-yet');
    }
    if (this.staffelDetails?.nativeElement) {
      this.staffelDetails.nativeElement.removeAttribute('open');
    }
    this.page.set(0);
  }

  triggerImagePicker(globalIdx: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.pendingImageIdx = globalIdx;
    this.imageInput?.nativeElement.click();
  }

  removeImage(globalIdx: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.episodes.update(list => list.map((ep, i) => {
      if (i !== globalIdx) return ep;
      const { image, ...rest } = ep;
      return rest;
    }));
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetIdx = this.pendingImageIdx;
    if (!file || targetIdx === null) {
      input.value = '';
      this.pendingImageIdx = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        this.episodes.update(list => list.map((ep, i) => i === targetIdx ? { ...ep, image: result } : ep));
      }
      this.pendingImageIdx = null;
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  onAddItemClick(action: string): void {
    if (action === 'image') {
      const list = this.episodes();
      let target = list.findIndex(ep => !ep.image);
      if (target === -1) target = this.page() * PAGE_SIZE;
      this.triggerImagePicker(target);
      return;
    }
    if (action === 'episode') {
      this.openEpisodeForm();
      return;
    }
    const item = this.addItems.find(i => i.action === action);
    this.overlay.open(item?.label ?? 'Hinzufügen', 'coming-soon');
  }

  openEpisodeForm(): void {
    this.editingIdx.set(null);
    this.newEpisodeTitle.set('');
    this.newEpisodeDescription.set('');
    this.showEpisodeForm.set(true);
  }

  editEpisode(globalIdx: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const ep = this.episodes()[globalIdx];
    if (!ep) return;
    this.editingIdx.set(globalIdx);
    this.newEpisodeTitle.set(this.episodeTitle(ep));
    this.newEpisodeDescription.set(this.episodeDescription(ep));
    this.showEpisodeForm.set(true);
  }

  deleteEpisode(globalIdx: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const ep = this.episodes()[globalIdx];
    if (!ep) return;
    if (!confirm(`Folge „${this.episodeTitle(ep)}" wirklich löschen?`)) return;
    this.episodes.update(list => {
      const filtered = list.filter((_, i) => i !== globalIdx);
      return filtered.map((e, i) => ({ ...e, num: 'EPISODE ' + String(i + 1).padStart(2, '0') }));
    });
    const newCount = this.episodes().length;
    const maxPage = Math.max(0, Math.ceil(newCount / PAGE_SIZE) - 1);
    if (this.page() > maxPage) this.page.set(maxPage);
  }

  closeEpisodeForm(): void {
    this.showEpisodeForm.set(false);
    this.editingIdx.set(null);
    this.newEpisodeTitle.set('');
    this.newEpisodeDescription.set('');
  }

  saveNewEpisode(event: Event): void {
    event.preventDefault();
    const title = this.newEpisodeTitle().trim();
    const description = this.newEpisodeDescription().trim();
    if (!title || !description) return;
    const editIdx = this.editingIdx();
    if (editIdx !== null) {
      this.episodes.update(list => list.map((ep, i) => {
        if (i !== editIdx) return ep;
        const { titleKey, descriptionKey, ...rest } = ep;
        return { ...rest, title, description };
      }));
    } else {
      this.episodes.update(list => {
        const nextNum = 'EPISODE ' + String(list.length + 1).padStart(2, '0');
        return [...list, { num: nextNum, title, description }];
      });
      const lastPage = Math.max(0, Math.ceil(this.episodes().length / PAGE_SIZE) - 1);
      this.page.set(lastPage);
    }
    this.closeEpisodeForm();
  }

  onEpisodeFormBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeEpisodeForm();
  }
}
