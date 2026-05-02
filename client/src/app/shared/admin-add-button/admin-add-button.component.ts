import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';

interface AddItem {
  action: string;
  label: string;
}

@Component({
  selector: 'app-admin-add-button',
  standalone: true,
  templateUrl: './admin-add-button.component.html',
})
export class AdminAddButtonComponent {
  @Input() wrapperClass = 'serie-add';
  @Input() items: AddItem[] = [];
  @Output() itemClick = new EventEmitter<string>();

  private overlay = inject(OverlayService);
  readonly auth = inject(AuthService);

  open(action: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.itemClick.observed) {
      this.itemClick.emit(action);
      return;
    }
    const item = this.items.find(i => i.action === action);
    this.overlay.open(item?.label ?? 'Hinzufügen', 'coming-soon');
  }
}
