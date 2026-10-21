const KONTAKT_MAIL = "info@klarglas-berlin.de";
const MAIL_ZIEL = `https://formsubmit.co/ajax/${KONTAKT_MAIL}`;
// Öffentliche Supabase-Anbindung für Anfragen und verfügbare Termine.
const INTERN = { url: "https://iwkklvjfftrjembrgnwv.supabase.co", schluessel: "sb_publishable_rSlCwQ_qWRGCEGLMfKkwzA_RrOjl5xG" };

const root = document.documentElement;
const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)");
// Wird von der Kopfzeile gesetzt, damit Lenis sie im selben Bild wie den Inhalt bewegt
let kopfNachziehen = null;
let lenis = null;

/* ========== Kern: funktioniert auch ohne Animationsbibliothek ========== */

/* ---------- Menü ---------- */

const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-open]");

const scrollSperren = (an) => {
  if (lenis) an ? lenis.stop() : lenis.start();
  else document.body.style.overflow = an ? "hidden" : "";
};

if (menu && menuToggle) {
  const hintergrund = [document.querySelector("main"), document.querySelector(".footer")];
  const fokussierbar = () => menu.querySelectorAll("a[href], button:not([disabled])");

  menu.querySelectorAll("a").forEach((link, i) => link.style.setProperty("--i", i));

  const oeffnen = () => {
    menu.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    scrollSperren(true);
    hintergrund.forEach((el) => el && el.setAttribute("inert", ""));
    // erst nach dem nächsten Frame fokussieren, sonst ist das Menü noch unsichtbar
    requestAnimationFrame(() => fokussierbar()[0].focus());
  };

  const schliessen = ({ fokusZurueck = true } = {}) => {
    menu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    scrollSperren(false);
    hintergrund.forEach((el) => el && el.removeAttribute("inert"));
    if (fokusZurueck) menuToggle.focus();
  };

  menuToggle.addEventListener("click", oeffnen);
  menu.querySelector("[data-menu-close]").addEventListener("click", () => schliessen());
  // läuft vor dem Anker-Handler am Dokument, damit das Scrollen nicht gesperrt ist
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) schliessen({ fokusZurueck: false });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) schliessen();
  });

  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const elemente = [...fokussierbar()];
    const erstes = elemente[0];
    const letztes = elemente[elemente.length - 1];

    if (event.shiftKey && document.activeElement === erstes) {
      event.preventDefault();
      letztes.focus();
    } else if (!event.shiftKey && document.activeElement === letztes) {
      event.preventDefault();
      erstes.focus();
    }
  });
}

/* ---------- Ankerlinks: weich scrollen, Fokus mitnehmen ---------- */

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.classList.contains("skip-link")) return;

  const hash = link.getAttribute("href");
  const ziel = hash.length > 1 && document.querySelector(hash);
  if (!ziel) return;

  event.preventDefault();

  // Abstand zur Kopfzeile kommt in beiden Fällen aus scroll-padding-top im CSS
  if (lenis) lenis.scrollTo(ziel, { duration: 1.1 });
  else ziel.scrollIntoView({ behavior: reduziert.matches ? "auto" : "smooth" });

  history.pushState(null, "", hash);
  if (!ziel.hasAttribute("tabindex")) ziel.setAttribute("tabindex", "-1");
  ziel.focus({ preventScroll: true });
});

/* ---------- Kopfzeile: oben großes Logo, beim Scrollen kompakt ---------- */

const kopfzeile = document.querySelector(".masthead");

if (kopfzeile) {
  const marke = kopfzeile.querySelector(".masthead__brand");
  const nebenan = [...kopfzeile.querySelectorAll(".navlinks, .masthead__cta")];
  const breit = window.matchMedia("(min-width: 900px)");
  const heroFlaeche = document.querySelector(".hero");
  let geplant = false;

  // Auf der Startseite zieht sich die Kopfzeile genau so lange zusammen,
  // wie die weiße Fläche braucht, um über das Hero-Bild zu fahren.
  const strecke = () => (heroFlaeche ? heroFlaeche.offsetHeight : 160);

  const kopfSetzen = () => {
    geplant = false;
    const y = window.scrollY;

    // Reduzierte Bewegung: kein Mitwachsen, nur ein Wechsel zwischen zwei Größen
    if (reduziert.matches) {
      kopfzeile.classList.toggle("is-kompakt", y > 72);
      [marke, ...nebenan].forEach((el) => el && el.style.removeProperty("scale"));
      return;
    }

    const anteil = Math.min(Math.max(y / strecke(), 0), 1);
    const kleinstes = breit.matches ? 0.8 : 0.92;
    if (marke) marke.style.scale = (1 - (1 - kleinstes) * anteil).toFixed(4);
    nebenan.forEach((el) => {
      el.style.scale = breit.matches ? (0.92 + 0.08 * anteil).toFixed(4) : "";
    });
  };

  const kopfPlanen = () => {
    // Mit Lenis kommt das Signal direkt aus dessen Takt (siehe bewegungStarten).
    // Über das native Scroll-Ereignis käme es ein Bild zu spät, und das Logo
    // würde dem Inhalt sichtbar hinterherhinken.
    if (lenis || geplant) return;
    geplant = true;
    requestAnimationFrame(kopfSetzen);
  };

  kopfNachziehen = kopfSetzen;
  window.addEventListener("scroll", kopfPlanen, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(kopfSetzen));
  kopfSetzen();
}

/* ---------- Aktionsleiste: erst nach dem Hero, nie über einem Eingabefeld ---------- */

const actionbar = document.querySelector(".actionbar");
const hero = document.querySelector(".hero");
let imHero = Boolean(hero);
let feldFokus = false;

const leisteAktualisieren = () => {
  if (!actionbar) return;
  actionbar.classList.toggle("is-visible", !imHero);
  actionbar.classList.toggle("is-hidden", feldFokus);
};

if (actionbar && hero) {
  new IntersectionObserver(
    ([eintrag]) => {
      imHero = eintrag.isIntersecting && eintrag.intersectionRatio > 0.2;
      leisteAktualisieren();
    },
    { threshold: [0, 0.2, 0.6, 1] }
  ).observe(hero);
}

/* ---------- Formular ---------- */

const PREIS_MINDEST = 25;
// Gleiche Mengen und Preise für Anzeige, E-Mail und Terminnotizen.
const fensterAnzahl = (wert) => Math.min(99, Math.max(0, parseInt(wert, 10) || 0));
const fensterPreis = (normal, boden) => fensterAnzahl(normal) * 5 + fensterAnzahl(boden) * 10;
// Bei diesen Leistungen geht es nur um Fenster – dort gilt der Mindestauftrag
const NUR_FENSTER = ["Fensterreinigung"];
// Bei diesen Leistungen spielen Fenster keine Rolle – der Zähler wird ausgegraut
const OHNE_FENSTER = ["Nachbarschaftshilfe"];

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const datumLang = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

const datumAus = (iso) => {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
};
const isoAus = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const inTagen = (tage) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + tage);
  return d;
};
const datumKurz = (d) => `${WOCHENTAGE[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
const terminLesbar = (wert) => (wert ? datumLang.format(datumAus(wert)) : "");

// Baut aus den Formularangaben die E-Mail, die bei uns im Postfach landet.
const anfrageNachricht = (daten) => {
  const name = daten.name.trim();
  const telefon = daten.telefon.trim();
  const nachricht = daten.nachricht.trim();
  const normal = fensterAnzahl(daten.fenster_normal);
  const boden = fensterAnzahl(daten.fenster_bodentief);
  const schaetzung = fensterPreis(normal, boden);
  const tag = terminLesbar(daten.termin);
  const uhrzeit = daten.uhrzeit || "";
  const termin = [tag, uhrzeit].filter(Boolean).join(" ");

  let terminKurz = "";
  if (daten.termin) {
    const d = datumAus(daten.termin);
    terminKurz = daten.termin === isoAus(inTagen(1)) ? `Morgen, ${datumKurz(d)}` : datumKurz(d);
  }

  const text = [
    `${name} fragt über die Website an: ${daten.leistung}.`,
    `Adresse: ${daten.adresse.trim()}.`,
    normal + boden
      ? `Fenster: ${normal} normale, ${boden} bodentiefe · Schätzung ${schaetzung} €.`
      : "Eine Fensteranzahl hat die Person nicht angegeben.",
    termin ? `Wunschtermin: ${termin}.` : "Einen Wunschtermin hat die Person nicht angegeben.",
    telefon
      ? `Erreichbar per E-Mail an ${daten.email} oder telefonisch unter ${telefon}.`
      : `Erreichbar per E-Mail an ${daten.email}.`,
    nachricht ? `Nachricht: „${nachricht}“` : "Eine zusätzliche Nachricht gibt es nicht.",
    "",
    `Wer auf diese E-Mail antwortet, schreibt direkt an ${name}.`,
    daten.werbewunsch ? `\n${werbewunschText(daten)}` : "",
  ].join("\n");

  return {
    Anfrage: text,
    Name: name,
    "E-Mail": daten.email,
    Telefon: telefon || "–",
    Adresse: daten.adresse.trim(),
    Leistung: daten.leistung,
    Fenster: normal + boden ? `${normal} normale, ${boden} bodentiefe` : "–",
    Schätzung: normal + boden ? `${schaetzung} €` : "–",
    Wunschtermin: termin || "–",
    Nachricht: nachricht || "–",
    Betreff: `Neue Anfrage: ${daten.leistung} – ${name}${terminKurz ? ` (${terminKurz})` : ""}`,
  };
};

/* Fenster-Zähler mit Preis-Schätzung */
function fensterZaehler(form) {
  const box = form.querySelector("[data-fenster]");
  if (!box) return null;

  const zeilen = [...box.querySelectorAll("[data-stepper]")].map((zeile) => ({
    zeile,
    preis: Number(zeile.dataset.preis),
    feld: zeile.querySelector(".stepper__input"),
    minus: zeile.querySelector('[data-schritt="-1"]'),
  }));
  const leer = box.querySelector("[data-schaetzung-leer]");
  const summeZeile = box.querySelector("[data-schaetzung-summe]");
  const wert = box.querySelector("[data-schaetzung-wert]");
  const hinweis = box.querySelector("[data-mindest]");
  let angezeigt = 0;
  let takt = 0;

  const anzahl = (feld) => fensterAnzahl(feld.value);
  const summe = () => zeilen.reduce((s, z) => s + anzahl(z.feld) * z.preis, 0);
  const unterMindest = () => summe() > 0 && summe() < PREIS_MINDEST;

  // Die Zahl zählt kurz hoch, statt zu springen (unter 0,3 s, ease-out)
  const zeigen = (ziel) => {
    cancelAnimationFrame(takt);
    if (reduziert.matches || document.hidden || angezeigt === ziel) {
      angezeigt = ziel;
      wert.textContent = ziel;
      return;
    }
    const start = angezeigt;
    const beginn = performance.now();
    const schritt = (jetzt) => {
      const t = Math.min((jetzt - beginn) / 240, 1);
      angezeigt = Math.round(start + (ziel - start) * (1 - (1 - t) ** 3));
      wert.textContent = angezeigt;
      if (t < 1) takt = requestAnimationFrame(schritt);
    };
    takt = requestAnimationFrame(schritt);
  };

  const aktualisieren = () => {
    const s = summe();
    zeilen.forEach((z) => {
      const n = anzahl(z.feld);
      z.minus.setAttribute("aria-disabled", String(n === 0));
      z.zeile.classList.toggle("is-aktiv", n > 0);
    });
    leer.hidden = s > 0;
    summeZeile.hidden = s === 0;
    zeigen(s);

    const warnen = !box.disabled && unterMindest();
    hinweis.textContent = `Der Mindestauftrag liegt bei ${PREIS_MINDEST} €. Ergänzen Sie Fenster, bis die Schätzung mindestens ${PREIS_MINDEST} € beträgt.`;
    hinweis.hidden = !warnen;
    zeilen.forEach((z) => {
      if (warnen) z.feld.setAttribute("aria-describedby", hinweis.id);
      else z.feld.removeAttribute("aria-describedby");
    });
  };

  zeilen.forEach((z) => {
    z.zeile.addEventListener("click", (event) => {
      const knopf = event.target.closest("[data-schritt]");
      if (!knopf || knopf.getAttribute("aria-disabled") === "true") return;
      z.feld.value = Math.min(99, Math.max(0, anzahl(z.feld) + Number(knopf.dataset.schritt)));
      aktualisieren();
    });
    z.feld.addEventListener("input", aktualisieren);
    z.feld.addEventListener("blur", () => {
      z.feld.value = anzahl(z.feld);
      aktualisieren();
    });
  });

  // Nachbarschaftshilfe: Der Fenster-Zähler wird ausgegraut.
  // Ein deaktiviertes fieldset schickt seine Werte auch nicht mit.
  const leistung = form.querySelector("#leistung");
  const leistungPruefen = () => {
    const aus = OHNE_FENSTER.includes(leistung.value);
    box.disabled = aus;
    box.classList.toggle("is-aus", aus);
    aktualisieren();
  };
  if (leistung) leistung.addEventListener("change", leistungPruefen);

  form.addEventListener("reset", () =>
    setTimeout(() => {
      aktualisieren();
      leistungPruefen();
    })
  );
  aktualisieren();
  leistungPruefen();

  const normalisieren = () => {
    zeilen.forEach((z) => { z.feld.value = anzahl(z.feld); });
    aktualisieren();
  };
  return { unterMindest, normalisieren, erstesFeld: zeilen[0].feld, hinweis };
}

// Freiwillige Kanalwahl nur als unbestätigten Anmeldewunsch erfassen.
// Das spätere Versandtool muss den jeweiligen Kanal bestätigen und Widerrufe beachten.
function werbewunschErfassen(form, daten) {
  const box = form.querySelector(".form__consent");
  if (!box) return;
  const kanaele = ["email", "whatsapp"].filter((kanal) =>
    form.querySelector(`[data-werbung-kanal="${kanal}"]`)?.checked
  );
  if (!kanaele.length) return;
  const wortlaut = kanaele.map((kanal) => ({
    kanal,
    text: box.querySelector(`[data-werbung-text="${kanal}"]`).textContent.trim(),
  }));
  const hinweis = form.querySelector("#werbung-hinweis").textContent.replace(/\s+/g, " ").trim();
  daten.werbewunsch = {
    status: "bestaetigung_ausstehend",
    kanaele,
    version: box.dataset.werbungVersion,
    formular_url: window.location.origin + window.location.pathname,
    client_zeitpunkt: new Date().toISOString(),
    wortlaut,
    hinweis,
  };
}

function werbewunschText(daten) {
  const wunsch = daten.werbewunsch;
  if (!wunsch) return "Keine Werbe-Anmeldung über dieses Formular. Frühere Widerrufe oder Einwilligungen werden dadurch nicht geändert.";
  return [
    "Werbe-Anmeldung: Bestätigung ausstehend – noch nicht für Werbung freigegeben.",
    `Gewählte Kanäle: ${wunsch.kanaele.join(", ")}`,
    `Textversion: ${wunsch.version}`,
    `Formular: ${wunsch.formular_url}`,
    `Zeitpunkt laut Browser (UTC, nicht serverseitig bestätigt): ${wunsch.client_zeitpunkt}`,
    ...wunsch.wortlaut.map((eintrag) => `${eintrag.kanal}: ${eintrag.text}`),
    `Hinweis: ${wunsch.hinweis}`,
  ].join("\n");
}

function dashboardNachricht(daten) {
  const nachricht = daten.nachricht.trim();
  if (!daten.werbewunsch) return nachricht;
  // Vorhandenes Nachrichtenfeld verwenden: keine unbekannten Datenbankspalten voraussetzen.
  return [nachricht, "--- Freiwilliger Werbe-Anmeldewunsch ---", werbewunschText(daten)].filter(Boolean).join("\n\n");
}

// Pro Absenden genau eine Anfrage; Erfolg erst nach Bestätigung durch Supabase.
async function ansDashboard(daten) {
  if (!INTERN.url || !INTERN.schluessel) throw new Error("Anbindung fehlt");
  const abbruch = new AbortController();
  const zeitlimit = setTimeout(() => abbruch.abort(), 15000);
  try {
    const antwort = await fetch(`${INTERN.url}/rest/v1/anfragen`, {
      method: "POST",
      credentials: "omit",
      headers: {
        apikey: INTERN.schluessel,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      signal: abbruch.signal,
      body: JSON.stringify({
        daten: {
          name: daten.name.trim(),
          email: daten.email.trim(),
          telefon: daten.telefon.trim(),
          adresse: daten.adresse.trim(),
          leistung: daten.leistung,
          fenster_normal: fensterAnzahl(daten.fenster_normal),
          fenster_boden: fensterAnzahl(daten.fenster_bodentief),
          nachricht: dashboardNachricht(daten),
          termin_start: daten.termin_start || "",
        },
      }),
    });
    if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
  } finally {
    clearTimeout(zeitlimit);
  }
}

// Zusätzliche interne Mail. Die Datenbank-Anfrage wird dafür nicht erneut angelegt.
async function anfrageMail(daten) {
  const nachricht = anfrageNachricht(daten);
  const normal = fensterAnzahl(daten.fenster_normal);
  const boden = fensterAnzahl(daten.fenster_bodentief);
  const fenster = daten.leistung === "Fensterreinigung";
  const abbruch = new AbortController();
  const zeitlimit = setTimeout(() => abbruch.abort(), 15000);
  try {
    const antwort = await fetch(MAIL_ZIEL, {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: abbruch.signal,
      body: JSON.stringify({
        Kunde: nachricht.Name,
        "E-Mail": daten.email.trim(),
        Telefon: nachricht.Telefon,
        Adresse: nachricht.Adresse,
        Leistung: daten.leistung,
        "Normale Fenster": fenster ? normal : "Nicht zutreffend",
        "Bodentiefe Fenster / Terrassentüren": fenster ? boden : "Nicht zutreffend",
        "Preisschätzung": fenster && normal + boden ? `${fensterPreis(normal, boden)} €` : "Nach Absprache",
        "Mindestauftragswert Fensterreinigung": `${PREIS_MINDEST} €`,
        Wunschtermin: nachricht.Wunschtermin,
        Terminstatus: daten.termin_start ? "Angefragt – noch zu bestätigen" : "Kein Termin ausgewählt",
        Nachricht: nachricht.Nachricht,
        "Freiwillige Werbe-Anmeldung": werbewunschText(daten),
        Dashboard: "https://horlbecklouis-stack.github.io/klarglas-intern/#kunden",
        _subject: nachricht.Betreff.replace(/[\r\n]/g, " "),
        _replyto: daten.email.trim(),
        _template: "table",
      }),
    });
    const ergebnis = await antwort.json().catch(() => ({}));
    if (!antwort.ok || String(ergebnis.success) !== "true") {
      throw new Error(ergebnis.message || `Status ${antwort.status}`);
    }
  } finally {
    clearTimeout(zeitlimit);
  }
}

/* Fragen nacheinander; dieselben Formularfelder und derselbe Versandweg. */
function formularSchritte(form, { rechner, pruefen, melden, termin }) {
  const auswahl = form.querySelector('#leistung');
  const feld = (id) => form.querySelector(`#${id}`).closest('.field');
  const absenden = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-form-status]');
  const zaehler = form.querySelector('[data-fenster]');
  const nachricht = form.querySelector('#nachricht');
  const legal = form.querySelector(':scope > .form__legal');
  const einwilligung = form.querySelector('.form__consent');
  const knopf = (text, klasse = 'btn btn--ghost') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = klasse;
    b.textContent = text;
    return b;
  };
  const kopf = document.createElement('div');
  kopf.className = 'form-flow__head';
  const fortschritt = document.createElement('p');
  fortschritt.className = 'form-flow__progress';
  const balken = document.createElement('progress');
  balken.max = 7;
  balken.setAttribute('aria-label', 'Fortschritt der Anfrage');
  kopf.append(fortschritt, balken);
  const uebersicht = document.createElement('dl');
  uebersicht.className = 'form-flow__summary';
  const hilfe = document.createElement('p');
  hilfe.className = 'form-flow__hint';
  const schritte = [
    ['Um welche Leistung geht es?', [feld('leistung')], 'Leistung'],
    ['Was dürfen wir für Sie erledigen?', [hilfe, zaehler, feld('nachricht')], 'Auftrag'],
    ['Wie heißen Sie?', [feld('name')], 'Name'],
    ['Wie können wir Sie erreichen?', [feld('email'), feld('telefon')], 'Kontakt'],
    ['Wo dürfen wir helfen?', [feld('adresse')], 'Adresse'],
    ['Wann passt es Ihnen?', [form.querySelector('[data-buchung]')], 'Wunschtermin'],
    ['Ist alles richtig?', [uebersicht, legal, einwilligung], 'Prüfen & senden'],
  ].map(([titel, inhalt, kurz], i) => {
    const bereich = document.createElement('section');
    bereich.className = 'form-flow__step';
    bereich.dataset.formStep = String(i);
    const h = document.createElement('h3');
    h.id = `anfrage-schritt-${i + 1}`;
    h.tabIndex = -1;
    h.textContent = titel;
    bereich.setAttribute('aria-labelledby', h.id);
    bereich.append(h, ...inhalt);
    return { bereich, h, kurz };
  });
  form.querySelectorAll(':scope > .form__row').forEach((row) => row.remove());
  form.removeAttribute('data-stagger');
  form.classList.add('form-flow');
  form.insertBefore(kopf, absenden);
  schritte.forEach(({ bereich }) => form.insertBefore(bereich, absenden));
  const navigation = document.createElement('div');
  navigation.className = 'form-flow__nav';
  const zurueck = knopf('Zurück');
  const weiter = knopf('Weiter', 'btn btn--primary');
  navigation.append(zurueck, weiter, absenden);
  form.insertBefore(navigation, status);
  status.tabIndex = -1;

  // Die Auswahlkarten setzen das bestehende Leistungsfeld für den Versand.
  auswahl.hidden = true;
  const label = feld('leistung').querySelector('label');
  label.hidden = true;
  const karten = document.createElement('div');
  karten.className = 'form-flow__choices';
  karten.setAttribute('role', 'group');
  karten.setAttribute('aria-label', 'Leistung auswählen');
  const optionen = ['Fensterreinigung', 'Nachbarschaftshilfe'].map((name, i) => {
    const b = knopf('', 'form-flow__choice');
    const titel = document.createElement('strong');
    titel.textContent = name;
    const text = document.createElement('span');
    text.textContent = i === 0 ? '5 € normal · 10 € bodentief · ab 25 € Auftragswert' : 'Kleine Aufgaben im Alltag · Preis nach Absprache';
    b.append(titel, text);
    b.addEventListener('click', () => {
      auswahl.value = name;
      auswahl.dispatchEvent(new Event('change', { bubbles: true }));
      pruefen(auswahl, false);
    });
    karten.append(b);
    return b;
  });
  feld('leistung').insertBefore(karten, auswahl);
  let aktuell = 0;
  let gesperrt = false;
  const leistungAktualisieren = () => {
    optionen.forEach((b, i) => b.setAttribute('aria-pressed', String(auswahl.selectedIndex === i + 1)));
    const fenster = auswahl.value === 'Fensterreinigung';
    zaehler.hidden = !fenster;
    hilfe.textContent = fenster
      ? 'Zählen Sie Ihre Fenster für eine erste Preisschätzung. Wenn Sie die Anzahl noch nicht kennen, lassen Sie die Zähler bei 0.'
      : 'Beschreiben Sie kurz, wobei Sie Unterstützung brauchen – zum Beispiel Laub fegen, Mülltonnen herausstellen oder eine kleine Besorgung. Den Preis vereinbaren wir persönlich.';
    nachricht.placeholder = fenster ? 'Zum Beispiel: Fenster im 1. Stock, Besonderheiten beim Zugang …' : 'Zum Beispiel: Laub im Vorgarten zusammenfegen …';
  };
  const zeile = (titel, wert, ziel) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = titel;
    dd.textContent = wert;
    const aendern = knopf('Ändern', 'form-flow__edit');
    aendern.setAttribute('aria-label', `${titel} ändern`);
    aendern.addEventListener('click', () => zeigen(ziel));
    row.append(dt, dd, aendern);
    uebersicht.append(row);
  };
  const zusammenfassen = () => {
    uebersicht.replaceChildren();
    const daten = Object.fromEntries(new FormData(form).entries());
    zeile('Leistung', daten.leistung, 0);
    if (daten.leistung === 'Fensterreinigung') {
      const normal = fensterAnzahl(daten.fenster_normal);
      const boden = fensterAnzahl(daten.fenster_bodentief);
      const summe = normal * 5 + boden * 10;
      zeile('Fenster & Preis', summe ? `${normal} normal, ${boden} bodentief / Terrassentüren · ca. ${summe} €` : 'Anzahl noch offen · Mindestauftragswert 25 €', 1);
    } else zeile('Preis', 'Nach Absprache', 1);
    zeile('Ihre Nachricht', daten.nachricht.trim() || 'Keine zusätzliche Nachricht', 1);
    zeile('Name', daten.name, 2);
    zeile('Kontakt', `${daten.email}\n${daten.telefon}`, 3);
    zeile('Adresse', daten.adresse, 4);
    zeile('Wunschtermin', termin()?.lesbar ? `${termin().lesbar} · noch unbestätigt` : 'Ohne Wunschtermin – wir stimmen uns mit Ihnen ab.', 5);
  };
  const zeigen = (index, fokus = true) => {
    if (gesperrt) return;
    aktuell = index;
    if (index === 6) zusammenfassen();
    schritte.forEach(({ bereich }, i) => { bereich.hidden = i !== index; });
    fortschritt.textContent = `Schritt ${index + 1} von ${schritte.length} · ${schritte[index].kurz}`;
    balken.value = index + 1;
    zurueck.hidden = index === 0;
    weiter.hidden = index === 6;
    absenden.hidden = index !== 6;
    weiter.textContent = index === 5 ? (termin() ? 'Zur Übersicht' : 'Ohne Wunschtermin weiter') : 'Weiter';
    if (fokus) {
      status.textContent = '';
      status.classList.remove('is-visible', 'is-error');
      schritte[index].h.focus();
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  };
  const feldZeigen = (input) => {
    const index = schritte.findIndex(({ bereich }) => bereich.contains(input));
    if (index >= 0) zeigen(index);
    if (input === auswahl) optionen[0].focus();
    else input.focus();
  };
  const naechster = () => {
    if (gesperrt) return;
    const felder = [...schritte[aktuell].bereich.querySelectorAll('.field input, .field select, .field textarea')];
    let erstes = null;
    felder.forEach((input) => {
      const fehler = !input.checkValidity();
      pruefen(input, fehler);
      if (fehler && !erstes) erstes = input;
    });
    if (erstes) {
      feldZeigen(erstes);
      melden('Bitte ergänzen Sie die markierten Felder.', true);
      return;
    }
    if (aktuell === 1 && auswahl.value === 'Fensterreinigung' && rechner) {
      rechner.normalisieren();
      if (rechner.unterMindest()) {
        rechner.erstesFeld.focus();
        melden(`Der Mindestauftrag liegt bei ${PREIS_MINDEST} €. Ergänzen Sie bitte weitere Fenster.`, true);
        return;
      }
    }
    zeigen(Math.min(6, aktuell + 1));
  };
  zurueck.addEventListener('click', () => zeigen(Math.max(0, aktuell - 1)));
  weiter.addEventListener('click', naechster);
  auswahl.addEventListener('change', () => {
    leistungAktualisieren();
    if (aktuell !== 0) zeigen(0, false);
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-buchung]') && aktuell === 5) {
      weiter.textContent = termin() ? 'Zur Übersicht' : 'Ohne Wunschtermin weiter';
    }
  });
  form.addEventListener('reset', () => setTimeout(() => {
    form.querySelectorAll('.field input, .field select, .field textarea').forEach((input) => pruefen(input, false));
    leistungAktualisieren();
    zeigen(0, false);
  }));
  leistungAktualisieren();
  zeigen(0, false);
  return {
    feldZeigen,
    vorAbsenden: () => {
      if (aktuell === 6) return true;
      naechster();
      return false;
    },
    sperren: (wert) => {
      gesperrt = wert;
      zurueck.disabled = wert;
      weiter.disabled = wert;
      schritte.forEach(({ bereich }) => { bereich.inert = wert; });
    },
  };
}


const form = document.querySelector("[data-form]");

if (form) {
  // Absenden wird nach dem Binden der Formularbehandlung freigeschaltet.
  form.setAttribute("novalidate", "");

  document.querySelectorAll("[data-leistung]").forEach((link) => {
    link.addEventListener("click", () => {
      const auswahl = form.querySelector("#leistung");
      auswahl.value = link.dataset.leistung;
      auswahl.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  const status = form.querySelector("[data-form-status]");
  const absenden = form.querySelector("button[type='submit']");
  const felder = [...form.querySelectorAll(".field input, .field select, .field textarea")];
  const rechner = fensterZaehler(form);
  let schrittFormular = null;

  const melden = (text, fehler = false) => {
    status.textContent = text;
    status.classList.add("is-visible");
    status.classList.toggle("is-error", fehler);
  };

  // Direkte E-Mail-Ausweichmöglichkeit, falls die Übertragung fehlschlägt.
  const perMailAnbieten = (nachricht) => {
    const link = document.createElement("a");
    link.className = "btn btn--ghost form__mail";
    link.href = `mailto:${KONTAKT_MAIL}?subject=${encodeURIComponent(
      nachricht.Betreff
    )}&body=${encodeURIComponent(nachricht.Anfrage)}`;
    link.textContent = "Per E-Mail senden";
    status.append(" ", link);
  };

  const pruefen = (feld, ungueltig) => {
    const huelle = feld.closest(".field");
    const meldung = huelle.querySelector(".field__error");
    huelle.classList.toggle("is-invalid", ungueltig);

    if (!meldung) return;
    if (!meldung.id) meldung.id = `${feld.id}-fehler`;

    if (ungueltig) {
      feld.setAttribute("aria-invalid", "true");
      feld.setAttribute("aria-describedby", meldung.id);
    } else {
      feld.removeAttribute("aria-invalid");
      feld.removeAttribute("aria-describedby");
    }
  };

  felder.forEach((feld) => {
    feld.addEventListener("blur", () => pruefen(feld, !feld.checkValidity()));
    feld.addEventListener("input", () => {
      if (feld.checkValidity()) pruefen(feld, false);
    });
  });

  form.addEventListener("focusin", () => {
    feldFokus = true;
    leisteAktualisieren();
  });
  form.addEventListener("focusout", (event) => {
    if (form.contains(event.relatedTarget)) return;
    feldFokus = false;
    leisteAktualisieren();
  });

  // Prüft alle Pflichtfelder und den Mindestauftrag. Gibt die Formulardaten zurück oder null.
  const allesPruefen = () => {
    let erstesFehlerfeld = null;
    felder.forEach((feld) => {
      const ungueltig = !feld.checkValidity();
      pruefen(feld, ungueltig);
      if (ungueltig && !erstesFehlerfeld) erstesFehlerfeld = feld;
    });

    if (erstesFehlerfeld) {
      if (schrittFormular) schrittFormular.feldZeigen(erstesFehlerfeld);
      else erstesFehlerfeld.focus();
      melden("Bitte ergänzen Sie die markierten Felder.", true);
      return null;
    }

    if (rechner) rechner.normalisieren();
    const daten = Object.fromEntries(new FormData(form).entries());

    // Mindestauftrag: Nur Fenster und unter 25 € – dann lohnt sich der Weg nicht
    if (rechner && rechner.unterMindest() && NUR_FENSTER.includes(daten.leistung)) {
      if (schrittFormular) schrittFormular.feldZeigen(rechner.erstesFeld);
      else rechner.erstesFeld.focus();
      melden(`Der Mindestauftrag liegt bei ${PREIS_MINDEST} €. Ergänzen Sie Fenster, bis die Schätzung mindestens ${PREIS_MINDEST} € beträgt.`, true);
      return null;
    }
    return daten;
  };

  /* Freie Zeiten aus Supabase; der Termin wird anschließend im Dashboard bestätigt. */
  const buchung = form.querySelector("[data-buchung]");
  let gewaehlt = null;
  let wirdGesendet = false;
  const terminDatum = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const terminLang = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long",
  });
  const terminUhr = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit",
  });
  const uhrzeitAus = (d) => terminUhr.format(d);

  if (buchung) {
    const start = buchung.querySelector("[data-buchung-start]");
    const hinweis = buchung.querySelector("[data-buchung-hinweis]");
    const slots = buchung.querySelector("[data-slots]");
    const tageBox = buchung.querySelector("[data-slot-tage]");
    const zeitenBox = buchung.querySelector("[data-slot-zeiten]");
    const zeitLabel = buchung.querySelector("[data-slot-label]");
    let freieZeiten = {};

    const knopf = (beschriftung, klasse = "") => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `slot ${klasse}`.trim();
      b.textContent = beschriftung;
      b.setAttribute("aria-pressed", "false");
      return b;
    };

    const markieren = (box, aktiv) =>
      box.querySelectorAll(".slot").forEach((b) => b.setAttribute("aria-pressed", String(b === aktiv)));

    const absendenBeschriften = () => {
      absenden.textContent = gewaehlt ? "Termin anfragen und senden" : "Anfrage senden";
    };

    const zeitenZeigen = (tag, tagKnopf) => {
      markieren(tageBox, tagKnopf);
      gewaehlt = null;
      absendenBeschriften();
      const zeitKnopf = (beginn) => {
        const zeit = new Date(beginn);
        const b = knopf(uhrzeitAus(zeit));
        b.setAttribute("aria-label", `${terminLang.format(zeit)} um ${uhrzeitAus(zeit)} Uhr`);
        b.addEventListener("click", () => {
          markieren(zeitenBox, b);
          gewaehlt = { start: beginn, lesbar: `${terminLang.format(zeit)} um ${uhrzeitAus(zeit)} Uhr` };
          absendenBeschriften();
        });
        return b;
      };
      // Viele freie Zeiten: erst nur volle Stunden, höchstens 5 (Handy) bzw. 10 (Computer), Rest über „Mehr Zeiten“
      const alle = freieZeiten[tag];
      const grenze = window.matchMedia("(max-width: 700px)").matches ? 5 : 10;
      let kurz = alle;
      if (alle.length > grenze) {
        const volle = alle.filter((beginn) => uhrzeitAus(new Date(beginn)).endsWith(":00"));
        kurz = (volle.length >= 3 ? volle : alle).slice(0, grenze);
      }
      const knoepfe = kurz.map(zeitKnopf);
      if (kurz.length < alle.length) {
        const mehr = knopf(`Mehr Zeiten (${alle.length - kurz.length})`, "slot--mehr");
        mehr.removeAttribute("aria-pressed");
        mehr.addEventListener("click", () => {
          gewaehlt = null;
          absendenBeschriften();
          zeitenBox.replaceChildren(...alle.map(zeitKnopf));
          zeitenBox.querySelector(".slot")?.focus();
        });
        knoepfe.push(mehr);
      }
      zeitenBox.replaceChildren(...knoepfe);
      zeitLabel.hidden = false;
    };

    const zeitenLaden = async () => {
      tageBox.replaceChildren();
      zeitenBox.replaceChildren();
      zeitLabel.hidden = true;
      gewaehlt = null;
      absendenBeschriften();
      slots.hidden = false;
      const lade = document.createElement("p");
      lade.className = "slots__leer";
      lade.textContent = "Freie Termine werden geladen …";
      tageBox.append(lade);

      const abbruch = new AbortController();
      const zeitlimit = setTimeout(() => abbruch.abort(), 15000);
      try {
        if (!INTERN.url || !INTERN.schluessel) throw new Error("Anbindung fehlt");
        const antwort = await fetch(`${INTERN.url}/functions/v1/slots`, {
          headers: { apikey: INTERN.schluessel },
          credentials: "omit",
          cache: "no-store",
          signal: abbruch.signal,
        });
        if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
        const ergebnis = await antwort.json();
        if (!Array.isArray(ergebnis.slots)) throw new Error("Ungültige Terminliste");
        const slotListe = [...new Set(ergebnis.slots
          .filter((slot) => typeof slot === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(slot))
          .map((slot) => new Date(slot).getTime())
          .filter((zeit) => Number.isFinite(zeit) && zeit > Date.now()))].sort((a, b) => a - b);
        freieZeiten = {};
        slotListe.forEach((zeit) => {
          const d = new Date(zeit);
          const tag = terminDatum.format(d);
          if (!freieZeiten[tag]) freieZeiten[tag] = [];
          freieZeiten[tag].push(d.toISOString());
        });
      } catch {
        lade.textContent =
          "Die freien Termine konnten gerade nicht geladen werden. Sie können Ihre Anfrage auch ohne Termin senden.";
        start.hidden = false;
        hinweis.hidden = false;
        return;
      } finally {
        clearTimeout(zeitlimit);
      }

      const tage = Object.keys(freieZeiten).filter((tag) => freieZeiten[tag].length).sort();
      if (!tage.length) {
        lade.textContent = "Aktuell sind keine freien Termine verfügbar. Senden Sie die Anfrage ohne Termin, wir melden uns.";
        return;
      }
      const morgenDatum = datumAus(terminDatum.format(new Date()));
      morgenDatum.setDate(morgenDatum.getDate() + 1);
      const morgen = isoAus(morgenDatum);
      tageBox.replaceChildren(
        ...tage.map((tag) => {
          const d = datumAus(tag);
          const b = knopf(tag === morgen ? `Morgen, ${datumKurz(d)}` : datumKurz(d), tag === morgen ? "is-morgen" : "");
          b.setAttribute("aria-label", datumLang.format(d));
          b.addEventListener("click", () => zeitenZeigen(tag, b));
          return b;
        })
      );
    };

    start.addEventListener("click", () => {
      start.hidden = true;
      hinweis.hidden = true;
      zeitenLaden();
    });

    form.addEventListener("reset", () =>
      setTimeout(() => {
        gewaehlt = null;
        slots.hidden = true;
        start.hidden = false;
        hinweis.hidden = false;
        absendenBeschriften();
      })
    );
  }


  schrittFormular = formularSchritte(form, { rechner, pruefen, melden, termin: () => gewaehlt });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (wirdGesendet) return;
    if (!schrittFormular.vorAbsenden()) return;

    const daten = allesPruefen();
    if (!daten) return;
    if (daten._honey) {
      form.reset();
      melden("Danke, Ihre Anfrage ist angekommen. Wir melden uns so schnell wie möglich.");
      return;
    }

    // Auswahl für diese Anfrage festhalten, auch wenn sich die Oberfläche später ändert.
    const wunschtermin = gewaehlt;
    if (wunschtermin) {
      daten.termin_start = wunschtermin.start;
      daten.termin = terminDatum.format(new Date(wunschtermin.start));
      daten.uhrzeit = `um ${uhrzeitAus(new Date(wunschtermin.start))} Uhr (Wunschtermin, noch unbestätigt)`;
    }
    werbewunschErfassen(form, daten);
    wirdGesendet = true;
    schrittFormular.sperren(true);
    delete form.dataset.mailStatus;
    delete form.dataset.dashboardStatus;
    absenden.disabled = true;
    absenden.textContent = "Wird gesendet …";
    form.setAttribute("aria-busy", "true");
    melden("Ihre Anfrage wird gesendet …");

    try {
      await ansDashboard(daten);
      form.dataset.dashboardStatus = "saved";
      // Erst speichern, dann genau eine interne Benachrichtigung versenden.
      // Eine fehlgeschlagene Mail darf keinen zweiten Kundenauftrag auslösen.
      try {
        await anfrageMail(daten);
        form.dataset.mailStatus = "sent";
      } catch (mailFehler) {
        form.dataset.mailStatus = "failed";
        console.warn("Die Anfrage ist im Dashboard gespeichert; die Mail-Benachrichtigung konnte nicht bestätigt werden:", mailFehler.message);
      }
      gewaehlt = null;
      form.reset();
      melden(wunschtermin
        ? `Danke! Ihre Anfrage für ${wunschtermin.lesbar} ist angekommen. Der Termin steht erst nach unserer Bestätigung per E-Mail fest.`
        : "Danke, Ihre Anfrage ist angekommen. Wir melden uns so schnell wie möglich."
      );
    } catch {
      // Bei einer unterbrochenen Antwort ist eine Speicherung ungewiss. Nie automatisch erneut senden.
      melden("Wir konnten die Übertragung gerade nicht bestätigen. Ihre Eingaben bleiben erhalten. Bitte kontaktieren Sie uns per E-Mail oder unter 0159 0660 2809, damit wir den Eingang prüfen können.", true);
      perMailAnbieten(anfrageNachricht(daten));
    } finally {
      wirdGesendet = false;
      schrittFormular.sperren(false);
      form.removeAttribute("aria-busy");
      absenden.disabled = false;
      absenden.textContent = gewaehlt ? "Termin anfragen und senden" : "Anfrage senden";
    }
  });
  absenden.disabled = false;
}

/* ========== Bewegung: GSAP + ScrollTrigger + Lenis ========== */

// Überschrift in Wörter zerlegen. Screenreader lesen den unzerteilten Text,
// die animierten Wörter sind für sie ausgeblendet.
function inWoerter(el) {
  if (el.dataset.geteilt) return [...el.querySelectorAll(".w__in")];
  el.dataset.geteilt = "1";

  const lesbar = document.createElement("span");
  lesbar.className = "visually-hidden";
  // Zeilenumbrüche (<br>) als Leerzeichen lesen, sonst verschmelzen Wörter
  lesbar.textContent = [...el.childNodes]
    .map((knoten) => (knoten.nodeName === "BR" ? " " : knoten.textContent))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  const sichtbar = document.createElement("span");
  sichtbar.setAttribute("aria-hidden", "true");
  const woerter = [];

  [...el.childNodes].forEach((knoten) => {
    if (knoten.nodeName === "BR") {
      sichtbar.append(document.createElement("br"));
      return;
    }
    if (knoten.nodeType !== Node.TEXT_NODE) return;

    knoten.textContent.split(/(\s+)/).forEach((teil) => {
      if (!teil) return;
      if (/^\s+$/.test(teil)) {
        sichtbar.append(" ");
        return;
      }
      const maske = document.createElement("span");
      maske.className = "w";
      const wort = document.createElement("span");
      wort.className = "w__in";
      wort.textContent = teil;
      maske.append(wort);
      sichtbar.append(maske);
      woerter.push(wort);
    });
  });

  el.textContent = "";
  el.append(lesbar, sichtbar);
  return woerter;
}

// Fließtext der Aussage: einfache Inline-Spans, die Screenreader normal vorlesen.
function aussageWoerter(el) {
  if (el.dataset.geteilt) return [...el.querySelectorAll(".sw")];
  el.dataset.geteilt = "1";
  const woerter = [];

  // Wörter an Ort und Stelle einpacken, damit Zeilen wie .statement__weiter erhalten bleiben
  const zerlegen = (knoten) => {
    [...knoten.childNodes].forEach((kind) => {
      if (kind.nodeType === Node.ELEMENT_NODE) {
        zerlegen(kind);
        return;
      }
      if (kind.nodeType !== Node.TEXT_NODE) return;
      const stueck = document.createDocumentFragment();
      kind.textContent.split(/(\s+)/).forEach((teil) => {
        if (!teil) return;
        if (/^\s+$/.test(teil)) {
          stueck.append(" ");
          return;
        }
        const span = document.createElement("span");
        span.className = "sw";
        span.textContent = teil;
        stueck.append(span);
        woerter.push(span);
      });
      kind.replaceWith(stueck);
    });
  };

  zerlegen(el);
  return woerter;
}

// Zähler: Screenreader bekommen den Endwert, die Animation ist für sie ausgeblendet.
function zaehlerVorbereiten() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (el.previousElementSibling && el.previousElementSibling.dataset.zahl) return;
    const lesbar = document.createElement("span");
    lesbar.className = "visually-hidden";
    lesbar.dataset.zahl = "1";
    lesbar.textContent = el.dataset.count;
    el.before(lesbar);
    el.setAttribute("aria-hidden", "true");
  });
}

// Nur auf das Laden warten, nicht auf decode(): das hängt in Hintergrund-Tabs.
// Spätestens nach 4 s geht es trotzdem weiter, damit der Platzhalter nie stehen bleibt.
function bildBereit(bild) {
  if (!bild || (bild.complete && bild.naturalWidth)) return Promise.resolve();
  return Promise.race([
    new Promise((fertig) => {
      bild.addEventListener("load", fertig, { once: true });
      bild.addEventListener("error", fertig, { once: true });
    }),
    new Promise((fertig) => setTimeout(fertig, 4000)),
  ]);
}

function heroEinstieg(gsap, OUT, INOUT) {
  const heroEl = document.querySelector(".hero");
  if (!heroEl) return;

  const kopf = document.querySelector(".masthead");
  const wischer = kopf && kopf.querySelector(".brandmark__swipe");
  const titel = heroEl.querySelector(".hero__title");
  const teile = [...heroEl.querySelectorAll("[data-hero-in]")].filter((el) => el !== titel);
  const hinweis = heroEl.querySelector(".scrollcue");
  const frost = heroEl.querySelector(".hero__frost");
  const klinge = heroEl.querySelector(".hero__blade");
  const media = heroEl.querySelector(".hero__media");
  const bild = media && media.querySelector("img");

  const aufraeumen = (els, props) => gsap.set(els.filter(Boolean), { clearProps: props });

  if (reduziert.matches) {
    // Sanft statt bewegt: nur Deckkraft, keine Wege, kein Wischen
    gsap.set(titel, { opacity: 0 });
    gsap.to([kopf, titel, ...teile, hinweis].filter(Boolean), {
      opacity: 1,
      duration: 0.4,
      ease: "none",
      onComplete: () => aufraeumen([kopf, titel, ...teile, hinweis], "opacity"),
    });
    bildBereit(bild).then(() =>
      gsap.to(frost, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => {
          frost && frost.remove();
          klinge && klinge.remove();
        },
      })
    );
    return;
  }

  const woerter = inWoerter(titel);

  const text = gsap.timeline({
    defaults: { ease: OUT },
    onComplete: () => {
      aufraeumen([kopf, titel, ...teile, hinweis], "opacity,transform");
      aufraeumen(woerter, "transform");
      aufraeumen([wischer], "strokeDasharray,strokeDashoffset");
    },
  });

  text
    .set(titel, { opacity: 1 })
    .fromTo(kopf, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.15)
    // Im Logo zieht der blaue Abzieher einmal quer übers Fenster
    .fromTo(
      wischer,
      { strokeDasharray: 28, strokeDashoffset: 28 },
      { strokeDashoffset: 0, duration: 0.75, ease: INOUT, autoRound: false },
      0.45
    )
    .fromTo(woerter, { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.07 }, 0.3)
    .fromTo(teile, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.85, stagger: 0.08 }, 0.6)
    .fromTo(hinweis, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.2);

  // Das Wischen startet erst, wenn das scharfe Foto wirklich da ist –
  // bis dahin bleibt die „eingeseifte Scheibe“ als Platzhalter stehen.
  bildBereit(bild).then(() => {
    const breite = heroEl.offsetWidth;
    gsap
      .timeline({
        onComplete: () => {
          frost && frost.remove();
          klinge && klinge.remove();
          aufraeumen([media], "transform");
        },
      })
      .fromTo(
        frost,
        { clipPath: "inset(0% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 100%)", duration: 1.2, ease: INOUT },
        0
      )
      .fromTo(klinge, { x: 0, opacity: 1 }, { x: breite, duration: 1.2, ease: INOUT }, 0)
      .to(klinge, { opacity: 0, duration: 0.25 }, 1)
      .fromTo(media, { scale: 1.08 }, { scale: 1, duration: 1.9, ease: OUT }, 0);
  });
}

function volleBewegung(gsap, ScrollTrigger, OUT, INOUT) {
  const breit = window.matchMedia("(min-width: 900px)").matches;

  /* Hero bleibt stehen, zoomt und tritt zurück, während die Aussage darüberfährt */
  const heroEl = document.querySelector(".hero");
  const naechste = heroEl && heroEl.nextElementSibling;

  if (heroEl && naechste) {
    // Ein einziger Trigger fixiert UND steuert – zwei getrennte würden sich die
    // Startposition gegenseitig verschieben.
    gsap
      .timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: "bottom bottom",
          endTrigger: naechste,
          end: "top top",
          scrub: true,
          pin: true,
          pinSpacing: false,
        },
      })
      .to(heroEl.querySelector(".hero__media img"), { scale: breit ? 1.14 : 1.1, ease: "none" }, 0)
      .to(
        heroEl.querySelector(".hero__stage"),
        { scale: breit ? 0.94 : 0.96, borderRadius: breit ? 40 : 24, ease: "none" },
        0
      )
      .to(heroEl.querySelector(".hero__dim"), { opacity: 0.45, ease: "none" }, 0)
      .to(heroEl.querySelector(".hero__content"), { yPercent: -10, opacity: 0, duration: 0.55, ease: "none" }, 0);
  }

  /* Aussage: Wort für Wort mit der Scrollbewegung aufhellen */
  const aussage = document.querySelector("[data-statement]");
  if (aussage) {
    gsap.fromTo(
      aussageWoerter(aussage),
      { opacity: 0.5 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: aussage, start: "top 80%", end: "bottom 45%", scrub: true },
      }
    );
  }

  /* Überschriften steigen wortweise aus ihrer Zeile */
  gsap.utils.toArray("[data-split]").forEach((el) => {
    gsap.fromTo(
      inWoerter(el),
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 0.95,
        ease: OUT,
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }
    );
  });

  /* Begleittext */
  gsap.set("[data-fade]", { opacity: 0, y: 16 });
  ScrollTrigger.batch("[data-fade]", {
    start: "top 90%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: OUT,
        stagger: 0.07,
        overwrite: true,
        onComplete: () => gsap.set(els, { clearProps: "transform" }),
      }),
  });

  /* Gruppen: Kinder nacheinander */
  gsap.utils.toArray("[data-stagger]").forEach((gruppe) => {
    // Versteckte Formularfelder zählen nicht mit, sonst entsteht eine Pause am Anfang.
    const kinder = [...gruppe.children].filter((el) => el.tagName !== "INPUT");
    gsap.fromTo(
      kinder,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: OUT,
        stagger: 0.05,
        scrollTrigger: { trigger: gruppe, start: "top 88%", once: true },
        onComplete: () => gsap.set(kinder, { clearProps: "transform" }),
      }
    );
  });

  /* Leistungen: Illustration wird wie mit dem Abzieher von oben freigezogen */
  gsap.utils.toArray(".lineup__row").forEach((zeile) => {
    const media = zeile.querySelector(".lineup__media");
    const grafik = media && media.querySelector("svg");
    const titel = zeile.querySelector(".lineup__title");
    const rest = zeile.querySelectorAll(".lineup__price, .lineup__text");

    gsap
      .timeline({
        scrollTrigger: { trigger: zeile, start: "top 86%", once: true },
        onComplete: () => gsap.set([grafik, titel, ...rest], { clearProps: "transform" }),
      })
      .fromTo(media, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: INOUT }, 0)
      .fromTo(grafik, { scale: 1.12 }, { scale: 1, duration: 1.3, ease: OUT }, 0)
      .fromTo(titel, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.85, ease: OUT }, 0.1)
      .fromTo(rest, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: OUT, stagger: 0.07 }, 0.25);
  });

  /* Fotos in Rahmen: gleiche Wischbewegung, danach sanfte Tiefe beim Scrollen */
  gsap.utils.toArray("[data-wipe]").forEach((rahmen) => {
    const bild = rahmen.querySelector("img");
    gsap
      .timeline({ scrollTrigger: { trigger: rahmen, start: "top 85%", once: true } })
      .fromTo(rahmen, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: INOUT }, 0)
      .fromTo(bild, { scale: 1.25 }, { scale: 1.1, duration: 1.5, ease: OUT }, 0);
  });

  /* Parallaxe: Hintergründe weiter, gerahmte Fotos nur leicht */
  gsap.utils.toArray("[data-parallax]").forEach((ebene) => {
    const bild = ebene.querySelector("img");
    const staerke = Number(ebene.dataset.parallax) || 6;
    gsap.fromTo(
      bild,
      { yPercent: -staerke },
      {
        yPercent: staerke,
        ease: "none",
        scrollTrigger: { trigger: ebene, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });

  /* Über uns: das kleine Bild schwebt ein und bewegt sich schneller als das große */
  const stapel = document.querySelector(".story__stack");
  const ueber = stapel && stapel.querySelector(".story__over");
  if (ueber) {
    gsap.fromTo(
      ueber,
      { opacity: 0, y: 70, rotate: 3 },
      {
        opacity: 1,
        y: 0,
        rotate: 0,
        duration: 1.1,
        ease: OUT,
        scrollTrigger: { trigger: stapel, start: "top 75%", once: true },
      }
    );
    gsap.to(ueber, {
      yPercent: breit ? -22 : -12,
      ease: "none",
      scrollTrigger: { trigger: stapel, start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  /* Ablauf: Linie zeichnet sich, dann folgt der Schritt */
  gsap.utils.toArray(".step").forEach((schritt, i) => {
    const linie = schritt.querySelector(".step__line");
    const rest = schritt.querySelectorAll(".step__num, h3, p");
    gsap
      .timeline({ scrollTrigger: { trigger: schritt, start: "top 86%", once: true }, delay: (i % 3) * 0.08 })
      .fromTo(linie, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: INOUT }, 0)
      .fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: OUT, stagger: 0.07 }, 0.25);
  });

  /* Zahlen zählen hoch */
  gsap.utils.toArray("[data-count]").forEach((el) => {
    const ziel = Number(el.dataset.count);
    const wert = { v: 0 };
    el.textContent = "0";
    gsap.to(wert, {
      v: ziel,
      duration: 1.1,
      ease: OUT,
      snap: { v: 1 },
      onUpdate: () => {
        el.textContent = String(wert.v);
      },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
}

function ruhigeBewegung(gsap, ScrollTrigger) {
  // Keine Wege, kein Zoom, keine Parallaxe – nur kurzes Einblenden beim Erreichen
  const ziele = gsap.utils.toArray(
    "[data-fade], [data-stagger] > *, .lineup__row, [data-wipe], .step, .story__over"
  );
  gsap.set(ziele, { opacity: 0 });
  ScrollTrigger.batch(ziele, {
    start: "top 92%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, duration: 0.35, ease: "none", overwrite: true }),
  });
}

function bewegungStarten() {
  const { gsap, ScrollTrigger, CustomEase, Lenis } = window;

  if (root.classList.contains("motion-off")) return;
  if (!gsap || !ScrollTrigger) {
    root.classList.add("motion-off");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  let OUT = "expo.out";
  let INOUT = "power4.inOut";
  if (CustomEase) {
    gsap.registerPlugin(CustomEase);
    // exakt dieselben Kurven wie --ease-out und --ease-in-out im CSS
    CustomEase.create("kgOut", "0.23,1,0.32,1");
    CustomEase.create("kgInOut", "0.77,0,0.175,1");
    OUT = "kgOut";
    INOUT = "kgInOut";
  }

  ScrollTrigger.config({ ignoreMobileResize: true });
  zaehlerVorbereiten();

  // Einmalig beim Laden, unabhängig von späteren Größenänderungen
  heroEinstieg(gsap, OUT, INOUT);

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    if (Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      if (kopfNachziehen) lenis.on("scroll", kopfNachziehen);
      const takt = (zeit) => lenis && lenis.raf(zeit * 1000);
      gsap.ticker.add(takt);
      gsap.ticker.lagSmoothing(0);

      volleBewegung(gsap, ScrollTrigger, OUT, INOUT);

      return () => {
        gsap.ticker.remove(takt);
        lenis.destroy();
        lenis = null;
      };
    }
    volleBewegung(gsap, ScrollTrigger, OUT, INOUT);
    return undefined;
  });

  mm.add("(prefers-reduced-motion: reduce)", () => ruhigeBewegung(gsap, ScrollTrigger));

  root.classList.add("motion-ready");

  // Maße neu berechnen, sobald Schrift und Bilder feststehen
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

bewegungStarten();
