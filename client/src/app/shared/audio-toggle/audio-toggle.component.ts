import { Component, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-audio-toggle',
  standalone: true,
  templateUrl: './audio-toggle.component.html',
})
export class AudioToggleComponent {
  readonly audio = inject(AudioService);

  toggle(): void {
    this.audio.toggle();
  }
}
