import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import type {GeneratedReminder} from './generated-reminders';

export const AELDARI_SUPPORT_ARTILLERY=new Set(['D-cannon Platform','Shadow Weaver Platform','Vibro Cannon Platform']);
/** Support Artillery is optional joining, separate from the mandatory Support ability. */
export function aeldariArtilleryHosts(army:ArmySelection,id:string,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[]{
 if(army.faction!=='Aeldari'||!roster.some(s=>s.id===id&&AELDARI_SUPPORT_ARTILLERY.has(s.unit)&&!s.attachedTo))return [];
 return roster.filter(body=>body.unit==='Guardian Defenders'&&!body.attachedTo&&!body.retinueTo&&!roster.some(s=>s.id!==id&&s.retinueTo===body.id));
}
export function aeldariJoinedArtillery(army:ArmySelection,s:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 return s.retinueTo?aeldariArtilleryHosts(army,s.id,roster).find(body=>body.id===s.retinueTo):undefined;
}
export function setAeldariArtillery(army:ArmySelection,id:string,bodyId:string|null):ArmySelection{
 const roster=expandRoster(army);
 if(army.faction!=='Aeldari'||!roster.some(s=>s.id===id&&AELDARI_SUPPORT_ARTILLERY.has(s.unit))||bodyId!==null&&!aeldariArtilleryHosts(army,id,roster).some(s=>s.id===bodyId))throw Error('Choose Guardian Defenders without another Support Weapon.');
 return {...army,instances:roster.map(s=>s.id===id?{...s,retinueTo:bodyId??undefined}:s)};
}
export function reconcileAeldariArtillery(army:ArmySelection):ArmySelection{
 if(!army.instances)return army;
 return {...army,instances:army.instances.map(s=>s.retinueTo&&!aeldariJoinedArtillery(army,s)?{...s,retinueTo:undefined}:s)};
}
export function aeldariArtilleryReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const original=expandRoster(army);
 return roster.filter(s=>AELDARI_SUPPORT_ARTILLERY.has(s.unit)).map(s=>{
  const body=aeldariJoinedArtillery(army,s,original);
  return {id:'11e-aeldari-artillery-'+s.id,title:s.id+' · Support Artillery',window:'Pre-battle' as const,turn:'either' as const,timing:'start' as const,origin:'unit' as const,units:[s.id,...body?[body.id]:[]],source:'https://wahapedia.ru/wh40k11ed/factions/aeldari/'+s.unit.replaceAll(' ','-'),summary:body?'At the start of Declare Battle Formations, this Support Weapon joins '+body.id+'. It is part of that Guardians unit for the rest of the battle, increasing its Starting Strength by one. This uses the separate Support Artillery slot; its Leader and Support slots remain available. Only one Support Weapon may join. This model and its joined unit cannot embark in a Transport.':'This Support Weapon remains a separate unit. It cannot embark in a Transport. During Declare Battle Formations it may instead join one Guardian Defenders unit with no other Support Weapon, becoming part of it for the battle and increasing its Starting Strength by one.'};
 });
}
