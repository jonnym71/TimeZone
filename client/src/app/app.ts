import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { ComingSoonOverlayComponent } from './shared/coming-soon-overlay/coming-soon-overlay.component';
import { ProfilePanelComponent } from './shared/profile-panel/profile-panel.component';
import { AudioToggleComponent } from './shared/audio-toggle/audio-toggle.component';
import { CookieBannerComponent } from './shared/cookie-banner/cookie-banner.component';
import { LockToastComponent } from './shared/lock-toast/lock-toast.component';
import { TabellenPageComponent } from './pages/tabellen/tabellen-page.component';
import { HistoryModalComponent } from './pages/history-modal/history-modal.component';
import { TransatPageComponent } from './pages/transat/transat-page.component';
import { OverlayService } from './services/overlay.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    ComingSoonOverlayComponent,
    ProfilePanelComponent,
    AudioToggleComponent,
    CookieBannerComponent,
    LockToastComponent,
    TabellenPageComponent,
    HistoryModalComponent,
    TransatPageComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private overlay = inject(OverlayService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.overlay.tabellenOpen()) this.overlay.closeTabellen();
    else if (this.overlay.historyOpen()) this.overlay.closeHistory();
    else if (this.overlay.transatOpen()) this.overlay.closeTransat();
    else if (this.overlay.state().open) this.overlay.close();
  }
}
