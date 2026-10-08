const KONTAKT_MAIL = "info@klarglas-berlin.de";
// FormSubmit leitet die Anfrage als E-Mail an diese Adresse weiter.
// Nach der Aktivierung kann die Adresse hier durch den geheimen Code von FormSubmit
// ersetzt werden, dann steht sie nicht mehr im Quelltext.
const FORMULAR_ZIEL = `https://formsubmit.co/ajax/${KONTAKT_MAIL}`;

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
// Bei diesen Leistungen geht es nur um Fenster – dort gilt der Mindestauftrag
const NUR_FENSTER = ["Fensterreinigung"];
// Bei diesen Leistungen spielen Fenster keine Rolle – der Zähler wird ausgegraut
const OHNE_FENSTER = ["Felgenreinigung", "Nachbarschaftshilfe"];

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
  const normal = Number(daten.fenster_normal) || 0;
  const boden = Number(daten.fenster_bodentief) || 0;
  const schaetzung = normal * 4 + boden * 5;
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
    _subject: `Neue Anfrage: ${daten.leistung} – ${name}${terminKurz ? ` (${terminKurz})` : ""}`,
    _replyto: daten.email,
    _template: "table",
    _captcha: "false",
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

  const anzahl = (feld) => Math.min(99, Math.max(0, parseInt(feld.value, 10) || 0));
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

    const warnen = unterMindest();
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

  // Felgen oder Nachbarschaftshilfe: Zähler ausgrauen, damit niemand unnötig Fenster zählt.
  // Ein deaktiviertes fieldset schickt seine Werte auch nicht mit.
  const leistung = form.querySelector("#leistung");
  const leistungPruefen = () => {
    const aus = OHNE_FENSTER.includes(leistung.value);
    box.disabled = aus;
    box.classList.toggle("is-aus", aus);
    hinweis.hidden = aus || !unterMindest();
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

  return { unterMindest, erstesFeld: zeilen[0].feld, hinweis };
}

const form = document.querySelector("[data-form]");

if (form) {
  // Ohne JavaScript prüft der Browser selbst und schickt das Formular direkt an FormSubmit.
  form.setAttribute("novalidate", "");

  const status = form.querySelector("[data-form-status]");
  const absenden = form.querySelector("button[type='submit']");
  const felder = [...form.querySelectorAll(".field input, .field select, .field textarea")];
  const rechner = fensterZaehler(form);

  const melden = (text, fehler = false) => {
    status.textContent = text;
    status.classList.add("is-visible");
    status.classList.toggle("is-error", fehler);
  };

  // Notlösung, falls der Versand scheitert: die fertige Nachricht im E-Mail-Programm öffnen
  const perMailAnbieten = (nachricht) => {
    const link = document.createElement("a");
    link.className = "btn btn--ghost form__mail";
    link.href = `mailto:${KONTAKT_MAIL}?subject=${encodeURIComponent(
      nachricht._subject
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
      erstesFehlerfeld.focus();
      melden("Bitte ergänzen Sie die markierten Felder.", true);
      return null;
    }

    const daten = Object.fromEntries(new FormData(form).entries());

    // Mindestauftrag: Nur Fenster und unter 25 € – dann lohnt sich der Weg nicht
    if (rechner && rechner.unterMindest() && NUR_FENSTER.includes(daten.leistung)) {
      rechner.erstesFeld.focus();
      melden("Der Mindestauftrag liegt bei 25 €. Ergänzen Sie Fenster, bis die Schätzung mindestens 25 € beträgt.", true);
      return null;
    }
    return daten;
  };

  /* Termin über Cal.com: Die Seite zeigt nur Zeiten, die im gemeinsamen Kalender frei sind,
     und bucht beim Absenden direkt mit den Angaben aus dem Formular – kein zweites Formular.
     Die Zeiten werden erst nach dem Tippen auf den Knopf von Cal.com geladen. */
  const CAL = { api: "https://api.cal.com/v2", nutzer: "klarglas", termin: "fensterreinigung" };
  const buchung = form.querySelector("[data-buchung]");
  let gewaehlt = null; // { start: ISO-Zeit von Cal.com, lesbar: "Samstag, 4. Oktober um 9:00 Uhr" }

  // Cal.com will Telefonnummern im internationalen Format: 0170 … wird zu +49170…
  const telefonInternational = (roh) => {
    let nummer = (roh || "").replace(/[^\d+]/g, "");
    if (!nummer) return "";
    if (nummer.startsWith("00")) nummer = `+${nummer.slice(2)}`;
    else if (nummer.startsWith("0")) nummer = `+49${nummer.slice(1)}`;
    else if (!nummer.startsWith("+")) nummer = `+49${nummer}`;
    return nummer.length >= 8 ? nummer : "";
  };

  const uhrzeitAus = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

  let zeitenNeuLaden = () => {};

  if (buchung) {
    const start = buchung.querySelector("[data-buchung-start]");
    const text = buchung.querySelector("[data-buchung-text]");
    const hinweis = buchung.querySelector("[data-buchung-hinweis]");
    const slots = buchung.querySelector("[data-slots]");
    const tageBox = buchung.querySelector("[data-slot-tage]");
    const zeitenBox = buchung.querySelector("[data-slot-zeiten]");
    const zeitLabel = buchung.querySelector("[data-slot-label]");
    const leistung = form.querySelector("#leistung");
    const textStandard = text.textContent;
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
      absenden.textContent = gewaehlt ? "Termin buchen und senden" : "Anfrage senden";
    };

    const zeitenZeigen = (tag, tagKnopf) => {
      markieren(tageBox, tagKnopf);
      gewaehlt = null;
      absendenBeschriften();
      zeitenBox.replaceChildren(
        ...freieZeiten[tag].map(({ start: beginn }) => {
          const zeit = new Date(beginn);
          const b = knopf(uhrzeitAus(zeit));
          b.setAttribute("aria-label", `${datumLang.format(zeit)} um ${uhrzeitAus(zeit)} Uhr`);
          b.addEventListener("click", () => {
            markieren(zeitenBox, b);
            gewaehlt = { start: beginn, lesbar: `${datumLang.format(zeit)} um ${uhrzeitAus(zeit)} Uhr` };
            absendenBeschriften();
          });
          return b;
        })
      );
      zeitLabel.hidden = false;
    };

    const zeitenLaden = async () => {
      const heute = new Date();
      const bis = inTagen(15);
      const url =
        `${CAL.api}/slots?eventTypeSlug=${CAL.termin}&username=${CAL.nutzer}` +
        `&start=${isoAus(heute)}&end=${isoAus(bis)}&timeZone=Europe/Berlin`;
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

      try {
        const antwort = await fetch(url, { headers: { "cal-api-version": "2024-09-04" } });
        if (!antwort.ok) throw new Error(`Status ${antwort.status}`);
        freieZeiten = (await antwort.json()).data || {};
      } catch {
        lade.textContent =
          "Die freien Termine konnten gerade nicht geladen werden. Senden Sie die Anfrage einfach ohne Termin, wir melden uns.";
        return;
      }

      const tage = Object.keys(freieZeiten).filter((tag) => freieZeiten[tag].length).sort();
      if (!tage.length) {
        lade.textContent = "In den nächsten zwei Wochen ist leider alles belegt. Senden Sie die Anfrage ohne Termin, wir melden uns.";
        return;
      }
      const morgen = isoAus(inTagen(1));
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
    zeitenNeuLaden = zeitenLaden;

    start.addEventListener("click", () => {
      if (start.getAttribute("aria-disabled") === "true") return;
      start.hidden = true;
      hinweis.hidden = true;
      zeitenLaden();
    });

    // Felgen und Nachbarschaftshilfe stimmen wir per E-Mail ab – dort gibt es keine Terminwahl
    const leistungPruefen = () => {
      const aus = OHNE_FENSTER.includes(leistung.value);
      buchung.classList.toggle("is-aus", aus);
      start.setAttribute("aria-disabled", String(aus));
      text.textContent = aus
        ? "Für Felgen und Nachbarschaftshilfe stimmen wir den Termin per E-Mail mit Ihnen ab."
        : textStandard;
      if (aus) {
        slots.hidden = true;
        gewaehlt = null;
        start.hidden = false;
        hinweis.hidden = false;
        absendenBeschriften();
      }
    };
    leistung.addEventListener("change", leistungPruefen);
    leistungPruefen();

    form.addEventListener("reset", () =>
      setTimeout(() => {
        gewaehlt = null;
        slots.hidden = true;
        start.hidden = false;
        hinweis.hidden = false;
        absendenBeschriften();
        leistungPruefen();
      })
    );
  }

  // Bucht den gewählten Termin bei Cal.com mit den Angaben aus dem Formular
  const terminBuchen = async (daten) => {
    const normal = Number(daten.fenster_normal) || 0;
    const boden = Number(daten.fenster_bodentief) || 0;
    const notiz = [
      normal + boden ? `Fenster: ${normal} normale, ${boden} bodentiefe (ca. ${normal * 4 + boden * 5} €)` : "",
      daten.telefon.trim() ? `Telefon: ${daten.telefon.trim()}` : "",
      daten.nachricht.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const telefon = telefonInternational(daten.telefon);

    const antwort = await fetch(`${CAL.api}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "cal-api-version": "2024-08-13" },
      body: JSON.stringify({
        start: new Date(gewaehlt.start).toISOString(),
        eventTypeSlug: CAL.termin,
        username: CAL.nutzer,
        attendee: {
          name: daten.name.trim(),
          email: daten.email.trim(),
          timeZone: "Europe/Berlin",
          language: "de",
          ...(telefon ? { phoneNumber: telefon } : {}),
        },
        location: { type: "attendeeAddress", address: daten.adresse.trim() },
        bookingFieldsResponses: {
          title: normal + boden ? `Fensterreinigung (${normal + boden} Fenster)` : "Fensterreinigung",
          notes: notiz,
          ...(telefon ? { attendeePhoneNumber: telefon } : {}),
        },
      }),
    });
    const ergebnis = await antwort.json().catch(() => ({}));
    if (!antwort.ok || ergebnis.status === "error") {
      const grund = (ergebnis.error && ergebnis.error.message) || `Status ${antwort.status}`;
      throw new Error(grund);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const daten = allesPruefen();
    if (!daten) return;

    // Honeypot: Menschen sehen das Feld nicht, Spam-Bots füllen es aus.
    if (daten._honey) {
      form.reset();
      melden("Danke, Ihre Anfrage ist angekommen. Wir melden uns in etwa 15 Minuten.");
      return;
    }

    absenden.disabled = true;
    absenden.textContent = gewaehlt ? "Termin wird gebucht …" : "Wird gesendet …";

    // Erst den Termin fest buchen – ist er inzwischen weg, wird nichts gesendet
    let terminGebucht = "";
    if (gewaehlt) {
      try {
        await terminBuchen(daten);
        terminGebucht = gewaehlt.lesbar;
        daten.termin = isoAus(new Date(gewaehlt.start));
        daten.uhrzeit = `um ${uhrzeitAus(new Date(gewaehlt.start))} Uhr (fest gebucht)`;
        // Gebucht ist gebucht: ein zweiter Klick darf keinen zweiten Termin anlegen
        gewaehlt = null;
      } catch (fehler) {
        absenden.disabled = false;
        const telefonFehlt = /phone/i.test(fehler.message) && !daten.telefon.trim();
        if (telefonFehlt) {
          absenden.textContent = "Termin buchen und senden";
          form.querySelector("#telefon").focus();
          melden("Für die Terminbuchung brauchen wir Ihre Telefonnummer. Bitte tragen Sie sie oben ein.", true);
        } else {
          melden("Dieser Termin ist leider gerade weggegangen oder konnte nicht gebucht werden. Bitte wählen Sie einen anderen.", true);
          zeitenNeuLaden();
        }
        return;
      }
    }

    const nachricht = anfrageNachricht(daten);
    absenden.textContent = "Wird gesendet …";

    const abbruch = new AbortController();
    const zeitlimit = setTimeout(() => abbruch.abort(), 15000);

    try {
      const antwort = await fetch(FORMULAR_ZIEL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(nachricht),
        signal: abbruch.signal,
      });
      const ergebnis = await antwort.json().catch(() => ({}));
      if (!antwort.ok || String(ergebnis.success) !== "true") {
        throw new Error(ergebnis.message || `Status ${antwort.status}`);
      }

      form.reset();
      melden(
        terminGebucht
          ? `Danke! Ihr Termin am ${terminGebucht} steht. Die Bestätigung kommt per E-Mail.`
          : "Danke, Ihre Anfrage ist angekommen. Wir melden uns in etwa 15 Minuten."
      );
    } catch (fehler) {
      // Termin steht schon, und alle Angaben liegen in den Notizen der Cal.com-Buchung.
      // Scheitert nur die Zusatz-Mail an uns, bekommt der Kunde trotzdem eine normale Bestätigung.
      if (terminGebucht) {
        console.warn("Zusatz-Mail über FormSubmit nicht gesendet:", fehler.message);
        form.reset();
        melden(`Danke! Ihr Termin am ${terminGebucht} steht. Die Bestätigung kommt per E-Mail.`);
        return;
      }
      // Lesbarer Grund, damit man beim Einrichten sofort sieht, woran es hängt
      const grund = /activat/i.test(fehler.message)
        ? " Das Formular ist noch nicht freigeschaltet."
        : /klarglas-berlin\.de$|^localhost$|^127\./.test(window.location.hostname)
          ? ""
          : " In dieser Testversion kann nicht echt gesendet werden.";
      melden(
        `Das Senden hat gerade nicht geklappt.${grund} Schicken Sie die Anfrage per E-Mail oder rufen Sie an: 0159 0660 2809.`,
        true
      );
      perMailAnbieten(nachricht);
    } finally {
      clearTimeout(zeitlimit);
      absenden.disabled = false;
      absenden.textContent = gewaehlt && !terminGebucht ? "Termin buchen und senden" : "Anfrage senden";
    }
  });
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
