# Blood Angels, Dark Angels, Black Templars and Space Wolves source audit

Checked 25 November 2026. This batch extends the current 11th-edition Space Marines implementation with the four remaining chapter collections. It covers **66 chapter-specific datasheets, 151 named datasheet/wargear entries, 92 core-ability entries and 316 full native weapon profiles**. Chapter upgrades add no new weapon profiles in this batch. Existing common Space Marines cards and the separately conditional Deathwatch collection retain their existing source audit.

| Chapter | Current CSV source | Specific cards | Named entries | Core entries | Weapon profiles |
| --- | --- | ---: | ---: | ---: | ---: |
| Blood Angels | `000000021` | 14 | 31 | 29 | 71 |
| Dark Angels | `000000023` | 16 | 41 | 21 | 68 |
| Black Templars | `000000162` | 15 | 28 | 21 | 85 |
| Space Wolves | `000000036` | 21 | 51 | 21 | 92 |
| **Total** | | **66** | **151** | **92** | **316** |

The native roster reconciliation covers **154 legal starting strengths, 81 physical model roles, 25 Leaders, four Supports, 27 later-copy price tables and nine datasheets with paid equipment**. Crusaders, Headtakers and Wolf Scouts retain 67 distinct legal mixed compositions. Existing common cards, actual allied identities and current attachment permissions are resolved in each chapter's faction context.

The chapter detachment inventory adds **12 detachments, 12 traits, 48 Stratagems and 32 enhancements or unit Upgrades**, including five repeatable unit Upgrades. Every rule has a source identifier and paragraph hash, and its eligible roster execution is covered by the detachment tests.

| Chapter | Current chapter detachments |
| --- | --- |
| Blood Angels | Angelic Inheritors; Encarmine Speartip; Wrath of the Doomed |
| Dark Angels | Wrath of the Rock; Inner Circle Task Force; Darkflight Pursuit |
| Black Templars | Vow-sworn Crusaders; Marshal's Household; Fist of the God-Emperor |
| Space Wolves | Saga of the Great Wolf; Champions of Fenris; Saga of the Beastslayer |

Each chapter also receives its permitted common Codex detachments and conditional Deathwatch Support. Black Templars excludes Gladius Task Force. The selectable totals are 19 for Blood Angels, Dark Angels and Space Wolves, and 18 for Black Templars; printed uniqueness tags still prevent incompatible selections.

## Current-source gate and limitations

The working export is [Wahapedia's current 11th-edition Space Marines collection](https://wahapedia.ru/wh40k11ed/factions/space-marines/), last updated **23 November 2026 at 01:43:36**. Its four chapter source rows explicitly identify edition 11 and type App, with an errata date of **3 October 2026**. Their version fields are empty; this audit does not assign them an app version that those rows do not record. Named-entry SHA-256 values in `CHAPTER_INTRINSIC_INVENTORY` bind each paraphrased implementation to its actual source paragraph. No generic rendering of an unhandled paragraph is used.

Independent physical-model, equipment and profile reconciliation uses [40kdc-data at commit `fd1035a4e2ac7330835010e660bdd7216bfa3fd9`](https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/adeptus-astartes). All four chapters are consolidated in that repository's `adeptus-astartes` directory. Current records are explicitly marked edition 11, dataslate 14 October 2026; the single Headtakers unit-metadata exception is enumerated below. The full independent weapon file contains 680 records; only actual weapons of the 66 selected cards enter this batch.

Membership, strength tiers, later-copy prices and paid equipment are independently compared with Munitorum Field Manual **1.6**, first seen **14 October 2026**, in the four chapter YAML files from the points repository at `6eed7b100ae508c1faa76a42bf7b55ecabb59107`. The chapter collections contain 83/85/75/88 current units respectively after adding their permitted common cards. The 69/69/60/67 shared generic cards' prices and wargear are checked against the existing common records, rather than silently replaced.

### Publisher verification

The [official downloads index](https://www.warhammer-community.com/en-gb/downloads/warhammer-40000/) and its observed public downloads search endpoint were checked for each chapter, for printed-product updates, and for the shared Space Marines update. Requests used the observed `downloads_v2` index with chapter search terms, with and without the game-system/language filters. Unfiltered chapter searches and official-domain web searches were also checked.

**No current, separate English chapter Printed Product Update or FAQ was exposed by those checks.** Blood Angels, Dark Angels and Space Wolves searches returned September Legends packs; those packs are outside this batch. Black Templars returned no matching current update. Other global hits included Horus Heresy material and a French Wolf Scouts sheet, which were also excluded. This is a publisher-index limitation, not a claim that a separate current chapter PDF was downloaded or verified. Old June faction packs were not substituted.

The same endpoint did return the current shared [Space Marines Printed Product Updates v1.1, 14 October 2026](https://assets.warhammer-community.com/eng_14-10_wh40k_printed_product_updates_space_marines_updates-91hillwcff-wzs8qnozam.pdf), so the missing chapter results were not treated as a general endpoint failure. That document covers the common Space Marines corrections already recorded in `SPACE_MARINES_SOURCE_INVENTORY.md`; it contains no separate correction to these 66 chapter cards. The publisher's [29 October updates notice](https://www.warhammer-community.com/en-gb/articles/cumo9vbg/the-warhammer-40000-updates-update/) also confirms that the October app changes were distributed among downloads. This audit therefore retains explicit current-card/independent-data discrepancies below, rather than presenting every field as publisher-PDF-confirmed.

The [primary 11th-edition Core Rules PDF](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf) was read locally alongside the current [core rules and FAQ index](https://wahapedia.ru/wh40k11ed/the-rules/core-rules/). The primary PDF is particularly material to Pistol equivalence, attached-unit ability propagation and explicit keyword grants.

## Exact independent-data corrections and aliases

Unexpected changes to any guarded input fail generation; these are specific reconciliations, not permissive defaults. The chapter weapon adapter first applies the existing base Space Marines adapter and then these additional checks.

| Record or source fact | Exact treatment |
| --- | --- |
| Five independent Storm Bolter item labels | `storm-bolter`, `storm-bolter-deathwing-terminator-squad`, `storm-bolter-murderfang`, `storm-bolter-wulfen-dreadnought` and `storm-bolter-baal-predator` have a plural item label but singular printed weapon. Check their complete current profile and date, then normalize the item label to Storm Bolter. Baal's Assault ability is retained. |
| Independent `bolt-rifle` | Guard both complete Focused Fire and Saturation profiles, then normalize the plural item label to Bolt Rifle. No statistic or ability is changed. |
| Deathwing Terminator Chainfist | The independent record repeats Chainfist for both profile names. Guard both complete profiles, then name them Standard and Hunter. The Hunter profile independently restricts targets to Monster or Vehicle; this restriction remains explicit in weapon text. |
| Bjorn Assault Cannon | Independent BS3 differs from the current CSV and [live Bjorn card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Bjorn-The-Fell-handed), which give BS2. Guard the full independent record before changing only BS to 2. |
| Castellan Heavy Bolt Pistol | Independent S5/Close-quarters differs from the current CSV and [live Castellan card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Castellan), which give S4/Pistol. Guard the full independent profile and preserve the current S4/Pistol. Primary Core24.27 expressly equates Pistol and Close-quarters for all rules purposes; the printed label is supported and no obsolete pistol rules or unresolved-keyword warning is introduced. |
| Mephiston invulnerable save | Independent 5+ differs from the current CSV and [live Mephiston card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chief-Librarian-Mephiston), both 4+. Guard those exact two values and retain 4+. |
| Death Company Captain with Jump Pack Leader | The independent core-ability array omits Leader, while the same current independent record explicitly assigns the Leader attachment role. Guard the omission, role and empty CSV parameter; retain the current printed Leader ability. |
| Ravenwing Darkshroud Lone Operative | The independent ability string omits its distance. Guard that unparameterized record and the current printed 15-inch parameter. The actual 15-inch detection restriction is retained. |
| Three Torrent skill fields | Iron Priest Helfrost Pistol—Dispersed, Murderfang Heavy Flamer and Wulfen Dreadnought Heavy Flamer print BS7 where the independent records use a dash. Guard the exact unit/profile, values and Torrent ability; keep the printed 7 while Torrent still hits automatically. |
| Wolf Guard Headtakers unit metadata | Its unit record alone is marked pre-launch-provisional and contains six exact malformed/collapsed prices, including 3 models at 115/125. The independently current composition and current CSV/live/MFM data are reconciled separately. Guard the complete old metadata/price array, promote the verified identity to the current revision, and discard that obsolete price array. |
| Headtaker composition prices | Preserve distinct H3/W0=85, H3/W3=115, H6/W0=170 and H6/W6=230 configurations, with third-copy values 95/125/180/240. The literal current composition permits 3–6 Headtakers and either zero or 3–6 Wolves. Its 20 legal mixtures use a printed price tier that covers each actual component; do not infer one- or two-Wolf mixtures or collapse the two six-model units. |
| Extra Space Wolves Venerable MFM row | The independent current YAML also carries an unmarked, same-named flat 165-point row belonging to the Legends Space Marines card. Guard both exact rows and remove only that Legends row. The current Space Wolves card remains 130 points, or 140 for the third and later copy. |
| Independent physical-profile aliases | Honor explicit `profile_name` mappings: Ravenwing Huntmaster uses Black Knight; Ravenwing Apothecary/Ancient use Champion; Crusader Sword Brother uses Initiate; Blood Claw, Grey Hunter, Wolf Guard Terminator, Thunderwolf and Wolf Scout Pack Leaders use their stated ordinary profile. Split comma-separated printed aliases for Sword Brother/Initiate and Wolf Scout/Pack Leader. No new role is invented. |
| Deathwing whole-unit weapon exchange | Guard the complete independent uniform choice and current printed instruction, then preserve the all-Knights Mace-to-Power-Weapon exchange as a unit-wide choice. The Knight Master's own weapon stays distinct. |
| Watchers in the Dark | The only two model-less chapter equipment slots are the optional Watchers on Deathwing Knights and Deathwing Terminator Squad. Guard both independent slots and printed options. Represent each once per unit, not as an arbitrary physical model's item. |
| Sword Brethren omitted independent caps | Under an exact guard of all five printed options, restore the four every-four-model limits: at most two Hand Flamers, one Thunder Hammer, one Plasma Pistol and one Twin Lightning Claws. Preserve the unlimited Power Weapon exchange separately. |
| Wolf Scout omitted independent caps | Under exact printed-option and existing-limit guards, restore one Runic Stave/Thunderclap bearer and one Plasma Gun. The optional Haywire Mine remains on its actual model and retains its Plasma Pistol prerequisite. |
| Grey Hunter and Headtaker split rules | Native generation exact-checks each complete printed split instruction. The generated split selection names actual purchased models; it does not generate replacement models or duplicate weapons. |

The full-profile generator checks Range, Attacks, BS/WS, Strength, AP, Damage, every weapon ability, target restrictions, every actual model's invulnerable save and every core-ability parameter. It also checks independent profile completeness, so a weapon cannot silently disappear because its printed name changed. Chapter lookup uses **faction then actual unit name**: the six Black Templars Impulsor/Gladiator/Repulsor names do not overwrite common Space Marines cards and are not renamed into invented units.

## Rule interpretation and implementation contracts

The following consequences are deliberate and source-based:

- **Attached sources and durations.** Core19.04 retains a surviving Leader/Support's own leading abilities after its original Bodyguard is destroyed. A Bodyguard's rules cease when its last source is lost. The final attacking sequence retains a source-dependent benefit through that attacker's remaining attacks. An already applied effect with an explicit duration retains that duration when the original source dies or leaves the battlefield. Core01.02.02 supplies the current phase as the default for an effect granted without a longer printed duration.
- **Explicit grants versus keyword aggregation.** Primary Core01.02 and19.04, reinforced explicitly by current Core01.02.07, apply unit-level effects to every actual model in the affected attached unit. Core19.03 prevents a model inheriting another model's personal printed keywords merely through aggregation. These are separate cases: the DA army's explicit Deathwing/Ravenwing grants and Wolf-Touched's explicit Wulfen grant propagate as effects to affected models; simply joining a model with a printed keyword does not. A chosen chapter army never invents a generic model's personal chapter identity. Wolf-Touched's source must survive and its Wulfen grant affects actual-model transport and aura checks.
- **Exact psychic windows.** Mephiston, Ezekiel and Njal each have a printed level-3 budget, although their CSV faction-ability list does not literally include Librarius. The shared army handler therefore explicitly recognizes those declarations. Each power is available once per phase within that budget and only while not Battle-shocked. A roll of 1 Battle-shocks the formation but still applies the power's effect. Transfixing Gaze and Murderous Hurricane expire in the Movement phase in which they were used; Whispers, Storm Caller and Watcher protections also retain their actual phase expiry. Tempest's Wrath instead retains its printed next-own-turn expiry.
- **Selections made during play.** Chosen doctrines, relics, Lion abilities, quarry, Slayer's Oath, reserve recipients and psychic targets are reminders with explicit conditions. The roster does not pretend that a battlefield target or choice has already been made. No new gameplay mode, dice engine or manual eligibility checklist is added.
- **Black Rage.** The current Death Company text joins its two absence conditions with a literal OR. The reminder preserves that wording's consequence: both positive proximity checks must be satisfied to avoid the Fall Back/OC restriction. It does not replace the printed current rule with a remembered older edition or assume that either source alone is enough. The named current [Death Company Captain card](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Captain) was checked.
- **Actual model and equipment scope.** Grimaldus's Servitors use zero transport spaces but remain real models; their presence enables a relic choice, and Grimaldus's survival maintains the selected relic after a Servitor dies. Ravenwing Command effects require the actual relevant role. Hunting Hounds affects only actual Hunting Wolves on mixed cards. Murder-maker and Gift of the Iron Wolf use actual eligible model keywords rather than a manufactured model keyword from a unit union. Wolf Guard shield Wounds bonuses and other units' shield invulnerable saves remain distinct and personal.
- **Wulfen weapons and current healing.** Violent Fury counts two physical melee weapons, not two modes of one axe. Death Totem is default Wulfen equipment that can be exchanged for a Stormfrag Auto-launcher. Unit healing first repairs an injured survivor, then may revive non-Character models; a Character is not restored through ordinary unit healing.
- **Movement reactions.** The Death Company Dreadnought surge requires a hit; Wulfen Dreadnought requires a lost wound; Crusaders require a destroyed model. All retain current surge restrictions. The Homer discounts Rapid Ingress at opponent Movement end and is lost after any enemy move ending within one inch, including reactions. A Normal reaction move does not permit engagement.
- **Normal and snap shooting.** Vengeance's return fire is normal shooting against the triggering enemy and includes every equipped profile. It does not activate rules limited to the player's own Shooting phase. Snap shooting cannot modify or re-roll Hit rolls or produce Critical Hits; personal Wound re-rolls such as Arjac's remain available where applicable. Current weapon profiles and target restrictions are printed for the actual equipped bearers.

### Shared owners, rather than duplicate chapter rules

`CHAPTER_DELEGATED_INTRINSIC` explicitly records the entries implemented outside the chapter switch. The shared core handler owns actual shield benefits and printed core rules. The army handler owns the three psychic-budget declarations, Heirs of Sigismund, the Ravenwing/Deathwing grants, Curse of the Wulfen and Combat Doctrines. Muster validation owns Lion's Warlord requirement, Murderfang's Warlord prohibition and the Emperor's Champion copy limit. Shared transports own the six Black Templars transport rules and capacity/equipment; shared intrinsic/core code handles their common same-name chassis rules. The chapter runtime explicitly owns Blood Angels Captain Finest Hour/Strategic Acumen and Deathwing Knights Teleport Homer, so new unique cards cannot disappear behind a common-name switch.

Native and formation helpers own actual pre-battle splits. Grey Hunters divide the actual already attached formation as equally as possible, with explicit model assignments. Headtakers keep all Headtakers and attached Leader/Support models in one part and all Hunting Wolves in the other. Ragnar's Headtaker benefit applies only to his resulting part. New parts have their own Starting Strength and retain the applicable original rules; another part does not acquire the Leader's abilities. No current source for allocating a purchased unit's points between split parts was found. A compulsory-reserve minimum requiring only one such part therefore remains explicitly unknown; reserving both parts counts the original purchased cost once.

The shared core, detachment, weapon and transport handlers consume those same physical parts. Repeatable unit Upgrades reach both resulting units; Scouts, personal enhancements, Wolf-Touched and attached Inquisitor effects remain with their actual source. Fixed single-model Agents retain their already verified weapon names and abilities; the chapter adapter does not invent numerical Agent weapon profiles. Firing Deck excludes the other part's models and weapons. Dedicated-transport matching reports an exact compulsory-reserve minimum only when it can prove every split enters Drop Pods with both parts or neither part, charging the purchased Bodyguard once and each actual attached unit in full. When a feasible partial assignment exists, the exact partial price stays unknown.

## Verification

Final integration validation passes **5,775 unit tests across 278 files, the production build and all 72 browser tests**. Eight complete chapter armies cover one 1,000-point and one 2,000-point force for each chapter, 90 purchased units, 67 printed unit names and all twelve chapter traits. Their browser workflows build through the real editor, preserve physical equipment and Leader/Support assignments through save/reopen/reload, and produce no roster errors or warnings. All eight exports include all eleven phase bookmarks and total 206 pages: Blood Angels 22/30, Dark Angels 19/30, Black Templars 16/20 and Space Wolves 40/29.

The shared source-bank indexing changes were benchmarked against byte-identical reminder arrays. Median generation fell from 4,059 to 234 ms for the 2,000-point Wolves force, 2,559 to 108 ms for the split 1,000-point Wolves force, and 3,719 to 168 ms for the 2,000-point Blood Angels force. Only immutable faction/unit source data is indexed; mutable roster, attachment and casualty state is recomputed.

The focused chapter intrinsic suite currently has **98 passing tests**, including one inventory execution test for every specific card. Every named entry is either executed under a legal equipment/composition variant or named in the explicit delegation contract. Further tests exercise source loss, original formations, pending death triggers, psychic levels and exact expiry, real optional equipment, current profile corrections, same-named chapter vehicles, personal saves, surge distinctions and reactive weapon text. The 98 chapter tests and 125 existing base intrinsic tests pass together (223 total). Split tests verify source-part boundaries, actual weapon availability and persistence after source death. The shared runtime and new chapter runtime pass TypeScript checking together.

Both owned data generators reproduce their committed outputs byte for byte from the pinned inputs. An additional negative check accepts all 680 unmodified independent weapon records and deliberately mutates each of the nine newly corrected weapon records; all nine changes are rejected by their exact guards. Native generation and its separate chapter tests verify actual composition, current costs, every reachable weapon, equipment limits and model identity.

Reproduction commands (the relational and native files are separately owned shared dependencies):

```sh
node scripts/import-space-marine-chapters-profiles.mjs /tmp/11e-wahapedia-csv /tmp/sm-40kdc /tmp/sm-chapter-profiles-reproduced.ts
node scripts/import-space-marine-chapters-intrinsic.mjs /tmp/11e-wahapedia-csv /tmp/sm-chapter-intrinsic-reproduced.ts
cmp src/space-marine-chapters-card-profiles.generated.ts /tmp/sm-chapter-profiles-reproduced.ts
cmp src/space-marine-chapters-intrinsic.generated.ts /tmp/sm-chapter-intrinsic-reproduced.ts
npx vitest run tests/space-marine-chapters-intrinsic.test.ts
npx tsc --noEmit
```

## Card-by-card inventory

| Chapter | Current card | Named | Core | Weapons |
| --- | --- | ---: | ---: | ---: |
| Blood Angels | [Astorath](https://wahapedia.ru/wh40k11ed/factions/space-marines/Astorath) | 2 | 2 | 1 |
| Blood Angels | [Baal Predator](https://wahapedia.ru/wh40k11ed/factions/space-marines/Baal-Predator) | 1 | 2 | 7 |
| Blood Angels | [Blood Angels Captain](https://wahapedia.ru/wh40k11ed/factions/space-marines/Blood-Angels-Captain) | 2 | 1 | 5 |
| Blood Angels | [Chief Librarian Mephiston](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chief-Librarian-Mephiston) | 3 | 3 | 5 |
| Blood Angels | [Commander Dante](https://wahapedia.ru/wh40k11ed/factions/space-marines/Commander-Dante) | 2 | 2 | 2 |
| Blood Angels | [Death Company Captain](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Captain) | 3 | 2 | 5 |
| Blood Angels | [Death Company Captain with Jump Pack](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Captain-with-Jump-Pack) | 4 | 3 | 8 |
| Blood Angels | [Death Company Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Dreadnought) | 2 | 3 | 6 |
| Blood Angels | [Death Company Marines](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Marines) | 2 | 1 | 15 |
| Blood Angels | [Death Company Marines With Jump Packs](https://wahapedia.ru/wh40k11ed/factions/space-marines/Death-Company-Marines-With-Jump-Packs) | 2 | 2 | 9 |
| Blood Angels | [Lemartes](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lemartes) | 2 | 3 | 2 |
| Blood Angels | [Sanguinary Guard](https://wahapedia.ru/wh40k11ed/factions/space-marines/Sanguinary-Guard) | 2 | 1 | 3 |
| Blood Angels | [Sanguinary Priest](https://wahapedia.ru/wh40k11ed/factions/space-marines/Sanguinary-Priest) | 2 | 1 | 2 |
| Blood Angels | [The Sanguinor](https://wahapedia.ru/wh40k11ed/factions/space-marines/The-Sanguinor) | 2 | 3 | 1 |
| Dark Angels | [Asmodai](https://wahapedia.ru/wh40k11ed/factions/space-marines/Asmodai) | 2 | 1 | 3 |
| Dark Angels | [Azrael](https://wahapedia.ru/wh40k11ed/factions/space-marines/Azrael) | 4 | 1 | 2 |
| Dark Angels | [Belial](https://wahapedia.ru/wh40k11ed/factions/space-marines/Belial) | 2 | 2 | 2 |
| Dark Angels | [Deathwing Knights](https://wahapedia.ru/wh40k11ed/factions/space-marines/Deathwing-Knights) | 3 | 1 | 4 |
| Dark Angels | [Deathwing Terminator Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Deathwing-Terminator-Squad) | 2 | 1 | 11 |
| Dark Angels | [Ezekiel](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ezekiel) | 5 | 1 | 4 |
| Dark Angels | [Inner Circle Companions](https://wahapedia.ru/wh40k11ed/factions/space-marines/Inner-Circle-Companions) | 2 | 0 | 3 |
| Dark Angels | [Land Speeder Vengeance](https://wahapedia.ru/wh40k11ed/factions/space-marines/Land-Speeder-Vengeance) | 1 | 2 | 5 |
| Dark Angels | [Lazarus](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lazarus) | 2 | 1 | 2 |
| Dark Angels | [Lion El’jonson](https://wahapedia.ru/wh40k11ed/factions/space-marines/Lion-El-jonson) | 9 | 2 | 4 |
| Dark Angels | [Nephilim Jetfighter](https://wahapedia.ru/wh40k11ed/factions/space-marines/Nephilim-Jetfighter) | 1 | 2 | 5 |
| Dark Angels | [Ravenwing Black Knights](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ravenwing-Black-Knights) | 1 | 0 | 6 |
| Dark Angels | [Ravenwing Command Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ravenwing-Command-Squad) | 3 | 1 | 7 |
| Dark Angels | [Ravenwing Dark Talon](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ravenwing-Dark-Talon) | 1 | 2 | 3 |
| Dark Angels | [Ravenwing Darkshroud](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ravenwing-Darkshroud) | 1 | 3 | 3 |
| Dark Angels | [Sammael](https://wahapedia.ru/wh40k11ed/factions/space-marines/Sammael) | 2 | 1 | 4 |
| Black Templars | [Castellan](https://wahapedia.ru/wh40k11ed/factions/space-marines/Castellan) | 1 | 1 | 6 |
| Black Templars | [Chaplain Grimaldus](https://wahapedia.ru/wh40k11ed/factions/space-marines/Chaplain-Grimaldus) | 6 | 2 | 4 |
| Black Templars | [Crusade Ancient](https://wahapedia.ru/wh40k11ed/factions/space-marines/Crusade-Ancient) | 2 | 1 | 2 |
| Black Templars | [Crusader Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Crusader-Squad) | 1 | 0 | 13 |
| Black Templars | [Emperor’s Champion](https://wahapedia.ru/wh40k11ed/factions/space-marines/Emperor-s-Champion) | 3 | 2 | 3 |
| Black Templars | [Execrator](https://wahapedia.ru/wh40k11ed/factions/space-marines/Execrator) | 2 | 1 | 4 |
| Black Templars | [Gladiator Lancer](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Lancer-1) | 1 | 2 | 4 |
| Black Templars | [Gladiator Reaper](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Reaper-1) | 1 | 2 | 4 |
| Black Templars | [Gladiator Valiant](https://wahapedia.ru/wh40k11ed/factions/space-marines/Gladiator-Valiant-1) | 1 | 2 | 4 |
| Black Templars | [High Marshal Helbrecht](https://wahapedia.ru/wh40k11ed/factions/space-marines/High-Marshal-Helbrecht) | 2 | 1 | 3 |
| Black Templars | [Impulsor](https://wahapedia.ru/wh40k11ed/factions/space-marines/Impulsor-1) | 3 | 2 | 8 |
| Black Templars | [Marshal](https://wahapedia.ru/wh40k11ed/factions/space-marines/Marshal) | 2 | 1 | 6 |
| Black Templars | [Repulsor](https://wahapedia.ru/wh40k11ed/factions/space-marines/Repulsor-1) | 1 | 2 | 8 |
| Black Templars | [Repulsor Executioner](https://wahapedia.ru/wh40k11ed/factions/space-marines/Repulsor-Executioner-1) | 1 | 2 | 8 |
| Black Templars | [Sword Brethren Squad](https://wahapedia.ru/wh40k11ed/factions/space-marines/Sword-Brethren-Squad) | 1 | 0 | 8 |
| Space Wolves | [Arjac Rockfist](https://wahapedia.ru/wh40k11ed/factions/space-marines/Arjac-Rockfist) | 2 | 2 | 2 |
| Space Wolves | [Bjorn The Fell-handed](https://wahapedia.ru/wh40k11ed/factions/space-marines/Bjorn-The-Fell-handed) | 2 | 2 | 6 |
| Space Wolves | [Blood Claws](https://wahapedia.ru/wh40k11ed/factions/space-marines/Blood-Claws) | 1 | 0 | 5 |
| Space Wolves | [Fenrisian Wolves](https://wahapedia.ru/wh40k11ed/factions/space-marines/Fenrisian-Wolves) | 2 | 0 | 1 |
| Space Wolves | [Grey Hunters](https://wahapedia.ru/wh40k11ed/factions/space-marines/Grey-Hunters) | 2 | 0 | 7 |
| Space Wolves | [Iron Priest](https://wahapedia.ru/wh40k11ed/factions/space-marines/Iron-Priest) | 3 | 1 | 3 |
| Space Wolves | [Logan Grimnar](https://wahapedia.ru/wh40k11ed/factions/space-marines/Logan-Grimnar) | 2 | 2 | 4 |
| Space Wolves | [Murderfang](https://wahapedia.ru/wh40k11ed/factions/space-marines/Murderfang) | 3 | 2 | 3 |
| Space Wolves | [Njal Stormcaller](https://wahapedia.ru/wh40k11ed/factions/space-marines/Njal-Stormcaller) | 5 | 1 | 4 |
| Space Wolves | [Ragnar Blackmane](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ragnar-Blackmane) | 2 | 1 | 2 |
| Space Wolves | [Thunderwolf Cavalry](https://wahapedia.ru/wh40k11ed/factions/space-marines/Thunderwolf-Cavalry) | 2 | 0 | 6 |
| Space Wolves | [Ulrik The Slayer](https://wahapedia.ru/wh40k11ed/factions/space-marines/Ulrik-The-Slayer) | 2 | 2 | 3 |
| Space Wolves | [Venerable Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Venerable-Dreadnought-1) | 2 | 1 | 9 |
| Space Wolves | [Wolf Guard Battle Leader](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wolf-Guard-Battle-Leader) | 3 | 1 | 4 |
| Space Wolves | [Wolf Guard Headtakers](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wolf-Guard-Headtakers) | 4 | 0 | 4 |
| Space Wolves | [Wolf Guard Terminators](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wolf-Guard-Terminators) | 2 | 1 | 6 |
| Space Wolves | [Wolf Priest](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wolf-Priest) | 2 | 1 | 2 |
| Space Wolves | [Wolf Scouts](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wolf-Scouts-1) | 3 | 2 | 11 |
| Space Wolves | [Wulfen](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wulfen) | 2 | 0 | 2 |
| Space Wolves | [Wulfen Dreadnought](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wulfen-Dreadnought-1) | 3 | 2 | 5 |
| Space Wolves | [Wulfen with Storm Shields](https://wahapedia.ru/wh40k11ed/factions/space-marines/Wulfen-with-Storm-Shields) | 2 | 0 | 3 |

## Input fingerprints

SHA-256 values below identify the exact reviewed inputs, including the native composition/loadout inputs used by the shared chapter adapters. They are provenance records, not a dependency on these temporary paths at application runtime.

| Input | SHA-256 |
| --- | --- |
| `Last_update.csv` | `fa7e6939e26ad36e179cd3205e056a032606b52e5248361b441a6fb0efd34d21` |
| `Source.csv` | `1b9d28d0d8c8c47746088e5f778afe1b4eb39a7e3ac35a7a8d4cce3a276ad9a9` |
| `Abilities.csv` | `c1f23f8f8b150574aa51912fdde1e727ba8e25f986e55bb407f1fd1e3f2676fe` |
| `Datasheets.csv` | `eccaf2514028c3f58398d8fe6422712d86a0569c7ce6f03a79eeafc7c086bc51` |
| `Datasheets_models.csv` | `658751b37f052e33497802d4152186e4e6dc439fe1e721639756ef5ca25e110e` |
| `Datasheets_abilities.csv` | `a9139d3809ca81884839dad900c653230a25cdada26f86b400b3ab91ddbabaff` |
| `Datasheets_wargear.csv` | `6f7624852f0fd2b0f3d04f5a6a31b5e4ec3ca2ad4afa102ec8c90530dc7345bd` |
| `Datasheets_keywords.csv` | `b1afc21a2a3a715e013b067a87eb0ef70650721e43df78986ed7dca4653899e0` |
| `Datasheets_models_cost.csv` | `293f4cd496181a8b939d50d7302dfed8c8fa74cebe5427e5455acacd19877170` |
| `Datasheets_options.csv` | `799a231be8decde46a3b64f4ca857c2ac49ba81f98c40bcc3bb466f700f79392` |
| `Datasheets_unit_composition.csv` | `e808801518e8aa8f8f4bdcd1b57c3dc336ae06da8e2ab2268826da08b381820e` |
| `Datasheets_leader.csv` | `c58e5caca2c6fb489e17eafce8156bef4ff3584bc1ab24151506cfa9d808d80a` |
| `units.json` | `483e70092ad9104e0f6da3bcd84816eac7775f5d1e040c44c53724291ca2f7fd` |
| `unit-compositions.json` | `2f79ae8a0be7a765460e9226e85588dece4b581e96a75aadea3a8f3ed27e3bbb` |
| `weapons.json` | `40dc31ce80618e0717cd1b7f57c1b0633398ca22ee47d657ca3b22f3023dbe24` |
| `wargear.json` | `8acdcfff3059c101af51a3490bb5e021f478e03cbc54d20cd3547aec3d31ea3f` |
| `blood-angels.yaml` | `2dc46512a44857dfb5aed2d926e3d745f44cc805f77a108d2737bc6d8a61eb84` |
| `dark-angels.yaml` | `3f678740fb3dfdb57ca2da56f31fc50c7a3dbdaa524d3f8e3e3ae6b6ebaddfb9` |
| `black-templars.yaml` | `9682ddf06ca20732b8085c3e4cbdacde1ce35d88536c9beb50a6ff0989a4f0e5` |
| `space-wolves.yaml` | `44c0dba931ddb2bc99bef95bd6890d32fddf1fa725191badff736c1dfc83c9ce` |
