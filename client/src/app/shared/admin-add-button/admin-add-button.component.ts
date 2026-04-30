import { Component, Input, inject } from '@angular/core';
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

  private overlay = inject(OverlayService);

  open(action: string, event: MouseEvent): void {
    event.stopPropagation();
    const item = this.items.find(i => i.action === action);
    this.overlay.open(item?.label ?? 'Hinzufügen', 'coming-soon');
  }
}
