import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {NECRON_SUPPORTS,necronAttachmentRole} from './attachments';
import {instanceBodyguards} from './leader-eligibility';
import {BATTLE_SIZES_2026} from './edition-2026';
export const NECRON_EPIC_HEROES_11E=new Set(['Illuminor Szeras','Imotekh the Stormlord','Nekrosor Ammentar','Orikan the Diviner','Trazyn the Infinite','C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','The Silent King']);
export const CHARACTERS=new Set([...NECRON_EPIC_HEROES_11E,'Chronomancer','Geomancer','Hexmark Destroyer','Overlord','Overlord with translocation shroud','Plasmancer','Psychomancer','Royal Warden','Skorpekh Lord','Technomancer','Transcendent C’tan','Lokhust Lord','Catacomb Command Barge']);
const STAR_GODS=new Set(['C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Transcendent C’tan']);
export function necronUnitLimit(army:ArmySelection,unit:string):number{
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return NECRON_EPIC_HEROES_11E.has(unit)?1:limit*(['Necron Warriors','Immortals','Ghost Ark'].includes(unit)?2:1);
}
// Keep incomplete rosters editable; enforce muster legality in the existing findings, not storage schema.
export function legalWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Necrons')return [];
 const eligible=expandRoster(army).filter(s=>CHARACTERS.has(s.unit)&&!STAR_GODS.has(s.unit));
 const required=eligible.filter(s=>s.unit==='The Silent King');
 return required.length?required:eligible;
}
export function resolvedWarlord(army:ArmySelection):RosterInstance|undefined{
 const candidates=legalWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!legalWarlordCandidates(army).some(s=>s.id===id))throw Error('Ineligible Warlord');
 return {...army,warlordId:id??undefined};
}
export function reconcileWarlord(army:ArmySelection):ArmySelection{
 if(army.faction!=='Necrons')return army;
 const candidate=resolvedWarlord(army);
 return {...army,warlordId:candidate?.id};
}
export function validSupportAttachment(army:ArmySelection,support:RosterInstance):boolean{
 const roster=expandRoster(army);
 const body=roster.find(s=>s.id===support.attachedTo);
 if(!body||body.id===support.id||body.attachedTo||!instanceBodyguards(army,support).includes(body.unit))return false;
 const attached=roster.filter(s=>s.attachedTo===body.id);
 return attached.length<=2&&attached.every(s=>s.id!==body.id&&instanceBodyguards(army,s).includes(body.unit)&&!!necronAttachmentRole(s.unit))&&new Set(attached.map(s=>necronAttachmentRole(s.unit))).size===attached.length;
}
export function unresolvedSupports(army:ArmySelection):RosterInstance[]{
 return army.faction==='Necrons'?expandRoster(army).filter(s=>NECRON_SUPPORTS.has(s.unit)&&!validSupportAttachment(army,s)):[];
}
