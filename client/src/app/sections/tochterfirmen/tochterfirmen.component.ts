import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { NewsPanelComponent } from '../../shared/news-panel/news-panel.component';
import { OverlayService } from '../../services/overlay.service';
import { LanguageService } from '../../services/language.service';
import { AudioService } from '../../services/audio.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

type SubsidiaryAction = 'transat' | 'history' | 'music' | 'more';

const RANK_ORDER = ['Eisen', 'Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'];

interface Subsidiary {
  icon: string;
  subtitle: string;
  title: string;
  description: string;
  linkText: string;
  action: SubsidiaryAction;
  /** Minimum rank required to use this subsidiary. Omit = always available. */
  requiredRank?: string;
  /** Only admins can use this subsidiary. */
  adminOnly?: boolean;
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
  private auth = inject(AuthService);

  subtitleOf(s: Subsidiary): string {
    return s.subtitleKey ? this.languageSvc.t(s.subtitleKey) : s.subtitle;
  }
  descriptionOf(s: Subsidiary): string {
    return s.descriptionKey ? this.languageSvc.t(s.descriptionKey) : s.description;
  }
  linkTextOf(s: Subsidiary): string {
    return s.linkTextKey ? this.languageSvc.t(s.linkTextKey) : s.linkText;
  }

  hasAccess(s: Subsidiary): boolean {
    if (s.adminOnly && !this.auth.isAdmin()) return false;
    if (!s.requiredRank) return true;
    const userRank = this.auth.user()?.rank ?? 'Eisen';
    return RANK_ORDER.indexOf(userRank) >= RANK_ORDER.indexOf(s.requiredRank);
  }

  readonly subsidiaries = signal<Subsidiary[]>([
    {
      icon: '✈',
      subtitle: '',
      title: 'TIME-ZONE-TRANSAT',
      description: '',
      linkText: '',
      action: 'transat',
      adminOnly: true,
      subtitleKey: 'sub.transat.subtitle',
      descriptionKey: 'sub.transat.description',
      linkTextKey: 'sub.transat.link',
    },
    {
      icon: '⌛',
      subtitle: '',
      title: 'HistoryFacts',
      description: '',
      linkText: '',
      action: 'history',
      requiredRank: 'Bronze',
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
      requiredRank: 'Gold',
    },
    {
      icon: '🎵',
      subtitle: 'Musik',
      title: 'TIME-ZONE Sound',
      description: 'Atmosphärische Klangwelten und Soundtracks aus dem TIME-ZONE-Universum – komponiert mit Liebe zum Detail.',
      linkText: 'Reinhören →',
      action: 'music',
      requiredRank: 'Gold',
    },
    {
      icon: '📚',
      subtitle: 'Bildung',
      title: 'TIME-ZONE Academy',
      description: 'Wissen verständlich vermittelt: Kurse, Workshops und Lerninhalte rund um Zeit, Geschichte und Innovation.',
      linkText: 'Lernen starten →',
      action: 'more',
      requiredRank: 'Gold',
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

  cardClick(sub: Subsidiary, event: MouseEvent): void {
    event.preventDefault();
    if (!this.hasAccess(sub)) {
      if (sub.adminOnly) {
        this.overlay.open(sub.title, 'admin-only');
      } else {
        this.overlay.openRankRequired(sub.title, sub.requiredRank!);
      }
      return;
    }
    const action = sub.action;
    if (action === 'transat') this.overlay.openTransat();
    else if (action === 'history') this.overlay.openHistory();
    else if (action === 'music') this.audio.playRadetzkymarsch();
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
