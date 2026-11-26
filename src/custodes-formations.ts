import {custodesKeywords} from './adeptus-custodes-data';
import type {ArmySelection} from './catalog';
import {CUSTODES_CARRIERS,custodesCargoFormations,custodesPassengerCount,custodesPassengerFormationFits,custodesPassengerFormations,SISTERS_RHINO} from './custodes-transports';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import type {GeneratedReminder} from './generated-reminders';
import {knightWeaponCount} from './knight-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {survivingTransportPassengers,transportMovementReminders} from './transport-movement';

const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
const ORION='Orion Assault Dropship';
const capacity:Record<string,string>={
 [SISTERS_RHINO]:'Each Rhino must begin with a separate whole formation embarked. It holds 12 Anathema Psykana Infantry models. Destroy an empty Rhino at the end of Declare Battle Formations without triggering destruction rules.',
 'Coronus Grav-Carrier':'Embark up to eight Adeptus Custodes Infantry models. Jump Pack models cannot board.',
 [ORION]:'Embark up to 12 Adeptus Custodes Infantry models, or one Dreadnought and up to six such Infantry models.'
};

export function custodesFormationReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Custodes')return [];
 const rows:GeneratedReminder[]=[];
 const passengers=new Set<string>(),usableCarriers:string[]=[];
 const carrierUnits=roster.filter(s=>CUSTODES_CARRIERS.some(name=>name===s.unit));
 const prices=new Map(carrierUnits.length?rosterCost2026(army).entries.map(e=>[e.id,e.points]):[]);
 const mandatoryReserves=roster.filter(s=>custodesKeywords(army,s).has('AIRCRAFT')).reduce((n,s)=>n+(prices.get(s.id)??0),0);
 const reserveCap=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points/2;
 for(const carrier of carrierUnits){
  const groups=custodesPassengerFormations(army,carrier.unit,roster);
  if(!groups.length&&carrier.unit!==SISTERS_RHINO)continue;
  if(groups.length)usableCarriers.push(carrier.id);
  const notes=[capacity[carrier.unit]];
  if(carrier.unit===SISTERS_RHINO){
   const scouts=groups.filter(group=>group.every(s=>s.unit==='Witchseeker Squad'||s.unit==='Knight-Centura'));
   if(scouts.length)rows.push({id:'11e-custodes-rhino-scout-'+carrier.id,title:carrier.id+' · Scouts 7″',window:'Pre-battle',turn:'either',timing:'during',
    summary:'During Resolve Pre-battle Abilities, this Rhino may Scout up to 7″ if it starts wholly in your deployment zone and every model aboard has Scouts. Eligible passenger formations: '+scouts.map(([root])=>root.id).join(', ')+'. End more than 8″ horizontally from every enemy unit.',
    units:[carrier.id,...scouts.map(([root])=>root.id)],source:core,origin:'unit'});
  }
  for(const group of groups)passengers.add(group[0].id);
  if(groups.length){
   const counts=groups.map(group=>group.map(s=>s.id).join(' + ')+' ('+custodesPassengerCount(group)+')');
   notes.push('Eligible formations and model counts: '+counts.join(', ')+'.');
   if(groups.some(group=>group.slice(1).some(s=>!custodesKeywords(army,s).has(carrier.unit===SISTERS_RHINO?'ANATHEMA PSYKANA':'ADEPTUS CUSTODES'))))
    notes.push('Authority of the Inquisition lets a leading Inquisitor take a place alongside its Bodyguard.');
   if(carrier.unit===ORION&&groups.some(([root])=>custodesKeywords(army,root).has('DREADNOUGHT'))){
    const infantry=groups.filter(([root])=>!custodesKeywords(army,root).has('DREADNOUGHT'));
    if(infantry.length===2&&custodesPassengerCount(infantry.flat())>6&&infantry.every(group=>custodesPassengerCount(group)<=6))
     notes.push('With a Dreadnought, choose at most one of '+infantry.map(([root])=>root.id).join(' and ')+'.');
   }
   const price=prices.get(carrier.id);
   if(price!=null){
    const allowance=reserveCap-price-mandatoryReserves;
    const excluded=groups.filter(group=>group.every(s=>prices.get(s.id)!=null)&&group.reduce((total,s)=>total+prices.get(s.id)!,0)>allowance);
    if(carrier.unit===ORION){
     const infantry=groups.filter(group=>!custodesKeywords(army,group[0]).has('DREADNOUGHT')&&custodesPassengerCount(group)<=6);
     for(const [dread] of groups.filter(([s])=>custodesKeywords(army,s).has('DREADNOUGHT'))){
      const priceOfDread=prices.get(dread.id);
      if(priceOfDread==null||priceOfDread>allowance||!infantry.length)continue;
      const remaining=allowance-priceOfDread;
      if(infantry.every(group=>group.every(s=>prices.get(s.id)!=null)&&group.reduce((n,s)=>n+prices.get(s.id)!,0)>remaining))
       notes.push('If it starts in reserve carrying '+dread.id+', only '+remaining+' points remain. No eligible Infantry formation can start aboard with that Dreadnought.');
     }
    }
    if(excluded.length)notes.push('If this transport starts in Strategic Reserves, its '+price+' points'+(mandatoryReserves?' and '+mandatoryReserves+' points of compulsory Aircraft':'')+' leave '+Math.max(0,allowance)+' of the initial allowance before other reserves. These formations cannot start aboard it in reserve: '+excluded.map(([root])=>root.id).join(', ')+'.');
   }
  }else notes.push('This roster has no eligible passengers for this Rhino.');
  rows.push({id:'11e-custodes-passengers-'+carrier.id,title:carrier.id+' · starting passengers',window:'Pre-battle',turn:'either',timing:'start',
   summary:notes.join(' '),units:[carrier.id,...groups.map(([root])=>root.id)],source:'https://wahapedia.ru/wh40k11ed/factions/adeptus-custodes/'+carrier.unit.replaceAll(' ','-'),origin:'unit'});
 }
 const original=expandRoster(army),originalCarriers=original.filter(s=>CUSTODES_CARRIERS.some(name=>name===s.unit)&&!roster.some(now=>now.id===s.id&&now.unit!==s.unit));
 const current=new Map(roster.map(s=>[s.id,s]));
 const priorCargo=custodesCargoFormations(army,original).filter(group=>{
  const survivors=group.flatMap(s=>current.has(s.id)?[current.get(s.id)!]:[]);
  return originalCarriers.some(carrier=>custodesPassengerFormationFits(army,carrier.unit,group)||custodesPassengerFormationFits(army,carrier.unit,survivors));
 });
 rows.push(...transportMovementReminders('11e-custodes-',[...passengers],usableCarriers,survivingTransportPassengers(priorCargo,roster)));
 const joined=roster.flatMap(s=>{
  const body=knightJoinedBodyguard(army,s);
  return body?[{member:s,body}]:[];
 });
 const targets=[...new Set(joined.map(({body})=>body.id))];
 if(targets.length)for(const phase of ['Movement','Shooting','Fight'] as const){
  const shielded=joined.filter(({member,body})=>body.unit==='Sentinel Guard Sodality'&&member.unit==='Shield-Captain'&&knightWeaponCount(member,'Praesidium Shield')>0);
  const shieldNote=shielded.length?' In '+shielded.map(({body})=>body.id).join(', ')+', apply the Sentinel Guard’s −1 to Wound against Strength above the unit’s Toughness. Apply the Captain’s −1 Damage only to attacks allocated to the Captain.':'';
  rows.push({id:'11e-custodes-save-allocation-'+phase,title:'Saving throws for attached formations',window:phase,turn:'either',timing:'during',summary:
   'When attacked, make a group for each Character. Group the other models by matching Wounds, Save and invulnerable save. Allocate to wounded non-Character groups first, then remaining non-Characters, wounded Characters and finally unwounded Characters. With Precision the attacker may choose one visible Character group first. Roll a save for each wound and resolve lowest first, allocating to a wounded model in the current group where possible. Advance to the next group when that group is destroyed.'+shieldNote,
   units:targets,source:core,origin:'army'});
 }
 return rows;
}
