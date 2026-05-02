import { Injectable, signal } from '@angular/core';

export interface HistoryEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  /** When set, title/description are looked up via translation keys */
  titleKey?: string;
  descriptionKey?: string;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  readonly events = signal<HistoryEvent[]>([
    {
      id: 'kolumbus',
      date: '1492',
      title: '',
      description: '',
      titleKey: 'evt.kolumbus.title',
      descriptionKey: 'evt.kolumbus.description',
    },
    {
      id: 'franz-rev',
      date: '1789',
      title: '',
      description: '',
      titleKey: 'evt.franz.title',
      descriptionKey: 'evt.franz.description',
    },
    {
      id: 'mond',
      date: '1969',
      title: '',
      description: '',
      titleKey: 'evt.mond.title',
      descriptionKey: 'evt.mond.description',
    },
    {
      id: 'mauer',
      date: '1989',
      title: '',
      description: '',
      titleKey: 'evt.mauer.title',
      descriptionKey: 'evt.mauer.description',
    },
  ]);

  readonly addFormRequested = signal(false);

  requestAddForm(): void {
    this.addFormRequested.set(true);
  }

  consumeAddFormRequest(): boolean {
    const requested = this.addFormRequested();
    if (requested) this.addFormRequested.set(false);
    return requested;
  }

  addEvent(input: { date: string; title: string; description: string }): void {
    const id = 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    this.events.update(list => [...list, { id, ...input }]);
  }

  updateEvent(id: string, input: { date: string; title: string; description: string }): void {
    this.events.update(list => list.map(e => {
      if (e.id !== id) return e;
      const { titleKey, descriptionKey, ...rest } = e;
      return { ...rest, ...input };
    }));
  }

  deleteEvent(id: string): void {
    this.events.update(list => list.filter(e => e.id !== id));
  }

  setImage(id: string, image: string): void {
    this.events.update(list => list.map(e => e.id === id ? { ...e, image } : e));
  }

  removeImage(id: string): void {
    this.events.update(list => list.map(e => {
      if (e.id !== id) return e;
      const { image, ...rest } = e;
      return rest;
    }));
  }
}
