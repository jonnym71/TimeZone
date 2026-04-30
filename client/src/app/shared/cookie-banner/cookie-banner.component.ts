import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieService } from '../../services/cookie.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-banner.component.html',
})
export class CookieBannerComponent {
  readonly cookies = inject(CookieService);

  accept(): void {
    this.cookies.accept();
  }
}
