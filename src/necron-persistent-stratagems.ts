import type {ArmySelection} from './catalog';
import type {GeneratedReminder, ReminderWindow} from './generated-reminders';
import {necronBattleFormations} from './necron-battle-units';
import {hasNecronRangedWeapon, necronKeywords} from './necron-wargear';
import {expandRoster, type RosterInstance} from './roster-instances';

const source='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf';
const sameMember=(a:RosterInstance,b:RosterInstance)=>a.id===b.id&&a.unit===b.unit&&a.attachedTo===b.attachedTo&&a.retinueTo===b.retinueTo;

// Publisher Necrons v1.3 pp.2,8; Core 01.02.02 and 14.02. These rows
// recall a prior use at the point its effect matters. They do not spend CP,
// assume a target was chosen, or permit an activation from a destroyed source.
export function necronPersistentStratagemReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const result:GeneratedReminder[]=[],selected=army.detachments2026??[];
 const original=necronBattleFormations(army),current=necronBattleFormations(army,roster);
 const surviving=original.flatMap(start=>current.filter(f=>f.originalBody.id===start.originalBody.id
  &&f.members.every(m=>start.members.some(s=>sameMember(s,m)))).map(f=>({start,current:f})));
 const add=(id:string,title:string,window:ReminderWindow,summary:string,units:string[],page:number,timing:GeneratedReminder['timing']='during',turn:GeneratedReminder['turn']='either')=>{
  if(units.length)result.push({id,title,window,timing,turn,summary,source:source+'#page='+page,origin:'detachment',units});
 };
 if(selected.includes('Hand of the Dynasty')){
  const recipients=surviving.filter(f=>f.start.members.some(s=>s.unit==='Immortals')).map(f=>f.current.id);
  for(const window of ['Command','Movement','Shooting','Charge','Fight','End of your turn','End of opponent turn'] as const){
   add('11e-necron-hod-dominance-control-'+window,'Dominance Protocols · objective control',window,
    'Only if this original Immortals formation was selected for Dominance Protocols in this turn’s Command phase: its models retain +1 OC until that turn ends, including after the original Immortals models are destroyed. Apply it when checking control at the end of each phase and turn, before other end-of-phase or end-of-turn rules. Battle-shocked models retain OC “–”. This reminder does not select another unit or spend CP.',recipients,2,'end');
  }
 }
 if(selected.includes('Cryptek Conclave')){
  const live=new Map(roster.map(s=>[s.id,s]));
  const possibleSource=expandRoster(army).some(s=>necronKeywords.CRYPTEK.has(s.unit)&&(!live.has(s.id)||sameMember(s,live.get(s.id)!)));
  if(possibleSource){
   for(const window of ['Movement','Shooting','Fight'] as const){
    const recipients=surviving.filter(f=>window==='Fight'||f.current.members.some(hasNecronRangedWeapon))
     .filter(f=>window!=='Movement'||f.current.members.some(s=>s.unit==='Deathmarks')).map(f=>f.current.id);
    add('11e-necron-conclave-animus-lasting-'+window,'Animus Curse · marked enemy',window,
     'Only against an enemy unit previously marked by Animus Curse after it destroyed a Cryptek model: friendly Necron models may re-roll Hit rolls against that enemy until the battle ends. The mark remains after the Cryptek and its original formation are destroyed. '+
     (window==='Movement'?'This applies to permitted normal Hyperspace Hunters shooting. ':window==='Shooting'?'This applies to normal shooting, including permitted return fire. ':'')+
     'Snap shooting cannot re-roll Hit rolls. This effect does not grant an extra attack or mark a new enemy.',recipients,8,'during',window==='Movement'?'opponent':'either');
   }
  }
 }
 return result;
}
