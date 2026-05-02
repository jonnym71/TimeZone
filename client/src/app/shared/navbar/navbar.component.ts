import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';
import { LanguageService, LangCode } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly overlay = inject(OverlayService);
  readonly language = inject(LanguageService);

  @ViewChild('langDetails', { static: false }) langDetails?: ElementRef<HTMLDetailsElement>;

  loginClick(): void {
    if (this.auth.loggedIn()) this.overlay.toggleProfile();
    else this.overlay.open('Anmelden', 'login');
  }

  gearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.overlay.toggleProfile();
  }

  openTabellen(event: MouseEvent): void {
    event.preventDefault();
    this.overlay.openTabellen();
  }

  openBuero(event: MouseEvent): void {
    event.preventDefault();
    this.overlay.open('Büro', 'coming-soon');
  }

  openGutscheine(event: MouseEvent): void {
    event.preventDefault();
    this.overlay.openGutscheine();
  }

  pickLanguage(code: LangCode): void {
    this.language.setLang(code);
    if (this.langDetails?.nativeElement) {
      this.langDetails.nativeElement.removeAttribute('open');
    }
  }
}
