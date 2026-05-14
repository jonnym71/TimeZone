import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
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

  readonly balanceFlash = signal(false);
  private flashTimer: number | null = null;
  private prevCredit = this.auth.user()?.credit ?? 0;

  @ViewChild('langDetails', { static: false }) langDetails?: ElementRef<HTMLDetailsElement>;

  constructor() {
    effect(() => {
      const credit = this.auth.user()?.credit ?? 0;
      if (credit > this.prevCredit) {
        this.balanceFlash.set(true);
        if (this.flashTimer !== null) clearTimeout(this.flashTimer);
        this.flashTimer = window.setTimeout(() => this.balanceFlash.set(false), 2400);
      }
      this.prevCredit = credit;
    });
  }

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
    this.overlay.openBuero();
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

  balanceClick(event: MouseEvent): void {
    event.stopPropagation();
    this.overlay.openGutscheine();
  }

  formatBalance(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }
}
