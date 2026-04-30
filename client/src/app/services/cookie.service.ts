import { Injectable, signal } from '@angular/core';

const COOKIE_ACK_KEY = 'tz-cookie-ack';

function loadAck(): boolean {
  try {
    return !!localStorage.getItem(COOKIE_ACK_KEY);
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class CookieService {
  readonly acknowledged = signal<boolean>(loadAck());

  accept(): void {
    try {
      localStorage.setItem(COOKIE_ACK_KEY, '1');
    } catch {
      // ignore
    }
    this.acknowledged.set(true);
  }
}
