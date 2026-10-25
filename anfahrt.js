/* Klarglas: automatische Adresssuche und Anfahrtschätzung. Keine Standortabfrage. */
(() => {
  'use strict';
  // Öffentlicher Kartenbezug aus dem vom Betreiber bereitgestellten Maps-Link.
  // Kein Wohnort-/Startpunkt-Marker oder entsprechender Beschreibungstext.
  const MITTE = [52.46679, 13.58514];
  const VERSION = '2026-10-25-luftlinie-v1';
  const euro = (wert) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(wert);
  const kmText = (meter) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(meter / 1000);
  const entfernung = ([lat, lon]) => {
    const rad = Math.PI / 180;
    const a = Math.sin((lat - MITTE[0]) * rad / 2) ** 2
      + Math.cos(MITTE[0] * rad) * Math.cos(lat * rad) * Math.sin((lon - MITTE[1]) * rad / 2) ** 2;
    return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))));
  };
  const tarif = (meter) => meter <= 3000 ? 0 : meter <= 7000 ? 7 : meter <= 12000 ? 15 : 15 + Math.ceil((meter - 12000) / 1000) * 2;
  window.klarglasAnfahrt = (form) => {
    const input = form.querySelector('#adresse');
    const box = form.querySelector('[data-anfahrt]');
    if (!input || !box) return null;
    const status = box.querySelector('[data-anfahrt-status]');
    const ergebnis = box.querySelector('[data-anfahrt-ergebnis]');
    const cache = new Map();
    let gewaehlt = null;
    let timer = null, controller = null, lauf = 0;
    const info = (text) => { status.textContent = text; status.hidden = !text; };
    const refresh = () => {
      form.dispatchEvent(new CustomEvent('anfahrt:change'));
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    const abbrechen = () => {
      clearTimeout(timer);
      controller?.abort();
      lauf++;
      box.removeAttribute('aria-busy');
    };
    const verwerfen = () => {
      gewaehlt = null;
      ergebnis.hidden = true;
      ergebnis.textContent = '';
      refresh();
    };
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/str\.(?=\s|$)/g, 'strasse').replace(/[^a-z0-9]+/g, ' ').trim();
    const auswaehlen = (ort) => {
      abbrechen();
      const meter = entfernung(ort.punkt);
      const kosten = tarif(meter);
      const zone = meter <= 3000 ? ['blue', 'Blaue Zone · bis 3 km'] : meter <= 7000 ? ['purple', 'Lila Zone · über 3 bis 7 km'] : meter <= 12000 ? ['orange', 'Orange Zone · über 7 bis 12 km'] : ['extra', 'Außerhalb der 12-km-Zone'];
      // Eingabe bleibt unverändert, damit während des Tippens kein Text ersetzt wird.
      gewaehlt = { adresse: ort.adresse, eingabe: input.value.trim(), meter, kosten, version: VERSION, quelle: 'Photon / OpenStreetMap', methode: 'Luftlinie, auf Meter gerundet' };
      ergebnis.replaceChildren();
      ergebnis.dataset.zone = zone[0];
      const badge = document.createElement('span');
      badge.className = 'travel__badge';
      badge.textContent = zone[1];
      const preis = document.createElement('strong');
      preis.className = 'travel__amount';
      preis.textContent = kosten ? `${euro(kosten)} Anfahrt` : 'Kostenlose Anfahrt';
      const strecke = document.createElement('span');
      strecke.textContent = `${kmText(meter)} km Luftlinie${kosten ? ' · zusätzlich zum Leistungspreis, einmal pro Auftrag' : ''}`;
      ergebnis.append(badge, preis, strecke);
      ergebnis.hidden = false;
      info('');
      refresh();
    };
    const anzeigen = (orte) => {
      const q = norm(input.value);
      const plz = input.value.match(/\b\d{5}\b/)?.[0];
      // Keine Vermutung aus dem ersten Treffer: Straße, Hausnummer und ggf. PLZ müssen passen.
      const passend = orte.filter((ort) => {
        const adresseTeil = norm(`${ort.strasse} ${ort.hausnummer}`);
        return (` ${q} `).includes(` ${adresseTeil} `) && (!plz || ort.plz === plz);
      });
      if (passend.length === 1) { auswaehlen(passend[0]); return; }
      info(passend.length > 1
        ? 'Die Adresse ist noch nicht eindeutig. Bitte ergänzen Sie PLZ und Ort.'
        : 'Noch keine eindeutige Adresse erkannt. Bitte Straße, Hausnummer, PLZ und Ort vervollständigen. Ohne Treffer klären wir die Anfahrt persönlich.');
      refresh();
    };
    const suchen = async () => {
      const q = input.value.trim();
      if (q.length < 6 || !/\d/.test(q)) {
        info('Bitte Straße, Hausnummer, PLZ und Ort eingeben. Die Anfahrt wird automatisch berechnet.');
        return;
      }
      if (gewaehlt?.eingabe === q) return;
      if (cache.has(q)) { anzeigen(cache.get(q)); return; }
      controller = new AbortController();
      const signal = controller.signal;
      const id = ++lauf;
      const zeitlimit = setTimeout(() => controller?.signal === signal && controller.abort(), 10000);
      const url = new URL('https://photon.komoot.io/api/');
      url.search = new URLSearchParams({ q, lang: 'de', limit: '6', countrycode: 'DE', lat: String(MITTE[0]), lon: String(MITTE[1]) });
      info('Passende Adressen werden gesucht …');
      box.setAttribute('aria-busy', 'true');
      try {
        const antwort = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
        if (!antwort.ok) throw new Error('Adressdienst nicht erreichbar');
        const daten = await antwort.json();
        if (id !== lauf || q !== input.value.trim()) return;
        const gesehen = new Set();
        const orte = (Array.isArray(daten.features) ? daten.features : []).flatMap((f) => {
          const p = f.properties || {}, koordinaten = f.geometry?.coordinates;
          if (f.geometry?.type !== 'Point' || !Array.isArray(koordinaten) || koordinaten.length < 2 || !koordinaten.slice(0, 2).every(Number.isFinite)
            || Math.abs(koordinaten[0]) > 180 || Math.abs(koordinaten[1]) > 90
            || !p.street || !p.housenumber || !(p.city || p.town || p.village || p.postcode)) return [];
          const adresse = `${p.street} ${p.housenumber}, ${[p.postcode, p.city || p.town || p.village].filter(Boolean).join(' ')}`;
          if (gesehen.has(adresse)) return [];
          gesehen.add(adresse);
          return [{ adresse, strasse: p.street, hausnummer: p.housenumber, plz: p.postcode || '', punkt: [koordinaten[1], koordinaten[0]] }];
        });
        cache.set(q, orte);
        anzeigen(orte);
      } catch (fehler) {
        if (id === lauf) info('Die Adresssuche ist gerade nicht verfügbar. Ihre Anfrage bleibt möglich; wir klären die Anfahrt persönlich.');
      } finally {
        clearTimeout(zeitlimit);
        if (id === lauf) box.removeAttribute('aria-busy');
      }
    };
    input.addEventListener('input', () => {
      abbrechen();
      verwerfen();
      info('Adresse wird nach Ihrer Eingabe gesucht …'); timer = setTimeout(suchen, 900);
    });
    form.addEventListener('reset', () => setTimeout(() => {
      abbrechen(); verwerfen();
      cache.clear();
      info('Geben Sie Ihre vollständige Adresse ein. Die Anfahrt wird automatisch berechnet.');
    }));
    if (input.value.trim()) timer = setTimeout(suchen, 900);
    return {
      wert: () => gewaehlt && gewaehlt.eingabe === input.value.trim() ? { ...gewaehlt } : null,
      text: () => gewaehlt && gewaehlt.eingabe === input.value.trim()
        ? `${euro(gewaehlt.kosten)} zusätzlich · ${kmText(gewaehlt.meter)} km Luftlinie · einmal pro Auftrag`
        : 'Noch offen – wir klären die Anfahrtskosten vor der Auftragsbestätigung.',
    };
  };
})();
