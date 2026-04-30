import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OverlayService } from '../../services/overlay.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly overlay = inject(OverlayService);

  loginClick(): void {
    if (this.auth.loggedIn()) this.overlay.toggleProfile();
    else this.overlay.open('Anmelden', 'login');
  }

  gearClick(event: MouseEvent): void {
    event.stopPropagation();
    this.overlay.toggleProfile();
  }

  openTabellen(event: MouseEvent): void {
    event.preventDefault();
    this.overlay.openTabellen();
  }

  openBuero(event: MouseEvent): void {
    event.preventDefault();
    this.overlay.open('Büro', 'coming-soon');
  }
}
