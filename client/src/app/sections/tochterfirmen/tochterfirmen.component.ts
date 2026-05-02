import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { NewsPanelComponent } from '../../shared/news-panel/news-panel.component';
import { OverlayService } from '../../services/overlay.service';
import { LanguageService } from '../../services/language.service';
import { AudioService } from '../../services/audio.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

type SubsidiaryAction = 'transat' | 'therapie' | 'history' | 'music' | 'more';

interface Subsidiary {
  icon: string;
  subtitle: string;
  title: string;
  description: string;
  linkText: string;
  action: SubsidiaryAction;
  /** When set, the corresponding text is looked up via translation key */
  subtitleKey?: string;
  descriptionKey?: string;
  linkTextKey?: string;
}

@Component({
  selector: 'app-tochterfirmen',
  standalone: true,
  imports: [AdminAddButtonComponent, NewsPanelComponent, FormsModule, TranslatePipe],
  templateUrl: './tochterfirmen.component.html',
})
export class TochterfirmenComponent {
  private overlay = inject(OverlayService);
  private languageSvc = inject(LanguageService);
  private audio = inject(AudioService);

  subtitleOf(s: Subsidiary): string {
    return s.subtitleKey ? this.languageSvc.t(s.subtitleKey) : s.subtitle;
  }
  descriptionOf(s: Subsidiary): string {
    return s.descriptionKey ? this.languageSvc.t(s.descriptionKey) : s.description;
  }
  linkTextOf(s: Subsidiary): string {
    return s.linkTextKey ? this.languageSvc.t(s.linkTextKey) : s.linkText;
  }

  readonly subsidiaries = signal<Subsidiary[]>([
    {
      icon: '✈',
      subtitle: '',
      title: 'TIME-ZONE-TRANSAT',
      description: '',
      linkText: '',
      action: 'transat',
      subtitleKey: 'sub.transat.subtitle',
      descriptionKey: 'sub.transat.description',
      linkTextKey: 'sub.transat.link',
    },
    {
      icon: '♥',
      subtitle: '',
      title: 'TIME-ZONE Therapie',
      description: '',
      linkText: '',
      action: 'therapie',
      subtitleKey: 'sub.therapie.subtitle',
      descriptionKey: 'sub.therapie.description',
      linkTextKey: 'sub.therapie.link',
    },
    {
      icon: '⌛',
      subtitle: '',
      title: 'HistoryFacts',
      description: '',
      linkText: '',
      action: 'history',
      subtitleKey: 'sub.history.subtitle',
      descriptionKey: 'sub.history.description',
      linkTextKey: 'sub.history.link',
    },
  ]);

  private readonly additionalSubsidiaries: Subsidiary[] = [
    {
      icon: '🎮',
      subtitle: 'Gaming',
      title: 'TIME-ZONE Games',
      description: 'Interaktive Spielwelten, in denen Zeit zur Spielfigur wird. Eintauchen, knobeln, gewinnen – mit Stil.',
      linkText: 'Spiele entdecken →',
      action: 'more',
    },
    {
      icon: '🎵',
      subtitle: 'Musik',
      title: 'TIME-ZONE Sound',
      description: 'Atmosphärische Klangwelten und Soundtracks aus dem TIME-ZONE-Universum – komponiert mit Liebe zum Detail.',
      linkText: 'Reinhören →',
      action: 'more',
    },
    {
      icon: '📚',
      subtitle: 'Bildung',
      title: 'TIME-ZONE Academy',
      description: 'Wissen verständlich vermittelt: Kurse, Workshops und Lerninhalte rund um Zeit, Geschichte und Innovation.',
      linkText: 'Lernen starten →',
      action: 'more',
    },
  ];

  readonly showMore = signal(false);
  readonly canShowMore = computed(() => !this.showMore());

  readonly showAddForm = signal(false);
  readonly newIcon = signal('★');
  readonly newSubtitle = signal('');
  readonly newTitle = signal('');
  readonly newDescription = signal('');

  readonly addItems = [
    { action: 'firma', label: 'Firma hinzufügen' },
  ];

  cardClick(action: SubsidiaryAction, event: MouseEvent): void {
    event.preventDefault();
    if (action === 'transat') this.overlay.openTransat();
    else if (action === 'therapie') this.overlay.open('TIME-ZONE Therapie', 'therapie');
    else if (action === 'history') this.overlay.openHistory();
    else this.overlay.open('Mehr Informationen', 'coming-soon');
  }

  moreClick(): void {
    this.subsidiaries.update(list => [...list, ...this.additionalSubsidiaries]);
    this.showMore.set(true);
  }

  onAddItemClick(action: string): void {
    if (action === 'firma') {
      this.openAddForm();
    }
  }

  openAddForm(): void {
    this.resetAddForm();
    this.showAddForm.set(true);
  }

  closeAddForm(): void {
    this.showAddForm.set(false);
    this.resetAddForm();
  }

  private resetAddForm(): void {
    this.newIcon.set('★');
    this.newSubtitle.set('');
    this.newTitle.set('');
    this.newDescription.set('');
  }

  saveNewFirma(event: Event): void {
    event.preventDefault();
    const title = this.newTitle().trim();
    const description = this.newDescription().trim();
    if (!title || !description) return;
    const newSub: Subsidiary = {
      icon: this.newIcon().trim() || '★',
      subtitle: this.newSubtitle().trim() || 'Tochterfirma',
      title,
      description,
      linkText: 'Mehr erfahren →',
      action: 'more',
    };
    this.subsidiaries.update(list => [...list, newSub]);
    this.closeAddForm();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeAddForm();
  }
}
