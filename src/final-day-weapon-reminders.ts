import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {FINAL_DAY_KITS} from './final-day-loadouts.generated';
import {gscAlliedMusterUnits} from './gsc-allies';
import {equippedWeaponText,type KnightCardStats} from './knight-card-rules';

const cards=new Map<string,KnightCardStats>(FINAL_DAY_KITS.map(card=>[card.unit,{
 source:card.source,weapons:card.weapons,save:null,rangedSave:false,demise:null,damage:null,conversion:null
}]));
export function finalDayWeaponReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults'||!army.detachments2026?.includes('Final Day'))return [];
 const allowed=new Set(gscAlliedMusterUnits(army)),output:GeneratedReminder[]=[];
 for(const squad of roster){
  const stats=cards.get(squad.unit);
  if(!stats||!allowed.has(squad.unit))continue;
  for(const window of ['Fight','Shooting','Movement'] as const){
   const snap=window==='Movement',phase=window==='Fight'?'Fight':'Shooting';
   const summary=equippedWeaponText(squad,stats,phase,snap);
   if(!summary)continue;
   output.push({id:'11e-final-day-weapon:'+squad.id+':'+window,title:squad.id+' · '+(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles'),
    window,turn:snap?'opponent':phase==='Fight'?'either':'own',timing:snap?'end':'during',origin:'unit',units:[squad.id],
    summary:(snap?'When firing Overwatch, use snap shooting. ':'')+summary,source:stats.source});
  }
 }
 return output;
}
