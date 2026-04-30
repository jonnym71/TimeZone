import { Component, inject } from '@angular/core';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { NewsPanelComponent } from '../../shared/news-panel/news-panel.component';
import { OverlayService } from '../../services/overlay.service';

interface Subsidiary {
  icon: string;
  subtitle: string;
  title: string;
  description: string;
  linkText: string;
  action: 'transat' | 'therapie' | 'history';
}

@Component({
  selector: 'app-tochterfirmen',
  standalone: true,
  imports: [AdminAddButtonComponent, NewsPanelComponent],
  templateUrl: './tochterfirmen.component.html',
})
export class TochterfirmenComponent {
  private overlay = inject(OverlayService);

  readonly subsidiaries: Subsidiary[] = [
    {
      icon: '✈',
      subtitle: 'Reisebüro',
      title: 'TIME-ZONE-TRANSAT',
      description: 'Ihr Partner für Reisen rund um den Globus. Wir gestalten unvergessliche Erlebnisse – fernab vom Alltag, mitten in der Welt.',
      linkText: 'Reisen entdecken →',
      action: 'transat',
    },
    {
      icon: '♥',
      subtitle: 'Therapie',
      title: 'TIME-ZONE Therapie',
      description: 'Wir helfen Menschen mit Depressionen. Mit Empathie, Erfahrung und modernen Therapieansätzen begleiten wir Sie auf Ihrem Weg zurück ins Licht.',
      linkText: 'Hilfe finden →',
      action: 'therapie',
    },
    {
      icon: '⌛',
      subtitle: 'Wissen & Geschichte',
      title: 'HistoryFacts',
      description: 'Geschichte zum Anfassen. Wir präsentieren historische Fakten, Hintergründe und Kuriositäten – fundiert recherchiert und spannend erzählt.',
      linkText: 'Mehr erfahren →',
      action: 'history',
    },
  ];

  readonly addItems = [
    { action: 'firma', label: 'Firma hinzufügen' },
  ];

  cardClick(action: Subsidiary['action'], event: MouseEvent): void {
    event.preventDefault();
    if (action === 'transat') this.overlay.openTransat();
    else if (action === 'therapie') this.overlay.open('TIME-ZONE Therapie', 'therapie');
    else if (action === 'history') this.overlay.openHistory();
  }
}
