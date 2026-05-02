import { Component, inject } from '@angular/core';
import { LockToastService } from '../../services/lock-toast.service';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-lock-toast',
  standalone: true,
  imports: [TranslatePipe],
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
