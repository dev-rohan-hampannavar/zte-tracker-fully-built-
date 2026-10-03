import type { TimeBlock } from "@/types/database";

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function localDateTime(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;
}

/** Builds a local-time iCalendar file for the user's planned blocks. */
export function buildTimeBlocksIcs(blocks: TimeBlock[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZTE Tracker//Execution OS//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:ZTE Execution OS",
  ];
  for (const block of blocks) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:zte-${block.id}@zerotoelite.site`,
      `DTSTAMP:${new Date(block.created_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART:${localDateTime(block.block_date, block.start_time)}`,
      `DTEND:${localDateTime(block.block_date, block.end_time)}`,
      `SUMMARY:${escapeText(block.title)}`,
      `CATEGORIES:${escapeText(block.block_type)}`,
      ...(block.notes ? [`DESCRIPTION:${escapeText(block.notes)}`] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
