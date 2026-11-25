import {TAU_SHEETS} from './tau-data';
import {tauAdditionalLeaderPair} from './tau-muster-data';
import {MECHANICUS_ARMY_SHEETS} from './mechanicus-army-data';
import {MECHANICUS_SHEETS} from './mechanicus-data';
import {SORORITAS_ARMY_SHEETS} from './sororitas-army-data';
import {SORORITAS_SHEETS} from './sororitas-data';
import {GREY_KNIGHTS_ARMY_SHEETS,GREY_KNIGHTS_SHEETS} from './grey-knights-data';
import {DEATH_GUARD_SHEETS,deathGuardAdditionalLeaderPair} from './death-guard-data';
import {THOUSAND_SONS_SHEETS,thousandSonsMusterUnits,thousandSonsAdditionalBodyguards} from './thousand-sons-data';
import {EMPERORS_CHILDREN_SHEETS,emperorsChildrenMusterUnits,emperorsChildrenAdditionalBodyguards} from './emperors-children-data';
import {ASTRA_ARMY_SHEETS,astraSheets} from './astra-army-data';
import {astraAdditionalBodyguards,astraAttachmentSlots,usesAstraAttachmentSlots} from './astra-muster-data';
import {GSC_SHEETS,GSC_UNITS} from './gsc-data';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {gscAlliedMusterUnits} from './gsc-allies';
import {WORLD_EATERS_SHEETS,worldEatersAdditionalBodyguards,worldEatersMusterUnits} from './world-eaters-data';
import {VOTANN_SHEETS} from './votann-data.generated';
import {DAEMON_SHEETS,daemonMusterUnits} from './chaos-daemons-data';
import {isDaemonicPactUnit} from './daemonic-pact';
import {CUSTODES_ARMY_SHEETS,CUSTODES_SHEETS,custodesKeywords} from './adeptus-custodes-data';
import {ORK_SHEETS,orkAdditionalBodyguards} from './ork-data';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data';
import {IMPERIAL_KNIGHT_SHEETS,knightMusterUnits} from './imperial-knights-data';
import {ASSIGNED_AGENT_SHEETS,BATTLELINE_INQUISITORS,NATIVE_AGENT_SHEETS} from './assigned-agent-data';
const gscSheets=[...GSC_SHEETS,...GSC_ALLIED_SHEETS];
const knightSheets=[...IMPERIAL_KNIGHT_SHEETS,...ASSIGNED_AGENT_SHEETS];
import {expandRoster,type RosterInstance} from './roster-instances';
import type {ArmySelection} from './catalog';
import {NECRON_LEADERS,necronAttachmentRole} from './attachments';
/** Explicitly modeled Leader -> Bodyguard compatibility. Unlisted Leaders remain unsupported. */
export const LEADER_BODYGUARDS:Partial<Record<ArmySelection['faction'],Record<string,readonly string[]>>>={
 Necrons:NECRON_LEADERS,
 'T’au Empire':Object.fromEntries(TAU_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Adeptus Mechanicus':Object.fromEntries(MECHANICUS_ARMY_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Adepta Sororitas':Object.fromEntries(SORORITAS_ARMY_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Grey Knights':Object.fromEntries(GREY_KNIGHTS_ARMY_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Astra Militarum':Object.fromEntries(ASTRA_ARMY_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Genestealer Cults':Object.fromEntries(gscSheets.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Death Guard':Object.fromEntries(DEATH_GUARD_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Thousand Sons':Object.fromEntries(THOUSAND_SONS_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Emperor’s Children':Object.fromEntries(EMPERORS_CHILDREN_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'World Eaters':Object.fromEntries(WORLD_EATERS_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Leagues of Votann':Object.fromEntries(VOTANN_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Imperial Agents':Object.fromEntries(NATIVE_AGENT_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Chaos Daemons':Object.fromEntries(DAEMON_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Adeptus Custodes':Object.fromEntries(CUSTODES_ARMY_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Chaos Knights':Object.fromEntries(CHAOS_KNIGHT_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 'Imperial Knights':Object.fromEntries(knightSheets.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 Orks:Object.fromEntries(ORK_SHEETS.filter(s=>s.attachmentRole).map(s=>[s.unit,s.bodyguards??[]])),
 Tyranids:{
  Broodlord:['Genestealers'], 'Winged Hive Tyrant':[]
 },
 'Space Marines':{
  Captain:['Intercessor Squad','Assault Intercessor Squad','Hellblaster Squad','Sternguard Veteran Squad'],
  Lieutenant:['Intercessor Squad','Assault Intercessor Squad','Hellblaster Squad','Sternguard Veteran Squad'],
  Judiciar:['Bladeguard Veteran Squad','Assault Intercessor Squad'],
  'Apothecary Biologis':['Aggressor Squad','Eradicator Squad','Heavy Intercessor Squad'],
  Chaplain:['Intercessor Squad','Assault Intercessor Squad','Bladeguard Veteran Squad']
 }
};
export function leaderBodyguards(faction:ArmySelection['faction'],leader:string):readonly string[]{
 return LEADER_BODYGUARDS[faction]?.[leader]||[];
}
export function isModeledLeader(faction:ArmySelection['faction'],unit:string):boolean{
 return Object.prototype.hasOwnProperty.call(LEADER_BODYGUARDS[faction]||{},unit);
}

/** Cursed Legion grants a specific additional attachment route, not blanket eligibility. */
export const MURDERMIND_BODYGUARDS=['Lokhust Destroyers','Lokhust Heavy Destroyers','Ophydian Destroyers','Skorpekh Destroyers'] as const;
const MURDERMIND_BEARERS=['Chronomancer','Geomancer','Plasmancer','Psychomancer','Technomancer'];
export function hasMurdermind(army:ArmySelection,leader:{id:string;unit:string}):boolean{
 return army.faction==='Necrons'&&!!army.detachments2026?.includes('Cursed Legion')&&MURDERMIND_BEARERS.includes(leader.unit)&&(army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit])==='Murdermind';
}
export function instanceBodyguards(army:ArmySelection,leader:{id:string;unit:string}):readonly string[]{
 if(army.faction==='Chaos Daemons'&&!daemonMusterUnits(army).includes(leader.unit))return [];
 if(army.faction==='Chaos Knights'&&!isDaemonicPactUnit(leader.unit)&&!army.detachments2026?.includes('Iconoclast Fiefdom'))return [];
 const base=leaderBodyguards(army.faction,leader.unit);
 if(army.faction==='Thousand Sons'){
  const available=thousandSonsMusterUnits(army);
  return available.includes(leader.unit)?[...new Set([...base,...thousandSonsAdditionalBodyguards(army,leader)])].filter(u=>available.includes(u)):[];
 }
 if(army.faction==='Emperor’s Children'){
  const available=emperorsChildrenMusterUnits(army);
  return available.includes(leader.unit)?[...new Set([...base,...emperorsChildrenAdditionalBodyguards(army,leader)])].filter(u=>available.includes(u)):[];
 }
 if(army.faction==='Astra Militarum')return [...new Set([...base,...astraAdditionalBodyguards(army,leader)])];
 if(army.faction==='Genestealer Cults'){
  const available=[...GSC_UNITS,...gscAlliedMusterUnits(army)];
  return available.includes(leader.unit)?base.filter(u=>available.includes(u)):[];
 }
 if(army.faction==='Adeptus Mechanicus'&&BATTLELINE_INQUISITORS.has(leader.unit)){
  const infantry=MECHANICUS_SHEETS.filter(s=>['IMPERIUM','INFANTRY','BATTLELINE'].every(tag=>s.keywords?.includes(tag)));
  return [...new Set([...base,...infantry.map(s=>s.unit)])];
 }
 if(army.faction==='Adepta Sororitas'&&BATTLELINE_INQUISITORS.has(leader.unit)){
  const infantry=SORORITAS_SHEETS.filter(s=>['IMPERIUM','INFANTRY','BATTLELINE'].every(tag=>s.keywords?.includes(tag)));
  return [...new Set([...base,...infantry.map(s=>s.unit)])];
 }
 if(army.faction==='Grey Knights'&&BATTLELINE_INQUISITORS.has(leader.unit)){
  const infantry=GREY_KNIGHTS_SHEETS.filter(s=>['IMPERIUM','INFANTRY','BATTLELINE'].every(tag=>s.keywords?.includes(tag)));
  return [...new Set([...base,...infantry.map(s=>s.unit)])];
 }
 if(army.faction==='Adeptus Custodes'&&BATTLELINE_INQUISITORS.has(leader.unit)){
  // MFM v1.6 lists 'Battleline Imperium Infantry' for these four allied Leaders.
  const native=CUSTODES_SHEETS.filter(s=>{
   const keywords=custodesKeywords(army,{unit:s.unit,id:''});
   return ['BATTLELINE','IMPERIUM','INFANTRY'].every(tag=>keywords.has(tag));
  });
  return [...new Set([...base,...native.map(s=>s.unit)])];
 }
 if(army.faction==='World Eaters'){
  const allowed=worldEatersMusterUnits(army);
  return [...new Set([...base,...worldEatersAdditionalBodyguards(army,leader)])].filter(unit=>allowed.includes(unit));
 }
 if(army.faction==='Orks')return [...new Set([...base,...orkAdditionalBodyguards(army,leader)])];
 if(army.faction==='Imperial Knights'){
  const eligible=knightMusterUnits(army);
  return eligible.includes(leader.unit)?base.filter(unit=>eligible.includes(unit)):[];
 }
 return hasMurdermind(army,leader)?[...new Set([...base,...MURDERMIND_BODYGUARDS])]:base;
}

// October MFM 1.6 gives the Marshal Support for Rangers and Vanguard. The
// Tech-Priests use the separate Leader slot on those Forgepact allies.
export function rosterAttachmentRole(faction:ArmySelection['faction'],unit:string):'leader'|'support'|null {
 if(faction==='T’au Empire')return TAU_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Adeptus Mechanicus')return MECHANICUS_ARMY_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Adepta Sororitas')return SORORITAS_ARMY_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Grey Knights')return GREY_KNIGHTS_ARMY_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Astra Militarum')return astraSheets.get(unit)?.attachmentRole??null;
 if(faction==='Imperial Agents')return NATIVE_AGENT_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Necrons')return necronAttachmentRole(unit);
 if(faction==='Chaos Daemons')return DAEMON_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Orks')return ORK_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Genestealer Cults')return gscSheets.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Death Guard')return DEATH_GUARD_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Thousand Sons')return THOUSAND_SONS_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Emperor’s Children')return EMPERORS_CHILDREN_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='World Eaters')return WORLD_EATERS_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Leagues of Votann')return VOTANN_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Adeptus Custodes')return CUSTODES_ARMY_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 if(faction==='Chaos Knights')return CHAOS_KNIGHT_SHEETS.find(s=>s.unit===unit)?.attachmentRole??null;
 return faction==='Imperial Knights'?knightSheets.find(s=>s.unit===unit)?.attachmentRole??null:null;
}

export function knightJoinedBodyguard(army:ArmySelection,leader:RosterInstance):RosterInstance|undefined {
 if(!['Astra Militarum','Imperial Knights','Chaos Knights','Chaos Daemons','Imperial Agents','Adeptus Custodes','Orks','Leagues of Votann','Genestealer Cults','World Eaters','Emperor’s Children','Thousand Sons','Death Guard','Grey Knights','Adepta Sororitas','Adeptus Mechanicus','T’au Empire'].includes(army.faction)||!leader.attachedTo)return undefined;
 const roster=expandRoster(army),body=roster.find(s=>s.id===leader.attachedTo);
 if(!body||body.attachedTo||body.retinueTo||!instanceBodyguards(army,leader).includes(body.unit))return undefined;
 const members=roster.filter(s=>s.attachedTo===body.id);
 if(!members.some(m=>m.id===leader.id)||members.some(m=>!instanceBodyguards(army,m).includes(body.unit)))return undefined;
 if(army.faction==='T’au Empire'&&members.length===2&&tauAdditionalLeaderPair(body,members[0].unit,members[1].unit))return body;
 if(army.faction==='Death Guard'&&members.length===2&&deathGuardAdditionalLeaderPair(body.unit,members[0].unit,members[1].unit))return body;
 if(usesAstraAttachmentSlots(army,body))return astraAttachmentSlots(body,members)?body:undefined;
 const roles=members.map(m=>rosterAttachmentRole(army.faction,m.unit));
 return roles.length<=2&&new Set(roles).size===roles.length?body:undefined;
}
