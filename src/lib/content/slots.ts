const TIME_ZONE = "America/New_York";
const X_HOURS = [9, 13, 17, 21];
const LINKEDIN_SLOTS = [
  { weekday: 2, hour: 8 },
  { weekday: 2, hour: 14 },
  { weekday: 3, hour: 8 },
  { weekday: 3, hour: 14 },
  { weekday: 4, hour: 8 },
] as const;

type Channel = "linkedin" | "x";
type EtDay = { year: number; month: number; day: number; weekday: number };

const weekdayNumbers: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsFor(date: Date): Record<string, string> {
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
}

function etDayFor(date: Date): EtDay {
  const parts = partsFor(date);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayNumbers[parts.weekday ?? "Sun"] ?? 0,
  };
}

function etLocalToUtc(year: number, month: number, day: number, hour: number): Date {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));

  for (let i = 0; i < 4; i += 1) {
    const rendered = partsFor(candidate);
    const deltaMinutes =
      (year - Number(rendered.year)) * 525_600 +
      (month - Number(rendered.month)) * 43_200 +
      (day - Number(rendered.day)) * 1_440 +
      (hour - Number(rendered.hour)) * 60 -
      Number(rendered.minute);

    if (deltaMinutes === 0) break;
    candidate = new Date(candidate.getTime() + deltaMinutes * 60_000);
  }

  return candidate;
}

function addEtDays(day: EtDay, count: number): EtDay {
  const noon = etLocalToUtc(day.year, day.month, day.day, 12);
  return etDayFor(new Date(noon.getTime() + count * 86_400_000));
}

export function nextAvailableSlot(channel: Channel, after = new Date()): Date {
  const start = etDayFor(after);
  const candidates: Date[] = [];

  for (let offset = 0; offset < 21; offset += 1) {
    const day = addEtDays(start, offset);

    if (channel === "x") {
      for (const hour of X_HOURS) candidates.push(etLocalToUtc(day.year, day.month, day.day, hour));
    } else {
      for (const slot of LINKEDIN_SLOTS) {
        if (slot.weekday === day.weekday) {
          candidates.push(etLocalToUtc(day.year, day.month, day.day, slot.hour));
        }
      }
    }
  }

  const next = candidates.sort((a, b) => a.getTime() - b.getTime()).find((slot) => slot.getTime() > after.getTime());
  if (!next) throw new Error(`No ${channel} slot found after ${after.toISOString()}`);
  return next;
}
