// Jeden wspólny format lokalizacji mat:
//   regał:  "REGAŁ-RZĄD"            np. "A-1"
//           "REGAŁ-RZĄD-RURA"       np. "2-1-7"
//           "REGAŁ-RZĄD-OD-DO"      np. "2-1-7-12" (zakres rur 7–12)
//   inne:   dowolny tekst bez zmian np. "PALETA", "KASA", "SPEC"
// Wszystkie stare zapisy rur ("7,,12", "7,12", "7, 12", "7-12") oznaczają zakres od–do.

(function (root) {
  const RACK_RE = /^\s*(\d+|[A-Za-z])\s*-\s*(\d+)\s*(?:-\s*([\d\s,-]*?))?\s*(?:-\s*rega[łl]\s*)?$/i;

  function buildCanonical(rack, row, pipeFrom, pipeTo) {
    rack = String(rack ?? '').trim().toUpperCase();
    row = String(row ?? '').trim();
    let from = String(pipeFrom ?? '').trim();
    let to = String(pipeTo ?? '').trim();

    if (!rack && !row && !from && !to) return '';

    if (from && to) {
      let a = parseInt(from, 10);
      let b = parseInt(to, 10);
      if (a > b) [a, b] = [b, a];
      from = String(a);
      to = a === b ? '' : String(b);
    } else if (!from && to) {
      from = to;
      to = '';
    }

    return [rack, row, from, to].filter(Boolean).join('-');
  }

  // Zwraca { type: 'rack', rack, row, pipeFrom, pipeTo } albo { type: 'other', text }
  function parseLocation(location) {
    const raw = String(location ?? '').trim();
    if (!raw) return { type: 'rack', rack: '', row: '', pipeFrom: '', pipeTo: '' };

    const match = raw.match(RACK_RE);
    if (!match) return { type: 'other', text: raw };

    const [, rack, row, pipesPart] = match;
    const pipes = (pipesPart || '').match(/\d+/g) || [];

    if (pipesPart && pipesPart.replace(/[\s,-]/g, '') !== '' && pipes.length === 0) {
      return { type: 'other', text: raw };
    }

    const nums = pipes.map(n => parseInt(n, 10));
    const from = nums.length ? Math.min(...nums) : '';
    const to = nums.length > 1 ? Math.max(...nums) : '';

    return {
      type: 'rack',
      rack: rack.toUpperCase(),
      row: String(parseInt(row, 10)),
      pipeFrom: from === '' ? '' : String(from),
      pipeTo: to === '' || to === from ? '' : String(to)
    };
  }

  function normalizeLocation(location) {
    const parsed = parseLocation(location);
    if (parsed.type === 'other') return parsed.text;
    return buildCanonical(parsed.rack, parsed.row, parsed.pipeFrom, parsed.pipeTo);
  }

  // Czytelny opis bez ikon, np. "Regał 2 → Rząd 1 → Rury 7–12"
  function describeLocation(location) {
    const parsed = parseLocation(location);
    if (parsed.type === 'other') return parsed.text;
    if (!parsed.rack && !parsed.row) return '';

    let text = `Regał ${parsed.rack} → Rząd ${parsed.row}`;
    if (parsed.pipeFrom && parsed.pipeTo) text += ` → Rury ${parsed.pipeFrom}–${parsed.pipeTo}`;
    else if (parsed.pipeFrom) text += ` → Rura ${parsed.pipeFrom}`;
    return text;
  }

  const api = { parseLocation, buildCanonical, normalizeLocation, describeLocation };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocationFormat = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
