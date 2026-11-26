import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {gscAlliedKeywords,gscAlliedMusterUnits} from './gsc-allies';

const source='https://assets.warhammer-community.com/eng_22-07_warhammer_40,000_faction_pack_genestealer_cults-vmkwgeydbr-sh7picbeqo.pdf';
const cost:Readonly<Record<string,Readonly<Record<number,number>>>>={
 'Aberrants':{5:4,10:8},'Acolyte Hybrids With Autopistols':{5:2,10:4},'Acolyte Hybrids With Hand Flamers':{5:2,10:4},
 'Hybrid Metamorphs':{5:2,10:4},'Atalan Jackals':{5:2,10:6},'Neophyte Hybrids':{10:3,20:6},'Purestrain Genestealers':{5:2,10:6},
};
export function gscResurgenceCost(squad:RosterInstance):number|undefined{
 const tiers=cost[squad.unit];
 if(!tiers)return undefined;
 return tiers[squad.models??Math.min(...Object.keys(tiers).map(Number))];
}

export function gscAmbushCandidates(army:ArmySelection,roster:readonly RosterInstance[]):RosterInstance[]{
 if(army.faction!=='Genestealer Cults')return [];
 const allies=new Set(gscAlliedMusterUnits(army));
 return roster.filter(s=>{
  if(cost[s.unit])return true;
  if(!allies.has(s.unit))return false;
  const tags=gscAlliedKeywords(s);
  return ['ASTRA MILITARUM','INFANTRY','REGIMENT'].every(k=>tags.has(k))&&!tags.has('ARTILLERY')&&!tags.has('CHARACTER');
 });
}

export function gscCultAmbushReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 const candidates=gscAmbushCandidates(army,roster);
 if(!candidates.length)return [];
 const replaceable=candidates.filter(s=>cost[s.unit]!==undefined);
 const rows:GeneratedReminder[]=[];
 function emit(key:string,title:string,window:ReminderWindow,turn:NonNullable<GeneratedReminder['turn']>,timing:GeneratedReminder['timing'],summary:string,units:readonly RosterInstance[]){
  if(units.length)rows.push({id:'11e-gsc-ambush-'+key+'-'+window,sourceRuleId:'cult-ambush',title,summary,source,origin:'army',window,turn,timing,units:units.map(s=>s.id)});
 }
 const battle=army.battleSize2026??'Strike Force';
 const base={Incursion:6,'Strike Force':10,Onslaught:14}[battle];
 const deeds=army.detachments2026?.includes('Xenocreed Congregation')&&roster.some(s=>
  ['Magus','Primus','Acolyte Iconward'].includes(s.unit)&&(army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement)==='Deeds That Speak to the Masses');
 const budget=base+(deeds?2:0);
 const prices=replaceable.map(s=>{
  const price=gscResurgenceCost(s);
  return s.id+' ('+(price===undefined?'no published Resurgence cost at '+s.models+' models':price+' Resurgence points')+')';
 }).join(', ');
 emit('budget','Cult Ambush · Resurgence points','Pre-battle','either','during','Begin this '+battle+' battle with '+budget+' Resurgence points'+(deeds?' including 2 from Deeds That Speak to the Masses':'')+'. Use the original bodyguard strength, excluding attached Characters. '+prices+'.',replaceable);
 for(const phase of PHASES){
  emit('replace','Cult Ambush · replaced units',phase,'either','during','When the last model of a qualifying formation is destroyed, including its attached Characters, you may spend its listed Resurgence cost. Create an identical full-strength unit in Cult Ambush, excluding Characters, with all wounds and unused One Shot weapons. Place a 32 mm marker more than 8″ horizontally from enemies if possible. '+prices+'.',replaceable);
 }
 for(const phase of PHASES)emit('marker','Cult Ambush · threatened markers',phase,'either','during','Remove one of your markers when an enemy model other than an Aircraft ends any kind of move within 8″ of it. Unused markers remain even if there are no units waiting in Cult Ambush.',candidates);
 emit('marker-arrival','Cult Ambush · arrive at a marker','Movement','opponent','end','At the end of the opponent’s next Movement phase, choose up to one unit in Cult Ambush for each remaining marker, including in round one. Put one model in base contact and every other model wholly within 3″ of the marker, respecting enemy reserve-denial abilities. Remove each used marker.',candidates);
 emit('reserve-arrival','Cult Ambush · reserve arrival','Movement','own','during','In a subsequent turn units in Cult Ambush may use normal Strategic Reserves ingress. Rapid Ingress cannot target units in Cult Ambush; they also survive the end of round three. '+(candidates.some(s=>s.unit==='Atalan Jackals')?'Atalan Jackals still need a marker and must follow their Outrider Gangs restrictions.':''),candidates);
 emit('round-three','Cult Ambush · round three','End of battle round','either','end','At the end of battle round three, units still in Cult Ambush are exempt from the normal deadline to enter the battlefield.',candidates);
 return rows;
}
