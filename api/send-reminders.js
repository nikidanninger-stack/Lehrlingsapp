// ----------------------------------------------------------------------------
// Vercel Cron Job: Stundenzettel-Erinnerung am Monatsletzten
//
// Diese Serverless Function wird automatisch von Vercel Cron aufgerufen
// (siehe vercel.json). Sie prüft, ob heute der letzte Tag des Monats ist,
// und verschickt in diesem Fall eine Push-Erinnerung an alle in Supabase
// gespeicherten Abonnements.
//
// WICHTIG: Die Umgebungsvariablen SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY und
// VAPID_PRIVATE_KEY müssen in den Vercel-Projekteinstellungen eingetragen
// sein (Settings -> Environment Variables), OHNE das VITE_-Präfix, damit sie
// nicht ins Frontend-Bundle gelangen, sondern nur serverseitig sichtbar sind.
// ----------------------------------------------------------------------------

const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

function isLastDayOfMonth(date) {
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  return tomorrow.getDate() === 1;
}

module.exports = async function handler(req, res) {
  // Optionaler Schutz: nur echte Vercel-Cron-Aufrufe akzeptieren, falls
  // CRON_SECRET gesetzt ist (empfohlen, siehe Vercel-Doku zu Cron Jobs).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers["authorization"];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const today = new Date();
  const forceTest = req.query?.force === "true";

  if (!isLastDayOfMonth(today) && !forceTest) {
    return res.status(200).json({
      skipped: true,
      reason: "Heute ist nicht der letzte Tag des Monats.",
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

  webpush.setVapidDetails(
    "mailto:info@hauser.com",
    vapidPublicKey,
    vapidPrivateKey,
  );

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const payload = JSON.stringify({
    title: "Stundenzettel-Erinnerung",
    body: "Heute ist der letzte Tag im Monat - bitte fuelle deinen Stundenzettel aus!",
    url: "/?screen=stundenzettel",
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints = [];

  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (err) {
      failed++;
      // Abgelaufene/ungültige Abonnements merken, um sie später zu löschen
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
    total: subs.length,
  });
};
