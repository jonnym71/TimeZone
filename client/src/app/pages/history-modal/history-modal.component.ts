import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { AuthService } from '../../services/auth.service';
import { HistoryService, HistoryEvent } from '../../services/history.service';
import { OverlayService } from '../../services/overlay.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [AdminAddButtonComponent, FormsModule, TranslatePipe],
  templateUrl: './history-modal.component.html',
})
export class HistoryModalComponent {
  readonly overlay = inject(OverlayService);
  readonly auth = inject(AuthService);
  private historyService = inject(HistoryService);
  private languageSvc = inject(LanguageService);

  readonly items = this.historyService.events;

  displayTitle(ev: HistoryEvent): string {
    return ev.titleKey ? this.languageSvc.t(ev.titleKey) : ev.title;
  }

  displayDescription(ev: HistoryEvent): string {
    return ev.descriptionKey ? this.languageSvc.t(ev.descriptionKey) : ev.description;
  }

  readonly showEventForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);
  readonly formDate = signal('');
  readonly formTitle = signal('');
  readonly formDescription = signal('');

  readonly addItems = [
    { action: 'image', label: 'Bild hinzufügen' },
    { action: 'video', label: 'Video hinzufügen' },
    { action: 'event', label: 'Ereignis hinzufügen' },
  ];

  private pendingImageId: string | null = null;
  @ViewChild('imageInput', { static: false }) imageInput?: ElementRef<HTMLInputElement>;

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.historyOpen();
      if (open && !prevOpen) {
        document.documentElement.style.overflow = 'hidden';
        if (this.historyService.consumeAddFormRequest()) {
          this.openEventForm();
        }
      } else if (!open && prevOpen) {
        document.documentElement.style.overflow = '';
        this.closeEventForm();
      }
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeHistory();
  }

  onAddItemClick(action: string): void {
    if (action === 'event') {
      this.openEventForm();
      return;
    }
    if (action === 'image') {
      const list = this.items();
      const target = list.find(e => !e.image) ?? list[0];
      if (target) this.triggerImagePicker(target.id);
      return;
    }
    this.overlay.open(this.addItems.find(i => i.action === action)?.label ?? 'Hinzufügen', 'coming-soon');
  }

  openEventForm(): void {
    this.editingId.set(null);
    this.formDate.set('');
    this.formTitle.set('');
    this.formDescription.set('');
    this.showEventForm.set(true);
  }

  editEvent(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    const ev = this.items().find(e => e.id === id);
    if (!ev) return;
    this.editingId.set(id);
    this.formDate.set(ev.date);
    this.formTitle.set(this.displayTitle(ev));
    this.formDescription.set(this.displayDescription(ev));
    this.showEventForm.set(true);
  }

  deleteEvent(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    const ev = this.items().find(e => e.id === id);
    if (!ev) return;
    const msg = this.languageSvc.t('history.deleteConfirm').split('{title}').join(this.displayTitle(ev));
    if (!confirm(msg)) return;
    this.historyService.deleteEvent(id);
  }

  closeEventForm(): void {
    this.showEventForm.set(false);
    this.editingId.set(null);
    this.formDate.set('');
    this.formTitle.set('');
    this.formDescription.set('');
  }

  saveEvent(event: Event): void {
    event.preventDefault();
    const date = this.formDate().trim();
    const title = this.formTitle().trim();
    const description = this.formDescription().trim();
    if (!date || !title || !description) return;
    const editId = this.editingId();
    if (editId !== null) {
      this.historyService.updateEvent(editId, { date, title, description });
    } else {
      this.historyService.addEvent({ date, title, description });
    }
    this.closeEventForm();
  }

  onFormBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeEventForm();
  }

  triggerImagePicker(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.pendingImageId = id;
    this.imageInput?.nativeElement.click();
  }

  removeImage(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.historyService.removeImage(id);
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetId = this.pendingImageId;
    if (!file || !targetId) {
      input.value = '';
      this.pendingImageId = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') this.historyService.setImage(targetId, result);
      this.pendingImageId = null;
      input.value = '';
    };
    reader.readAsDataURL(file);
  }
}
