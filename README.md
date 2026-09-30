# ploegapp.nl

De voorlichtingssite van **Ploegapp**: wat de app is, wat hij kan en hoe je hem gebruikt, met
screenshots van de nieuwste versie.

- **Altijd actueel.** Elke nacht haalt GitHub Actions de nieuwste app op, start die met een lege
  database, vult hem met verzonnen gegevens en maakt nieuwe screenshots.
- **Alleen verzonnen gegevens.** Het korps "Brandweer Duinwijk" en alle namen zijn verzonnen
  (`scripts/voorbeeld.js`). Het screenshotscript stopt als er iets anders in de database staat.
- **Geen app-code in deze repo.** De app is privé en blijft dat. Hij staat alleen tijdelijk op de
  runner (`.app/`, in `.gitignore`), en de workflow faalt als er ooit app-bestanden in deze repo staan.
  De gepubliceerde site bevat alleen html, css, png, svg en txt.
- **Geen cookies, trackers of externe diensten.** Geen JavaScript op de site. `scripts/controleer.js`
  laadt elke pagina in Chromium en keurt de site af bij een cookie, script of verzoek naar buiten.

## Opbouw

| Map / bestand | Wat |
|---|---|
| `inhoud/*.html` | De tekst van de pagina's. `[[telefoon naam \| onderschrift]]` zet een screenshot in een telefoonrand. |
| `inhoud/dekking.json` | Welke functie van de app op welke pagina staat. |
| `sjabloon/` | Paginasjabloon, opmaak en icoon |
| `scripts/voorbeeld.js` | Start de app en vult hem met verzonnen gegevens (via de gewone API) |
| `scripts/screenshots.js` | Maakt de screenshots (Playwright) |
| `scripts/bouw.js` | Bouwt de site in `uit/` |
| `scripts/controleer.js` | Privacy- en kwaliteitscontrole vóór publicatie |
| `scripts/dekking.js` | Nieuwe functie in de README van de app zonder uitleg hier? Dan komt er een issue. |

## Tekst aanpassen

Pas een bestand in `inhoud/` aan en push naar `main`; de site wordt binnen een paar minuten opnieuw
gepubliceerd. Een nieuw screenshot voeg je toe in `scripts/screenshots.js`.

Een pagina begint met een kopblok:

```html
<!--
titel: Functies
beschrijving: Eén zin voor zoekmachines
menu: 3          (volgorde in het menu; weglaten = niet in het menu)
menutekst: Functies
-->
```

Gebruik geen `style="..."` of `<script>`: de Content-Security-Policy blokkeert ze en de controle faalt.

## Lokaal draaien

Node.js 22.5 of nieuwer en een checkout van de app ernaast:

```bash
npm ci
APP_PAD=../ploegapp npm run alles   # screenshots, bouwen, controleren
npm run bekijk                      # http://localhost:8080
```

De app zelf heeft zijn eigen afhankelijkheden nodig (`npm ci --omit=dev` in de app-map).

## Eenmalig instellen

1. **Alleen-lezen token voor de app.** GitHub → Settings → Developer settings → Personal access tokens →
   *Fine-grained tokens* → *Generate new token*:
   - Repository access: *Only select repositories* → `ploegapp`
   - Permissions → Repository permissions → **Contents: Read-only** (verder niets)
   - Vervaldatum: bijvoorbeeld een jaar (zet een herinnering om hem te vernieuwen)

   Zet hem in deze repo onder Settings → Secrets and variables → Actions → *New repository secret*,
   met de naam `PLOEGAPP_LEES_TOKEN`.
2. **Optioneel: verboden woorden.** Secret `VERBODEN_WOORDEN` met komma-gescheiden woorden die nooit
   op de site mogen staan (bijvoorbeeld echte namen of de echte korpsnaam). De controle keurt de site
   dan af als een van die woorden erin staat. Het staat in een secret, zodat de lijst zelf niet publiek is.
3. **GitHub Pages aanzetten.** Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. **Eigen domein.** Settings → Pages → Custom domain: `ploegapp.nl`, daarna *Enforce HTTPS* aanvinken
   zodra dat kan. DNS bij de domeinregistrar:

   | Naam | Type | Waarde |
   |---|---|---|
   | `@` | A | `185.199.108.153` |
   | `@` | A | `185.199.109.153` |
   | `@` | A | `185.199.110.153` |
   | `@` | A | `185.199.111.153` |
   | `@` | AAAA | `2606:50c0:8000::153` |
   | `@` | AAAA | `2606:50c0:8001::153` |
   | `@` | AAAA | `2606:50c0:8002::153` |
   | `@` | AAAA | `2606:50c0:8003::153` |
   | `www` | CNAME | `svenkortekaas.github.io` |

   Laat de records van de app (de subdomeinen van de korpsen) staan zoals ze zijn. Aanrader: verifieer het domein
   in je GitHub-account (Settings → Pages → *Add a domain*), zodat niemand anders het kan claimen.

## Privacy van deze site

GitHub Pages ontvangt bij een bezoek technisch het IP-adres van de bezoeker en bewaart dat tijdelijk
in logbestanden. Dat staat eerlijk op de pagina *Over deze site*. De site zelf verzamelt niets.
