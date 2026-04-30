import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Credit {
  src: string;
  alt: string;
  bild: string;
  urheber: string;
  urheberLink?: string;
  lizenz: string;
  lizenzLink: string;
  quelle: string;
  quelleLink: string;
  quelleExtra?: string;
}

@Component({
  selector: 'app-bildquellen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './bildquellen.component.html',
})
export class BildquellenComponent {
  credits: Credit[] = [
    {
      src: 'images/os-a320.jpg',
      alt: 'Airbus A320 OE-LBO der Austrian Airlines',
      bild: 'Airbus A320 (OE-LBO) der Austrian Airlines',
      urheber: 'aeroprints.com',
      urheberLink: 'https://aeroprints.com',
      lizenz: 'CC-BY-SA 3.0 Unported',
      lizenzLink: 'https://creativecommons.org/licenses/by-sa/3.0/',
      quelle: 'Wikimedia Commons',
      quelleLink: 'https://commons.wikimedia.org',
      quelleExtra: ' · VRT-Ticket #2013031510006025',
    },
    {
      src: 'images/af-a320.jpg',
      alt: 'Airbus A320 F-GKXJ der Air France',
      bild: 'Airbus A320 (F-GKXJ) der Air France in Paris-Lackierung',
      urheber: '[Wikimedia-Autor – wird ergänzt]',
      lizenz: 'CC-BY-SA 2.0 Generic',
      lizenzLink: 'https://creativecommons.org/licenses/by-sa/2.0/',
      quelle: 'Wikimedia Commons',
      quelleLink: 'https://commons.wikimedia.org',
    },
    {
      src: 'images/lh-a320.jpg',
      alt: 'Airbus A320 D-AIPF der Lufthansa',
      bild: 'Airbus A320 (D-AIPF) der Lufthansa in München',
      urheber: 'Julian Herzog',
      urheberLink: 'https://commons.wikimedia.org/wiki/User:Julian_Herzog',
      lizenz: 'CC-BY 4.0 International',
      lizenzLink: 'https://creativecommons.org/licenses/by/4.0/',
      quelle: 'Wikimedia Commons',
      quelleLink: 'https://commons.wikimedia.org',
    },
  ];
}
