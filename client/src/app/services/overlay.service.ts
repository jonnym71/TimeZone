import { Injectable, signal } from '@angular/core';

export type OverlayMode = 'coming-soon' | 'not-yet' | 'therapie' | 'login' | 'rank-required';

export interface OverlayState {
  mode: OverlayMode;
  label: string;
  open: boolean;
  requiredRank?: string;
}

@Injectable({ providedIn: 'root' })
export class OverlayService {
  readonly state = signal<OverlayState>({ mode: 'coming-soon', label: '', open: false });

  readonly tabellenOpen = signal(false);
  readonly historyOpen = signal(false);
  readonly transatOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly newsOpen = signal(false);
  readonly gutscheineOpen = signal(false);

  open(label: string, mode: OverlayMode = 'coming-soon'): void {
    this.state.set({ mode, label, open: true });
  }

  openRankRequired(label: string, requiredRank: string): void {
    this.state.set({ mode: 'rank-required', label, open: true, requiredRank });
  }

  close(): void {
    this.state.update(s => ({ ...s, open: false }));
  }

  openTabellen(): void { this.tabellenOpen.set(true); }
  closeTabellen(): void { this.tabellenOpen.set(false); }

  openHistory(): void { this.historyOpen.set(true); }
  closeHistory(): void { this.historyOpen.set(false); }

  openTransat(): void { this.transatOpen.set(true); }
  closeTransat(): void { this.transatOpen.set(false); }

  openGutscheine(): void { this.gutscheineOpen.set(true); }
  closeGutscheine(): void { this.gutscheineOpen.set(false); }

  toggleProfile(): void { this.profileOpen.update(v => !v); }
  closeProfile(): void { this.profileOpen.set(false); }

  toggleNews(): void { this.newsOpen.update(v => !v); }
  closeNews(): void { this.newsOpen.set(false); }
}
