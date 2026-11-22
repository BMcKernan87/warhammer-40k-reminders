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
    "id": "11e-necron-macrocytes-nanoscarab",
    "title": "Canoptek Macrocytes · Nanoscarab Projector",
    "window": "Command",
    "timing": "during",
    "summary": "Once per battle round, when a friendly NECRONS unit within 3 inches activates Reanimation Protocols, a model equipped with a nanoscarab projector can make that unit reanimate 1 additional wound.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Canoptek Macrocytes"
    ]
  },
  {
    "id": "11e-necron-tomb-crawlers-retinue",
    "title": "Canoptek Tomb Crawlers · Canoptek Retinue",
    "window": "Command",
    "timing": "start",
    "summary": "At Declare Battle Formations, this unit may join a Bodyguard led by a CRYPTEK; no more than one Tomb Crawlers unit and no Cryptothralls in the same Bodyguard.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Canoptek Tomb Crawlers"
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
    "id": "11e-necron-deceiver-illusion",
    "title": "C'tan Shard of the Deceiver · Grand Illusion",
    "window": "Command",
    "timing": "start",
    "summary": "After both players deploy, redeploy up to three friendly NECRONS units; they may enter Strategic Reserves regardless of the existing number in Reserves.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "C’tan Shard of the Deceiver"
    ]
  },
  {
    "id": "11e-necron-transcendent-displacement",
    "title": "Transcendent C'tan · Transdimensional Displacement",
    "window": "Movement",
    "timing": "during",
    "summary": "When this model is selected to Advance, you may remove and set it up anywhere more than 9 inches horizontally from all enemy units.",
    "source": "https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf",
    "origin": "unit",
    "units": [
      "Transcendent C’tan"
    ]
  }
] as readonly GeneratedReminder[];
export function necronDatasheetReminders2026(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const selected=new Set([...Object.entries(army.units).filter(([,count])=>count>0).map(([unit])=>unit),...(army.instances||[]).map(x=>x.unit)]);
 return NECRON_DATASHEET_REMINDERS_2026.filter(rule=>rule.units?.some(unit=>selected.has(unit))).map(rule=>({...rule}));
}
