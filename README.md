# News-image 20261125 — The world on Wednesday, 25 November 2026

[![news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/nunfixx/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/nunfixx/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125)

A Node 22 program (standard library only, no network at runtime) that draws a
1024×1024 front page summing up Wednesday 25 November 2026's world news and
writes it to `entry.png`. Every pixel is drawn by `main.ts`: a small bitmap
font, flat colour blocks and simple shapes — deterministic, same bytes on
every run.

## The seven stories

1. **2 tankers hit mines in Hormuz** — Iran says 2 tankers struck mines and
   caught fire on an unauthorised route; Iran claims 2 US drones downed; the
   US tells its citizens to leave Iran now.
2. **Houthis claim a strike on Saudi Arabia's biggest refinery** — Ras Tanura,
   550,000 bpd; 4 drones shot down; Brent $94.61, +3.5%.
3. **Wall Street whiplash** — Nasdaq −4.6% intraday, ends −0.6%; S&P −0.25%,
   Dow +0.33%; Nvidia −3.9% as hot inflation (PCE +3.8% y/y) meets the AI
   selloff.
4. **Pakistan's first astronaut docks at Tiangong** — Shenzhou-24, launch to
   docking in 3.5 hours; Ali stays about a week, returns on Shenzhou-23.
5. **Trump hits 14 partners with new tariffs** — China 20% (40% if the truce
   fails); hearing 25 Jan 2027.
6. **19 killed in RSF drone strikes in Sudan** — rights group says 19 dead in
   Blue Nile: Damazin homes hit, dam targeted; toll reported Wednesday.
7. **Bangladesh garment wage +36% to 17,000 taka** — after weeks of
   protests; workers wanted 18,000 taka.

All figures verified against Reuters, AP and Xinhua reporting of 25 Nov 2026;
disputed items are worded as claims, with attribution in the image.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
