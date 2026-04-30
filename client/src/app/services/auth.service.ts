import { Injectable, computed, signal } from '@angular/core';

export interface UserState {
  email: string;
  username: string;
  avatar: string;
  rank: string;
  expenses: number;
  nameLastChanged: number | null;
}

const STORAGE_KEY = 'tz-user-state';
export const NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const ADMIN_EMAILS = ['lorenz.mauerhofer@outlook.com', 'jakisimfin@gmail.com'];

const ADJECTIVES = ['saurer', 'wilder', 'schneller', 'frecher', 'sturer', 'leiser', 'roter', 'blauer', 'goldener', 'silberner', 'mutiger', 'flinker', 'listiger', 'stiller', 'heller'];
const NOUNS = ['Spitz', 'Wolf', 'Bär', 'Falke', 'Tiger', 'Fuchs', 'Adler', 'Drache', 'Phönix', 'Geist', 'Rabe', 'Luchs', 'Hai', 'Kojote', 'Panther'];

function loadState(): UserState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistState(state: UserState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function generateUsername(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] +
    NOUNS[Math.floor(Math.random() * NOUNS.length)];
}

function getAutoNameForEmail(email: string): string | null {
  const lower = email.toLowerCase();
  if (lower === 'lorenz.mauerhofer@outlook.com') return 'Lorenz';
  if (lower === 'jakisimfin@gmail.com') return 'Jakob';
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stateSignal = signal<UserState | null>(loadState());

  readonly user = this.stateSignal.asReadonly();
  readonly loggedIn = computed(() => this.stateSignal() !== null);
  readonly isAdmin = computed(() => {
    const s = this.stateSignal();
    return s !== null && ADMIN_EMAILS.includes(s.email.toLowerCase());
  });

  isAdminEmail(email: string): boolean {
    return ADMIN_EMAILS.includes(email.toLowerCase());
  }

  generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  login(email: string): { isAdmin: boolean } {
    const existing = this.stateSignal();
    const autoName = getAutoNameForEmail(email);
    let state: UserState;
    if (!existing || existing.email !== email) {
      state = {
        email,
        username: autoName ?? generateUsername(),
        avatar: 'default',
        rank: 'Eisen',
        expenses: 0,
        nameLastChanged: null,
      };
    } else {
      state = { ...existing };
      if (autoName && !state.nameLastChanged && state.username !== autoName) {
        state.username = autoName;
      }
    }
    persistState(state);
    this.stateSignal.set(state);
    return { isAdmin: this.isAdminEmail(email) };
  }

  logout(): void {
    persistState(null);
    this.stateSignal.set(null);
  }

  updateState(partial: Partial<UserState>): void {
    const current = this.stateSignal();
    if (!current) return;
    const updated = { ...current, ...partial };
    persistState(updated);
    this.stateSignal.set(updated);
  }

  changeName(newName: string): boolean {
    const current = this.stateSignal();
    if (!current) return false;
    if (current.nameLastChanged && Date.now() - current.nameLastChanged < NAME_COOLDOWN_MS) {
      return false;
    }
    this.updateState({ username: newName, nameLastChanged: Date.now() });
    return true;
  }

  clearCooldownIfExpired(): void {
    const current = this.stateSignal();
    if (current?.nameLastChanged && Date.now() - current.nameLastChanged >= NAME_COOLDOWN_MS) {
      this.updateState({ nameLastChanged: null });
    }
  }
}
