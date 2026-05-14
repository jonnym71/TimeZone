import { Component, inject } from '@angular/core';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-buero-page',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './buero-page.component.html',
})
export class BueroPageComponent {
  readonly overlay = inject(OverlayService);

  close(): void {
    this.overlay.closeBuero();
  }

  openSpark(): void {
    this.overlay.openSpark();
  }

  openDocument(): void {
    this.overlay.openDocument();
  }

  openCompute(): void {
    this.overlay.openCompute();
  }

  openInbox(): void {
    this.overlay.openInbox();
  }

  openDrive(): void {
    this.overlay.openDrive();
  }

  openSheets(): void {
    this.overlay.openSheets();
  }
}
