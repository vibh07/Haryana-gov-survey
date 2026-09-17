// api/send-notification.js
// Vercel serverless function — this is what customerapp.html's
// sendPushToCustomer() calls. It holds the OneSignal REST API Key (a
// secret that must NEVER sit in customerapp.html, since anyone could open
// dev tools and read it) and forwards the request to OneSignal's own API.
//
// SETUP (do this in the Vercel dashboard, not in code):
//   1. Project → Settings → Environment Variables → add:
//        ONESIGNAL_APP_ID        = the same App ID used in customerapp.html
//        ONESIGNAL_REST_API_KEY  = OneSignal dashboard → Settings → Keys & IDs → REST API Key
//   2. Redeploy after adding the variables (Vercel only picks them up on a
//      fresh deployment, not on an already-running one).
//   3. Place this file at:  api/send-notification.js   (project root, exactly
//      this path — Vercel only turns files under /api into routes).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { externalId, title, message } = req.body || {};
  if (!externalId || !title || !message) {
    return res.status(400).json({ error: 'externalId, title and message are all required' });
  }

  const APP_ID = process.env.ONESIGNAL_APP_ID;
  const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!APP_ID || !REST_API_KEY) {
    console.error('Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY environment variable');
    return res.status(500).json({ error: 'Server is not configured with OneSignal credentials' });
  }

  try {
    const osRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        // Targets the same external_id OneSignal.login(custId) tagged this
        // customer's browser/device with on the client side.
        include_aliases: { external_id: [String(externalId)] },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: message }
      })
    });

    const data = await osRes.json().catch(() => ({}));

    if (!osRes.ok) {
      console.error('OneSignal API error', osRes.status, data);
      return res.status(osRes.status).json({ error: 'OneSignal rejected the request', details: data });
    }

    // recipients === 0 is the single most common "silently didn't arrive"
    // case: the request succeeded but nobody with that external_id/opted-in
    // subscription was found (e.g. login() hadn't finished syncing yet).
    if (data.recipients === 0) {
      console.warn('OneSignal accepted the request but found 0 recipients for', externalId);
    }

    return res.status(200).json({ ok: true, recipients: data.recipients ?? 0, id: data.id });
  } catch (e) {
    console.error('Failed to reach OneSignal', e);
    return res.status(502).json({ error: 'Could not reach OneSignal' });
  }
}
