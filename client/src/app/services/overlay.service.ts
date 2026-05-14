import { Injectable, signal } from '@angular/core';

export type OverlayMode = 'coming-soon' | 'not-yet' | 'login' | 'rank-required' | 'admin-only';

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
  readonly bueroOpen = signal(false);
  readonly sparkOpen = signal(false);
  readonly documentOpen = signal(false);
  readonly computeOpen = signal(false);
  readonly inboxOpen = signal(false);
  readonly driveOpen = signal(false);
  readonly sheetsOpen = signal(false);

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

  openBuero(): void { this.bueroOpen.set(true); }
  closeBuero(): void { this.bueroOpen.set(false); }

  openSpark(): void { this.sparkOpen.set(true); }
  closeSpark(): void { this.sparkOpen.set(false); }

  openDocument(): void { this.documentOpen.set(true); }
  closeDocument(): void { this.documentOpen.set(false); }

  openCompute(): void { this.computeOpen.set(true); }
  closeCompute(): void { this.computeOpen.set(false); }

  openInbox(): void { this.inboxOpen.set(true); }
  closeInbox(): void { this.inboxOpen.set(false); }

  openDrive(): void { this.driveOpen.set(true); }
  closeDrive(): void { this.driveOpen.set(false); }

  openSheets(): void { this.sheetsOpen.set(true); }
  closeSheets(): void { this.sheetsOpen.set(false); }

  toggleProfile(): void { this.profileOpen.update(v => !v); }
  closeProfile(): void { this.profileOpen.set(false); }

  toggleNews(): void { this.newsOpen.update(v => !v); }
  closeNews(): void { this.newsOpen.set(false); }
}
