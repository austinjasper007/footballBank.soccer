import { parsePhoneNumberFromString } from "libphonenumber-js";

export function formatPlayerPhone(phone, countryCode) {
  const value = typeof phone === "string" ? phone.trim() : "";
  if (!value) return "";

  const parsed = parsePhoneNumberFromString(value, countryCode || undefined);
  if (parsed) return parsed.formatInternational();

  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}
