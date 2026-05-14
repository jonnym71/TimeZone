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

const ADMIN_EMAILS = ['lorenz.mauerhofer@outlook.com', 'jakisimfin@gmail.com', 'jaksimfin@gmail.com', 'samuel.allmer@outlook.com', 'markusallmer79@gmail.com'];

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
  if (lower === 'samuel.allmer@outlook.com' || lower === 'markusallmer79@gmail.com') return 'Samuel';
  return null;
}

export interface ClaimedGift {
  amount: number;
  fromName?: string;
  fromEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stateSignal = signal<UserState | null>(loadState());

  /** Last batch of gifts that was just claimed (with sender info if available). [] = no notification. */
  readonly justClaimedGifts = signal<ClaimedGift[]>([]);
  /** Total amount of the last claim (sum of justClaimedGifts amounts). 0 = no notification. */
  readonly justClaimedCredit = signal(0);

  readonly user = this.stateSignal.asReadonly();
  readonly loggedIn = computed(() => this.stateSignal() !== null);
  readonly isAdmin = computed(() => {
    const s = this.stateSignal();
    return s !== null && ADMIN_EMAILS.includes(s.email.toLowerCase());
  });

  constructor() {
    // On app startup, claim any pending remote gifts for the already-logged-in user
    const existing = this.stateSignal();
    if (existing) {
      void this.claimRemoteGifts(existing.email);
    }

    // Re-check whenever the tab/window regains focus or becomes visible (cross-device delivery)
    if (typeof window !== 'undefined') {
      const recheck = () => {
        const u = this.stateSignal();
        if (u) void this.claimRemoteGifts(u.email);
      };
      window.addEventListener('focus', recheck);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') recheck();
      });
      // Periodic poll every 30s while the tab is open
      window.setInterval(recheck, 30000);
    }
  }

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

    const localClaimed = this.claimLocalPendingGiftsFor(email);
    state.credit = (state.credit ?? 0) + localClaimed;

    persistState(state);
    this.stateSignal.set(state);

    if (localClaimed > 0) {
      this.justClaimedGifts.set([{ amount: localClaimed }]);
      this.justClaimedCredit.set(localClaimed);
    }

    // Fire-and-forget remote claim — updates state when the server responds
    void this.claimRemoteGifts(email);

    return { isAdmin: this.isAdminEmail(email), claimedCredit: localClaimed };
  }

  private claimLocalPendingGiftsFor(email: string): number {
    const map = loadPendingGifts();
    const key = email.toLowerCase();
    const amount = map[key] ?? 0;
    if (amount > 0) {
      delete map[key];
      persistPendingGifts(map);
    }
    return amount;
  }

  private async claimRemoteGifts(email: string): Promise<void> {
    try {
      const res = await fetch('/api/gifts/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return;
      const data = await res.json() as { ok?: boolean; total?: number; gifts?: ClaimedGift[] };
      if (data.ok && typeof data.total === 'number' && data.total > 0) {
        const current = this.stateSignal();
        if (current && current.email.toLowerCase() === email.toLowerCase()) {
          this.updateState({ credit: (current.credit ?? 0) + data.total });
          const gifts: ClaimedGift[] = data.gifts && data.gifts.length > 0
            ? data.gifts
            : [{ amount: data.total }];
          this.notifyClaimed(gifts);
        }
      }
    } catch {
      // Server unreachable — silent fallback (localStorage already covered)
    }
  }

  /** Set the toast-driving signals AND dispatch a backup DOM event. */
  private notifyClaimed(gifts: ClaimedGift[]): void {
    if (!gifts.length) return;
    const total = gifts.reduce((s, g) => s + g.amount, 0);
    // Use set() with merged array for a fresh reference — guarantees effect re-runs
    const merged = [...this.justClaimedGifts(), ...gifts];
    this.justClaimedGifts.set(merged);
    this.justClaimedCredit.set(this.justClaimedCredit() + total);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tz:gift-claimed', { detail: { gifts, total } }));
    }
  }

  /**
   * Send a gift to the given email.
   * - If the recipient is the currently logged-in user → credit added immediately.
   * - Else → POSTs to the server (so the recipient can receive it on any browser/device).
   *   Falls back to localStorage if the server is unreachable.
   */
  async sendGift(toEmail: string, amount: number, fromName?: string): Promise<void> {
    const key = toEmail.trim().toLowerCase();
    if (!key || amount <= 0) return;
    const current = this.stateSignal();
    if (current && current.email.toLowerCase() === key) {
      this.updateState({ credit: (current.credit ?? 0) + amount });
      return;
    }
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: key,
          amount,
          fromEmail: current?.email,
          fromName: fromName ?? current?.username,
        }),
      });
      if (res.ok) return;
    } catch {
      // network error — fall through to localStorage fallback
    }
    // Fallback: store in localStorage (only delivers to users on the same browser)
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

  /** Deduct credit from the current user (clamped at zero). Returns the actually deducted amount. */
  spendCredit(amount: number): number {
    if (amount <= 0) return 0;
    const current = this.stateSignal();
    if (!current) return 0;
    const available = current.credit ?? 0;
    const deducted = Math.min(available, amount);
    this.updateState({ credit: Math.max(0, available - amount) });
    return deducted;
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
