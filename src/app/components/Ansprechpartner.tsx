import { useEffect, useState } from "react";
import { Users, Search, Phone, Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Ansprechpartner as AnsprechpartnerType, User } from "../types";
import { DataStore, subscribeToDataChanges } from "../data/store";
import { GlassCard } from "./ui/GlassCard";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface AnsprechpartnerProps {
  user: User;
}

export function Ansprechpartner({ user }: AnsprechpartnerProps) {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnsprechpartnerType | null>(null);

  useEffect(() => subscribeToDataChanges(() => setTick((t) => t + 1)), []);

  const isAdmin = user.role === "admin";
  const alle = DataStore.getAnsprechpartner();
  const gefiltert = alle.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.abteilung.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase()),
  );

  function handleDelete(id: string) {
    if (!confirm("Diesen Ansprechpartner wirklich löschen?")) return;
    DataStore.deleteAnsprechpartner(id);
    toast.success("Ansprechpartner gelöscht");
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: AnsprechpartnerType) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader
          icon={<Users size={22} />}
          title="Ansprechpartner"
          subtitle="Deine Kontakte bei Hauser Kältetechnik"
          actions={
            isAdmin ? (
              <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={openNew}>
                Hinzufügen
              </Button>
            ) : undefined
          }
        />
        <div className="p-6 space-y-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder Abteilung suchen..."
              className="input pl-9"
            />
          </div>

          {gefiltert.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Keine Ansprechpartner gefunden.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {gefiltert.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/60 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        p.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {p.position} · {p.abteilung}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs">
                        <a
                          href={`tel:${p.phone}`}
                          className="flex items-center gap-1 text-blue-700 hover:underline"
                        >
                          <Phone size={12} /> {p.phone}
                        </a>
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-1 text-blue-700 hover:underline"
                        >
                          <Mail size={12} /> {p.email}
                        </a>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Bearbeiten"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          aria-label="Löschen"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {isAdmin && (
        <AnsprechpartnerFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          person={editing}
        />
      )}
    </div>
  );
}

function AnsprechpartnerFormModal({
  isOpen,
  onClose,
  person,
}: {
  isOpen: boolean;
  onClose: () => void;
  person: AnsprechpartnerType | null;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [position, setPosition] = useState(person?.position ?? "");
  const [abteilung, setAbteilung] = useState(person?.abteilung ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");

  useEffect(() => {
    setName(person?.name ?? "");
    setPosition(person?.position ?? "");
    setAbteilung(person?.abteilung ?? "");
    setPhone(person?.phone ?? "");
    setEmail(person?.email ?? "");
  }, [person, isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !position.trim()) {
      toast.error("Bitte Name und Position ausfüllen.");
      return;
    }

    if (person) {
      DataStore.updateAnsprechpartner(person.id, {
        name,
        position,
        abteilung,
        phone,
        email,
      });
      toast.success("Ansprechpartner aktualisiert");
    } else {
      DataStore.addAnsprechpartner({
        id: crypto.randomUUID(),
        name,
        position,
        abteilung,
        phone,
        email,
        responsibilities: [],
      });
      toast.success("Ansprechpartner hinzugefügt");
    }
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={person ? "Ansprechpartner bearbeiten" : "Ansprechpartner hinzufügen"}
      icon={<Users size={20} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Abteilung</label>
            <input
              value={abteilung}
              onChange={(e) => setAbteilung(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {person ? "Speichern" : "Hinzufügen"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
