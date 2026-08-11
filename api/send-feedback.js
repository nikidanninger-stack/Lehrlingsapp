// api/send-feedback.js
// Vercel Serverless Function – Empfängt Feedback-Formulare und schickt
// sie als E-Mail an niki.danninger@gmail.com.
//
// Benötigte Umgebungsvariablen in Vercel:
//   GMAIL_USER        = niki.danninger@gmail.com
//   GMAIL_APP_PASSWORD = xxxx xxxx xxxx xxxx  (Google App-Passwort)
//
// Wie App-Passwort erstellen:
//   myaccount.google.com → Sicherheit → 2-Schritt-Verifizierung → App-Passwörter

import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // CORS – erlaubt Aufrufe vom Vercel-Frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, nachricht, personalnummer } = req.body ?? {};

  if (!nachricht?.trim()) {
    return res.status(400).json({ error: "Nachricht darf nicht leer sein." });
  }

  const senderName = name?.trim() || "Anonym";

  // ── 1. In Supabase speichern (optional – falls Tabelle existiert) ──────
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("verbesserungen").insert({
        name: name?.trim() || null,
        nachricht: nachricht.trim(),
        personalnummer: personalnummer ?? null,
        eingereicht_am: new Date().toISOString(),
      });
    }
  } catch (_) {
    // Supabase-Fehler ignorieren – E-Mail wird trotzdem gesendet
  }

  // ── 2. E-Mail senden ───────────────────────────────────────────────────
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return res
      .status(500)
      .json({ error: "E-Mail-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD)." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"LehrlingsApp Feedback" <${gmailUser}>`,
    to: "niki.danninger@gmail.com",
    subject: `💡 Neue Verbesserungsidee – ${senderName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">💡 Neue Verbesserungsidee / Wunsch</h2>
        <p><strong>Von:</strong> ${senderName}</p>
        <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="margin: 0; color: #1e3a5f; white-space: pre-wrap;">${nachricht.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
          Gesendet über die Hauser LehrlingsApp · ${new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    `,
  });

  return res.status(200).json({ success: true });
}
