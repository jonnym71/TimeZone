import { Component, inject } from '@angular/core';
import { LockToastService } from '../../services/lock-toast.service';
import { OverlayService } from '../../services/overlay.service';

@Component({
  selector: 'app-lock-toast',
  standalone: true,
  templateUrl: './lock-toast.component.html',
})
export class LockToastComponent {
  readonly toast = inject(LockToastService);
  private overlay = inject(OverlayService);

  openLogin(): void {
    this.toast.hide();
    this.overlay.open('Anmelden', 'login');
  }
}
