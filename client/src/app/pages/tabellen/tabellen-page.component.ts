import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

const SAMUEL_TRIGGERS = ['sam', 'samu', 'samue', 'samuel'];

@Component({
  selector: 'app-tabellen-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './tabellen-page.component.html',
})
export class TabellenPageComponent {
  readonly overlay = inject(OverlayService);

  readonly searchValue = signal('');
  readonly samuelShown = computed(() => {
    const v = this.searchValue().trim().toLowerCase();
    return SAMUEL_TRIGGERS.includes(v);
  });
  readonly chartHidden = computed(() => this.searchValue().trim().length > 0);

  // Animation reset signal — ticks up each time page opens
  readonly animateTick = signal(0);

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.tabellenOpen();
      if (open && !prevOpen) {
        // restart chart animation
        this.animateTick.update(v => v + 1);
        document.documentElement.style.overflow = 'hidden';
      } else if (!open && prevOpen) {
        document.documentElement.style.overflow = '';
      }
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeTabellen();
  }

  onEnterClick(): void {
    // Trigger samuel check via change detection — already handled by computed
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }
}
