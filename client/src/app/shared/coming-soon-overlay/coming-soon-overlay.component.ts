import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-coming-soon-overlay',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './coming-soon-overlay.component.html',
})
export class ComingSoonOverlayComponent implements OnDestroy {
  private overlayService = inject(OverlayService);
  private auth = inject(AuthService);

  readonly state = this.overlayService.state;

  readonly alarmCount = signal(10);
  private countdownTimer: number | null = null;
  private prevOpen = false;
  private prevMode = '';

  // Login form state
  readonly emailValue = signal('');
  readonly codeValue = signal('');
  readonly emailSent = signal(false);
  readonly success = signal(false);
  readonly admin = signal(false);
  readonly codeError = signal(false);
  readonly resendSent = signal(false);
  readonly demoCode = signal('000000');
  private pendingCode: string | null = null;
  private pendingEmail: string | null = null;
  private resendTimer: number | null = null;

  constructor() {
    // Watch for state changes
    queueMicrotask(() => this.syncCountdown());
    setInterval(() => this.syncCountdown(), 100);
  }

  private syncCountdown(): void {
    const s = this.state();
    if (s.open && s.mode === 'not-yet' && (!this.prevOpen || this.prevMode !== 'not-yet')) {
      this.startCountdown();
    } else if (!s.open || s.mode !== 'not-yet') {
      if (this.prevOpen && this.prevMode === 'not-yet') this.stopCountdown();
    }
    if (this.prevOpen && !s.open) {
      this.resetLoginForm();
    }
    this.prevOpen = s.open;
    this.prevMode = s.mode;
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.alarmCount.set(10);
    this.countdownTimer = window.setInterval(() => {
      const v = this.alarmCount();
      this.alarmCount.set(v - 1 < 0 ? 10 : v - 1);
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    if (this.resendTimer !== null) clearTimeout(this.resendTimer);
  }

  close(): void {
    this.overlayService.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  private issueNewCode(email: string): void {
    this.pendingEmail = email;
    this.pendingCode = this.auth.generateCode();
    this.demoCode.set(this.pendingCode);
    try {
      console.info('[TIME-ZONE Login] Code für ' + email + ': ' + this.pendingCode);
    } catch {
      // ignore
    }
  }

  private resetLoginForm(): void {
    this.emailSent.set(false);
    this.success.set(false);
    this.admin.set(false);
    this.codeError.set(false);
    this.resendSent.set(false);
    this.emailValue.set('');
    this.codeValue.set('');
    this.pendingCode = null;
    this.pendingEmail = null;
  }

  onLoginSubmit(event: Event): void {
    event.preventDefault();
    if (this.success()) {
      this.close();
      return;
    }
    if (!this.emailSent()) {
      const email = this.emailValue().trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && emailRe.test(email)) {
        this.issueNewCode(email);
        this.emailSent.set(true);
        setTimeout(() => {
          const codeInput = document.getElementById('loginCode');
          codeInput?.focus();
        }, 100);
      } else {
        const target = event.target as HTMLFormElement;
        target.querySelector<HTMLInputElement>('#loginEmail')?.reportValidity();
      }
    } else {
      const code = this.codeValue().trim();
      if (this.pendingCode && code === this.pendingCode && this.pendingEmail) {
        const result = this.auth.login(this.pendingEmail);
        this.admin.set(result.isAdmin);
        this.success.set(true);
        this.pendingCode = null;
        this.pendingEmail = null;
      } else {
        this.codeError.set(true);
        const codeInput = document.getElementById('loginCode') as HTMLInputElement | null;
        codeInput?.focus();
        codeInput?.select();
        setTimeout(() => this.codeError.set(false), 600);
      }
    }
  }

  triggerSubmit(): void {
    const form = document.getElementById('loginForm') as HTMLFormElement | null;
    if (form?.requestSubmit) form.requestSubmit();
    else form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }

  resend(): void {
    if (this.pendingEmail) this.issueNewCode(this.pendingEmail);
    this.resendSent.set(true);
    if (this.resendTimer !== null) clearTimeout(this.resendTimer);
    this.resendTimer = window.setTimeout(() => this.resendSent.set(false), 1800);
  }
}
