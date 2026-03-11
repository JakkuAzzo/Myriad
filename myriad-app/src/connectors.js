function toIsoFromTelegram(rawDate) {
  if (!rawDate) {
    return new Date().toISOString();
  }

  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

function parseWhatsAppExport(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const events = [];
  const lineRegex =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*(\d{1,2}:\d{2})(?:\s?(AM|PM))?\s*-\s*([^:]+):\s*(.*)$/i;

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) {
      continue;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    let hourMinute = match[4];
    const ampm = match[5] ? match[5].toUpperCase() : null;
    const sender = match[6].trim();
    const message = match[7].trim();

    if (year < 100) {
      year += 2000;
    }

    if (ampm) {
      const [hRaw, mRaw] = hourMinute.split(':').map(Number);
      let h = hRaw;
      if (ampm === 'PM' && h < 12) {
        h += 12;
      }
      if (ampm === 'AM' && h === 12) {
        h = 0;
      }
      hourMinute = `${String(h).padStart(2, '0')}:${String(mRaw).padStart(2, '0')}`;
    }

    const occurredAt = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${hourMinute}:00`);

    events.push({
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date().toISOString() : occurredAt.toISOString(),
      source: 'chat',
      category: 'messaging',
      durationMinutes: 1,
      sentiment: null,
      topic: message.split(' ').slice(0, 4).join(' ').slice(0, 80),
      identifier: sender,
      metadata: JSON.stringify({
        connector: 'whatsapp',
        messageLength: message.length,
      }),
    });
  }

  return events;
}

function parseTelegramExport(jsonText) {
  const parsed = JSON.parse(String(jsonText || '{}'));
  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

  const events = [];
  for (const msg of messages) {
    if (!msg || msg.type !== 'message') {
      continue;
    }

    const text = typeof msg.text === 'string' ? msg.text : Array.isArray(msg.text) ? msg.text.map((t) => (typeof t === 'string' ? t : t.text || '')).join(' ') : '';

    events.push({
      occurredAt: toIsoFromTelegram(msg.date),
      source: 'chat',
      category: 'messaging',
      durationMinutes: 1,
      sentiment: null,
      topic: text.split(' ').slice(0, 4).join(' ').slice(0, 80),
      identifier: msg.from || parsed.name || 'telegram-user',
      metadata: JSON.stringify({
        connector: 'telegram',
        messageId: msg.id || null,
        messageLength: text.length,
      }),
    });
  }

  return events;
}

function parseBrowserHistoryImport(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return [];
  }

  let rows;
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    rows = Array.isArray(parsed) ? parsed : parsed.history || [];
  } else {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(',').map((x) => x.trim().toLowerCase());
    rows = lines.slice(1).map((line) => {
      const cols = line.split(',');
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] || '').trim();
      });
      return row;
    });
  }

  const events = [];
  for (const row of rows) {
    const url = row.url || row.link || '';
    const title = row.title || row.page_title || '';
    const occurredAtRaw = row.visitTime || row.visited_at || row.lastVisitTime || row.timestamp;
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

    events.push({
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date().toISOString() : occurredAt.toISOString(),
      source: 'browser',
      category: 'browsing',
      durationMinutes: Number(row.durationMinutes || row.duration || 1) || 1,
      sentiment: null,
      topic: title.slice(0, 80),
      identifier: url,
      metadata: JSON.stringify({
        connector: 'browser-history',
        url,
      }),
    });
  }

  return events;
}

module.exports = {
  parseWhatsAppExport,
  parseTelegramExport,
  parseBrowserHistoryImport,
};
