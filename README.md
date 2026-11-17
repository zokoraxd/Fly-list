# ✈️ Fly-List

> A travel to-do planner with a single natural-language input. Type **"Flight to Tokyo next Friday"** and Fly-List attaches the destination, the date, live weather for your trip day, a Wikipedia travel guide and a pin on a 3D globe.

[![CI](https://github.com/zokoraxd/fly-list/actions/workflows/ci.yml/badge.svg)](https://github.com/zokoraxd/fly-list/actions/workflows/ci.yml)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why

Most trip planners make you fill in a city field, a date field, a category and a title before they do anything useful. Fly-List replaces all of that with one text box. Everything else is inferred from what you type, in English or Arabic.

| You type                              | Fly-List understands                                                 |
| ------------------------------------- | -------------------------------------------------------------------- |
| `Flight to Tokyo next Friday`         | Destination **Tokyo 🇯🇵**, date **next Friday**, weather for that day |
| `حجز فندق في اسطنبول بعد أسبوعين`     | Destination **Istanbul 🇹🇷**, date **in two weeks**                   |
| `Flight from Cairo to Paris 12 March` | Destination **Paris** (the "to", not the "from"), date **12 March**  |
| `Have a nice flight` / `Buy a turkey` | Plain tasks. No destination, no network call                         |

## Features

- **One input, no forms.** Destination and date are extracted while you type, with a live preview before you press Enter.
- **Date-aware weather.** Current conditions plus a 16-day forecast from Open-Meteo. If your trip is within range you see the forecast for that exact day. Further out, you see typical weather for that week based on last year's records.
- **Smart packing advice** per destination (rain, snow, cold, heat, wind), based on the trip-day forecast. Add with one click or dismiss permanently.
- **Travel guides** from Wikipedia with disambiguation handling ("Washington" resolves to the city, "Georgia" to the country) and Arabic articles when the UI is in Arabic.
- **3D globe** (MapLibre, loaded only when you open the tab). Drag to turn it and click any spot to see its coordinates in degrees, the current temperature and a short Wikipedia guide, then add it to your list. Search finds cities, countries and landmarks ("Eiffel Tower", "برج إيفل"). Your trips appear as numbered pins joined by a route that follows the Earth's curve; a button flattens the globe into a 2D map.
- **Arabic names without a translation service.** A place picked in Arabic shows its Arabic Wikipedia title, then the Open-Meteo Arabic name, and countries use the browser's built-in region names.
- **Group by destination** with progress bars, or filter by status and place.
- **Export** as Markdown (for WhatsApp or Notion), a print-ready sheet, or a JSON backup you can restore later.
- **English and Arabic** UI with full right-to-left layout, **light and dark** themes, keyboard-accessible dialogs, and undo for deletions.
- **Local-first.** Everything lives in your browser. No account, no API keys, no tracking.

## How detection works

```
"Flight from Cairo to Paris 12 March"
          │
          ▼
 ┌─ Tokenise + normalise (Arabic letter variants, clitic prefixes و/ب/ل) ─┐
 │                                                                        │
 │  Local gazetteer: ~215 countries, capitals and tourist cities          │
 │  + ~300 aliases (NYC, KSA, Marrakesh, القاهرة, …)                      │
 │  Longest phrase wins. Destination cues ("to") beat origin cues ("from")│
 │  Ambiguous words (Nice, Turkey, Jordan…) need capitals or a travel cue │
 └───────────────┬───────────────────────────────┬────────────────────────┘
                 │ hit                            │ miss, but looks like travel
                 ▼                                ▼
         Paris 🇫🇷 (48.86, 2.35)        Open-Meteo geocoder (populated places only)
                 │
                 ▼
   Open-Meteo forecast ‖ Wikipedia summary   (parallel, 8s timeout, cached 30 min)
                 │
                 ▼
   Date parser: "12 March" → 2027-03-12 → forecast for that day or typical weather
```

The gazetteer lookup is synchronous and runs on every keystroke. The network is only touched when a task is added or when cached weather is older than 30 minutes.

## Getting started

Requires Node.js 20.19 or newer.

```bash
git clone https://github.com/zokoraxd/fly-list.git
cd fly-list
npm install
npm run dev
```

| Script            | What it does                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `npm run dev`     | Start the dev server                                             |
| `npm run build`   | Production build into `dist/` (relative paths, deploys anywhere) |
| `npm run preview` | Serve the production build locally                               |
| `npm test`        | Run the unit tests (Vitest)                                      |
| `npm run lint`    | ESLint with the Vue plugin                                       |
| `npm run format`  | Prettier                                                         |

## Project structure

```
src/
├── components/        UI (TaskList, TaskItem, SmartInput, NextTrip, TripGlobe, DestinationModal, ExportModal…)
├── composables/       useTasks (store), useTheme, useToast
├── data/              places.js (gazetteer + extractor), placeAliases.js
├── i18n/              en.js, ar.js, index.js
├── services/          travelApi.js (Open-Meteo, Wikipedia, geocoding, detection pipeline)
├── store/             storage.js (schema, validation, v3 → v4 migration)
└── utils/             dateParser, packing, exportUtils, http, escapeHtml, flags
tests/                 Vitest unit tests for every pure module
```

## Data and privacy

All data is stored in `localStorage` under `fly_list_state_v4`. Nothing is sent anywhere except the public, keyless APIs below, and only the place name or coordinates are sent:

- [Open-Meteo](https://open-meteo.com/) forecast, archive and geocoding APIs
- [Wikipedia REST API](https://www.mediawiki.org/wiki/API:REST_API) and the MediaWiki search and langlinks endpoints
- [OpenFreeMap](https://openfreemap.org/) vector tiles (built on [OpenStreetMap](https://www.openstreetmap.org/copyright) data) for the globe
- [Nominatim](https://nominatim.org/) reverse geocoding, only for the spot you click on the globe (cached, about one request per second)

Use **Export → Download backup** to move your data between browsers.

## Date phrases understood

English: `today`, `tomorrow`, `day after tomorrow`, `in 3 days`, `in two weeks`, `in a month`, `next week`, `next month`, `next weekend`, `Friday`, `next Friday`, `on Fri`, `12 March`, `March 12th, 2027`, `Dec 5`, `11/20`, `20/11/2026`, `2026-11-20`.

Arabic: `اليوم`, `غداً`, `بكرة`, `بعد غد`, `بعد 3 أيام`, `بعد أسبوعين`, `الأسبوع القادم`, `الشهر الجاي`, `الجمعة`, `الجمعة القادمة`, `يوم الاثنين`, `12 مارس`, `٥ كانون الأول`.

Numeric dates with both parts ≤ 12 follow the UI language: month/day in English, day/month in Arabic.

## Deploying & Custom Domain

Fly-List builds into a pure static bundle (`dist/`). It needs no backend, no database, and no API keys, and uses `base: './'` so it works from any domain or subpath.

### 1. Push to GitHub

```bash
git branch -M main
git add .
git commit -m "Initial release"
git remote add origin https://github.com/zokoraxd/fly-list.git
git push -u origin main
```

### 2. Deploy the static site (free, global CDN, never sleeps)

Connect the `zokoraxd/fly-list` repository to any static host with these settings:

| Setting           | Value           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Publish directory | `dist`          |

Recommended free hosts:

- **Cloudflare Pages** (unlimited bandwidth on free plan)
- **Vercel** or **Netlify** (automatic preview deploys per commit)

### 3. Connect a custom domain

1. Register a domain (e.g. via **Cloudflare Registrar**, **Spaceship**, or **Porkbun**).
2. In your hosting provider's dashboard (**Custom Domains**), add `flylist.yourname.com` (or `yourname.com`).
3. Create the `CNAME` (or `ALIAS`/`A`) record shown by the host at your DNS provider. HTTPS is provisioned automatically.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint && npm test` before opening a PR. Adding a place is a one-line change in `src/data/places.js`; adding a spelling or an Arabic name is one line in `src/data/placeAliases.js`, and the test suite checks that every alias resolves.

## License

[MIT](LICENSE)
