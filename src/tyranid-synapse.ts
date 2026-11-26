import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder} from './generated-reminders';
import {TYRANID_SHADOW_SOURCES} from './tyranid-data.generated';
import {tyranidMusterUnits} from './tyranid-data';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidModelLoadouts} from './tyranid-loadouts';
import {tyranidFormations} from './tyranid-transports';
import {tyranidHasDetachment} from './tyranid-muster-data';
import {expandRoster,type RosterInstance} from './roster-instances';

export const TYRANID_PACK='https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf';
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');

/** Actual native/equipped sources. Being within Synapse Range does not grant SYNAPSE. */
export function tyranidSynapseSources(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Tyranids')return [];
 const current={...army,instances:[...roster]},legal=new Set(tyranidMusterUnits(army));
 return roster.filter(s=>legal.has(s.unit)).flatMap(s=>{
  const roles=[...new Set(tyranidModelLoadouts(s).filter(m=>tyranidKeywords(current,s,m.model).has('SYNAPSE')).map(m=>m.model))];
  return roles.length?[{squad:s,models:roles}]:[];
 });
}
export function tyranidShadowSources(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Tyranids')return [];
 const legal=new Set(tyranidMusterUnits(army));
 return roster.filter(s=>legal.has(s.unit)).flatMap(s=>{
  const rule=TYRANID_SHADOW_SOURCES.find(r=>r.unit===s.unit);
  if(!rule||rule.model&&!tyranidModelLoadouts(s).some(m=>key(m.model)===key(rule.model!)))return [];
  return [{squad:s,model:rule.model}];
 });
}

/** Potential eligibility only: range and any previous Neuroloids choice stay conditional. */
export function tyranidSynapsePossible(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Tyranids')return false;
 return tyranidSynapseSources(army,roster).length>0||expandRoster(army).some(s=>s.unit==='Neurotyrant')||
  tyranidHasDetachment(army,'Subterranean Assault')&&roster.some(s=>['Mawloc','Trygon'].includes(s.unit));
}

export function tyranidFactionReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Tyranids')return [];
 const legal=new Set(tyranidMusterUnits(army)),groups=tyranidFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 if(!groups.length)return [];
 const conduits=tyranidSynapseSources(army,roster),shadow=tyranidShadowSources(army,roster),all=groups.flatMap(g=>g.members.map(s=>s.id));
 const temporary=tyranidHasDetachment(army,'Subterranean Assault')?roster.filter(s=>['Mawloc','Trygon'].includes(s.unit)):[];
 const result:GeneratedReminder[]=[];
 function add(id:string,title:string,window:GeneratedReminder['window'],turn:GeneratedReminder['turn'],timing:GeneratedReminder['timing'],summary:string,units:string[]){
  if(units.length)result.push({id:'11e-tyranid-faction:'+id,title,window,turn,timing,summary,units:[...new Set(units)],source:TYRANID_PACK,origin:'army'});
 }
 const sourceText=conduits.map(s=>s.squad.id+' ('+s.models.join(', ')+')').join('; ');
 const condition='A Tyranids formation is within Synapse Range while within 6″ of a surviving friendly SYNAPSE model. Measure from the actual Synapse models, not every model in their attached formation. '+(sourceText?'Native or equipped conduits: '+sourceText+'. ':'')+(temporary.length?'Adaptive Optimisation can temporarily grant SYNAPSE to an eligible Mawloc or Trygon; use that model as a conduit only while the grant is active. ':'')+(expandRoster(army).some(s=>s.unit==='Neurotyrant')?'A previously selected Neuroloids effect lasts until the start of your next Command phase, including if its Neurotyrant has since been destroyed. ':'');
 if(tyranidSynapsePossible(army,roster)){
  for(const phase of PHASES)add('battle-shock-'+phase,'Synapse · Battle-shock',phase,'either','during',condition+'When a formation within Synapse Range takes a Battle-shock test, roll 3D6 instead of 2D6. Neuroloids can make a selected formation count as within army Synapse Range without giving its models the SYNAPSE keyword.',all);
  add('melee','Synapse · Melee strength','Fight','either','during',condition+'While within Synapse Range, add 1 to the Strength of each melee attack made by a model in that formation.',all);
 }
 if(shadow.length){
  const names=shadow.map(s=>s.squad.id+(s.model?' (only while its '+s.model+' survives)':'')).join('; ');
  const neuro=roster.some(s=>s.unit==='Neurotyrant'&&legal.has(s.unit));
  add('shadow','Shadow in the Warp','Command','either','during','Once per battle, during either player’s Command phase, you may unleash Shadow in the Warp if a surviving source is on the battlefield. Every enemy unit on the battlefield then takes a Battle-shock test. Subtract 1 from that test if the enemy is within 6″ of one or more friendly SYNAPSE units; this condition measures from the Synapse unit, whereas ordinary Synapse Range measures from Synapse models. '+(neuro?'While at least one Neurotyrant survives on the battlefield, Psychic Terror subtracts a further 1 from every such test; multiple Neurotyrants do not stack this extra penalty. ':'')+'Available sources: '+names+'.',shadow.map(s=>s.squad.id));
 }
 return result;
}
