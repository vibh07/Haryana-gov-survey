/* ================= ADMIN → SEND PUSH NOTIFICATION =================
   Paste this into deliverychart.html (the admin app) wherever order/
   delivery status changes — e.g. right after you mark a customer's
   delivery "Out for delivery" or "Delivered" for today.

   `custId` = the same Firebase key under customers/{custId} that
   customerapp.html already uses everywhere (rec.id / the push key from
   your customers ref) — that's exactly the id OneSignal.login() tagged
   the customer's device with, so this will reach the right phone.

   Example call sites you likely already have in deliverychart.html:
     - when you toggle a delivery boy's status to "on the way"
     - when you mark a specific customer's today delivery as done
*/async function sendPushToCustomer(custId, title, message) {
  if (!custId) return;
  try {
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalId: custId, title, message })
    });
  } catch (e) {
    console.error('Push notification send failed', e);
  }
}

/* ---- Example usage ---- */

// When a delivery partner starts their round:
// sendPushToCustomer(custId, "Out for delivery 🚴", "Your fresh delivery is on the way!");

// When a delivery is marked complete for today:
// sendPushToCustomer(custId, "Delivered ✅", "Your order has been delivered. Enjoy!");

// When a delivery is rejected/skipped:
// sendPushToCustomer(custId, "Delivery update", "Today's delivery couldn't be completed — we'll follow up.");