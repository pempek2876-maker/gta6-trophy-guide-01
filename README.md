# Leonida Legend

[![make.fun competition](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/pempek2876-maker/gta6-trophy-guide-01/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/pempek2876-maker/gta6-trophy-guide-01/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of **Grand Theft Auto VI** — built for the [gta6-trophy-guide-01 competition on make.fun](https://make.fun/c/gta6-trophy-guide-01).

## What it is

Leonida Legend is a static web app (no build step, no network at run time) that helps you earn the GTA VI platinum:

- **Checklist** — all 55 official trophies with names, descriptions, and grades, plus an original guide and 2–4 steps for each. Tick trophies off as you earn them; progress is saved in your browser.
- **Roadmap to Platinum** — five phases from story to cleanup, about 200 hours at a reported difficulty of 4/10.
- **Missable** — the one trophy you can miss for good (#28, Positive Mental Attitude) and the save discipline that protects it: there is no mission replay and no New Game Plus.
- **Sources** — where every fact comes from (Exophase, PSNProfiles, Output Lag, GTA Vibes, GTA Vice City Hub, eso.jffk), and what "unconfirmed" means for the seven trophies with no reported unlock method yet.

Story trophies are hidden behind a spoiler mask by default — names, descriptions, and guides stay masked until you earn them. Demo mode (`?demo=1`) ticks a fixed 12-trophy set in memory for a quick look.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Or open `app/index.html` through any static file server. Your progress is stored in `localStorage` under `leonida-legend-progress-v1`; export it as JSON any time from the progress card.

## Rebuild the dossier

```sh
MAKEFUN_OUTPUT_DIR=/tmp/leonida-out node main.ts
```

`main.ts` validates the trophy data (55 trophies, grade mix 1 platinum / 2 gold / 6 silver / 46 bronze), copies `app/` and `screenshots/` into the output directory, and writes `dossier.json` there with the kit's `buildDossier`.

## Notes

- An unofficial fan-made guide. Not affiliated with Rockstar Games or Sony. Trophy names, descriptions, and grades are the official PlayStation list; the guides are original writing.
- No Rockstar logo, artwork, or game screenshots are used anywhere in this app.

## License

MIT — see [LICENSE](LICENSE).
