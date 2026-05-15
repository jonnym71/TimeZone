import { Component, ElementRef, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, NAME_COOLDOWN_MS, buildInternalEmail } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';
import { RanksService } from '../../services/ranks.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface Figure {
  key: string;
  nameKey: string;
}

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './profile-panel.component.html',
})
export class ProfilePanelComponent implements OnDestroy {
  private auth = inject(AuthService);
  readonly overlayService = inject(OverlayService);
  readonly ranksService = inject(RanksService);
  private elementRef = inject(ElementRef);

  readonly user = this.auth.user;
  readonly isAdmin = this.auth.isAdmin;
  readonly internalEmail = this.auth.internalEmail;
  readonly open = this.overlayService.profileOpen;

  readonly figurePickerOpen = signal(false);
  readonly nameEditOpen = signal(false);
  readonly deleteConfirming = signal(false);
  readonly nameInput = signal('');
  readonly emailInfoOpen = signal(false);

  /** Live: ist der gerade eingetippte Name schon (von jemand anderem) vergeben? */
  readonly nameTaken = computed(() => {
    const candidate = this.nameInput().trim();
    const u = this.user();
    if (!candidate || !u) return false;
    if (candidate === u.username) return false;       // unverändert → ok
    return this.auth.isInternalEmailTakenForOther(candidate, u.email);
  });

  /** Vorschau-internalEmail während des Tippens. */
  readonly previewEmail = computed(() => {
    const candidate = this.nameInput().trim();
    if (!candidate) return '';
    return buildInternalEmail(candidate);
  });

  readonly figures: Figure[] = [
    { key: 'default', nameKey: 'profile.figure.standard' },
  ];

  readonly cooldownText = signal('');
  readonly cooldownActive = signal(false);
  private cooldownTimer: number | null = null;

  constructor() {
    effect(() => {
      const u = this.user();
      if (u?.nameLastChanged) {
        const remaining = NAME_COOLDOWN_MS - (Date.now() - u.nameLastChanged);
        if (remaining > 0) this.startCooldown(u.nameLastChanged);
        else this.stopCooldown();
      } else {
        this.stopCooldown();
      }
    });

    document.addEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: MouseEvent): void => {
    if (!this.open()) return;
    const target = e.target as Node;
    const el: HTMLElement = this.elementRef.nativeElement;
    const panel = el.querySelector('.profile-panel');
    if (panel?.contains(target)) return;
    // Don't close when clicking the login/gear button (handled there)
    const loginBtn = document.querySelector('.login-btn');
    const gearBtn = document.querySelector('.user-gear');
    if (loginBtn?.contains(target) || gearBtn?.contains(target)) return;
    this.overlayService.closeProfile();
  };

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);
    this.stopCooldown();
  }

  close(): void {
    this.overlayService.closeProfile();
    this.figurePickerOpen.set(false);
    this.nameEditOpen.set(false);
    this.deleteConfirming.set(false);
  }

  toggleFigurePicker(): void {
    this.figurePickerOpen.update(v => !v);
  }

  selectFigure(key: string): void {
    this.auth.updateState({ avatar: key });
  }

  togglePencil(): void {
    const u = this.user();
    if (!u) return;
    if (u.nameLastChanged && Date.now() - u.nameLastChanged < NAME_COOLDOWN_MS) return;
    this.nameEditOpen.update(v => {
      const newVal = !v;
      if (newVal) {
        this.nameInput.set(u.username);
        setTimeout(() => {
          const inp = this.elementRef.nativeElement.querySelector('.name-input') as HTMLInputElement | null;
          inp?.focus();
          inp?.select();
        }, 50);
      }
      return newVal;
    });
  }

  saveName(event: Event): void {
    event.preventDefault();
    const newName = this.nameInput().trim();
    if (!newName) return;
    if (this.nameTaken()) return;
    if (this.auth.changeName(newName)) {
      this.nameEditOpen.set(false);
    }
  }

  toggleEmailInfo(): void {
    this.emailInfoOpen.update(v => !v);
  }
  closeEmailInfo(): void {
    this.emailInfoOpen.set(false);
  }

  selectRank(rank: string): void {
    if (!this.isAdmin()) return;
    const u = this.user();
    if (!u || u.rank === rank) return;
    this.auth.updateState({ rank });
  }

  startDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.deleteConfirming.set(true);
  }

  confirmDelete(): void {
    this.auth.logout();
    this.deleteConfirming.set(false);
    this.close();
  }

  cancelDelete(): void {
    this.deleteConfirming.set(false);
  }

  formatEur(value: number | undefined | null): string {
    return ((value ?? 0)).toFixed(2).replace('.', ',') + '€';
  }

  private startCooldown(startedAt: number): void {
    this.stopCooldown();
    const tick = (): void => {
      const remaining = NAME_COOLDOWN_MS - (Date.now() - startedAt);
      if (remaining <= 0) {
        this.stopCooldown();
        this.auth.clearCooldownIfExpired();
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      this.cooldownText.set(`${h}h ${m}m ${sec}s`);
    };
    tick();
    this.cooldownActive.set(true);
    this.cooldownTimer = window.setInterval(tick, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownActive.set(false);
  }
}
