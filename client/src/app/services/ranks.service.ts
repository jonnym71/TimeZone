import { Injectable } from '@angular/core';

export interface Rank {
  key: string;
  color: string;
  price: string;
  perks: string[];
}

@Injectable({ providedIn: 'root' })
export class RanksService {
  readonly ranks: Rank[] = [
    {
      key: 'Eisen', color: '#7a8088', price: '0,00€',
      perks: ['Staffel 1', 'TIME-ZONE Tabellen', 'TIME-ZONE Therapie'],
    },
    {
      key: 'Bronze', color: '#cd7f32', price: '0,49€ / Monat',
      perks: ['Alles von Eisen', 'TIME-ZONE Transat', 'HistoryFacts', 'Staffeln 1–3'],
    },
    {
      key: 'Silber', color: '#c0c0c0', price: '2,49€ / Monat',
      perks: ['Alles von Bronze', 'HistoryFacts: alle Staffeln', 'TIME-ZONE Staffeln 1–10', 'Restliche Tochterfirmen'],
    },
    {
      key: 'Gold', color: '#ffd24d', price: '5,99€ / Monat',
      perks: ['Alles von Silber', 'Büro-Modus (eingeschränkt)'],
    },
    {
      key: 'Platin', color: '#9bd3e6', price: '12,99€ / Monat',
      perks: ['Alles von Gold', 'Gewinnspiele', 'Alle TIME-ZONE Staffeln', 'Büro: voller Zugriff'],
    },
    {
      key: 'Diamant', color: '#4dd2ff', price: '18,99€ / Monat',
      perks: ['Alles von Platin', 'Character-Design', 'Folgen sehen vor Veröffentlichung'],
    },
  ];
}
