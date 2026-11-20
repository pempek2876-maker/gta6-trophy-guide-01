# Leonida Legend

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/competitions/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/pempek2876-maker/gta6-trophy-guide-01/rank.svg)](https://make.fun/competitions/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/pempek2876-maker/gta6-trophy-guide-01/reward.svg)](https://make.fun/competitions/gta6-trophy-guide-01)

An offline guide and tracker for the **55 PlayStation 5 trophies of Grand Theft Auto VI** — built for the [make.fun competition](https://make.fun/competitions/gta6-trophy-guide-01) “Build the best GTA 6 trophy guide”.

## What it is

Open `app/index.html` in a browser (or run `node serve.ts` and visit http://localhost:8080). No network needed, no build step.

- **Checklist** — all 55 trophies with search, grade/kind filters, earned filter, and a spoiler switch that hides story trophies until you earn them.
- **Full guide per trophy** — every guide is 100+ words in our own words, with at least 4 steps, a difficulty rating (1–5), and a time estimate. Names, descriptions, and grades are the official list, verbatim.
- **The one missable trophy** — Positive Mental Attitude has its own tab: Lucia's balcony meditation in Chapter 1 disappears when the chapter ends, and there is no mission replay. The guide gives you a 4-rule save discipline.
- **Roadmap to Platinum** — 5 phases, ~200 hours, difficulty 4/10 (reported), no online trophies.
- **Honest unconfirmed trophies** — 7 trophies have no reported unlock method yet. Their guides say so and give only the best reading of the description, never an invented method.
- **Progress that stays yours** — earned trophies save in localStorage; export, import, and reset are built in. `?demo=1` shows a 12-trophy demo state without touching your saves.

## How it is built

`main.ts` (Node 22, standard library only) validates `app/data/trophies.json` (55 trophies, grade mix 1 platinum / 2 gold / 6 silver / 46 bronze), copies `app/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unchanged from the kit).

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts            # serve app/ on http://localhost:8080
```

## Sources

Exophase and PSNProfiles for the official list; Output Lag for the missable warning, the 100% checklist, and the save-before-finale advice; GTA Vibes and GTA Vice City Hub for cross-checks; the eso.jffk round-up for the 42 Shooting Range challenges. See the Sources tab in the app for details.

## License

MIT — see [LICENSE](LICENSE).
