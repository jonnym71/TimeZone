import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

const SHIP_SVG =
  '<svg viewBox="-15 0 110 60" aria-hidden="true">' +
    '<defs>' +
      '<linearGradient id="shipBody" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0%" stop-color="#e8edf7"/>' +
        '<stop offset="100%" stop-color="#7a8088"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<ellipse cx="-8" cy="30" rx="14" ry="3.5" fill="#ffd24d" opacity="0.85"/>' +
    '<path d="M 8 30 Q 0 26 -10 30 Q 0 34 8 30 Z" fill="#ffaa3b"/>' +
    '<ellipse cx="50" cy="30" rx="35" ry="11" fill="url(#shipBody)" stroke="#5a606a" stroke-width="1"/>' +
    '<path d="M 75 30 L 92 30 L 86 24 L 86 36 Z" fill="#5a606a"/>' +
    '<circle cx="60" cy="30" r="4.5" fill="#0057ff"/>' +
    '<circle cx="59" cy="29" r="1.5" fill="#fff" opacity="0.8"/>' +
    '<path d="M 35 22 L 25 12 L 47 22 Z" fill="#5a606a"/>' +
    '<path d="M 35 38 L 25 48 L 47 38 Z" fill="#5a606a"/>' +
  '</svg>';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.component.html',
})
export class HeroComponent {
  @ViewChild('heroClock', { static: true }) heroClockRef!: ElementRef<HTMLElement>;

  private crashRunning = false;

  onClockClick(event: MouseEvent): void {
    event.stopPropagation();
    this.runCrash();
  }

  onClockKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.runCrash();
    }
  }

  private spawnCrashBurst(x: number, y: number): void {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'crash-burst';
      p.style.left = (x - 3) + 'px';
      p.style.top = (y - 3) + 'px';
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 50;
      p.style.setProperty('--bx', (Math.cos(angle) * dist) + 'px');
      p.style.setProperty('--by', (Math.sin(angle) * dist) + 'px');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  private runCrash(): void {
    const heroClock = this.heroClockRef.nativeElement;
    if (this.crashRunning || !heroClock) return;
    this.crashRunning = true;

    const rect = heroClock.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    heroClock.classList.add('mars-mode');

    const ship = document.createElement('div');
    ship.className = 'spaceship-anim';
    ship.innerHTML = SHIP_SVG;
    const startLeft = -160;
    ship.style.left = startLeft + 'px';
    ship.style.top = (targetY - 28) + 'px';
    document.body.appendChild(ship);

    const dx = targetX - 45 - startLeft;
    const anim = ship.animate([
      { transform: 'translate(0, 0) rotate(-2deg)' },
      { transform: 'translate(' + (dx * 0.35) + 'px, -22px) rotate(4deg)', offset: 0.35 },
      { transform: 'translate(' + (dx * 0.65) + 'px, 18px) rotate(-5deg)', offset: 0.65 },
      { transform: 'translate(' + (dx * 0.9) + 'px, -8px) rotate(8deg)', offset: 0.88 },
      { transform: 'translate(' + dx + 'px, 0) rotate(-2deg)' },
    ], {
      duration: 1500,
      easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
      fill: 'forwards',
    });

    anim.onfinish = () => {
      heroClock.classList.add('crashed');
      ship.classList.add('exploded');
      this.spawnCrashBurst(targetX, targetY);
      setTimeout(() => {
        heroClock.classList.remove('mars-mode', 'crashed');
        ship.remove();
        this.crashRunning = false;
      }, 1100);
    };
  }
}
