import { ArrowLeft, ExternalLink } from "lucide-react";

// ----------------------------------------------------------------------------
// StundenzettelScreen
//
// Bettet die externe Stundenzettel-App direkt als iframe INNERHALB der
// LehrlingsApp ein, statt sie in einem neuen Tab/Fenster zu öffnen. Dadurch
// bleibt die LehrlingsApp jederzeit sichtbar/erreichbar - besonders wichtig
// auf iOS, wo als PWA installierte Apps keine echten mehrfachen Tabs/Fenster
// unterstützen und ein externer Link sonst die gesamte Ansicht ersetzt.
//
// Ein "Zurück"-Button oben lässt jederzeit zur LehrlingsApp zurückkehren.
// ----------------------------------------------------------------------------

const STUNDENZETTEL_URL = "https://reduce-mint-67086786.figma.site";

interface StundenzettelScreenProps {
  onBack: () => void;
}

export function StundenzettelScreen({ onBack }: StundenzettelScreenProps) {
  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Zurück zur LehrlingsApp
        </button>
        <a
          href={STUNDENZETTEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors text-xs"
          title="In separatem Tab öffnen"
        >
          <ExternalLink size={14} />
          <span className="hidden sm:inline">Extern öffnen</span>
        </a>
      </div>
      <iframe
        src={STUNDENZETTEL_URL}
        title="Stundenzettel"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
