# Warhammer 40K Reminders

Build a Warhammer 40,000 **10th-edition** army, choose its equipment and attachments, and open its phase-by-phase reminder sheet. Play, print and local saved armies work on GitHub Pages.

[Open the application](https://bmckernan87.github.io/warhammer-40k-reminders/)

## Development

Use Node 22 or newer.

```sh
npm ci
npm run dev
npm test
npm run rules:audit
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

The browser suite serves the production build under the Pages subpath and runs the main workflows in desktop Chromium and iPhone-sized WebKit.

## Rules maintenance

The faction index in `src/data/catalog.json` stores normalized identifiers, upstream faction and detachment identifiers, chapter restrictions and datasheet paths read from faction navigation. The initial index covers standard 10th-edition army detachments and excludes Boarding Actions. Catalog entries outside the four priority faction groups still need datasheet review.

Use the publisher’s [data export and format specification](https://wahapedia.ru/wh40k10ed/the-rules/data-export/) to check changes to its metadata. Given a current official detachment index, `python scripts/check-detachments.py /path/to/Detachments.csv` reports added, removed and renamed IDs. Check each changed entry against its faction page. A listed name or link alone establishes no rule effect.

For a reviewed datasheet, add selected characteristics, weapon profiles, legal choices and Leader restrictions to `src/data/profiles.json`. Record the source URL, review date and edition. Add independently written trigger, timing, eligibility and effect records in `src/data/rules.ts`. The generator resolves the records against individual models’ equipment and actual Leader and Bodyguard assignments. Scoped effects distinguish the bearer from its attached unit. Informational Stratagem cards leave CP expenditure to the player.

`npm run rules:audit -- --json` lists individual missing profiles, missing abilities, missing detachment rules, unresolved source links and rules due for rechecking. A datasheet with one entered ability still needs review for completeness. The app validates the data relationships at startup and exercises each faction and detachment in tests.

Each named army saves its roster, preferences and battle locally. Army exports and share links transfer the configuration. Battle backups are separate. The importer migrates both previous local save formats and flags name-only pairings when several copies could match.
