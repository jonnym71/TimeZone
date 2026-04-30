import { Component, effect, inject } from '@angular/core';
import { OverlayService } from '../../services/overlay.service';

interface HistoryItem {
  year: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-history-modal',
  standalone: true,
  templateUrl: './history-modal.component.html',
})
export class HistoryModalComponent {
  readonly overlay = inject(OverlayService);

  readonly items: HistoryItem[] = [
    {
      year: '1492',
      title: 'Eine neue Welt',
      text: 'Kolumbus erreicht Amerika und verändert die Welt für immer. Mit drei Schiffen — Niña, Pinta und Santa María — bricht er auf der Suche nach einem Seeweg nach Indien auf. Was als wirtschaftliche Mission beginnt, mündet in der Begegnung zweier Kontinente und der ersten echten Globalisierung lange vor ihrer Zeit.',
    },
    {
      year: '1789',
      title: 'Französische Revolution',
      text: 'Freiheit, Gleichheit, Brüderlichkeit — drei Worte, die Europa erschüttern. Mit dem Sturm auf die Bastille am 14. Juli 1789 beginnt das Ende der absoluten Monarchie. Die Erklärung der Menschen- und Bürgerrechte wird zur Vorlage moderner Demokratien.',
    },
    {
      year: '1969',
      title: 'Mondlandung',
      text: '„Ein kleiner Schritt für einen Menschen, ein großer Sprung für die Menschheit." Am 20. Juli 1969 betritt Neil Armstrong als erster Mensch den Mond. Über 600 Millionen Zuschauer weltweit verfolgen den Moment live im Fernsehen — der vorläufige Höhepunkt des Wettlaufs ins All.',
    },
    {
      year: '1989',
      title: 'Mauerfall',
      text: 'In der Nacht vom 9. November 1989 öffnen sich die Grenzübergänge in Berlin. Tausende strömen von Ost nach West, der Eiserne Vorhang zerbricht. Symbolisch endet damit der Kalte Krieg — und Deutschland steht ein knappes Jahr später wieder vereint da.',
    },
  ];

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.historyOpen();
      if (open && !prevOpen) document.documentElement.style.overflow = 'hidden';
      else if (!open && prevOpen) document.documentElement.style.overflow = '';
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeHistory();
  }
}
