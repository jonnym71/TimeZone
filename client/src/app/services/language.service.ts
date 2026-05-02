import { Injectable, signal } from '@angular/core';
import { TRANSLATIONS } from './translations';

export type LangCode = 'de' | 'en' | 'it' | 'es' | 'fr' | 'pt';

export interface LangOption {
  code: LangCode;
  name: string;
  flag: string;
}

export const LANGUAGES: LangOption[] = [
  { code: 'de', name: 'Deutsch',      flag: '🇩🇪' },
  { code: 'en', name: 'English',      flag: '🇬🇧' },
  { code: 'it', name: 'Italiano',     flag: '🇮🇹' },
  { code: 'es', name: 'Español',      flag: '🇪🇸' },
  { code: 'fr', name: 'Français',     flag: '🇫🇷' },
  { code: 'pt', name: 'Português',    flag: '🇵🇹' },
];

const STORAGE_KEY = 'tz-lang';

function loadLang(): LangCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (raw && TRANSLATIONS[raw]) return raw;
  } catch {
    // ignore
  }
  return 'de';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<LangCode>(loadLang());
  readonly languages = LANGUAGES;

  setLang(code: LangCode): void {
    if (!TRANSLATIONS[code]) return;
    this.lang.set(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
    try {
      document.documentElement.setAttribute('lang', code);
    } catch {
      // ignore
    }
  }

  current(): LangOption {
    return LANGUAGES.find(l => l.code === this.lang()) ?? LANGUAGES[0];
  }

  t(key: string): string {
    const dict = TRANSLATIONS[this.lang()] ?? TRANSLATIONS.de;
    return dict[key] ?? TRANSLATIONS.de[key] ?? key;
  }
}
