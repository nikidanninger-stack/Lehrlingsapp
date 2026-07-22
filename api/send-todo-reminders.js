// ----------------------------------------------------------------------------
// Vercel Cron Job: To-Do-Erinnerung 3 Tage vor Monatsende
//
// Wird automatisch von Vercel Cron aufgerufen (siehe vercel.json). Prüft, ob
// heute der drittletzte Tag des Monats ist, und schickt dann NUR an die
// Lehrlinge eine Push-Erinnerung, die für den aktuellen Monat noch mindestens
// ein offenes To-Do haben (keine Massen-Nachricht an alle).
//
// Berücksichtigt sowohl einmalige To-Dos (monat === aktueller Monat) als auch
// laufende/ganzjährige To-Dos (wiederholtSichMonatlich = true, monat <=
// aktueller Monat).
//
// WICHTIG: Die Umgebungsvariablen SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY und
// VAPID_PRIVATE_KEY müssen in den Vercel-Projekteinstellungen eingetragen
// sein (Settings -> Environment Variables).
// ----------------------------------------------------------------------------

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function letzterTagDesMonats(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function istDrittletzterTagDesMonats(date) {
  return date.getDate() === letzterTagDesMonats(date) - 2;
}

function aktuellerMonat(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const today = new Date();
  const forceTest = req.query?.force === "true";

  if (!istDrittletzterTagDesMonats(today) && !forceTest) {
    return res.status(200).json({
      skipped: true,
      reason: "Heute ist nicht der drittletzte Tag des Monats.",
      today: today.toISOString(),
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({
      error: "Fehlende Umgebungsvariablen für Push-Versand.",
    });
  }

  webpush.setVapidDetails("mailto:info@hauser.com", vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const monat = aktuellerMonat(today);

  const [
    { data: todos, error: todosError },
    { data: erledigungen, error: erledigungenError },
    { data: lehrlinge, error: lehrlingeError },
    { data: subs, error: subsError },
  ] = await Promise.all([
    supabase.from("todos").select("*"),
    supabase.from("todo_erledigungen").select("*").eq("monat", monat),
    supabase.from("lehrlinge").select("personalnummer, lehrjahr"),
    supabase.from("push_subscriptions").select("*"),
  ]);

  const firstError = todosError || erledigungenError || lehrlingeError || subsError;
  if (firstError) {
    return res.status(500).json({ error: firstError.message });
  }

  // Nur To-Dos, die diesen Monat aktiv sind (einmalig für diesen Monat ODER
  // laufend seit einem Startmonat <= diesem Monat)
  const aktiveTodos = (todos ?? []).filter((t) =>
    t.wiederholtSichMonatlich ? t.monat <= monat : t.monat === monat,
  );

  if (aktiveTodos.length === 0) {
    return res.status(200).json({ skipped: true, reason: "Keine aktiven To-Dos diesen Monat." });
  }

  // Für jeden Lehrling: hat er noch mindestens ein offenes To-Do?
  const subsByPersonalnummer = new Map();
  for (const sub of subs ?? []) {
    if (!subsByPersonalnummer.has(sub.personalnummer)) {
      subsByPersonalnummer.set(sub.personalnummer, []);
    }
    subsByPersonalnummer.get(sub.personalnummer).push(sub);
  }

  const empfaenger = [];
  for (const lehrling of lehrlinge ?? []) {
    const betreffendeTodos = aktiveTodos.filter(
      (t) => t.lehrjahr === "alle" || Number(t.lehrjahr) === lehrling.lehrjahr,
    );
    if (betreffendeTodos.length === 0) continue;

    const hatOffenes = betreffendeTodos.some(
      (t) =>
        !(erledigungen ?? []).some(
          (e) => e.todoId === t.id && e.personalnummer === lehrling.personalnummer,
        ),
    );
    if (hatOffenes && subsByPersonalnummer.has(lehrling.personalnummer)) {
      empfaenger.push(...subsByPersonalnummer.get(lehrling.personalnummer));
    }
  }

  const payload = JSON.stringify({
    title: "Offene To-Dos",
    body: "Du hast noch To-Dos fuer diesen Monat offen - bitte bis Monatsende erledigen!",
    url: "/?screen=dashboard",
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints = [];

  for (const sub of empfaenger) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 404 || err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return res.status(200).json({
    sent,
    failed,
    removedStale: staleEndpoints.length,
    empfaengerGesamt: empfaenger.length,
  });
}
