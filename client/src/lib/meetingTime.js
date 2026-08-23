export function formatMeetingDateTime(date, time) {
  if (!date && !time) return "";
  if (!date) return time ? `${time} EST` : "";
  if (!time) return date;
  return `${date} at ${time} EST`;
}