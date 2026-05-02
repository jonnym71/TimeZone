import { Component, computed, inject } from '@angular/core';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { OverlayService } from '../../services/overlay.service';
import { HistoryService } from '../../services/history.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-history-preview',
  standalone: true,
  imports: [AdminAddButtonComponent, TranslatePipe],
  templateUrl: './history-preview.component.html',
})
export class HistoryPreviewComponent {
  private overlay = inject(OverlayService);
  private history = inject(HistoryService);

  readonly facts = computed(() => this.history.events().slice(0, 4));

  readonly addItems = [
    { action: 'event', label: 'Geschichtliches Ereignis hinzufügen' },
  ];

  factClick(): void {
    this.overlay.openHistory();
  }

  onAddItemClick(action: string): void {
    if (action === 'event') {
      this.history.requestAddForm();
      this.overlay.openHistory();
    }
  }
}
