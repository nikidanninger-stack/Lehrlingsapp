import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, nachricht, personalnummer } = req.body ?? {};
  if (!nachricht?.trim()) return res.status(400).json({ error: "Nachricht darf nicht leer sein." });

  const senderName = name?.trim() || "Anonym";

  // Supabase speichern (optional)
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
  } catch (_) {}

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const feedbackTo = process.env.FEEDBACK_TO || gmailUser;

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: "E-Mail-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD)." });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const pnr = personalnummer ? String(personalnummer) : "–";
  const datum = new Date().toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  await transporter.sendMail({
    from: `"LehrlingsApp Feedback" <${gmailUser}>`,
    to: feedbackTo,
    subject: `Neue Verbesserungsidee von ${senderName} (PNr. ${pnr})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Neue Verbesserungsidee / Wunsch</h2>
        <p><strong>Von:</strong> ${senderName}</p>
        <p><strong>Personalnummer:</strong> ${pnr}</p>
        <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="margin: 0; color: #1e3a5f; white-space: pre-wrap;">${nachricht.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Gesendet über die Hauser LehrlingsApp · ${datum}</p>
      </div>
    `,
  });

  return res.status(200).json({ success: true });
}
