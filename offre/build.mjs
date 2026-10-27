// Génère les pages de l'offre dirigeant (site/dirigeants/, site/rendez-vous/, pages légales…)
// à partir de offre/pages/*.html, du gabarit offre/layout.html et de offre/site.config.json.
// Aucune dépendance : `node offre/build.mjs`. Les pages générées sont committées dans site/,
// le déploiement Cloudflare n'a donc pas d'étape de build.
//
// Syntaxe des gabarits :
//   {{CLE}}                    valeur de site.config.json, échappée HTML
//   {{#if CLE}}…{{/if}}        bloc affiché seulement si la valeur est renseignée
//   {{#unless CLE}}…{{/unless}} bloc affiché seulement si la valeur est vide
//   <!--meta {...} -->         en première ligne d'une page : path, title, description, jsonld
//
// Le script vérifie ensuite les pages générées (mots interdits, bloc réglementaire) et liste
// les valeurs restant à compléter. Il sort en erreur si une règle de conformité est enfreinte.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const offre = join(root, "offre");

const config = JSON.parse(readFileSync(join(offre, "site.config.json"), "utf8"));
config.ANNEE = String(new Date().getFullYear());
const optional = new Set(config._optional || []);
const layout = readFileSync(join(offre, "layout.html"), "utf8");

const escapeHtml = value =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const missing = new Map(); // clé -> pages où elle manque

function render(template, page) {
  let out = template
    .replace(/\{\{#if ([A-Z_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => (config[key] ? body : ""))
    .replace(/\{\{#unless ([A-Z_]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, key, body) => (config[key] ? "" : body));
  return out.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in config)) throw new Error(`${page} : clé inconnue {{${key}}} (absente de site.config.json)`);
    if (config[key]) return escapeHtml(config[key]);
    if (optional.has(key)) return "";
    if (!missing.has(key)) missing.set(key, new Set());
    missing.get(key).add(page);
    return `<mark class="todo">[à compléter : ${key}]</mark>`;
  });
}

function jsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "Captain Invest",
    legalName: "RKG Invest",
    url: `${config.SITE_URL}/dirigeants/`,
    email: config.EMAIL,
    address: config.ADRESSE_SIEGE
      ? { "@type": "PostalAddress", streetAddress: config.ADRESSE_SIEGE, addressCountry: "FR" }
      : { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

const pageFiles = readdirSync(join(offre, "pages")).filter(f => f.endsWith(".html")).sort();
const written = [];

for (const file of pageFiles) {
  const source = readFileSync(join(offre, "pages", file), "utf8");
  const match = source.match(/^<!--meta (\{[\s\S]*?\}) -->\n/);
  if (!match) throw new Error(`${file} : première ligne <!--meta {...} --> manquante`);
  const meta = JSON.parse(match[1]);
  const body = render(source.slice(match[0].length), file);
  const html = render(layout, file)
    .replace("{{@title}}", escapeHtml(meta.title))
    .replace("{{@description}}", escapeHtml(meta.description))
    .replace("{{@canonical}}", escapeHtml(config.SITE_URL + meta.path))
    .replace("{{@robots}}", meta.noindex ? '<meta name="robots" content="noindex">' : "")
    .replace("{{@jsonld}}", meta.jsonld ? jsonLd() : "")
    .replace("{{@content}}", body);
  const target = join(root, "site", meta.path, "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  written.push({ file, path: meta.path, html });
}

// --- Vérifications de conformité (cahier des charges, section 1 et checklist de recette) ---

// Expressions interdites. « indépendant » est toléré uniquement dans « non indépendant(e) »,
// mention exigée par la réglementation (section 5.2). « garanti » n'est interdit que comme
// promesse : les tournures listées dans ALLOWED_GARANTI sont celles du cahier des charges.
// « agréée par l'AMF » n'est permis que pour l'association (CNCEF), jamais pour le cabinet.
// Frontières de mot écrites en Unicode : en JavaScript, \b ne reconnaît pas « é » comme une lettre.
const FORBIDDEN = [
  /(?<!non )(?<!\p{L})ind[ée]pendante?s?(?!\p{L})/iu,
  /(?<!association )(?<!\p{L})agr[ée][ée]e?s? (par l'|par l’)?AMF(?!\p{L})/iu,
  /(?<!\p{L})contr[ôo]l[ée]e?s? par l['’]AMF(?!\p{L})/iu,
  /(?<!\p{L})sans risques?(?!\p{L})/iu,
  /(?<!\p{L})rendements? assur[ée]e?s?(?!\p{L})/iu,
  /(?<!\p{L})100\s?%\s?honoraires(?!\p{L})/iu,
  /(?<!\p{L})sans commissions?(?!\p{L})/iu,
];
const ALLOWED_GARANTI = ["rendement garanti", "garantie financière", "Garantie : si l"];

const problems = [];
for (const { path, html } of written) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;| | /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  for (const re of FORBIDDEN) {
    const hit = text.match(re);
    if (hit) problems.push(`${path} : expression interdite « ${hit[0]} »`);
  }
  let rest = text;
  for (const ok of ALLOWED_GARANTI) rest = rest.split(ok).join("");
  const garanti = rest.match(/\bgarantie?s?\b/i);
  if (garanti) problems.push(`${path} : « ${garanti[0]} » hors des tournures autorisées`);
  if (!html.includes('class="reg-block"')) problems.push(`${path} : bloc réglementaire absent du pied de page`);
}

console.log(`${written.length} pages générées :`);
for (const { path } of written) console.log(`  site${path}index.html`);

if (missing.size) {
  console.log(`\n${missing.size} valeurs à compléter dans offre/site.config.json :`);
  for (const [key, pages] of missing) console.log(`  ${key.padEnd(26)} ${[...pages].join(", ")}`);
}

if (problems.length) {
  console.error(`\nRègles de conformité enfreintes :\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("\nConformité : aucun mot interdit, bloc réglementaire présent sur toutes les pages.");
