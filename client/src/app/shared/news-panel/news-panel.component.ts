import { Component, ElementRef, OnDestroy, inject } from '@angular/core';
import { OverlayService } from '../../services/overlay.service';

@Component({
  selector: 'app-news-panel',
  standalone: true,
  templateUrl: './news-panel.component.html',
})
export class NewsPanelComponent implements OnDestroy {
  readonly overlay = inject(OverlayService);
  private elementRef = inject(ElementRef);

  constructor() {
    document.addEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: MouseEvent): void => {
    if (!this.overlay.newsOpen()) return;
    const target = e.target as Node;
    const el: HTMLElement = this.elementRef.nativeElement;
    if (el.contains(target)) return;
    this.overlay.closeNews();
  };

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.overlay.toggleNews();
  }

  close(): void {
    this.overlay.closeNews();
  }
}
