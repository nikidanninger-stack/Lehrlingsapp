// ----------------------------------------------------------------------------
// Push-Benachrichtigung aus der HAUSER-Zeiterfassung an Lehrlinge
//
// Die Zeiterfassung (hauser-stundenaufzeichnung.de) ist in der LehrlingsApp nur
// als iframe eingebettet. In einem eingebetteten Fenster einer fremden Adresse
// kann der Browser keine Push-Erlaubnis erteilen. Deshalb ruft die Zeiterfassung
// nach einer Genehmigung/Ablehnung (SEG-Zulage, Privat-KM) diesen Endpunkt auf,
// und die Nachricht wird über die Push-Abos der LehrlingsApp verschickt.
//
// Schutz vor Missbrauch: Es wird nur verschickt, wenn der Entscheid wirklich so
// in der Datenbank der Zeiterfassung gespeichert ist. Der Text wird hier gebaut,
// der Aufrufer kann keinen eigenen Text schicken.
//
// Body: { employee_id, type: "seg" | "km", year, month (0-basiert), day }
// ----------------------------------------------------------------------------

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Öffentliche Zugangsdaten der Zeiterfassung (dieselben, die auch in deren
// Browser-Code stehen – nur Lesezugriff)
const ZE_URL = "https://owiismhgpvznahyawlac.supabase.co";
const ZE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93aWlzbWhncHZ6bmFoeWF3bGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDQ4MzUsImV4cCI6MjA4NzA4MDgzNX0.qn0rMsRQQr0GSPEx5zZyFXbAhbe32td4h4G69I8Pjq8";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { employee_id, type, year, month, day } = req.body ?? {};
  if (
    !employee_id ||
    !["seg", "km"].includes(type) ||
    ![year, month, day].every((n) => Number.isInteger(n))
  ) {
    return res.status(400).json({ error: "Ungültige Anfrage" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: "Fehlende Umgebungsvariablen für Push-Versand." });
  }

  try {
    // 1. Entscheid in der Zeiterfassung prüfen
    const zeResp = await fetch(
      `${ZE_URL}/rest/v1/employee_data?employee_id=eq.${encodeURIComponent(employee_id)}&select=data`,
      { headers: { apikey: ZE_ANON_KEY, Authorization: `Bearer ${ZE_ANON_KEY}` } },
    );
    if (!zeResp.ok) return res.status(502).json({ error: `Zeiterfassung nicht erreichbar (${zeResp.status})` });
    const rows = await zeResp.json();
    const entry = rows?.[0]?.data?.years?.[year]?.months?.[month]?.days?.[day];
    const status = type === "seg" ? entry?.segAllowanceStatus : entry?.privateKmStatus;
    if (status !== "approved" && status !== "rejected") {
      return res.status(200).json({ sent: 0, subscriptions: 0, reason: "Kein Entscheid gespeichert" });
    }

    // 2. Nachricht bauen
    const ok = status === "approved";
    const label = type === "seg" ? "SEG-Zulage" : "Privat-KM";
    const what = type === "seg" ? "SEG-Zulage" : `Privat-KM (${entry?.privateKm ?? ""} km)`;
    const dateStr = `${String(day).padStart(2, "0")}.${String(month + 1).padStart(2, "0")}.${year}`;
    const payload = JSON.stringify({
      title: ok ? `✓ ${label} genehmigt` : `✗ ${label} abgelehnt`,
      body: `Deine ${what} vom ${dateStr} wurde ${ok ? "genehmigt" : "abgelehnt"}.`,
      url: "/?screen=stundenzettel",
    });

    // 3. An alle Geräte des Lehrlings schicken
    webpush.setVapidDetails("mailto:info@hauser.com", vapidPublicKey, vapidPrivateKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("personalnummer", String(employee_id));
    if (error) return res.status(500).json({ error: error.message });

    let sent = 0;
    let failed = 0;
    const staleEndpoints = [];
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) staleEndpoints.push(sub.endpoint);
      }
    }
    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
    }

    return res.status(200).json({ sent, failed, subscriptions: subs?.length ?? 0 });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message ?? err) });
  }
}
