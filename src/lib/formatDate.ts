export function formatDate(d: string, locale: string = "en") {
  const date = Temporal.PlainDate.from(d);
  return date.toLocaleString(locale, { month: "short", day: "numeric", year: "numeric" });
}
