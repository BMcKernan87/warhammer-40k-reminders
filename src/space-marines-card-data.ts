import {SM_CARDS,type SpaceMarineCardStats} from './space-marines-card-profiles.generated';
import {CHAPTER_CARDS} from './space-marine-chapters-card-profiles.generated';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {spaceMarineAgentName} from './space-marines-data';

/** The army faction selects the actual card, including the six Templar vehicles
 * that share names with Codex cards but have different equipment and profiles. */
export function spaceMarineCard(unit:string,faction:string='Space Marines'):SpaceMarineCardStats|undefined{
 return CHAPTER_CARDS[faction]?.[unit]??SM_CARDS[unit];
}

const banks:Record<string,Readonly<Record<string,SpaceMarineCardStats>>>={};
export const spaceMarineCards=(faction:string)=>banks[faction]??(banks[faction]={...SM_CARDS,...CHAPTER_CARDS[faction]});

interface PhysicalWeapon {name:string;phase:'Shooting'|'Fight';abilities:readonly string[]}
const agentWeapons=new Map<string,PhysicalWeapon[]>(ASSIGNED_AGENT_DATA.map(row=>[row.sheet.unit,row.weapons.map(w=>({name:w.name,phase:w.type==='Ranged'?'Shooting' as const:'Fight' as const,abilities:w.abilities.split(',').map(a=>a.trim()).filter(Boolean)}))]));
const weaponKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
/** Assigned Agents retain their verified printed weapon abilities. Their bank
 * does not contain numerical attack profiles, so none are inferred here. */
export function spaceMarinePhysicalWeapons(unit:string,faction:string,items:readonly string[]):PhysicalWeapon[]{
 const profiles=spaceMarineCard(unit,faction)?.weapons??agentWeapons.get(spaceMarineAgentName(unit)??'')??[];
 return profiles.filter(w=>items.some(item=>weaponKey(item)===weaponKey(w.name))).map(w=>({name:w.name,phase:w.phase,abilities:w.abilities}));
}
