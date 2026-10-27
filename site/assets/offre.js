// Offre dirigeant — script partagé des pages générées par offre/build.mjs.
// 1. Suivi d'origine : les paramètres utm_* de l'URL d'arrivée sont conservés pour la session
//    et ajoutés aux boutons « Réserver mon diagnostic », puis transmis à l'agenda.
// 2. Consentement cookies : seul l'agenda (Calendly) dépose des cookies tiers. Choix conservé
//    6 mois dans le navigateur. Sans accord, l'agenda s'ouvre dans un nouvel onglet.
// 3. Formulaire de qualification (/rendez-vous/) : 7 questions, routage, puis agenda pré-rempli.
//    Rien n'est envoyé à ce site : les réponses partent uniquement dans l'URL de l'agenda.
(() => {
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const CONSENT_KEY = "ci_consent";
  const CONSENT_MAX_AGE = 183 * 24 * 3600 * 1000; // 6 mois

  const store = {
    get(area, key) { try { return JSON.parse(window[area].getItem(key)); } catch { return null; } },
    set(area, key, value) { try { window[area].setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
  };

  // --- 1. UTM ---
  const params = new URLSearchParams(location.search);
  const fromUrl = {};
  for (const key of UTM_KEYS) if (params.get(key)) fromUrl[key] = params.get(key).slice(0, 100);
  if (Object.keys(fromUrl).length) store.set("sessionStorage", "ci_utm", fromUrl);
  const utm = Object.keys(fromUrl).length ? fromUrl : store.get("sessionStorage", "ci_utm") || {};

  if (Object.keys(utm).length) {
    for (const link of document.querySelectorAll("a[data-cta]")) {
      const target = new URL(link.href, location.href);
      for (const [key, value] of Object.entries(utm)) target.searchParams.set(key, value);
      link.href = target.pathname + target.search;
    }
  }

  // --- 2. Consentement ---
  function getConsent() {
    const saved = store.get("localStorage", CONSENT_KEY);
    if (!saved || typeof saved.at !== "number" || Date.now() - saved.at > CONSENT_MAX_AGE) return null;
    return saved;
  }
  function setConsent(agenda) {
    store.set("localStorage", CONSENT_KEY, { agenda: Boolean(agenda), at: Date.now() });
    document.dispatchEvent(new CustomEvent("ci:consent"));
  }

  const banner = document.querySelector(".cookie-banner");
  const custom = banner.querySelector(".cookie-custom");
  const agendaBox = banner.querySelector("[data-cookie-agenda]");
  const saveBtn = banner.querySelector('[data-cookie="save"]');

  function openBanner() {
    custom.hidden = true;
    saveBtn.hidden = true;
    agendaBox.checked = Boolean(getConsent()?.agenda);
    banner.hidden = false;
  }
  function closeBanner() { banner.hidden = true; }

  banner.addEventListener("click", event => {
    const action = event.target.closest("[data-cookie]")?.dataset.cookie;
    if (action === "accept") { setConsent(true); closeBanner(); }
    if (action === "refuse") { setConsent(false); closeBanner(); }
    if (action === "custom") { custom.hidden = false; saveBtn.hidden = false; agendaBox.focus(); }
    if (action === "save") { setConsent(agendaBox.checked); closeBanner(); }
  });
  for (const button of document.querySelectorAll("[data-cookie-manage]")) button.addEventListener("click", openBanner);

  // Le bandeau ne s'ouvre de lui-même que là où un cookie tiers peut être déposé : /rendez-vous/.
  const agenda = document.getElementById("agenda");
  if (agenda && !getConsent()) openBanner();

  // --- 3. Formulaire de qualification ---
  const form = document.getElementById("qualif");
  if (!form) return;

  const error = form.querySelector(".form-error");
  const counter = form.querySelector("[data-count]");
  const textarea = form.elements.attente;
  const frame = agenda.querySelector("[data-agenda-frame]");
  const consentBlock = agenda.querySelector("[data-agenda-consent]");
  const tabLink = agenda.querySelector("[data-agenda-tab]");
  let bookingUrl = "";

  textarea.addEventListener("input", () => { counter.textContent = String(textarea.value.length); });

  // Ordre des réponses transmises à l'agenda (a1…a7) : doit suivre l'ordre des questions
  // personnalisées de l'événement Calendly (voir site/DEPLOY.md).
  const ANSWERS = ["telephone", "forme", "beneficiaire", "tresorerie", "sujet", "attente", "origine"];

  function validate() {
    for (const el of form.querySelectorAll(".invalid")) el.classList.remove("invalid");
    const data = new FormData(form);
    const text = name => String(data.get(name) || "").trim();
    const fail = (message, field) => {
      error.textContent = message;
      const el = form.elements[field];
      const node = el instanceof RadioNodeList ? el[0].closest("fieldset") : el;
      node.classList.add("invalid");
      node.scrollIntoView({ block: "center", behavior: "smooth" });
      return null;
    };
    if (!text("prenom")) return fail("Merci d'indiquer votre prénom.", "prenom");
    if (!text("nom")) return fail("Merci d'indiquer votre nom.", "nom");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email"))) return fail("Merci d'indiquer une adresse email valide.", "email");
    for (const [field, label] of [["forme", "la forme de votre société"], ["beneficiaire", "si votre société est bénéficiaire"],
      ["tresorerie", "votre trésorerie disponible"], ["sujet", "votre sujet prioritaire"]]) {
      if (!text(field)) return fail(`Merci d'indiquer ${label}.`, field);
    }
    if (!text("attente")) return fail("Merci d'indiquer ce que vous attendez de ce rendez-vous.", "attente");
    if (!text("origine")) return fail("Merci d'indiquer comment vous m'avez connue.", "origine");
    if (!form.elements.consentement.checked) return fail("Merci d'accepter l'utilisation de vos données pour organiser ce rendez-vous.", "consentement");
    error.textContent = "";
    return { data, text };
  }

  function buildBookingUrl({ text }) {
    const url = new URL(form.dataset.bookingUrl);
    url.searchParams.set("name", `${text("prenom")} ${text("nom")}`);
    url.searchParams.set("email", text("email"));
    ANSWERS.forEach((field, i) => { if (text(field)) url.searchParams.set(`a${i + 1}`, text(field)); });
    for (const [key, value] of Object.entries(utm)) url.searchParams.set(key, value);
    return url;
  }

  function showAgenda() {
    if (getConsent()?.agenda) {
      consentBlock.hidden = true;
      if (!frame.firstChild) {
        const url = new URL(bookingUrl);
        url.searchParams.set("embed_domain", location.hostname);
        url.searchParams.set("embed_type", "Inline");
        const iframe = document.createElement("iframe");
        iframe.src = url.href;
        iframe.title = "Agenda de réservation du Diagnostic Stratégique";
        frame.appendChild(iframe);
      }
    } else {
      consentBlock.hidden = false;
      frame.replaceChildren();
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = validate();
    if (!result) return;
    const excluded = [...form.querySelectorAll("input[data-exclude]")].some(input => input.checked);
    if (excluded) {
      location.href = "/rendez-vous/pas-encore/";
      return;
    }
    bookingUrl = buildBookingUrl(result).href;
    tabLink.href = bookingUrl;
    form.hidden = true;
    agenda.hidden = false;
    showAgenda();
    agenda.scrollIntoView({ block: "start" });
  });

  agenda.querySelector("[data-agenda-accept]").addEventListener("click", () => { setConsent(true); closeBanner(); });
  agenda.querySelector("[data-agenda-back]").addEventListener("click", () => {
    agenda.hidden = true;
    frame.replaceChildren();
    form.hidden = false;
    form.scrollIntoView({ block: "start" });
  });
  document.addEventListener("ci:consent", () => { if (!agenda.hidden) showAgenda(); });
})();
