import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieService } from '../../services/cookie.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './cookie-banner.component.html',
})
export class CookieBannerComponent {
  readonly cookies = inject(CookieService);

  accept(): void {
    this.cookies.accept();
  }
}
