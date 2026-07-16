import { getSupabaseClient } from "../lib/supabase";

// ----------------------------------------------------------------------------
// Push-Benachrichtigungen
//
// Registriert das aktuelle Gerät für Web Push, sofern der Nutzer zustimmt,
// und speichert das Abonnement in Supabase (Tabelle push_subscriptions),
// verknüpft mit der Personalnummer. Ein separater, serverseitiger Prozess
// (Vercel Cron / Supabase Edge Function) verschickt später am Monatsletzten
// die eigentliche Push-Nachricht an alle gespeicherten Abonnements.
//
// WICHTIG: Push funktioniert nur, wenn:
// - der Browser Push/Service Worker unterstützt (praktisch alle modernen)
// - auf iOS: die App zum Home-Bildschirm hinzugefügt wurde (installierte PWA)
// - der Nutzer die Berechtigungsanfrage explizit erlaubt
// ----------------------------------------------------------------------------

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

export const isPushSupported =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

// Wandelt den Base64-URL-kodierten VAPID-Key in ein Uint8Array um
// (von der Push API so gefordert). Rückgabetyp explizit als ArrayBuffer
// gebacktes Uint8Array, damit TypeScript es als gültigen BufferSource für
// applicationServerKey akzeptiert.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionResult =
  | "not-supported"
  | "not-configured"
  | "granted"
  | "denied"
  | "error";

/**
 * Fragt den Nutzer nach Erlaubnis für Push-Benachrichtigungen und speichert
 * bei Zustimmung das Abonnement in Supabase, verknüpft mit der Personalnummer.
 */
export async function requestPushPermissionAndSubscribe(
  personalnummer: string,
): Promise<PushPermissionResult> {
  if (!isPushSupported) return "not-supported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) return "error";

    const supabase = getSupabaseClient();
    if (!supabase) return "not-configured";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        personalnummer,
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      console.error("Push-Abonnement konnte nicht gespeichert werden:", error);
      return "error";
    }

    return "granted";
  } catch (err) {
    console.error("Push-Registrierung fehlgeschlagen:", err);
    return "error";
  }
}

/**
 * Meldet das aktuelle Gerät von Push-Benachrichtigungen ab (z.B. beim Logout
 * oder auf Wunsch des Nutzers) und entfernt den Eintrag aus Supabase.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
  } catch (err) {
    console.error("Push-Abmeldung fehlgeschlagen:", err);
  }
}

/**
 * Prüft, ob für dieses Gerät bereits eine aktive Push-Berechtigung besteht.
 */
export async function getCurrentPushStatus(): Promise<
  "granted" | "denied" | "default" | "not-supported"
> {
  if (!isPushSupported) return "not-supported";
  return Notification.permission;
}
