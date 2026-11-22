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
] as readonly GeneratedReminder[];
export function necronDatasheetReminders2026(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const selected=new Set([...Object.entries(army.units).filter(([,count])=>count>0).map(([unit])=>unit),...(army.instances||[]).map(x=>x.unit)]);
 return NECRON_DATASHEET_REMINDERS_2026.filter(rule=>rule.units?.some(unit=>selected.has(unit))).map(rule=>({...rule}));
}
