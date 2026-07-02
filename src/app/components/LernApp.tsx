import { useEffect, useState } from "react";
import {
  GraduationCap,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { LernAbschnitt, User, Wissensabfrage } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { ProgressBar } from "./ui/ProgressBar";
import { Button } from "./ui/Button";

interface LernAppProps {
  user: User;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null; // kein bekannter Embed-Anbieter → als <video>-Quelle behandeln
}

export function LernApp({ user }: LernAppProps) {
  const [, setTick] = useState(0);
  const [selectedAbschnitt, setSelectedAbschnitt] = useState<LernAbschnitt | null>(null);
  const [activeLehrjahr, setActiveLehrjahr] = useState<number>(
    user.role === "admin" ? 1 : user.lehrjahr,
  );

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const abschnitte = DataStore.getLernAbschnitte().filter(
    (a) => a.lehrjahr === activeLehrjahr,
  );

  if (selectedAbschnitt) {
    // Aktuellste Version aus dem Store holen, falls zwischenzeitlich geändert
    const fresh = DataStore.getLernAbschnitte().find((a) => a.id === selectedAbschnitt.id);
    if (!fresh) {
      setSelectedAbschnitt(null);
      return null;
    }
    return (
      <AbschnittDetail
        abschnitt={fresh}
        user={user}
        onBack={() => setSelectedAbschnitt(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<GraduationCap size={22} />}
          title="LernApp"
          subtitle={
            isAdmin
              ? "Lerninhalte für alle Lehrjahre"
              : `Deine Lerninhalte – Lehrjahr ${user.lehrjahr}`
          }
        />
        <div className="p-6 space-y-6">
          {isAdmin && (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((jahr) => (
                <button
                  key={jahr}
                  onClick={() => setActiveLehrjahr(jahr)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeLehrjahr === jahr
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Lehrjahr {jahr}
                </button>
              ))}
            </div>
          )}

          {abschnitte.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Für dieses Lehrjahr sind noch keine Lernabschnitte verfügbar.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {abschnitte.map((abschnitt) => (
                <AbschnittCard
                  key={abschnitt.id}
                  abschnitt={abschnitt}
                  personalnummer={user.personalnummer}
                  onClick={() => setSelectedAbschnitt(abschnitt)}
                />
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function AbschnittCard({
  abschnitt,
  personalnummer,
  onClick,
}: {
  abschnitt: LernAbschnitt;
  personalnummer: string;
  onClick: () => void;
}) {
  const fortschritt = DataStore.getLernFortschrittFor(personalnummer, abschnitt.id);
  const percent = fortschritt?.fortschritt ?? 0;
  const abgeschlossen = fortschritt?.abgeschlossen ?? false;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white/60 border border-gray-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">{abschnitt.titel}</h3>
        {abgeschlossen && (
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
        )}
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{abschnitt.beschreibung}</p>
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
        {abschnitt.videoUrl && (
          <span className="flex items-center gap-1">
            <PlayCircle size={13} /> Video
          </span>
        )}
        <span className="flex items-center gap-1">
          <HelpCircle size={13} /> {abschnitt.wissensabfragen.length} Fragen
        </span>
      </div>
      <ProgressBar value={percent} />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gray-400">{percent}%</span>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
    </button>
  );
}

// ============================================================================
// Detail-Ansicht eines Abschnitts (Video + Inhalt + Quiz)
// ============================================================================

function AbschnittDetail({
  abschnitt,
  user,
  onBack,
}: {
  abschnitt: LernAbschnitt;
  user: User;
  onBack: () => void;
}) {
  const [videoWatched, setVideoWatched] = useState(abschnitt.videoAngeschaut ?? false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredLog, setAnsweredLog] = useState<
    { frageId: string; richtig: boolean; datum: string }[]
  >([]);
  const [quizFinished, setQuizFinished] = useState(false);

  const embedUrl = abschnitt.videoUrl ? getEmbedUrl(abschnitt.videoUrl) : null;
  const isDirectVideo = abschnitt.videoUrl && !embedUrl;

  const currentQuestion: Wissensabfrage | undefined =
    abschnitt.wissensabfragen[currentQuestionIdx];

  function handleMarkWatched() {
    setVideoWatched(true);
    DataStore.updateLernAbschnitt(abschnitt.id, { videoAngeschaut: true });
    toast.success("Video als angeschaut markiert");
  }

  function handleAnswerSelect(idx: number) {
    if (showFeedback || !currentQuestion) return;
    setSelectedAnswer(idx);
    setShowFeedback(true);
    const richtig = idx === currentQuestion.richtigeAntwort;
    if (richtig) setCorrectCount((c) => c + 1);
    setAnsweredLog((log) => [
      ...log,
      { frageId: currentQuestion.id, richtig, datum: new Date().toISOString() },
    ]);
  }

  function handleNextQuestion() {
    setSelectedAnswer(null);
    setShowFeedback(false);
    if (currentQuestionIdx + 1 < abschnitt.wissensabfragen.length) {
      setCurrentQuestionIdx((i) => i + 1);
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    const total = abschnitt.wissensabfragen.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 100;
    DataStore.upsertLernFortschritt({
      personalnummer: user.personalnummer,
      abschnittId: abschnitt.id,
      abgeschlossen: true,
      fortschritt: percent,
      beantworteteFragen: answeredLog,
      letzteAktivitaet: new Date().toISOString(),
    });
    setQuizFinished(true);
    toast.success(`Quiz abgeschlossen: ${correctCount}/${total} richtig`);
  }

  function restartQuiz() {
    setQuizStarted(true);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setAnsweredLog([]);
    setQuizFinished(false);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Zurück zur Übersicht
      </button>

      <GlassCard className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{abschnitt.titel}</h1>
          <p className="text-sm text-gray-500 mt-1">{abschnitt.beschreibung}</p>
        </div>

        {/* Video */}
        {abschnitt.videoUrl && (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={abschnitt.titel}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video
                  src={abschnitt.videoUrl}
                  controls
                  className="w-full h-full"
                  onEnded={handleMarkWatched}
                />
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={videoWatched}
                onChange={(e) => (e.target.checked ? handleMarkWatched() : setVideoWatched(false))}
                className="w-4 h-4 accent-blue-600"
              />
              Video als angeschaut markieren
            </label>
          </div>
        )}

        {/* Inhalt */}
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: abschnitt.inhalt }}
        />

        {/* Quiz */}
        {abschnitt.wissensabfragen.length > 0 && (
          <div className="border-t border-gray-100 pt-6">
            {!quizStarted ? (
              <div className="text-center py-6">
                <HelpCircle size={32} className="mx-auto text-blue-400 mb-2" />
                <p className="text-sm text-gray-600 mb-4">
                  {abschnitt.wissensabfragen.length} Fragen warten auf dich.
                </p>
                <Button onClick={restartQuiz}>Quiz starten</Button>
              </div>
            ) : quizFinished ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                <p className="font-semibold text-gray-800">
                  {correctCount} von {abschnitt.wissensabfragen.length} richtig
                </p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Dein Fortschritt wurde gespeichert.
                </p>
                <Button variant="ghost" onClick={restartQuiz}>
                  Quiz wiederholen
                </Button>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Frage {currentQuestionIdx + 1} von {abschnitt.wissensabfragen.length}
                  </span>
                </div>
                <ProgressBar
                  value={((currentQuestionIdx + 1) / abschnitt.wissensabfragen.length) * 100}
                />
                <p className="font-medium text-gray-800">{currentQuestion.frage}</p>
                <div className="space-y-2">
                  {currentQuestion.antworten.map((antwort, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrect = idx === currentQuestion.richtigeAntwort;
                    let styles =
                      "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50";
                    if (showFeedback) {
                      if (isCorrect) {
                        styles = "border-green-400 bg-green-50 text-green-800";
                      } else if (isSelected) {
                        styles = "border-red-400 bg-red-50 text-red-800";
                      } else {
                        styles = "border-gray-200 opacity-60";
                      }
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        disabled={showFeedback}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${styles}`}
                      >
                        <span className="font-semibold mr-2">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {antwort}
                      </button>
                    );
                  })}
                </div>

                {showFeedback && currentQuestion.erklaerung && (
                  <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    {currentQuestion.erklaerung}
                  </p>
                )}

                {showFeedback && (
                  <Button onClick={handleNextQuestion} className="w-full">
                    {currentQuestionIdx + 1 < abschnitt.wissensabfragen.length
                      ? "Nächste Frage"
                      : "Quiz abschließen"}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
