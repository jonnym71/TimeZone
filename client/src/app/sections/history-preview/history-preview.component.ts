import { Component, inject } from '@angular/core';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { OverlayService } from '../../services/overlay.service';

interface Fact {
  year: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-history-preview',
  standalone: true,
  imports: [AdminAddButtonComponent],
  templateUrl: './history-preview.component.html',
})
export class HistoryPreviewComponent {
  private overlay = inject(OverlayService);

  readonly facts: Fact[] = [
    { year: '1492', title: 'Eine neue Welt', description: 'Kolumbus erreicht Amerika und verändert die Welt für immer.' },
    { year: '1789', title: 'Französische Revolution', description: 'Freiheit, Gleichheit, Brüderlichkeit – ein Aufschrei gegen die Monarchie.' },
    { year: '1969', title: 'Mondlandung', description: 'Ein kleiner Schritt für einen Menschen, ein großer Sprung für die Menschheit.' },
    { year: '1989', title: 'Mauerfall', description: 'Berlin wird wieder eins – Symbol für das Ende des Kalten Krieges.' },
  ];

  readonly addItems = [
    { action: 'event', label: 'Geschichtliches Ereignis hinzufügen' },
  ];

  factClick(): void {
    this.overlay.openHistory();
  }
}
