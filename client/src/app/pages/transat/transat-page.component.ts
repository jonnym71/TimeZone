import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OverlayService } from '../../services/overlay.service';
import { Journey, JourneyLeg, TransatService } from '../../services/transat.service';

interface ConnectionResult {
  ok: boolean;
  errorMessage?: string;
  errorHint?: string;
  from?: string;
  to?: string;
  journey?: Journey;
}

@Component({
  selector: 'app-transat-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './transat-page.component.html',
})
export class TransatPageComponent {
  readonly overlay = inject(OverlayService);
  private transat = inject(TransatService);

  readonly fromValue = signal('');
  readonly toValue = signal('');
  readonly fromSugg = signal<string[]>([]);
  readonly toSugg = signal<string[]>([]);
  readonly fromFocus = signal(false);
  readonly toFocus = signal(false);

  readonly cardExpanded = signal(false);
  readonly expandedLegs = signal<Set<number>>(new Set());

  readonly connection = computed<ConnectionResult | null>(() => {
    const fromRaw = this.fromValue().trim();
    const toRaw = this.toValue().trim();
    if (!fromRaw || !toRaw) return null;

    const fromCanon = this.transat.findCanonical(fromRaw);
    const toCanon = this.transat.findCanonical(toRaw);

    const unknown: string[] = [];
    if (!fromCanon) unknown.push(fromRaw);
    if (!toCanon && (!fromCanon || toRaw.toLowerCase() !== fromRaw.toLowerCase())) {
      if (!toCanon) unknown.push(toRaw);
    }

    if (unknown.length) {
      const list = unknown.map(u => `„${u}"`).join(' und ');
      return {
        ok: false,
        errorMessage: `Hmm, ${list} kennen wir leider nicht.`,
        errorHint: 'Bitte einen Ort aus den Vorschlägen wählen — wir kennen Städte, Bundesländer und Länder in Europa.',
      };
    }

    if (fromCanon!.toLowerCase() === toCanon!.toLowerCase()) {
      return { ok: false, errorMessage: 'Start und Ziel müssen unterschiedlich sein.' };
    }

    const journey = this.transat.generateJourney(fromCanon!, toCanon!);
    return { ok: true, from: fromCanon!, to: toCanon!, journey };
  });

  constructor() {
    let prevOpen = false;
    effect(() => {
      const open = this.overlay.transatOpen();
      if (open && !prevOpen) document.documentElement.style.overflow = 'hidden';
      else if (!open && prevOpen) document.documentElement.style.overflow = '';
      prevOpen = open;
    });
  }

  close(): void {
    this.overlay.closeTransat();
  }

  onFromInput(value: string): void {
    this.fromValue.set(value);
    this.fromSugg.set(this.transat.searchSuggestions(value));
  }

  onToInput(value: string): void {
    this.toValue.set(value);
    this.toSugg.set(this.transat.searchSuggestions(value));
  }

  pickFrom(loc: string): void {
    this.fromValue.set(loc);
    this.fromSugg.set([]);
    this.fromFocus.set(false);
  }

  pickTo(loc: string): void {
    this.toValue.set(loc);
    this.toSugg.set([]);
    this.toFocus.set(false);
  }

  onFromFocus(): void {
    if (this.fromValue().trim()) this.fromSugg.set(this.transat.searchSuggestions(this.fromValue()));
    this.fromFocus.set(true);
  }

  onToFocus(): void {
    if (this.toValue().trim()) this.toSugg.set(this.transat.searchSuggestions(this.toValue()));
    this.toFocus.set(true);
  }

  onFromBlur(): void {
    setTimeout(() => this.fromFocus.set(false), 160);
  }

  onToBlur(): void {
    setTimeout(() => this.toFocus.set(false), 160);
  }

  toggleCard(): void {
    this.cardExpanded.update(v => !v);
  }

  toggleLeg(idx: number): void {
    this.expandedLegs.update(set => {
      const newSet = new Set(set);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  }

  legIsExpanded(idx: number): boolean {
    return this.expandedLegs().has(idx);
  }

  platformLabel(type: 'Bus' | 'Zug' | 'Flug'): string {
    return this.transat.platformLabel(type);
  }

  legDurText(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return (h ? h + 'h ' : '') + m + 'min';
  }

  totalText(j: Journey): string {
    const h = Math.floor(j.totalMin / 60);
    const m = j.totalMin % 60;
    const numTransfers = j.legs.length - 1;
    const transferText = numTransfers === 0 ? 'Direktverbindung' : (numTransfers === 1 ? '1 Umstieg' : numTransfers + ' Umstiege');
    return `Gesamtreisezeit: ca. ${h}h ${m}min · ${transferText}`;
  }

  transferText(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m} min` : `${min} Min.`;
  }

  highlightedSuggestion(loc: string, query: string): { before: string; match: string; after: string } | null {
    if (!query) return null;
    const idx = loc.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return null;
    return {
      before: loc.slice(0, idx),
      match: loc.slice(idx, idx + query.length),
      after: loc.slice(idx + query.length),
    };
  }

  legSummary(leg: JourneyLeg): string {
    return this.transat.legSummary(leg);
  }

  operatorName(leg: JourneyLeg): string {
    if (!leg.operator) return '';
    return leg.operator.operator ? `${leg.operator.label} · ${leg.operator.operator}` : leg.operator.label;
  }
}
