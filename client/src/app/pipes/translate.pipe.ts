import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private lang = inject(LanguageService);

  transform(key: string, params?: Record<string, string | number>): string {
    // Touch the signal so Angular's change-detection re-runs on lang change
    this.lang.lang();
    let str = this.lang.t(key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.split('{' + k + '}').join(String(v));
      }
    }
    return str;
  }
}
