// WhatsApp without any WhatsApp service: a wa.me link opens the shopkeeper's own WhatsApp with the
// message already typed. Nothing is sent until they press send there. No cost.

// A Pakistani number in any style (0300-1234567, +92 300 1234567, 3001234567) -> "923001234567".
// null = no usable number, so WhatsApp lets the shopkeeper choose who to send to.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('92') && d.length === 12) return d;
  if (d.startsWith('0') && d.length === 11) return `92${d.slice(1)}`;
  if (d.startsWith('3') && d.length === 10) return `92${d}`;
  if (!d.startsWith('0') && d.length >= 11 && d.length <= 15) return d; // a number from another country
  return null;
}

export function whatsappUrl(phone: string | null | undefined, text: string): string {
  return `https://wa.me/${normalizePhone(phone) ?? ''}?text=${encodeURIComponent(text)}`;
}

// The phone's own messages app with the text already typed (for a customer who is not on WhatsApp).
// Nothing is sent until the shopkeeper presses send there. No cost from us (their own SMS plan applies).
export function smsUrl(phone: string | null | undefined, text: string): string {
  const number = normalizePhone(phone);
  return `sms:${number ? `+${number}` : ''}?body=${encodeURIComponent(text)}`;
}

// Must be called straight from a tap, or the phone may block the new window.
// On an Android phone the WhatsApp app is opened directly on the chat (no web page, no "open with" question).
// If the app does not take over within a moment, the normal wa.me link is opened instead.
export function openWhatsApp(url: string) {
  const parts = /^https:\/\/wa\.me\/(\d*)\?text=(.*)$/.exec(url);
  if (!parts || typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent)) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  let left = false;
  const onChange = () => {
    if (document.visibilityState === 'hidden') left = true;
  };
  document.addEventListener('visibilitychange', onChange);
  window.location.href = `whatsapp://send?${parts[1] ? `phone=${parts[1]}&` : ''}text=${parts[2]}`;
  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onChange);
    if (!left && document.visibilityState === 'visible') window.open(url, '_blank', 'noopener');
  }, 1500);
}
