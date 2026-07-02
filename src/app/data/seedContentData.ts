import type { Ansprechpartner, Werkzeug, LeitfadenEintrag, LernAbschnitt } from "../types";

// ----------------------------------------------------------------------------
// Seed-Daten: Ansprechpartner, Werkzeugkatalog, Lehrlingsleitfaden, LernApp
//
// Wird über den "Jetzt importieren"-Button im Admin-Panel (Daten-Management)
// manuell geladen. Ersetzt vorhandene Daten in diesen vier Bereichen.
// ----------------------------------------------------------------------------

export const SEED_ANSPRECHPARTNER: Ansprechpartner[] = [
  {
    "id": "ap-1",
    "name": "Rupert Danninger",
    "position": "Manager Skills Development Center",
    "abteilung": "Ausbildung",
    "phone": "+43 664 8186493",
    "email": "Rupert.Danninger@hauser.com",
    "responsibilities": [
      "Ausbildungsleitung",
      "Skills Development",
      "Lehrlingsentwicklung"
    ]
  },
  {
    "id": "ap-2",
    "name": "Sascha Gusenbauer",
    "position": "Manager Execution AT",
    "abteilung": "Ausführung",
    "phone": "+43 664 88344124",
    "email": "Sascha.Gusenbauer@hauser.com",
    "responsibilities": [
      "Projektausführung",
      "Koordination Ausbildung",
      "Ansprechpartner Execution"
    ]
  },
  {
    "id": "ap-3",
    "name": "Niklas Danninger",
    "position": "Teamleiter Montage Lehrlinge",
    "abteilung": "Montage",
    "phone": "+43 664 88687981",
    "email": "Niklas.Danninger@hauser.com",
    "responsibilities": [
      "Montage-Ausbildung",
      "Betreuung Lehrlinge Montage",
      "Praktische Anleitung"
    ]
  },
  {
    "id": "ap-4",
    "name": "Raphael Reisinger",
    "position": "Teamleiter Montage",
    "abteilung": "Montage",
    "phone": "+43 664 88344129",
    "email": "Raphael.Reisinger@hauser.com",
    "responsibilities": [
      "Montage-Organisation",
      "Teamkoordination",
      "Technische Fragen"
    ]
  }
] as Ansprechpartner[];

export const SEED_WERKZEUGE: Werkzeug[] = [
  {
    "id": "wz-0",
    "name": "Abisolierzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-1",
    "name": "Abklemmzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-2",
    "name": "Crimpzange PZ 6",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-3",
    "name": "Crimpzange PZ 16",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-4",
    "name": "Seitenschneider",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-5",
    "name": "Telefonzange (gerade)",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-6",
    "name": "Revolverzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-7",
    "name": "Zapfventilzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-8",
    "name": "Wasserpumpenzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-9",
    "name": "Zange für PG-Verschraubung",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-10",
    "name": "Kombizange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-11",
    "name": "Flachzange",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-12",
    "name": "Kabelschere",
    "kategorie": "Zangen & Greifwerkzeuge",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-13",
    "name": "Ratschensatz",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-14",
    "name": "Steckschlüssel",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-15",
    "name": "Steckschlüsselsatz",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-16",
    "name": "Kälte Knarre (1/4\", 3/8\")",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-17",
    "name": "Verlängerungen für Steckschlüssel",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-18",
    "name": "Rollgabelschlüssel",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-19",
    "name": "Maul-/Ringschlüssel",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-20",
    "name": "Drehmomentschlüssel",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-21",
    "name": "Schraubendreher Schlitz",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-22",
    "name": "Schraubendreher Kreuz (PH/PZ)",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-23",
    "name": "Schraubendreher-Satz isoliert",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-24",
    "name": "Bit-Satz (Torx, PH, PZ, Schlitz)",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-25",
    "name": "Sechskant-Stiftschlüsselsatz (Inbus)",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-26",
    "name": "Torx-Schlüsselsatz",
    "kategorie": "Schrauben, Schlüssel & Sätze",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-27",
    "name": "Bohrerkassette",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-28",
    "name": "Stufenbohrer",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-29",
    "name": "Kegelbohrer",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-30",
    "name": "Nietbohrer",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-31",
    "name": "Zentrierbohrer für Lochsäge",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-32",
    "name": "Rohrabschneider",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-33",
    "name": "Rohrabschneider MiniCut",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-34",
    "name": "Rohrschneider-Schneidrad",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-35",
    "name": "Schnellentgrater",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-36",
    "name": "Innen-/Außenentgrater",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-37",
    "name": "Reißnadel",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-38",
    "name": "Metallsäge / Bügelsäge",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-39",
    "name": "Ersatz-Sägeblätter",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-40",
    "name": "Feilen-Set",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-41",
    "name": "Cuttermesser",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-42",
    "name": "Ersatzklingen",
    "kategorie": "Schneiden, Bohren & Bearbeiten",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-43",
    "name": "Wasserwaage",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-44",
    "name": "Rollbandmaß",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-45",
    "name": "Maßstab / Zollstock",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-46",
    "name": "Schieblehre",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-47",
    "name": "Winkel",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-48",
    "name": "Spannungsprüfer",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-49",
    "name": "Spannungsprüfer Combi-Check",
    "kategorie": "Messen & Prüfen (allgemein)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-50",
    "name": "Brenner",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-51",
    "name": "Brennergriff",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-52",
    "name": "Ausbläser",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-53",
    "name": "Hartlötset",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-54",
    "name": "Silberlot",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-55",
    "name": "Flussmittel",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-56",
    "name": "Zündgerät",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-57",
    "name": "Hitzeschutzmatte",
    "kategorie": "Löten, Gas & Kälte-Basis",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-58",
    "name": "Manometer-Satz (analog)",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-59",
    "name": "Digitales Manometer",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-60",
    "name": "Vakuummeter (Mikron-Messgerät)",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-61",
    "name": "Thermometer (Kontakt)",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-62",
    "name": "Infrarot-Thermometer",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-63",
    "name": "Elektronisches Lecksuchgerät",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-64",
    "name": "Stickstoff-Druckprüfset",
    "kategorie": "Kältetechnik – Messen & Diagnostik",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-65",
    "name": "Vakuumpumpe",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-66",
    "name": "Kältemittelwaage",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-67",
    "name": "Service-Schläuche (Low / High / Mittel)",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-68",
    "name": "Füllschlauch",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-69",
    "name": "Schnellkupplungen",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-70",
    "name": "Absperrventile / Kugelhähne",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-71",
    "name": "Flaschenanschluss",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-72",
    "name": "Ventileinsatzentferner",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-73",
    "name": "Schrader-Ventildurchgangsöffner",
    "kategorie": "Kältetechnik – Evakuieren & Befüllen",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-74",
    "name": "Rohrbiegezange (Cu)",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-75",
    "name": "Rohrbiegefeder",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-76",
    "name": "Kalibrierwerkzeug",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-77",
    "name": "Aufweitgerät",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-78",
    "name": "Bördelgerät",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-79",
    "name": "Biegegerät",
    "kategorie": "Rohrbearbeitung (Kälte / Klima)",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-80",
    "name": "Schutzbrille",
    "kategorie": "Sicherheit, Umwelt & Service",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-81",
    "name": "Kältemittel-Schutzhandschuhe",
    "kategorie": "Sicherheit, Umwelt & Service",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-82",
    "name": "Gaswarngerät",
    "kategorie": "Sicherheit, Umwelt & Service",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  },
  {
    "id": "wz-83",
    "name": "Kältemittel-Rückgewinnungsgerät (Absauggerät)",
    "kategorie": "Sicherheit, Umwelt & Service",
    "beschreibung": "",
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
        "wichtig": false
  }
] as Werkzeug[];

export const SEED_LEITFADEN: LeitfadenEintrag[] = [
  {
    "id": "lf-1-1",
    "titel": "Maximale Arbeitszeiten ab 18 Jahren",
    "kategorie": "Regelung Arbeitszeiten Lehrlinge",
    "sortierung": 11,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Aufgrund der gesetzlichen Vorgaben ist ab dem 01.11.2025 eine maximale Arbeitszeit für Mitarbeiter in Österreich, die das 18. Lebensjahr bereits erreicht haben, von maximal 12 Stunden pro Tag und 60 Stunden pro Woche strikt einzuhalten!</p>"
  },
  {
    "id": "lf-1-2",
    "titel": "Arbeitszeiten für Lehrlinge unter 18 Jahren",
    "kategorie": "Regelung Arbeitszeiten Lehrlinge",
    "sortierung": 12,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Für Lehrlinge unter 18 Jahren gilt eine tägliche Arbeitszeit von 8 Stunden, die Wochenarbeitszeit 40 Stunden (KV abhängig; HAUSER = 38,5 Std.). Innerhalb einer Woche kann die tägliche Arbeitszeit auf bis zu neun Stunden ausgedehnt werden, wenn dadurch eine längere Wochenfreizeit erreicht wird (Freitag frei).</p>"
  },
  {
    "id": "lf-1-3",
    "titel": "Verbote für jugendliche Lehrlinge",
    "kategorie": "Regelung Arbeitszeiten Lehrlinge",
    "sortierung": 13,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Überstunden sowie ein Arbeiten vor 6:00 Uhr bzw. nach 20:00 Uhr sind für Lehrlinge untersagt. Jugendliche unterliegen nicht dem Arbeitszeitgesetz, sondern dem Kinder- und Jugendlichen-Beschäftigungsgesetz und können daher nicht von einer Gleitzeitvereinbarung erfasst werden.</p>"
  },
  {
    "id": "lf-1-4",
    "titel": "Ausnahmen für Vor- und Abschlussarbeiten (ab 16 Jahren)",
    "kategorie": "Regelung Arbeitszeiten Lehrlinge",
    "sortierung": 14,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Überstunden sind für Jugendliche über 16 Jahre ausschließlich zur Durchführung von Vor- und Abschlussarbeiten zulässig. Dabei ist die tägliche Mehrarbeitszeit auf maximal eine halbe Stunde begrenzt. Zusätzlich darf der wöchentliche Umfang insgesamt drei Stunden nicht überschreiten; bei einer Fünf-Tage-Woche reduziert sich dieses Höchstausmaß entsprechend auf 2,5 Stunden.</p>"
  },
  {
    "id": "lf-2-1",
    "titel": "Maximale Anreisezeiten nach Wohnort und Einsatzort",
    "kategorie": "Anreise & Arbeitszeit – Werk/Testlabor St. Martin & Schulungen Linz",
    "sortierung": 21,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Die Anreisezeiten von Lehrlingen sind abhängig vom jeweiligen Wohn- bzw. Ausgangsort sowie vom Einsatzort festgelegt:</p><ul><li>Wien → Linz: max. 2 Stunden</li><li>Wien → Werk St. Martin: max. 2,5 Stunden</li><li>St. Pölten → Linz: max. 1,5 Stunden</li><li>St. Pölten → Werk St. Martin: max. 2 Stunden</li></ul><p>Ausgenommen: Berufsschulzeiten, WIFI-Kurse, externe Kurse</p>"
  },
  {
    "id": "lf-2-2",
    "titel": "Anreise zum Werk St. Martin am ersten Arbeitstag",
    "kategorie": "Anreise & Arbeitszeit – Werk/Testlabor St. Martin & Schulungen Linz",
    "sortierung": 22,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Lehrlinge mit Ausgangsort Wien: spätestens 9:30 Uhr</li><li>Lehrlinge mit Ausgangsort St. Pölten: spätestens 9:00 Uhr</li></ul>"
  },
  {
    "id": "lf-2-3",
    "titel": "Regelung zur Anreise am Sonntag",
    "kategorie": "Anreise & Arbeitszeit – Werk/Testlabor St. Martin & Schulungen Linz",
    "sortierung": 23,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Eine Anreise am Sonntag ist grundsätzlich zu vermeiden. Nur bei zwingend erforderlichem betrieblichem Grund und ausdrücklichem Anlass zulässig.</p>"
  },
  {
    "id": "lf-2-4",
    "titel": "Altersabhängige Arbeitszeiten und Abfahrtszeiten am Freitag",
    "kategorie": "Anreise & Arbeitszeit – Werk/Testlabor St. Martin & Schulungen Linz",
    "sortierung": 24,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Unter 18: Arbeitszeit endet Freitag spätestens 13:00 Uhr (+ 15 Min. Pause pflicht)</li><li>Über 18: Arbeitszeit endet Freitag spätestens 12:45 Uhr</li></ul><p><em>Beispiel:</em> Lehrling unter 18, Wien → Abreise Linz um 11:00 Uhr. Lehrling über 18, Wien → Abreise Linz um 10:45 Uhr.</p>"
  },
  {
    "id": "lf-3-1",
    "titel": "HAUSER DO's & DON'Ts",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 31,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Freundliches, respektvolles Auftreten gegenüber Kollegen, Vorgesetzten und Kunden</li><li>Pünktlichkeit zu Arbeitsbeginn und nach Pausen</li><li>Gepflegtes Erscheinungsbild</li><li>Ordnung und Sauberkeit am Arbeitsplatz</li><li>Verantwortungsvoller Umgang mit Werkzeug und Material</li><li>Fragen sofort stellen, wenn etwas unklar ist</li><li>Fehler offen kommunizieren</li><li>Abwesenheiten unverzüglich melden</li><li>Unfälle sofort melden</li><li>Eigeninitiative zeigen</li></ul><p><strong>Wichtig:</strong> Diese Regeln gelten auch während der Berufsschule!</p>"
  },
  {
    "id": "lf-3-2",
    "titel": "Pflichten des Lehrlings",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 32,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Berufliche Kenntnisse und Fertigkeiten erlernen</li><li>Übertragene Aufgaben ordnungsgemäß ausführen</li><li>Betriebsgeheimnisse wahren</li><li>Arbeitsmittel sorgfältig behandeln</li><li>Krankheit oder Verhinderung sofort melden</li><li>Ärztliche Bestätigung vorlegen</li><li>Zeugnisse unverzüglich abgeben</li></ul>"
  },
  {
    "id": "lf-3-3",
    "titel": "Pflichten des Unternehmens",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 33,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Fachgerechte Ausbildung sicherstellen</li><li>Keine berufsfremden oder unzumutbaren Tätigkeiten verlangen</li><li>Freistellung für Berufsschule und LAP</li><li>Internatskosten übernehmen</li><li>Erste Prüfungsgebühren übernehmen</li></ul>"
  },
  {
    "id": "lf-3-4",
    "titel": "Abwesenheiten",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 34,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Jede Abwesenheit SOFORT melden (bis spätestens 8:00 Uhr am ersten Tag)</li><li>Ärztliche Bestätigung ab dem 1. Tag erforderlich</li><li>Urlaub nur nach vorheriger Genehmigung</li><li>25 Urlaubstage bei 5-Tage-Woche</li><li>Zeitausgleich zeitnah konsumieren</li><li>Arzttermine möglichst außerhalb der Arbeitszeit</li><li>Arbeitsunfälle sofort melden</li><li>Wegunfälle melden</li><li>Beinaheunfälle melden</li><li>Sonderfreistellungen laut Kollektivvertrag möglich</li></ul>"
  },
  {
    "id": "lf-3-5",
    "titel": "Berufsschule und Internat",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 35,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Berufsschule ist verpflichtend (ca. 20 % der Lehrzeit)</li><li>Anmeldung erfolgt durch HR</li><li>Zeugnisse müssen in Kopie abgegeben werden</li><li>Gute Leistungen werden prämiert</li><li>Schulfreie Tage sind NICHT automatisch arbeitsfrei</li><li>Erkrankung während der Schulzeit sofort melden</li></ul>"
  },
  {
    "id": "lf-3-6",
    "titel": "Zeiterfassung",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 36,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Stundenzettel täglich ausfüllen</li><li>Krankheit, Urlaub und Zeitausgleich eintragen</li><li>Schulungen eintragen</li><li>Nächtigungen auf Montage dokumentieren</li><li>Grenzübertritte bei Auslandseinsätzen eintragen</li><li>Abgabe spätestens am Monatsletzten</li><li>Normalarbeitszeit: 38,5 Stunden pro Woche</li></ul>"
  },
  {
    "id": "lf-3-7",
    "titel": "Arbeitszeiten – Produktion",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 37,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Montag bis Donnerstag: 06:00–15:00 Uhr</li><li>Freitag: 06:00–11:45 Uhr</li><li>Pausenzeit: 45 Minuten</li><li>Stempeln nur zwischen 06:00 und 20:00 Uhr möglich</li><li>Jugendliche unterliegen dem KJBG</li></ul>"
  },
  {
    "id": "lf-3-8",
    "titel": "Arbeitszeiten – Montage/Service",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 38,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Montag bis Donnerstag: 07:00–16:00 Uhr</li><li>Freitag: 07:00–12:45 Uhr</li><li>Pausenzeit: 45 Minuten</li><li>Stempeln nur zwischen 06:00 und 20:00 Uhr möglich</li><li>Jugendliche unterliegen dem KJBG</li></ul>"
  },
  {
    "id": "lf-3-9",
    "titel": "Zeugnisprämien",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 39,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>350 Euro für Einser-Vorzug</li><li>250 Euro für Ausgezeichneten Erfolg</li><li>150 Euro für Guten Erfolg</li></ul>"
  },
  {
    "id": "lf-3-10a",
    "titel": "LAP-Prämien",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 40,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>500 Euro für Ausgezeichnet bestandene LAP</li><li>350 Euro für Gut bestandene LAP</li><li>150 Euro für Bestandene LAP</li></ul>"
  },
  {
    "id": "lf-3-10b",
    "titel": "Führerschein-Förderung",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 41,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>2.000 Euro bei positivem Abschluss</li><li>Freiwillige Leistung des Unternehmens</li><li>Voraussetzungen müssen erfüllt sein</li></ul>"
  },
  {
    "id": "lf-3-11",
    "titel": "Lehrabschlussprüfung (LAP)",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 42,
    "wichtig": true,
    "lehrjahre": [
      3,
      4
    ],
    "inhalt": "<ul><li>Anmeldung frühestens 6 Monate vor Lehrzeitende</li><li>Erste Prüfungsgebühr wird vom Unternehmen übernommen</li><li>Prüfungstage sind frei (bezahlte Freistellung)</li><li>Das Lehrverhältnis endet mit Ablauf der Woche nach positiver LAP!</li></ul>"
  },
  {
    "id": "lf-3-12",
    "titel": "Rotation durch Fachabteilungen",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 43,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Abteilungen während der Lehrzeit:</p><ul><li>Montage KT Linz</li><li>Montage ET Linz</li><li>Elektrowerkstatt St. Martin</li><li>Löt- und Isolierschulung</li><li>Service AT/DE</li></ul><ul><li>Schulungstage sind verpflichtend</li><li>Kein Urlaub während geplanter Schulungen möglich</li><li>Nachhilfe bei Bedarf möglich</li></ul>"
  },
  {
    "id": "lf-3-13",
    "titel": "Lehre mit Matura",
    "kategorie": "Regelwerk für Lehrlinge",
    "sortierung": 44,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<ul><li>Fächer: Deutsch, Englisch, Mathematik, Fachbereich</li><li>5 Tage bezahlte Vorbereitung gesamt</li><li>Prüfungstage sind frei (bezahlte Freistellung)</li><li>Zugang zu Universitäten und Fachhochschulen möglich</li></ul>"
  },
  {
    "id": "lf-4-1",
    "titel": "Dokumentationspflicht",
    "kategorie": "Stundenzettel",
    "sortierung": 51,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Beginn und Ende der Arbeitszeit sind jeden Arbeitstag korrekt zu dokumentieren.</p>"
  },
  {
    "id": "lf-4-2",
    "titel": "Wechsel der Stundenzettel-Vorlage bei Vollendung des 18. Lebensjahres",
    "kategorie": "Stundenzettel",
    "sortierung": 52,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>In dem Monat, in dem du das 18. Lebensjahr vollendest, verwendest du weiterhin den Stundenzettel für Lehrlinge unter 18 Jahren. Ab dem darauffolgenden Monat wechselst du zur Vorlage für Lehrlinge über 18 Jahre.</p><p><em>Hinweis: PDF-Vorlagen für Stundenzettel werden vom Admin bereitgestellt.</em></p>"
  },
  {
    "id": "lf-5-1",
    "titel": "Persönliche Schutzausrüstung",
    "kategorie": "Sicherheit am Arbeitsplatz",
    "sortierung": 61,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Du erhältst kostenlos deine PSA: Sicherheitsschuhe, Schutzbrille, Gehörschutz, Handschuhe und Arbeitskleidung. Das Tragen der PSA ist in allen Produktions- und Werkstattbereichen Pflicht!</p>"
  },
  {
    "id": "lf-5-2",
    "titel": "Verhalten im Notfall",
    "kategorie": "Sicherheit am Arbeitsplatz",
    "sortierung": 62,
    "wichtig": true,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Im Notfall: Ruhe bewahren, Vorgesetzte informieren, Notruf 122 (Feuerwehr) oder 144 (Rettung). Feuerlöscher und Erste-Hilfe-Kästen sind deutlich gekennzeichnet. Sammelpunkt bei Evakuierung: Parkplatz Süd.</p>"
  },
  {
    "id": "lf-5-3",
    "titel": "Sicherheitsschulungen",
    "kategorie": "Sicherheit am Arbeitsplatz",
    "sortierung": 63,
    "wichtig": false,
    "lehrjahre": [
      1,
      2,
      3,
      4
    ],
    "inhalt": "<p>Du nimmst verpflichtend an regelmäßigen Sicherheitsschulungen teil. Diese finden halbjährlich statt und umfassen Brandschutz, Erste Hilfe und Arbeitssicherheit.</p>"
  },
  {
    "id": "lf-6-1",
    "titel": "Vorbereitung auf die LAP",
    "kategorie": "Lehrabschlussprüfung",
    "sortierung": 71,
    "wichtig": false,
    "lehrjahre": [
      3,
      4
    ],
    "inhalt": "<p>Die Lehrabschlussprüfung (LAP) findet am Ende deiner Ausbildung statt. Sie besteht aus einem praktischen Werkstück und einer theoretischen Prüfung. Wir unterstützen dich intensiv bei der Vorbereitung mit Vorbereitungskursen und Übungsprüfungen.</p>"
  },
  {
    "id": "lf-6-2",
    "titel": "Praktische Prüfung",
    "kategorie": "Lehrabschlussprüfung",
    "sortierung": 72,
    "wichtig": false,
    "lehrjahre": [
      3,
      4
    ],
    "inhalt": "<p>In der praktischen Prüfung fertigst du ein Prüfungswerkstück an, das deine handwerklichen Fähigkeiten zeigt. Du hast mehrere Stunden Zeit und wirst dabei von Prüfern beobachtet. Die Bewertung erfolgt nach einem festgelegten Kriterienkatalog.</p>"
  },
  {
    "id": "lf-6-3",
    "titel": "Theoretische Prüfung",
    "kategorie": "Lehrabschlussprüfung",
    "sortierung": 73,
    "wichtig": false,
    "lehrjahre": [
      3,
      4
    ],
    "inhalt": "<p>Die theoretische Prüfung umfasst Fragen zu Fachkunde, Fachrechnen und technischer Zeichnung. Eine gründliche Vorbereitung mit den bereitgestellten Übungsmaterialien ist der Schlüssel zum Erfolg.</p>"
  },
  {
    "id": "lf-6-4",
    "titel": "Nach der Prüfung",
    "kategorie": "Lehrabschlussprüfung",
    "sortierung": 74,
    "wichtig": false,
    "lehrjahre": [
      3,
      4
    ],
    "inhalt": "<p>Bei guten Leistungen besteht eine hohe Chance auf Übernahme in ein fixes Dienstverhältnis. Wir fördern die Weiterbildung und bieten verschiedene Karrierepfade an, darunter Werkmeisterausbildung und Ingenieursstudium.</p>"
  }
] as LeitfadenEintrag[];

export const SEED_LERNABSCHNITTE: LernAbschnitt[] = [
  {
    "id": "lj1_allgemein",
    "lehrjahr": 1,
    "titel": "Allgemeine Kältetechnik",
    "beschreibung": "Grundlagen der Kältetechnik: Physik, Kreisprozess, Sicherheit und F-Gase",
    "sortierung": 0,
    "inhalt": "<h2>Grundlagen der Kältetechnik</h2>\n<p><strong>Kernthemen:</strong></p>\n<ul>\n<li>🌡️ Temperatur, Druck und Leistung – Grundgrößen verstehen</li>\n<li>🔄 Kältekreislauf – Wie funktioniert eine Kälteanlage?</li>\n<li>⚡ Latente und sensible Wärme – Phasenwechsel verstehen</li>\n<li>📊 p-h-Diagramm – Zustände visualisieren</li>\n<li>🧪 Kältemittel – R404A, R134a, NH₃ und F-Gase</li>\n<li>🔒 Sicherheit – Lockout/Tagout, Arbeitnehmerschutz</li>\n<li>📜 Zertifizierung – F-Gase-Verordnung und EU-Regeln</li>\n</ul>\n\n<h3>Lernziele</h3>\n<ul>\n<li>✅ Kältekreislauf und seine 4 Hauptkomponenten erklären können</li>\n<li>✅ Druck, Temperatur und Überhitzung messen und interpretieren</li>\n<li>✅ Unterschied zwischen latenter und sensibler Wärme verstehen</li>\n<li>✅ Kältemittel-Anforderungen und Sicherheitsregeln kennen</li>\n<li>✅ F-Gase-Verordnung und Zertifizierungspflicht verstehen</li>\n</ul>\n\n<h3>⚠️ Sicherheitshinweise</h3>\n<p><strong>WICHTIG:</strong> Kältemittel stehen unter hohem Druck! Niemals ohne Schutzbrille arbeiten.</p>\n<p>Bei fluorierten Kältemitteln kann Verbrennung hochgiftige Zersetzungsprodukte erzeugen!</p>\n<p><strong>Lockout/Tagout (LOTO):</strong> Vor Wartungsarbeiten immer Energiequellen isolieren!</p>",
    "dateiIds": [],
    "wissensabfragen": [
      {
        "id": "q1",
        "frage": "Was ist die Grundaufgabe einer Kälteanlage?",
        "antworten": [
          "Wärme zu erzeugen und zu speichern",
          "Waren/Güter abzukühlen und bei niedrigerer Temperatur zu halten als die Umgebung",
          "Luftfeuchtigkeit zu erhöhen",
          "Strom zu sparen"
        ],
        "richtigeAntwort": 1,
        "erklaerung": "Die Anlage entzieht Wärme und hält so Temperaturen unter der Umgebung."
      },
      {
        "id": "q2",
        "frage": "Welche Aussage zu Temperaturdifferenzen stimmt?",
        "antworten": [
          "1 °C Differenz entspricht 2 K",
          "1 °C Differenz entspricht 1 K",
          "Celsius und Kelvin sind nicht vergleichbar",
          "1 °C Differenz entspricht 0,5 K"
        ],
        "richtigeAntwort": 1,
        "erklaerung": "Kelvin und Celsius unterscheiden sich im Nullpunkt; die Differenz ist gleich groß."
      },
      {
        "id": "q3",
        "frage": "Wie ist Druck im physikalischen Sinn definiert?",
        "antworten": [
          "Masse mal Beschleunigung",
          "Energie pro Zeit",
          "Kraft pro Fläche",
          "Volumen pro Zeit"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Druck ist das Verhältnis zwischen Kraft und der Fläche, auf die sie wirkt."
      }
    ],
    "erstellt": "2026-07-02T00:00:00.000Z",
    "aktualisiert": "2026-07-02T00:00:00.000Z"
  },
  {
    "id": "lern_verdichter_4lj",
    "lehrjahr": 4,
    "titel": "Verdichter – Grundlagen",
    "beschreibung": "Lerne alles über die verschiedenen Verdichter-Bauarten, ihre Einteilung und Anwendungen in Kälteanlagen.",
    "sortierung": 0,
    "inhalt": "<h2>📚 Verdichter in der Kältetechnik</h2>\n<ul>\n<li>Die Einteilung von Verdichtern in Hauptgruppen</li>\n<li>Verdrängungsmaschinen vs. Strömungsmaschinen</li>\n<li>Verschiedene Bauarten: Hubkolben, Scroll, Schraube, Turbo</li>\n<li>Vollhermetische, halbhermetische und offene Verdichter</li>\n<li>Schmierungssysteme und ihre Bedeutung</li>\n<li>Einsatzgebiete verschiedener Verdichtertypen</li>\n</ul>\n<p><strong>⚠️ WICHTIG:</strong> Schaue dir zuerst das Video an, bevor du die Wissensabfrage startest!</p>",
    "dateiIds": [],
    "wissensabfragen": [
      {
        "id": "q2",
        "frage": "In welche zwei Hauptgruppen werden Verdichter eingeteilt?",
        "antworten": [
          "Groß- und Kleinverdichter",
          "Elektrisch und mechanisch",
          "Verdrängungsmaschinen und Strömungsmaschinen",
          "Offen und geschlossen"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Verdichter werden nach ihrem Funktionsprinzip eingeteilt."
      },
      {
        "id": "q3",
        "frage": "Welche Verdichter gehören zu den Strömungsmaschinen?",
        "antworten": [
          "Hubkolben- und Scrollverdichter",
          "Rollkolben- und Zellenverdichter",
          "Dampfstrahlverdichter und Turboverdichter",
          "Schrauben- und Rotationsverdichter"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Strömungsmaschinen arbeiten mit kontinuierlicher Strömung."
      },
      {
        "id": "q4",
        "frage": "Wie werden Turboverdichter weiter unterteilt?",
        "antworten": [
          "Groß- und Kleinturbinen",
          "Ein- und mehrstufige Verdichter",
          "Axial- und Radialverdichter",
          "Nass- und Trockenläufer"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Je nach Strömungsrichtung in Axial- und Radialverdichter."
      },
      {
        "id": "q5",
        "frage": "Welche Verdichter zählen zu den Verdrängungsmaschinen?",
        "antworten": [
          "Turbo- und Dampfstrahlverdichter",
          "Hubkolben- und Rotationsverdichter",
          "Nur Hubkolbenverdichter",
          "Nur Rotationsverdichter"
        ],
        "richtigeAntwort": 1,
        "erklaerung": "Verdrängungsmaschinen komprimieren durch Volumenverkleinerung."
      },
      {
        "id": "q7",
        "frage": "Welche Bauarten gibt es bei Hubkolbenverdichtern?",
        "antworten": [
          "Pleuelstangen-, Kurbelschleifen- und Taumelscheibenverdichter",
          "Nur Pleuelstangenverdichter",
          "Scroll- und Schraubenverdichter",
          "Radial- und Axialverdichter"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Unterscheiden sich nach der Art der Kraftübertragung."
      },
      {
        "id": "q8",
        "frage": "Welche Verdichter gehören zu den Rotationsverdichtern?",
        "antworten": [
          "Hubkolben- und Turboverdichter",
          "Nur Schraubenverdichter",
          "Scroll-, Schrauben-, Zellen-, Rollkolben- und Kreiselkolbenverdichter",
          "Dampfstrahl- und Axialverdichter"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Rotierende Bauteile zur Verdichtung."
      },
      {
        "id": "q9",
        "frage": "Was ist ein Merkmal eines vollhermetischen Verdichters?",
        "antworten": [
          "Verschraubtes, zerlegbares Gehäuse",
          "Motor außerhalb des Kältekreislaufs",
          "Dicht verschweißtes Gehäuse",
          "Kein Gehäuse notwendig"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Motor und Verdichter sind fest verbunden, nicht zerlegbar."
      },
      {
        "id": "q10",
        "frage": "Welche Aussage trifft auf einen halbhermetischen Verdichter zu?",
        "antworten": [
          "Nicht reparierbar",
          "Reparierbar durch verschraubtes Gehäuse",
          "Wird nur in Klimaanlagen eingesetzt",
          "Hat keinen Motor"
        ],
        "richtigeAntwort": 1,
        "erklaerung": "Zerlegbar und reparierbar durch Verschraubung."
      },
      {
        "id": "q11",
        "frage": "Wo werden offene Verdichter hauptsächlich eingesetzt?",
        "antworten": [
          "Nur in Haushaltskühlschränken",
          "Nur in Klimaanlagen",
          "Ammoniak-Kälteanlagen und Fahrzeugkühlungen",
          "Nur in Wärmepumpen"
        ],
        "richtigeAntwort": 2,
        "erklaerung": "Trennung von Motor und Kältemittel wichtig."
      },
      {
        "id": "q12",
        "frage": "Was ist ein Vorteil von Rotationsverdichtern?",
        "antworten": [
          "Hoher Wartungsaufwand",
          "Ruhiger Lauf und gleichmäßige Verdichtung",
          "Sehr laut im Betrieb",
          "Nur für kleine Anlagen geeignet"
        ],
        "richtigeAntwort": 1,
        "erklaerung": "Keine hin- und hergehenden Massen vorhanden."
      },
      {
        "id": "q13",
        "frage": "Was passiert bei falscher Drehrichtung eines Scrollverdichters?",
        "antworten": [
          "Kein Druckaufbau und lauter Lauf",
          "Nichts, funktioniert normal weiter",
          "Höhere Effizienz",
          "Der Verdichter schaltet automatisch um"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Drehrichtung muss zwingend stimmen!"
      },
      {
        "id": "q14",
        "frage": "Welche Schmierungsarten werden bei Verdichtern verwendet?",
        "antworten": [
          "Schleuderschmierung, Fliehkraft-, Zentrifugalkraftschmierung und Ölpumpe",
          "Nur Handschmierung",
          "Nur Ölpumpe",
          "Wasser als Schmiermittel"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Verschiedene Schmierungssysteme je nach Bauart."
      },
      {
        "id": "q15",
        "frage": "Nenne zwei Vorteile eines vollhermetischen Verdichters.",
        "antworten": [
          "Kompakt, dicht und wartungsarm",
          "Sehr laut und schwer zu warten",
          "Nur für Ammoniak geeignet",
          "Muss ständig geölt werden"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Absolut dicht, kein Kältemittelverlust."
      },
      {
        "id": "q16",
        "frage": "Warum ist die richtige Schmierung eines Verdichters wichtig?",
        "antworten": [
          "Reduziert Reibung, Verschleiß und sorgt für Abdichtung",
          "Erhöht nur die Lautstärke",
          "Ist nur optisch relevant",
          "Hat keinen technischen Nutzen"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Richtige Schmierung führt auch Wärme ab."
      },
      {
        "id": "q17",
        "frage": "Nenne zwei Unterschiede zwischen vollhermetischem und halbhermetischem Verdichter.",
        "antworten": [
          "Vollhermetisch: verschweißt und nicht reparierbar. Halbhermetisch: verschraubt und reparierbar",
          "Beide sind identisch aufgebaut",
          "Vollhermetisch ist immer größer",
          "Halbhermetisch hat keinen Motor"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Hauptunterschied ist die Zerlegbarkeit."
      },
      {
        "id": "q18",
        "frage": "Welche Verdichterart wird in Ammoniak-Kälteanlagen eingesetzt und warum?",
        "antworten": [
          "Offene Verdichter – wegen der Aggressivität von Ammoniak gegenüber Motorwicklungen",
          "Vollhermetische Verdichter – wegen der Kompaktheit",
          "Turboverdichter – wegen der hohen Drehzahl",
          "Scrollverdichter – wegen der Laufruhe"
        ],
        "richtigeAntwort": 0,
        "erklaerung": "Motor muss außerhalb des Kältekreislaufs sein."
      }
    ],
    "erstellt": "2026-07-02T00:00:00.000Z",
    "aktualisiert": "2026-07-02T00:00:00.000Z"
  }
] as LernAbschnitt[];
