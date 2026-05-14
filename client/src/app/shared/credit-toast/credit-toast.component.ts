import { Component, computed, effect, inject, signal } from '@angular/core';
import { AuthService, ClaimedGift } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-credit-toast',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './credit-toast.component.html',
})
export class CreditToastComponent {
  private auth = inject(AuthService);
  private overlay = inject(OverlayService);

  readonly visible = signal(false);
  readonly gifts = signal<ClaimedGift[]>([]);
  readonly count = computed(() => this.gifts().length);
  private timer: number | null = null;

  constructor() {
    effect(() => {
      const claimed = this.auth.justClaimedGifts();
      if (claimed.length > 0) {
        this.show(claimed);
      }
    });
    // Backup: also listen to the DOM event in case the signal effect misses a tick
    if (typeof window !== 'undefined') {
      window.addEventListener('tz:gift-claimed', (ev: Event) => {
        const detail = (ev as CustomEvent<{ gifts: ClaimedGift[] }>).detail;
        if (detail?.gifts?.length) this.show(detail.gifts);
      });
    }
  }

  private show(claimed: ClaimedGift[]): void {
    this.gifts.set(claimed);
    this.overlay.openGutscheine();
    this.visible.set(true);
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.dismiss(), 12000);
  }

  formatEur(value: number): string {
    return value.toFixed(2).replace('.', ',') + ' €';
  }

  dismiss(): void {
    this.visible.set(false);
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.auth.justClaimedCredit.set(0);
    this.auth.justClaimedGifts.set([]);
  }

  openShop(): void {
    this.dismiss();
    this.overlay.openGutscheine();
  }
}
