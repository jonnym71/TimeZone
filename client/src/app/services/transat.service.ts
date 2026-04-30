import { Injectable } from '@angular/core';

export type LegType = 'Bus' | 'Zug' | 'Flug';

export interface Operator {
  _key: string;
  label: string;
  bg: string;
  fg: string;
  vehicles: string[];
  seats: [number, number];
  operator?: string;
}

export interface JourneyLeg {
  from: string;
  to: string;
  type: LegType;
  line: string;
  depTime: string;
  arrTime: string;
  durMin: number;
  platform: string | number;
  operator: Operator | null;
  vehicle: string;
  seats: number;
  transferAfter?: number;
}

export interface Journey {
  legs: JourneyLeg[];
  totalMin: number;
}

const RAW_LOCATIONS = [
  'Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien',
  'Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn', 'Bregenz', 'Eisenstadt', 'Steyr', 'Leoben', 'Krems', 'Hallein', 'Kufstein',
  'Bayern', 'Baden-Württemberg', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
  'Berlin', 'München', 'Hamburg', 'Frankfurt am Main', 'Köln', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover', 'Nürnberg', 'Bremen', 'Bonn', 'Heidelberg', 'Würzburg', 'Freiburg', 'Mainz', 'Karlsruhe', 'Augsburg', 'Münster',
  'Zürich', 'Bern', 'Genf', 'Basel', 'Lausanne', 'Luzern', 'Lugano', 'St. Gallen', 'Winterthur',
  'Amsterdam', 'Andorra la Vella', 'Ankara', 'Athen', 'Belgrad', 'Berlin', 'Bern', 'Bratislava', 'Brüssel', 'Budapest', 'Bukarest', 'Chișinău', 'Dublin', 'Helsinki', 'Kiew', 'Kopenhagen', 'Lissabon', 'Ljubljana', 'London', 'Luxemburg', 'Madrid', 'Minsk', 'Monaco', 'Moskau', 'Nikosia', 'Oslo', 'Paris', 'Podgorica', 'Prag', 'Pristina', 'Reykjavík', 'Riga', 'Rom', 'San Marino', 'Sarajevo', 'Skopje', 'Sofia', 'Stockholm', 'Tallinn', 'Tirana', 'Vaduz', 'Valletta', 'Vatikanstadt', 'Vilnius', 'Warschau', 'Wien', 'Zagreb',
  'Albanien', 'Andorra', 'Belarus', 'Belgien', 'Bosnien-Herzegowina', 'Bulgarien', 'Dänemark', 'Deutschland', 'Estland', 'Finnland', 'Frankreich', 'Griechenland', 'Großbritannien', 'Irland', 'Island', 'Italien', 'Kosovo', 'Kroatien', 'Lettland', 'Liechtenstein', 'Litauen', 'Luxemburg', 'Malta', 'Moldau', 'Monaco', 'Montenegro', 'Niederlande', 'Nordmazedonien', 'Norwegen', 'Österreich', 'Polen', 'Portugal', 'Rumänien', 'Russland', 'San Marino', 'Schweden', 'Schweiz', 'Serbien', 'Slowakei', 'Slowenien', 'Spanien', 'Tschechien', 'Türkei', 'Ukraine', 'Ungarn', 'Vatikan', 'Zypern',
  'Barcelona', 'Mailand', 'Venedig', 'Florenz', 'Neapel', 'Turin', 'Bologna', 'Verona', 'Edinburgh', 'Manchester', 'Liverpool', 'Birmingham', 'Glasgow', 'Krakau', 'Danzig', 'Posen', 'Breslau', 'Lyon', 'Marseille', 'Nizza', 'Bordeaux', 'Toulouse', 'Strassburg', 'Sevilla', 'Valencia', 'Bilbao', 'Málaga', 'Granada', 'Porto', 'Coimbra', 'Rotterdam', 'Den Haag', 'Utrecht', 'Antwerpen', 'Brügge', 'Gent', 'Hamburg', 'Lübeck', 'Salonika', 'Thessaloniki', 'Patras', 'Izmir', 'Antalya', 'Istanbul',
];

const LOCATION_COORDS: Record<string, [number, number]> = {
  'Wien': [48.21, 16.37], 'Graz': [47.07, 15.44], 'Linz': [48.30, 14.29], 'Salzburg': [47.81, 13.05], 'Innsbruck': [47.27, 11.39], 'Klagenfurt': [46.62, 14.31], 'Villach': [46.61, 13.85], 'Wels': [48.16, 14.03], 'Sankt Pölten': [48.20, 15.62], 'Dornbirn': [47.41, 9.74], 'Bregenz': [47.50, 9.75], 'Eisenstadt': [47.85, 16.52], 'Steyr': [48.04, 14.42], 'Leoben': [47.38, 15.10], 'Krems': [48.41, 15.60], 'Hallein': [47.68, 13.10], 'Kufstein': [47.58, 12.17],
  'Burgenland': [47.84, 16.53], 'Kärnten': [46.62, 14.31], 'Niederösterreich': [48.10, 15.80], 'Oberösterreich': [48.30, 14.30], 'Steiermark': [47.07, 15.44], 'Tirol': [47.27, 11.39], 'Vorarlberg': [47.25, 9.97], 'Österreich': [47.5, 14.5],
  'Berlin': [52.52, 13.40], 'München': [48.14, 11.58], 'Hamburg': [53.55, 10.00], 'Frankfurt am Main': [50.11, 8.68], 'Köln': [50.94, 6.96], 'Stuttgart': [48.78, 9.18], 'Düsseldorf': [51.23, 6.78], 'Leipzig': [51.34, 12.37], 'Dresden': [51.05, 13.74], 'Hannover': [52.37, 9.74], 'Nürnberg': [49.45, 11.08], 'Bremen': [53.08, 8.80], 'Bonn': [50.74, 7.10], 'Heidelberg': [49.40, 8.67], 'Würzburg': [49.79, 9.93], 'Freiburg': [48.00, 7.85], 'Mainz': [50.00, 8.27], 'Karlsruhe': [49.01, 8.40], 'Augsburg': [48.37, 10.90], 'Münster': [51.96, 7.63], 'Lübeck': [53.87, 10.69],
  'Bayern': [48.14, 11.58], 'Baden-Württemberg': [48.78, 9.18], 'Brandenburg': [52.41, 12.55], 'Hessen': [50.65, 9.16], 'Mecklenburg-Vorpommern': [53.61, 12.43], 'Niedersachsen': [52.37, 9.74], 'Nordrhein-Westfalen': [51.43, 7.66], 'Rheinland-Pfalz': [50.00, 8.27], 'Saarland': [49.40, 7.02], 'Sachsen': [51.05, 13.74], 'Sachsen-Anhalt': [52.13, 11.62], 'Schleswig-Holstein': [54.32, 10.13], 'Thüringen': [50.85, 11.05], 'Deutschland': [51.16, 10.45],
  'Zürich': [47.38, 8.54], 'Bern': [46.95, 7.44], 'Genf': [46.20, 6.14], 'Basel': [47.56, 7.59], 'Lausanne': [46.52, 6.63], 'Luzern': [47.05, 8.31], 'Lugano': [46.00, 8.96], 'St. Gallen': [47.42, 9.37], 'Winterthur': [47.50, 8.72], 'Schweiz': [46.95, 8.23],
  'Amsterdam': [52.37, 4.89], 'Andorra la Vella': [42.51, 1.52], 'Ankara': [39.93, 32.86], 'Athen': [37.98, 23.73], 'Belgrad': [44.79, 20.45], 'Bratislava': [48.15, 17.11], 'Brüssel': [50.85, 4.35], 'Budapest': [47.50, 19.04], 'Bukarest': [44.43, 26.10], 'Chișinău': [47.01, 28.86], 'Dublin': [53.34, -6.27], 'Helsinki': [60.17, 24.94], 'Kiew': [50.45, 30.52], 'Kopenhagen': [55.68, 12.57], 'Lissabon': [38.72, -9.14], 'Ljubljana': [46.06, 14.51], 'London': [51.51, -0.13], 'Luxemburg': [49.61, 6.13], 'Madrid': [40.42, -3.70], 'Minsk': [53.90, 27.57], 'Monaco': [43.74, 7.43], 'Moskau': [55.76, 37.62], 'Nikosia': [35.17, 33.36], 'Oslo': [59.91, 10.75], 'Paris': [48.86, 2.35], 'Podgorica': [42.44, 19.26], 'Prag': [50.08, 14.43], 'Pristina': [42.66, 21.17], 'Reykjavík': [64.13, -21.94], 'Riga': [56.95, 24.11], 'Rom': [41.90, 12.50], 'San Marino': [43.93, 12.45], 'Sarajevo': [43.86, 18.41], 'Skopje': [41.99, 21.43], 'Sofia': [42.70, 23.32], 'Stockholm': [59.33, 18.07], 'Tallinn': [59.44, 24.75], 'Tirana': [41.33, 19.82], 'Vaduz': [47.14, 9.52], 'Valletta': [35.90, 14.51], 'Vatikanstadt': [41.90, 12.45], 'Vilnius': [54.69, 25.28], 'Warschau': [52.23, 21.01], 'Zagreb': [45.81, 15.98],
  'Albanien': [41.33, 19.82], 'Andorra': [42.51, 1.52], 'Belarus': [53.90, 27.57], 'Belgien': [50.85, 4.35], 'Bosnien-Herzegowina': [43.86, 18.41], 'Bulgarien': [42.70, 23.32], 'Dänemark': [55.68, 12.57], 'Estland': [59.44, 24.75], 'Finnland': [60.17, 24.94], 'Frankreich': [48.86, 2.35], 'Griechenland': [37.98, 23.73], 'Großbritannien': [51.51, -0.13], 'Irland': [53.34, -6.27], 'Island': [64.13, -21.94], 'Italien': [41.90, 12.50], 'Kosovo': [42.66, 21.17], 'Kroatien': [45.81, 15.98], 'Lettland': [56.95, 24.11], 'Liechtenstein': [47.14, 9.52], 'Litauen': [54.69, 25.28], 'Malta': [35.90, 14.51], 'Moldau': [47.01, 28.86], 'Montenegro': [42.44, 19.26], 'Niederlande': [52.37, 4.89], 'Nordmazedonien': [41.99, 21.43], 'Norwegen': [59.91, 10.75], 'Polen': [52.23, 21.01], 'Portugal': [38.72, -9.14], 'Rumänien': [44.43, 26.10], 'Russland': [55.76, 37.62], 'Schweden': [59.33, 18.07], 'Serbien': [44.79, 20.45], 'Slowakei': [48.15, 17.11], 'Slowenien': [46.06, 14.51], 'Spanien': [40.42, -3.70], 'Tschechien': [50.08, 14.43], 'Türkei': [39.93, 32.86], 'Ukraine': [50.45, 30.52], 'Ungarn': [47.50, 19.04], 'Vatikan': [41.90, 12.45], 'Zypern': [35.17, 33.36],
  'Barcelona': [41.39, 2.16], 'Mailand': [45.46, 9.19], 'Venedig': [45.44, 12.32], 'Florenz': [43.77, 11.25], 'Neapel': [40.85, 14.26], 'Turin': [45.07, 7.69], 'Bologna': [44.50, 11.34], 'Verona': [45.44, 10.99], 'Edinburgh': [55.95, -3.19], 'Manchester': [53.48, -2.24], 'Liverpool': [53.41, -2.99], 'Birmingham': [52.49, -1.89], 'Glasgow': [55.86, -4.25], 'Krakau': [50.06, 19.94], 'Danzig': [54.35, 18.65], 'Posen': [52.41, 16.93], 'Breslau': [51.11, 17.04], 'Lyon': [45.76, 4.84], 'Marseille': [43.30, 5.37], 'Nizza': [43.71, 7.27], 'Bordeaux': [44.84, -0.58], 'Toulouse': [43.60, 1.44], 'Strassburg': [48.58, 7.75], 'Sevilla': [37.39, -5.99], 'Valencia': [39.47, -0.38], 'Bilbao': [43.26, -2.93], 'Málaga': [36.72, -4.42], 'Granada': [37.18, -3.60], 'Porto': [41.16, -8.61], 'Coimbra': [40.21, -8.43], 'Rotterdam': [51.92, 4.48], 'Den Haag': [52.07, 4.30], 'Utrecht': [52.09, 5.12], 'Antwerpen': [51.22, 4.40], 'Brügge': [51.21, 3.22], 'Gent': [51.05, 3.72], 'Salonika': [40.64, 22.94], 'Thessaloniki': [40.64, 22.94], 'Patras': [38.25, 21.73], 'Izmir': [38.42, 27.13], 'Antalya': [36.90, 30.71], 'Istanbul': [41.01, 28.98],
};

const FLIGHT_ONLY_LOCATIONS = new Set([
  'Zypern', 'Nikosia',
  'Malta', 'Valletta',
  'Island', 'Reykjavík',
  'Irland', 'Dublin',
  'Großbritannien', 'London', 'Edinburgh', 'Manchester', 'Liverpool', 'Birmingham', 'Glasgow',
]);

const FLIGHT_HUBS = ['Frankfurt am Main', 'München', 'Zürich', 'Amsterdam', 'Wien', 'Madrid', 'Rom', 'Paris', 'London', 'Brüssel'];
const TRANSAT_HUBS = ['München', 'Frankfurt am Main', 'Wien', 'Paris', 'Barcelona', 'Mailand', 'Zürich', 'Berlin', 'Amsterdam', 'Madrid', 'Rom', 'Brüssel', 'Prag', 'Salzburg', 'Köln', 'Hamburg'];

const TRANSPORT_TYPES = {
  Bus: {
    type: 'Bus' as const,
    lines: ['FlixBus N3', 'FlixBus N7', 'FlixBus 058', 'FlixBus 014', 'FlixBus 045', 'BlaBlaCar Bus 17', 'Eurolines 218', 'ALSA 234', 'Megabus M5', 'National Express 010', 'Postbus 1062', 'Westbahn-Bus W18'],
    duration: () => [2 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15] as [number, number],
    platform: () => String(1 + Math.floor(Math.random() * 16)),
  },
  Zug: {
    type: 'Zug' as const,
    lines: ['ICE 572', 'ICE 1245', 'ICE 78', 'IC 2010', 'IC 246', 'EC 112', 'EC 163', 'RJ 43', 'RJX 130', 'RJ 555', 'RE 7', 'NJ 421', 'EN 491', 'EN 234', 'TGV 9871', 'TGV 6543', 'Eurostar 9114', 'Frecciarossa 9520'],
    duration: () => [1 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 4) * 15] as [number, number],
    platform: () => String(1 + Math.floor(Math.random() * 22)),
  },
  Flug: {
    type: 'Flug' as const,
    lines: ['LH 1234', 'LH 456', 'OS 511', 'OS 305', 'AF 1234', 'BA 243', 'KL 1851', 'IB 3140', 'AY 877', 'LO 321', 'AZ 102', 'SK 543', 'LX 198', 'EW 3801', 'FR 5283', 'U2 8042', 'TP 1098', 'SN 2614'],
    duration: () => [1 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 4) * 5] as [number, number],
    platform: (): string => {
      const r = Math.random();
      if (r < 0.55) {
        return (1 + Math.floor(Math.random() * 38)) + 'abcdef'[Math.floor(Math.random() * 6)];
      }
      return 'ABCDEF'[Math.floor(Math.random() * 6)] + (1 + Math.floor(Math.random() * 28));
    },
  },
};

const OPERATORS = {
  Bus: {
    'FlixBus': { label: 'FlixBus', bg: '#73d700', fg: '#0a1933', vehicles: ['MAN Lion’s Coach', 'Mercedes-Benz Tourismo', 'Setra ComfortClass 515 HD', 'Van Hool EX17H'], seats: [48, 88] as [number, number] },
    'BlaBlaCar Bus': { label: 'BlaBlaBus', bg: '#01bbb1', fg: '#ffffff', vehicles: ['Iveco Crossway', 'MAN Lion’s Coach', 'Setra TopClass 517 HDH'], seats: [55, 75] as [number, number] },
    'Eurolines': { label: 'Eurolines', bg: '#0049a3', fg: '#ffd200', vehicles: ['VDL Futura FHD2', 'Setra ComfortClass'], seats: [50, 70] as [number, number] },
    'ALSA': { label: 'ALSA', bg: '#0c4ea2', fg: '#ffffff', vehicles: ['Setra TopClass 517', 'Iveco Magelys Pro', 'Mercedes-Benz Tourismo'], seats: [50, 80] as [number, number] },
    'Megabus': { label: 'megabus.com', bg: '#1c2e6d', fg: '#ffd200', vehicles: ['Van Hool TDX27 Astromega', 'MAN Lion’s Coach', 'Setra ComfortClass'], seats: [70, 95] as [number, number] },
    'National Express': { label: 'National Express', bg: '#ffd200', fg: '#0a1933', vehicles: ['Caetano Levante', 'Plaxton Panther', 'VDL Futura FHD2'], seats: [49, 70] as [number, number] },
    'Postbus': { label: 'Postbus', bg: '#ffeb3b', fg: '#0a1933', vehicles: ['Mercedes-Benz Tourismo', 'Setra MultiClass S 415 NF'], seats: [50, 65] as [number, number] },
    'Westbahn-Bus': { label: 'Westbahn', bg: '#0066cc', fg: '#ffffff', vehicles: ['MAN Lion’s Coach', 'Setra ComfortClass'], seats: [50, 70] as [number, number] },
  } as Record<string, Omit<Operator, '_key'>>,
  Zug: {
    'ICE': { label: 'ICE', operator: 'Deutsche Bahn', bg: '#ec0016', fg: '#ffffff', vehicles: ['ICE 3 (Siemens Velaro)', 'ICE 4 (Siemens)', 'ICE 1'], seats: [400, 830] as [number, number] },
    'IC': { label: 'IC', operator: 'Deutsche Bahn', bg: '#ec0016', fg: '#ffffff', vehicles: ['IC2-Doppelstockzug (Bombardier)', 'Siemens Vectron-Lok + IC-Wagen'], seats: [380, 600] as [number, number] },
    'EC': { label: 'EC', operator: 'EuroCity', bg: '#ec0016', fg: '#ffffff', vehicles: ['ÖBB EuroCity-Wagen', 'Bombardier IC2'], seats: [380, 540] as [number, number] },
    'RJ': { label: 'Railjet', operator: 'ÖBB', bg: '#c8102e', fg: '#ffffff', vehicles: ['Siemens Railjet (Taurus + 7 Wagen)'], seats: [408, 408] as [number, number] },
    'RJX': { label: 'Railjet Xpress', operator: 'ÖBB', bg: '#c8102e', fg: '#ffffff', vehicles: ['Siemens Railjet Xpress'], seats: [430, 430] as [number, number] },
    'RE': { label: 'RE', operator: 'Regional-Express', bg: '#5a606a', fg: '#ffffff', vehicles: ['Bombardier Talent 2', 'Stadler FLIRT', 'Bombardier Twindexx'], seats: [200, 400] as [number, number] },
    'NJ': { label: 'Nightjet', operator: 'ÖBB', bg: '#0091dc', fg: '#ffffff', vehicles: ['ÖBB Nightjet (Siemens Viaggio)'], seats: [254, 254] as [number, number] },
    'EN': { label: 'EuroNight', operator: 'EuroNight', bg: '#0091dc', fg: '#ffffff', vehicles: ['Schlafwagen + Liegewagen-Verbund'], seats: [200, 280] as [number, number] },
    'TGV': { label: 'TGV', operator: 'SNCF', bg: '#7895c5', fg: '#ffffff', vehicles: ['TGV Duplex (Alstom)', 'TGV Réseau', 'TGV Inoui'], seats: [377, 510] as [number, number] },
    'Eurostar': { label: 'Eurostar', operator: 'Eurostar Int’l', bg: '#003864', fg: '#ffd200', vehicles: ['Eurostar e320 (Siemens Velaro)'], seats: [902, 902] as [number, number] },
    'Frecciarossa': { label: 'Frecciarossa', operator: 'Trenitalia', bg: '#cc0000', fg: '#ffffff', vehicles: ['Frecciarossa 1000 (Hitachi/Bombardier)', 'ETR 500'], seats: [457, 575] as [number, number] },
  } as Record<string, Omit<Operator, '_key'>>,
  Flug: {
    'LH': { label: 'Lufthansa', bg: '#05164d', fg: '#ffd700', vehicles: ['Airbus A320neo', 'Airbus A321', 'Airbus A350-900', 'Boeing 747-8'], seats: [180, 364] as [number, number] },
    'OS': { label: 'Austrian Airlines', bg: '#cc0000', fg: '#ffffff', vehicles: ['Airbus A320', 'Airbus A321neo', 'Embraer 195', 'Boeing 777-200ER'], seats: [120, 308] as [number, number] },
    'AF': { label: 'Air France', bg: '#002157', fg: '#ffffff', vehicles: ['Airbus A220-300', 'Airbus A320', 'Boeing 777-300ER'], seats: [148, 296] as [number, number] },
    'BA': { label: 'British Airways', bg: '#075aaa', fg: '#ffffff', vehicles: ['Airbus A320neo', 'Airbus A321neo', 'Boeing 787-9 Dreamliner'], seats: [180, 216] as [number, number] },
    'KL': { label: 'KLM', bg: '#00a1de', fg: '#ffffff', vehicles: ['Boeing 737-800', 'Embraer 195-E2', 'Boeing 787-10'], seats: [142, 318] as [number, number] },
    'IB': { label: 'Iberia', bg: '#d50032', fg: '#ffffff', vehicles: ['Airbus A320neo', 'Airbus A350-900'], seats: [180, 348] as [number, number] },
    'AY': { label: 'Finnair', bg: '#0a2d6e', fg: '#ffffff', vehicles: ['Airbus A320', 'Airbus A321', 'Airbus A350-900'], seats: [174, 297] as [number, number] },
    'LO': { label: 'LOT Polish', bg: '#0a356a', fg: '#ffffff', vehicles: ['Embraer 195', 'Boeing 737 MAX 8', 'Boeing 787-9'], seats: [112, 294] as [number, number] },
    'AZ': { label: 'ITA Airways', bg: '#0c4ea2', fg: '#ffffff', vehicles: ['Airbus A220-300', 'Airbus A320', 'Airbus A330-900neo'], seats: [148, 256] as [number, number] },
    'SK': { label: 'SAS', bg: '#003366', fg: '#ffffff', vehicles: ['Airbus A320neo', 'Airbus A321LR', 'Airbus A350-900'], seats: [174, 300] as [number, number] },
    'LX': { label: 'SWISS', bg: '#cc0000', fg: '#ffffff', vehicles: ['Airbus A220-100', 'Airbus A220-300', 'Airbus A320neo', 'Boeing 777-300ER'], seats: [125, 340] as [number, number] },
    'EW': { label: 'Eurowings', bg: '#69175a', fg: '#ffffff', vehicles: ['Airbus A319', 'Airbus A320', 'Airbus A321'], seats: [144, 215] as [number, number] },
    'FR': { label: 'Ryanair', bg: '#073590', fg: '#ffeb00', vehicles: ['Boeing 737-800', 'Boeing 737 MAX 8200'], seats: [189, 197] as [number, number] },
    'U2': { label: 'easyJet', bg: '#ff6600', fg: '#ffffff', vehicles: ['Airbus A320neo', 'Airbus A321neo'], seats: [186, 235] as [number, number] },
    'TP': { label: 'TAP Portugal', bg: '#017d3a', fg: '#ffffff', vehicles: ['Airbus A320neo', 'Airbus A330neo', 'Airbus A321LR'], seats: [180, 298] as [number, number] },
    'SN': { label: 'Brussels Airlines', bg: '#1a1a1a', fg: '#cc0000', vehicles: ['Airbus A319', 'Airbus A320', 'Airbus A330-300'], seats: [141, 288] as [number, number] },
  } as Record<string, Omit<Operator, '_key'>>,
};

const REGIONAL_BUS_PREFIXES = ['Postbus', 'Westbahn-Bus'];
const LONG_DISTANCE_BUS_PREFIXES = ['FlixBus', 'BlaBlaCar Bus', 'Eurolines', 'ALSA', 'Megabus', 'National Express'];

@Injectable({ providedIn: 'root' })
export class TransatService {
  readonly locations: string[] = Array.from(new Set(RAW_LOCATIONS)).sort((a, b) => a.localeCompare(b, 'de'));

  findCanonical(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    return this.locations.find(l => l.toLowerCase() === lower) ?? null;
  }

  searchSuggestions(query: string, limit = 8): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.locations.filter(l => l.toLowerCase().includes(q)).slice(0, limit);
  }

  private haversineKm(a: [number, number], b: [number, number]): number {
    const R = 6371;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  getDistance(from: string, to: string): number {
    const a = LOCATION_COORDS[from];
    const b = LOCATION_COORDS[to];
    if (!a || !b) return 800;
    return this.haversineKm(a, b);
  }

  isFlightOnly(loc: string): boolean {
    return FLIGHT_ONLY_LOCATIONS.has(loc);
  }

  private formatMinutes(min: number): string {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  private findOperator(type: LegType, line: string): Operator | null {
    if (type === 'Bus') {
      const keys = Object.keys(OPERATORS.Bus).sort((a, b) => b.length - a.length);
      for (const k of keys) {
        if (line.indexOf(k) === 0) return { _key: k, ...OPERATORS.Bus[k] };
      }
      return null;
    }
    const code = line.split(' ')[0];
    const pool = type === 'Zug' ? OPERATORS.Zug : OPERATORS.Flug;
    if (!pool[code]) return null;
    return { _key: code, ...pool[code] };
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randInRange(range: [number, number]): number {
    return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
  }

  private pickBusLineForDistance(km: number): string | null {
    const allLines = TRANSPORT_TYPES.Bus.lines;
    let pool: string[];
    if (km <= 100) pool = allLines;
    else if (km <= 1500) pool = allLines.filter(l => LONG_DISTANCE_BUS_PREFIXES.some(p => l.indexOf(p) === 0));
    else return null;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  private pickTransport(km: number, mustFly: boolean): { type: LegType; line: string | null } {
    if (mustFly) return { type: 'Flug', line: null };
    let busP: number, zugP: number;
    if (km <= 100) { busP = 0.50; zugP = 0.45; }
    else if (km <= 400) { busP = 0.05; zugP = 0.70; }
    else if (km <= 1000) { busP = 0.03; zugP = 0.42; }
    else if (km <= 1800) { busP = 0.02; zugP = 0.18; }
    else { busP = 0.00; zugP = 0.05; }

    const r = Math.random();
    if (r < busP) {
      const busLine = this.pickBusLineForDistance(km);
      if (busLine) return { type: 'Bus', line: busLine };
    }
    if (r < busP + zugP && km <= 2500) return { type: 'Zug', line: null };
    return { type: 'Flug', line: null };
  }

  generateJourney(from: string, to: string): Journey {
    const totalKm = this.getDistance(from, to);
    const fromIsland = this.isFlightOnly(from);
    const toIsland = this.isFlightOnly(to);
    const requiresFlight = fromIsland || toIsland;

    let numLegs: number;
    if (requiresFlight) {
      numLegs = totalKm < 1500 ? (Math.random() < 0.75 ? 1 : 2) : (Math.random() < 0.45 ? 1 : 2);
    } else if (totalKm < 200) {
      numLegs = Math.random() < 0.88 ? 1 : 2;
    } else if (totalKm < 600) {
      numLegs = Math.random() < 0.55 ? 1 : 2;
    } else if (totalKm < 1500) {
      const r = Math.random();
      numLegs = r < 0.25 ? 1 : r < 0.85 ? 2 : 3;
    } else {
      const r = Math.random();
      numLegs = r < 0.10 ? 1 : r < 0.70 ? 2 : 3;
    }

    const hubPool = requiresFlight ? FLIGHT_HUBS : TRANSAT_HUBS;
    const stops: string[] = [from];
    for (let i = 1; i < numLegs; i++) {
      let hub: string | null = null;
      let attempts = 0;
      do {
        hub = hubPool[Math.floor(Math.random() * hubPool.length)];
        attempts++;
      } while ((hub === from || hub === to || stops.indexOf(hub) !== -1) && attempts < 30);
      stops.push(hub);
    }
    stops.push(to);

    const legs: JourneyLeg[] = [];
    let cursorMin = 6 * 60 + Math.floor(Math.random() * 12 * 60);
    let totalMin = 0;

    for (let i = 0; i < numLegs; i++) {
      const legKm = this.getDistance(stops[i], stops[i + 1]);
      const legNeedsFlight = requiresFlight || this.isFlightOnly(stops[i]) || this.isFlightOnly(stops[i + 1]);
      const choice = this.pickTransport(legKm, legNeedsFlight);
      const transport = TRANSPORT_TYPES[choice.type];
      const line = choice.line ?? transport.lines[Math.floor(Math.random() * transport.lines.length)];

      const dur = transport.duration();
      const durMin = dur[0] * 60 + dur[1];
      const platform = transport.platform();

      const depMin = cursorMin;
      cursorMin += durMin;
      const arrMin = cursorMin;

      const op = this.findOperator(choice.type, line);
      legs.push({
        from: stops[i],
        to: stops[i + 1],
        type: choice.type,
        line,
        depTime: this.formatMinutes(depMin),
        arrTime: this.formatMinutes(arrMin),
        durMin,
        platform,
        operator: op,
        vehicle: op?.vehicles ? this.pickRandom(op.vehicles) : 'Standard',
        seats: op?.seats ? this.randInRange(op.seats) : 50,
      });

      totalMin += durMin;
      if (i < numLegs - 1) {
        const isFlightTransfer = choice.type === 'Flug';
        const transferMin = isFlightTransfer
          ? (45 + Math.floor(Math.random() * 45))
          : (25 + Math.floor(Math.random() * 50));
        cursorMin += transferMin;
        totalMin += transferMin;
        legs[i].transferAfter = transferMin;
      }
    }

    return { legs, totalMin };
  }

  platformLabel(type: LegType): string {
    if (type === 'Bus') return 'Steig';
    if (type === 'Zug') return 'Gleis';
    return 'Gate';
  }

  legSummary(leg: JourneyLeg): string {
    const platLabel = this.platformLabel(leg.type);
    if (leg.type === 'Bus') return `Es fährt der Bus <strong>${leg.line}</strong> ab <strong>${leg.depTime} Uhr</strong> von Steig <strong>${leg.platform}</strong>.`;
    if (leg.type === 'Zug') return `Es fährt der Zug <strong>${leg.line}</strong> ab <strong>${leg.depTime} Uhr</strong> von Gleis <strong>${leg.platform}</strong>.`;
    return `Es startet der Flug <strong>${leg.line}</strong> um <strong>${leg.depTime} Uhr</strong> ab Gate <strong>${leg.platform}</strong>.`;
  }
}
