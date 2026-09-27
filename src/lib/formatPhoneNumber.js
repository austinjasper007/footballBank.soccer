import { getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";

export function formatPhoneNumber(phone, countryCode) {
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  if (!normalizedPhone) return "-";

  const parsedPhone = parsePhoneNumberFromString(
    normalizedPhone,
    countryCode || undefined,
  );
  if (parsedPhone) return parsedPhone.formatInternational();
  if (normalizedPhone.startsWith("+") || !countryCode) return normalizedPhone;

  try {
    return `+${getCountryCallingCode(countryCode)} ${normalizedPhone}`;
  } catch {
    return normalizedPhone;
  }
}