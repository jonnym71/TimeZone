import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface Voucher {
  value: number;
  price: number;
}

@Component({
  selector: 'app-gutscheine-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './gutscheine-page.component.html',
})
export class GutscheinePageComponent {
  readonly overlay = inject(OverlayService);
  private auth = inject(AuthService);

  readonly vouchers: Voucher[] = [
    { value: 2.50, price: 4.00 },
    { value: 5.00, price: 7.49 },
    { value: 10.00, price: 14.99 },
    { value: 12.00, price: 15.49 },
    { value: 15.00, price: 17.79 },
    { value: 20.00, price: 23.99 },
  ];

  readonly showWarning = signal(false);
  readonly showGiftForm = signal(false);
  readonly showSuccess = signal(false);
  readonly pendingVoucher = signal<Voucher | null>(null);
  readonly mode = signal<'gift' | 'self'>('gift');
  readonly recipientEmail = signal('');
  readonly recipientName = signal('');
  readonly successMessage = signal<{ amount: string; toName: string; toEmail: string; selfClaimed: boolean } | null>(null);
  readonly emailError = signal(false);

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.gutscheineOpen();
      if (open && !prevOpen) document.documentElement.style.overflow = 'hidden';
      else if (!open && prevOpen) {
        document.documentElement.style.overflow = '';
        this.resetAll();
      }
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeGutscheine();
  }

  formatEur(value: number): string {
    return value.toFixed(2).replace('.', ',') + ' €';
  }

  buyForSelf(v: Voucher): void {
    this.pendingVoucher.set(v);
    this.mode.set('self');
    this.showWarning.set(true);
  }

  giftVoucher(v: Voucher): void {
    this.pendingVoucher.set(v);
    this.mode.set('gift');
    this.showWarning.set(true);
  }

  dismissWarning(): void {
    this.showWarning.set(false);
    this.pendingVoucher.set(null);
  }

  confirmPurchase(): void {
    const v = this.pendingVoucher();
    if (!v) return;
    this.showWarning.set(false);
    if (this.mode() === 'self') {
      this.completeSelfPurchase(v);
      return;
    }
    this.recipientEmail.set('');
    this.recipientName.set('');
    this.emailError.set(false);
    this.showGiftForm.set(true);
  }

  private completeSelfPurchase(v: Voucher): void {
    const user = this.auth.user();
    if (!user) {
      this.pendingVoucher.set(null);
      this.overlay.open('Anmelden', 'login');
      return;
    }
    this.auth.sendGift(user.email, v.value);
    this.auth.addExpense(v.price);
    this.successMessage.set({
      amount: this.formatEur(v.value),
      toName: user.username,
      toEmail: user.email,
      selfClaimed: true,
    });
    this.pendingVoucher.set(null);
    this.showSuccess.set(true);
  }

  onWarningBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.dismissWarning();
  }

  closeGiftForm(): void {
    this.showGiftForm.set(false);
    this.pendingVoucher.set(null);
    this.recipientEmail.set('');
    this.recipientName.set('');
    this.emailError.set(false);
  }

  onGiftFormBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeGiftForm();
  }

  submitGift(event: Event): void {
    event.preventDefault();
    const v = this.pendingVoucher();
    if (!v) return;
    const email = this.recipientEmail().trim();
    const name = this.recipientName().trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email) || !name) {
      this.emailError.set(!emailRe.test(email));
      return;
    }
    this.auth.sendGift(email, v.value);
    this.auth.addExpense(v.price);
    const currentUser = this.auth.user();
    const selfClaimed = currentUser !== null && currentUser.email.toLowerCase() === email.toLowerCase();
    this.successMessage.set({
      amount: this.formatEur(v.value),
      toName: name,
      toEmail: email,
      selfClaimed,
    });
    this.showGiftForm.set(false);
    this.showSuccess.set(true);
    this.pendingVoucher.set(null);
    this.recipientEmail.set('');
    this.recipientName.set('');
  }

  closeSuccess(): void {
    this.showSuccess.set(false);
    this.successMessage.set(null);
  }

  onSuccessBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeSuccess();
  }

  private resetAll(): void {
    this.showWarning.set(false);
    this.showGiftForm.set(false);
    this.showSuccess.set(false);
    this.pendingVoucher.set(null);
    this.mode.set('gift');
    this.recipientEmail.set('');
    this.recipientName.set('');
    this.successMessage.set(null);
    this.emailError.set(false);
  }
}
