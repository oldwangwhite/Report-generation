export function formatDateTimeMinute(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  const normalized = value.replace('T', ' ').replace(/\+.*$/, '').replace(/Z$/, '');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})/);
  return match ? `${match[1]} ${match[2]}:${match[3]}` : normalized;
}
