import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LockToastService {
  readonly visible = signal(false);
  private timer: number | null = null;

  show(): void {
    this.visible.set(true);
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.hide(), 5000);
  }

  hide(): void {
    this.visible.set(false);
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
