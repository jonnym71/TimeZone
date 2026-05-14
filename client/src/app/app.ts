import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { ComingSoonOverlayComponent } from './shared/coming-soon-overlay/coming-soon-overlay.component';
import { ProfilePanelComponent } from './shared/profile-panel/profile-panel.component';
import { AudioToggleComponent } from './shared/audio-toggle/audio-toggle.component';
import { CookieBannerComponent } from './shared/cookie-banner/cookie-banner.component';
import { LockToastComponent } from './shared/lock-toast/lock-toast.component';
import { CreditToastComponent } from './shared/credit-toast/credit-toast.component';
import { TabellenPageComponent } from './pages/tabellen/tabellen-page.component';
import { HistoryModalComponent } from './pages/history-modal/history-modal.component';
import { TransatPageComponent } from './pages/transat/transat-page.component';
import { GutscheinePageComponent } from './pages/gutscheine/gutscheine-page.component';
import { BueroPageComponent } from './pages/buero/buero-page.component';
import { SparkPageComponent } from './pages/spark/spark-page.component';
import { DocumentPageComponent } from './pages/document/document-page.component';
import { ComputePageComponent } from './pages/compute/compute-page.component';
import { InboxPageComponent } from './pages/inbox/inbox-page.component';
import { DrivePageComponent } from './pages/drive/drive-page.component';
import { SheetsPageComponent } from './pages/sheets/sheets-page.component';
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
    CreditToastComponent,
    TabellenPageComponent,
    HistoryModalComponent,
    TransatPageComponent,
    GutscheinePageComponent,
    BueroPageComponent,
    SparkPageComponent,
    DocumentPageComponent,
    ComputePageComponent,
    InboxPageComponent,
    DrivePageComponent,
    SheetsPageComponent,
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
    else if (this.overlay.gutscheineOpen()) this.overlay.closeGutscheine();
    else if (this.overlay.sheetsOpen()) this.overlay.closeSheets();
    else if (this.overlay.driveOpen()) this.overlay.closeDrive();
    else if (this.overlay.inboxOpen()) this.overlay.closeInbox();
    else if (this.overlay.computeOpen()) this.overlay.closeCompute();
    else if (this.overlay.documentOpen()) this.overlay.closeDocument();
    else if (this.overlay.sparkOpen()) this.overlay.closeSpark();
    else if (this.overlay.bueroOpen()) this.overlay.closeBuero();
    else if (this.overlay.state().open) this.overlay.close();
  }
}
