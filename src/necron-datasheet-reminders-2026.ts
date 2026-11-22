import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
/** Rules checked against the June 2026 Necron 11th-edition Faction Pack. */
export const NECRON_DATASHEET_REMINDERS_2026:readonly GeneratedReminder[]=[
  {
    "id": "11e-necron-macrocytes-accelerator",
    "title": "Canoptek Macrocytes · Accelerator Mandible",
    "window": "Fight",
    "timing": "start",
    "summary": "At the start of the Fight phase, if equipped with an accelerator mandible, select a friendly CANOPTEK unit within 3 inches; improve its melee Weapon Skill by 1 until the end of the phase.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Canoptek Macrocytes"
    ]
  },
  {
    "id": "11e-necron-tomb-crawlers-sentinels",
    "title": "Canoptek Tomb Crawlers · Weapon Sentinels",
    "window": "Shooting",
    "timing": "during",
    "summary": "When shooting a target within 12 inches, this unit can ignore modifiers to its Ballistic Skill, Hit rolls and Wound rolls.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Canoptek Tomb Crawlers"
    ]
  },
  {
    "id": "11e-necron-geomancer-tectonic",
    "title": "Geomancer · Tectonic Reverberations",
    "window": "Movement",
    "timing": "during",
    "summary": "In your Movement phase, select a visible enemy unit within 18 inches. It is pinned until your next Movement phase: -2 Move and -2 to Charge rolls.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Geomancer"
    ]
  },
  {
    "id": "11e-necron-geomancer-obelisk",
    "title": "Geomancer · Obelisk Node Control",
    "window": "Movement",
    "timing": "during",
    "summary": "While this model is within range of an objective you control, enemy units arriving from Reserves cannot be set up within 12 inches of it.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Geomancer"
    ]
  },
  {
    "id": "11e-necron-transcendent-displacement",
    "title": "Transcendent C'tan · Transdimensional Displacement",
    "window": "Movement",
    "timing": "during",
    "summary": "When this model is selected to Advance, you may remove and set it up anywhere more than 8 inches horizontally from all enemy units.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Transcendent C’tan"
    ]
  }
,
{"id":"11e-necron-nekrosor-ranged-aura","title":"Nekrosor Ammentar · Infectious Murder-madness","window":"Shooting","timing":"during","summary":"Friendly NECRONS units within 6 inches (excluding MONSTER and TITANIC) gain Sustained Hits 1 when attacking if they have DESTROYER CULT or target the closest eligible enemy.","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","origin":"unit","units":["Nekrosor Ammentar"]},
{"id":"11e-necron-nekrosor-fight-aura","title":"Nekrosor Ammentar · Infectious Murder-madness","window":"Fight","timing":"during","summary":"Friendly NECRONS units within 6 inches (excluding MONSTER and TITANIC) gain Sustained Hits 1 when attacking if they have DESTROYER CULT or target the closest eligible enemy.","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","origin":"unit","units":["Nekrosor Ammentar"]}

,{"id":"11e-necron-overlord-my-will","title":"Overlord · My Will Be Done","window":"Command","timing":"during","summary":"Once per battle round, one eligible Overlord-led unit can reduce the CP cost of a Stratagem targeting it by 1.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Overlord","Overlord with translocation shroud"]},
{"id":"11e-necron-overlord-orb","title":"Overlord · Resurrection Orb","window":"Command","timing":"end","summary":"Once per battle per unit, at the end of any phase, activate Reanimation Protocols healing D6 instead of D3; at most one unit can resurrect per turn.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Overlord","Overlord with translocation shroud"]},
{"id":"11e-necron-plasmancer-lightning","title":"Plasmancer · Living Lightning","window":"Shooting","timing":"during","summary":"Select a visible enemy within 18 inches (respect Lone Operative restriction), roll four D6; each 4+ causes one mortal wound.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Plasmancer"]},
{"id":"11e-necron-warriors-legion","title":"Necron Warriors · Their Number is Legion","window":"Command","timing":"during","summary":"When this unit's Reanimation Protocols activate, you may re-roll the dice for wounds reanimated.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Necron Warriors"]},
{"id":"11e-necron-ghost-ark-repair","title":"Ghost Ark · Repair Barge","window":"Shooting","timing":"during","summary":"Once per turn, immediately after enemy attacks cause wounds to a Necron Warriors unit within 3 inches, activate that unit's Reanimation Protocols; each unit at most once per turn.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Ghost Ark"]},
{"id":"11e-necron-spyder-swarm","title":"Canoptek Spyders · Canoptek Swarm","window":"Command","timing":"during","summary":"In your Command phase, return one destroyed Scarab Swarm model per Spyder model to a friendly Scarab unit within 6 inches.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Canoptek Spyders"]},
{"id":"11e-necron-obelisks-pulse","title":"Obelisk · Gravitic Pulse","window":"Movement","timing":"start","summary":"At the start of your opponent's Movement phase, choose a visible enemy within 18 inches; halve its Move and Advance/Charge rolls this turn, with an additional anti-FLY effect.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Obelisk"]},
{"id":"11e-necron-tomb-blades-reanimation","title":"Tomb Blades · Reanimation Protocols","window":"Command","timing":"during","summary":"Resolve this unit's Reanimation Protocols when eligible, accounting for any applicable detachment and unit modifiers.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Tomb Blades"]},
{"id":"11e-necron-trazyn-hosts","title":"Trazyn · Surrogate Hosts","window":"Command","timing":"start","summary":"At the start of your Command phase, you may replace an eligible friendly Necrons Infantry Character on the battlefield with Trazyn, preserving remaining wounds and attachment.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Trazyn the Infinite"]},
{"id":"11e-necron-silent-king-triarch","title":"The Silent King · Triarch Abilities","window":"Command","timing":"start","summary":"At the start of each battle round, choose one Triarch ability; its effect lasts until the next battle round.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["The Silent King"]},
{"id":"11e-necron-immortals-eradication","title":"Immortals · Implacable Eradication","window":"Shooting","timing":"during","summary":"Re-roll Wound rolls of 1; against an enemy on an objective marker, you can re-roll the Wound roll instead.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html","origin":"unit","units":["Immortals"]}
] as readonly GeneratedReminder[];
export function necronDatasheetReminders2026(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const selected=new Set([...Object.entries(army.units).filter(([,count])=>count>0).map(([unit])=>unit),...(army.instances||[]).map(x=>x.unit)]);
 return NECRON_DATASHEET_REMINDERS_2026.filter(rule=>rule.units?.some(unit=>selected.has(unit))).map(rule=>({...rule}));
}
