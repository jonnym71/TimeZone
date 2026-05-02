import { Injectable, computed, signal } from '@angular/core';

export interface UserState {
  email: string;
  username: string;
  avatar: string;
  rank: string;
  expenses: number;
  credit: number;
  nameLastChanged: number | null;
}

const STORAGE_KEY = 'tz-user-state';
const PENDING_GIFTS_KEY = 'tz-pending-gifts';
export const NAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const ADMIN_EMAILS = ['lorenz.mauerhofer@outlook.com', 'jakisimfin@gmail.com', 'jaksimfin@gmail.com'];

const ADJECTIVES = ['saurer', 'wilder', 'schneller', 'frecher', 'sturer', 'leiser', 'roter', 'blauer', 'goldener', 'silberner', 'mutiger', 'flinker', 'listiger', 'stiller', 'heller'];
const NOUNS = ['Spitz', 'Wolf', 'Bär', 'Falke', 'Tiger', 'Fuchs', 'Adler', 'Drache', 'Phönix', 'Geist', 'Rabe', 'Luchs', 'Hai', 'Kojote', 'Panther'];

function loadState(): UserState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserState>;
    return {
      email: parsed.email ?? '',
      username: parsed.username ?? '',
      avatar: parsed.avatar ?? 'default',
      rank: parsed.rank ?? 'Eisen',
      expenses: parsed.expenses ?? 0,
      credit: parsed.credit ?? 0,
      nameLastChanged: parsed.nameLastChanged ?? null,
    };
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

function loadPendingGifts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PENDING_GIFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistPendingGifts(map: Record<string, number>) {
  try {
    localStorage.setItem(PENDING_GIFTS_KEY, JSON.stringify(map));
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
  if (lower === 'jakisimfin@gmail.com' || lower === 'jaksimfin@gmail.com') return 'Jakob';
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

  login(email: string): { isAdmin: boolean; claimedCredit: number } {
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
        credit: 0,
        nameLastChanged: null,
      };
    } else {
      state = { ...existing };
      if (autoName && !state.nameLastChanged && state.username !== autoName) {
        state.username = autoName;
      }
    }

    const claimedCredit = this.claimPendingGiftsFor(email);
    state.credit = (state.credit ?? 0) + claimedCredit;

    persistState(state);
    this.stateSignal.set(state);
    return { isAdmin: this.isAdminEmail(email), claimedCredit };
  }

  private claimPendingGiftsFor(email: string): number {
    const map = loadPendingGifts();
    const key = email.toLowerCase();
    const amount = map[key] ?? 0;
    if (amount > 0) {
      delete map[key];
      persistPendingGifts(map);
    }
    return amount;
  }

  sendGift(toEmail: string, amount: number): void {
    const key = toEmail.trim().toLowerCase();
    if (!key || amount <= 0) return;
    const current = this.stateSignal();
    if (current && current.email.toLowerCase() === key) {
      this.updateState({ credit: (current.credit ?? 0) + amount });
      return;
    }
    const map = loadPendingGifts();
    map[key] = (map[key] ?? 0) + amount;
    persistPendingGifts(map);
  }

  addExpense(amount: number): void {
    if (amount <= 0) return;
    const current = this.stateSignal();
    if (!current) return;
    this.updateState({ expenses: (current.expenses ?? 0) + amount });
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
