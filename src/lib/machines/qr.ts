const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Machine labels encode a link to the report form, e.g. https://host/pl/tickets/new?m=<qr_token>,
// so a phone's own camera app opens the form with the machine selected. The in-app
// scanner accepts that link or a bare token.
export function parseMachineQr(text: string): string | null {
  const value = text.trim();
  if (UUID.test(value)) return value.toLowerCase();
  try {
    const token = new URL(value).searchParams.get("m");
    return token && UUID.test(token) ? token.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function machineQrUrl(origin: string, locale: string, token: string) {
  return `${origin}/${locale}/tickets/new?m=${token}`;
}
