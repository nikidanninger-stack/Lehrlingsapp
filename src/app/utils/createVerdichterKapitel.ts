import type { LernAbschnitt, Wissensabfrage } from "../types";
import { DataStore } from "../data/store";

// ----------------------------------------------------------------------------
// Erstellt automatisch das Kapitel "Verdichter & Kompressoren" für das
// 4. Lehrjahr mit 18 Quiz-Fragen, falls es noch nicht existiert.
// ----------------------------------------------------------------------------

const VERDICHTER_ID = "verdichter-kompressoren";

const fragen: Wissensabfrage[] = [
  {
    id: "verdichter-f1",
    frage: "Welche Verdichterart arbeitet mit einem hin- und herbewegten Kolben?",
    antworten: ["Scrollverdichter", "Hubkolbenverdichter", "Schraubenverdichter", "Turboverdichter"],
    richtigeAntwort: 1,
    erklaerung: "Der Hubkolbenverdichter nutzt einen Kolben, der sich linear in einem Zylinder bewegt.",
  },
  {
    id: "verdichter-f2",
    frage: "Wie funktioniert ein Scrollverdichter?",
    antworten: [
      "Zwei ineinandergreifende Spiralen verdichten das Gas",
      "Ein Kolben verdichtet in einem Zylinder",
      "Zwei Schrauben kämmen ineinander",
      "Ein Flügelrad beschleunigt das Gas",
    ],
    richtigeAntwort: 0,
    erklaerung: "Beim Scrollverdichter verdichten zwei ineinandergreifende, spiralförmige Elemente das Kältemittel kontinuierlich.",
  },
  {
    id: "verdichter-f3",
    frage: "Was kennzeichnet einen Schraubenverdichter?",
    antworten: [
      "Zwei rotierende Schraubenrotoren verdichten das Gas",
      "Er hat keine beweglichen Teile",
      "Er wird nur in Haushaltskühlschränken eingesetzt",
      "Er arbeitet ausschließlich mit Wasser als Kältemittel",
    ],
    richtigeAntwort: 0,
    erklaerung: "Zwei ineinandergreifende Schraubenrotoren verdichten das Gas in den Zwischenräumen der Rotoren.",
  },
  {
    id: "verdichter-f4",
    frage: "Was beschreibt das Druckverhältnis eines Verdichters?",
    antworten: [
      "Das Verhältnis von Verdampfungs- zu Kondensationsdruck",
      "Das Verhältnis von Hochdruck zu Niederdruck",
      "Das Verhältnis von Ansaug- zu Enddruck",
      "Das Verhältnis von Öldruck zu Gasdruck",
    ],
    richtigeAntwort: 2,
    erklaerung: "Das Druckverhältnis ist der Quotient aus dem Enddruck (Hochdruck) und dem Ansaugdruck (Niederdruck) des Verdichters.",
  },
  {
    id: "verdichter-f5",
    frage: "Wie wirkt sich ein hohes Druckverhältnis auf die Effizienz aus?",
    antworten: [
      "Die Effizienz steigt proportional",
      "Die Effizienz sinkt, da mehr Verdichtungsarbeit nötig ist",
      "Es hat keinen Einfluss auf die Effizienz",
      "Nur die Kälteleistung sinkt, die Effizienz bleibt gleich",
    ],
    richtigeAntwort: 1,
    erklaerung: "Ein hohes Druckverhältnis erhöht die notwendige Verdichtungsarbeit und senkt dadurch die Effizienz (COP) der Anlage.",
  },
  {
    id: "verdichter-f6",
    frage: "Welche Aufgabe haben die Verdichterventile beim Hubkolbenverdichter?",
    antworten: [
      "Sie regeln die Drehzahl des Motors",
      "Sie steuern Ansaugen und Ausstoßen des Kältemittels",
      "Sie kühlen das Motoröl",
      "Sie messen die Kältemitteltemperatur",
    ],
    richtigeAntwort: 1,
    erklaerung: "Saug- und Druckventile öffnen und schließen im Takt des Kolbens und steuern so den Gasfluss in und aus dem Zylinder.",
  },
  {
    id: "verdichter-f7",
    frage: "Warum ist der Ölkreislauf im Verdichter wichtig?",
    antworten: [
      "Er kühlt nur das Kältemittel",
      "Er schmiert bewegliche Teile und reduziert Verschleiß",
      "Er ersetzt das Kältemittel",
      "Er hat keine technische Funktion",
    ],
    richtigeAntwort: 1,
    erklaerung: "Das Öl schmiert die beweglichen Bauteile im Verdichter und reduziert dadurch Reibung und Verschleiß.",
  },
  {
    id: "verdichter-f8",
    frage: "Was passiert, wenn zu wenig Öl im Verdichter vorhanden ist?",
    antworten: [
      "Die Kälteleistung steigt",
      "Erhöhter Verschleiß und mögliche Beschädigung des Verdichters",
      "Der Verdichter wird leiser",
      "Das Kältemittel kondensiert schneller",
    ],
    richtigeAntwort: 1,
    erklaerung: "Ölmangel führt zu unzureichender Schmierung, was Verschleiß und im schlimmsten Fall einen Verdichterausfall zur Folge hat.",
  },
  {
    id: "verdichter-f9",
    frage: "Wozu dient der Motorschutz beim Verdichter?",
    antworten: [
      "Er schützt den Motor vor Überhitzung und Überlastung",
      "Er erhöht die Kälteleistung",
      "Er ersetzt das Expansionsventil",
      "Er misst den Kältemittelstand",
    ],
    richtigeAntwort: 0,
    erklaerung: "Der Motorschutz überwacht Temperatur und Stromaufnahme und schaltet den Verdichter bei Grenzwertüberschreitung ab.",
  },
  {
    id: "verdichter-f10",
    frage: "Was ist eine typische Sicherheitseinrichtung am Verdichter?",
    antworten: [
      "Hochdruckpressostat",
      "Wasserfilter",
      "Luftbefeuchter",
      "Frequenzumrichter für die Beleuchtung",
    ],
    richtigeAntwort: 0,
    erklaerung: "Der Hochdruckpressostat schaltet den Verdichter bei zu hohem Druck ab, um Schäden zu verhindern.",
  },
  {
    id: "verdichter-f11",
    frage: "Was versteht man unter den Betriebsgrenzen eines Verdichters?",
    antworten: [
      "Die maximale Lautstärke im Betrieb",
      "Den Bereich aus Verdampfungs- und Verflüssigungstemperatur, in dem der Verdichter sicher arbeitet",
      "Die Farbe des Verdichtergehäuses",
      "Die maximale Anzahl an Betriebsstunden",
    ],
    richtigeAntwort: 1,
    erklaerung: "Die Betriebsgrenzen definieren, in welchem Bereich von Verdampfungs- und Verflüssigungstemperatur der Verdichter zuverlässig arbeitet.",
  },
  {
    id: "verdichter-f12",
    frage: "Wie hängen Verdampfertemperatur und Sauggasdruck zusammen?",
    antworten: [
      "Sie stehen in keinem Zusammenhang",
      "Niedrigere Verdampfertemperatur bedeutet niedrigeren Sauggasdruck",
      "Niedrigere Verdampfertemperatur bedeutet höheren Sauggasdruck",
      "Der Sauggasdruck ist immer konstant",
    ],
    richtigeAntwort: 1,
    erklaerung: "Mit sinkender Verdampfertemperatur sinkt auch der zugehörige Sättigungsdruck – also der Sauggasdruck.",
  },
  {
    id: "verdichter-f13",
    frage: "Was ist ein Flüssigkeitsschlag und warum ist er gefährlich?",
    antworten: [
      "Ein normaler Betriebszustand ohne Risiko",
      "Flüssiges Kältemittel gelangt in den Verdichter und kann ihn mechanisch beschädigen",
      "Ein Fehler in der Elektrik des Verdichters",
      "Eine Methode zur Reinigung des Verdichters",
    ],
    richtigeAntwort: 1,
    erklaerung: "Da Flüssigkeit nicht komprimierbar ist, kann ein Flüssigkeitsschlag zu schweren mechanischen Schäden am Verdichter führen.",
  },
  {
    id: "verdichter-f14",
    frage: "Wie lässt sich ein Flüssigkeitsschlag vermeiden?",
    antworten: [
      "Durch ausreichende Überhitzung des Sauggases",
      "Durch Erhöhung des Kondensationsdrucks",
      "Durch Verringerung der Ölmenge",
      "Durch Abschalten des Motorschutzes",
    ],
    richtigeAntwort: 0,
    erklaerung: "Eine ausreichende Sauggasüberhitzung stellt sicher, dass kein flüssiges Kältemittel in den Verdichter gelangt.",
  },
  {
    id: "verdichter-f15",
    frage: "Was versteht man unter 'Heißgas' in der Kältetechnik?",
    antworten: [
      "Kältemittel im flüssigen Zustand vor dem Verdampfer",
      "Das vom Verdichter ausgestoßene, heiße und verdichtete Kältemittelgas",
      "Umgebungsluft, die den Verflüssiger kühlt",
      "Ölnebel im Kältemittelkreislauf",
    ],
    richtigeAntwort: 1,
    erklaerung: "Heißgas ist das vom Verdichter verdichtete, heiße Kältemittelgas auf der Druckseite, bevor es in den Verflüssiger eintritt.",
  },
  {
    id: "verdichter-f16",
    frage: "Was ist 'Kaltgas' im Kontext von Verdichtern?",
    antworten: [
      "Kaltes Sauggas auf der Niederdruckseite vor dem Verdichter",
      "Kältemittel im festen Aggregatzustand",
      "Gas, das zur Kühlung des Verdichtergehäuses von außen zugeführt wird",
      "Ein Synonym für Heißgas",
    ],
    richtigeAntwort: 0,
    erklaerung: "Kaltgas bezeichnet das kühlere, gasförmige Kältemittel auf der Saugseite (Niederdruckseite) vor dem Verdichter.",
  },
  {
    id: "verdichter-f17",
    frage: "Welche Servicearbeit gehört zur regelmäßigen Wartung eines Verdichters?",
    antworten: [
      "Kontrolle von Ölstand, Anschlüssen und Betriebsdrücken",
      "Austausch des kompletten Kältemittels wöchentlich",
      "Lackieren des Gehäuses",
      "Deaktivieren des Motorschutzes",
    ],
    richtigeAntwort: 0,
    erklaerung: "Regelmäßige Wartung umfasst u.a. die Kontrolle von Ölstand, elektrischen Anschlüssen sowie Saug- und Hochdruck.",
  },
  {
    id: "verdichter-f18",
    frage: "Was beschreibt der COP (Coefficient of Performance) einer Kälteanlage?",
    antworten: [
      "Das Verhältnis von Kälteleistung zu aufgenommener elektrischer Leistung",
      "Die maximale Drehzahl des Verdichters",
      "Die Anzahl der Verdichterzylinder",
      "Den Kältemitteltyp der Anlage",
    ],
    richtigeAntwort: 0,
    erklaerung: "Der COP gibt das Verhältnis von nutzbarer Kälteleistung zu aufgenommener elektrischer Leistung an – ein Maß für die Energieeffizienz.",
  },
];

const verdichterKapitel: LernAbschnitt = {
  id: VERDICHTER_ID,
  lehrjahr: 4,
  titel: "Verdichter & Kompressoren",
  beschreibung: "Vertiefendes Wissen zu Verdichterarten, Betrieb und Service für das 4. Lehrjahr",
  sortierung: 0,
  inhalt: `
    <h2>Verdichter & Kompressoren</h2>
    <p>Der Verdichter ist das Herzstück jeder Kompressionskälteanlage. In diesem
    Kapitel vertiefst du dein Wissen zu den gängigen Verdichterarten, ihren
    Betriebsgrenzen und den wichtigsten Servicearbeiten.</p>

    <h3>Verdichterarten im Überblick</h3>
    <ul>
      <li><strong>Hubkolbenverdichter</strong> – klassische Bauart mit hin- und
      hergehendem Kolben</li>
      <li><strong>Scrollverdichter</strong> – zwei ineinandergreifende Spiralen,
      ruhiger Lauf, weit verbreitet in kleineren und mittleren Anlagen</li>
      <li><strong>Schraubenverdichter</strong> – zwei kämmende Rotoren, geeignet
      für größere Leistungsbereiche</li>
    </ul>

    <h3>Sicherheit geht vor</h3>
    <p>Motorschutz, Hochdruckpressostat und ausreichende Sauggasüberhitzung
    schützen den Verdichter vor Überlastung, Überhitzung und Flüssigkeitsschlägen.
    Als angehende Fachkraft musst du diese Zusammenhänge sicher beherrschen.</p>
  `,
  dateiIds: [],
  wissensabfragen: fragen,
  erstellt: new Date().toISOString(),
  aktualisiert: new Date().toISOString(),
};

export function createVerdichterKapitel(): void {
  const existing = DataStore.getLernAbschnitte();
  if (existing.some((a) => a.id === VERDICHTER_ID)) return;
  DataStore.addLernAbschnitt(verdichterKapitel);
}
