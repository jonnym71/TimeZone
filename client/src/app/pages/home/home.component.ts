import { Component } from '@angular/core';
import { HeroComponent } from '../../sections/hero/hero.component';
import { SerieComponent } from '../../sections/serie/serie.component';
import { TochterfirmenComponent } from '../../sections/tochterfirmen/tochterfirmen.component';
import { HistoryPreviewComponent } from '../../sections/history-preview/history-preview.component';
import { ContactComponent } from '../../sections/contact/contact.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    SerieComponent,
    TochterfirmenComponent,
    HistoryPreviewComponent,
    ContactComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {}
