import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { AdminAddButtonComponent } from '../../shared/admin-add-button/admin-add-button.component';
import { AuthService } from '../../services/auth.service';
import { LockToastService } from '../../services/lock-toast.service';
import { OverlayService } from '../../services/overlay.service';

interface Episode {
  num: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-serie',
  standalone: true,
  imports: [AdminAddButtonComponent],
  templateUrl: './serie.component.html',
})
export class SerieComponent {
  private auth = inject(AuthService);
  private lockToast = inject(LockToastService);
  private overlay = inject(OverlayService);

  readonly locked = computed(() => !this.auth.loggedIn());
  readonly shaking = signal<number | null>(null);

  readonly episodes: Episode[] = [
    { num: 'EPISODE 01', title: 'Der erste Sprung', description: 'Ein Pilotfilm, der die Zuschauer in das Universum von TIME-ZONE einführt.' },
    { num: 'EPISODE 02', title: 'Das Zeitalter der Pioniere', description: 'Erfindergeist und Mut treffen auf eine Welt im Wandel.' },
    { num: 'EPISODE 03', title: 'Schatten der Vergangenheit', description: 'Eine düstere Episode, die alte Geheimnisse ans Licht bringt.' },
    { num: 'EPISODE 04', title: 'Reise zu den Sternen', description: 'TIME-ZONE bricht auf in unbekannte Galaxien und Zeitlinien.' },
  ];

  readonly staffeln = ['Staffel 1', 'Staffel 2', 'Staffel 3', 'Staffel 4', 'Staffel 5'];

  readonly addItems = [
    { action: 'image', label: 'Bild hinzufügen' },
    { action: 'video', label: 'Video hinzufügen' },
  ];

  @ViewChild('staffelDetails', { static: false }) staffelDetails?: ElementRef<HTMLDetailsElement>;

  episodeClick(idx: number): void {
    if (!this.locked()) return;
    this.shaking.set(idx);
    this.lockToast.show();
    setTimeout(() => this.shaking.set(null), 700);
  }

  staffelClick(label: string, idx: number): void {
    const mode = idx === 0 ? 'coming-soon' : 'not-yet';
    this.overlay.open(label, mode);
    if (this.staffelDetails?.nativeElement) {
      this.staffelDetails.nativeElement.removeAttribute('open');
    }
  }
}
