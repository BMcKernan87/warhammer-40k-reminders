import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightWeaponCount} from './knight-loadouts';
import {orkKeywords} from './ork-data';
import {orkHasRangedWeapon} from './ork-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';

const types=new Set(['Dakkajet','Burna-bommer','Blitza-bommer','Wazbom Blastajet','Warbuggies','Wartrakks','Gunwagon','Deffkoptas','Battlewagon','Deff Dread','Killa Kans','Mek Gunz']);
const guns={
 'Bubblechukka':'When the wobbled enemy attacks, its targets have cover against those attacks.',
 'Kustom Mega-kannon':'The zapped enemy worsens its Leadership by 1.',
 'Smasha Gun':'The smashed enemy loses 2″ Move.',
 'Traktor Kannon':'The grounded enemy cannot take to the skies.',
};
export function orkVehicleDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Orks')return [];
 const rows:GeneratedReminder[]=[];
 const speed=roster.filter(s=>orkKeywords(army,s).has('SPEED FREEKS'));
 for(const s of roster){
  if(!types.has(s.unit))continue;
  const source='https://wahapedia.ru/wh40k11ed/factions/orks/'+s.unit.replaceAll(' ','-');
  function emit(key:string,title:string,window:ReminderWindow,turn:NonNullable<GeneratedReminder['turn']>,timing:GeneratedReminder['timing'],summary:string,targets=[s]){
   if(targets.length)rows.push({id:'11e-ork-vehicle-'+s.id+'-'+key+'-'+window,sourceRuleId:key,title:s.id+' · '+title,window,turn,timing,summary,source,origin:'unit',units:targets.map(t=>t.id)});
  }
  switch(s.unit){
   case 'Deffkoptas':
    emit('deff-from-above','Deff from Above','Shooting','own','during','If these Deffkoptas made an ingress move this turn, their ranged attacks gain +1 to Hit.');
    emit('aerial-manoover','Aerial Manoover','Fight','opponent','end','If unengaged, this unit may enter Strategic Reserves.');break;
   case 'Dakkajet':
    emit('strafing-run','Strafing Run','Shooting','own','during','When the Dakkajet shoots a unit without Fly, add 1 to its ranged Hit rolls.');break;
   case 'Burna-bommer':
    emit('burna-bomb','Burna Bomb','Fight','opponent','end','Select a visible enemy within 36″, excluding Lone Operatives, Monsters and Vehicles. On a D6 roll of 2+ it suffers D3 mortal wounds, cannot be hidden, and ranged attacks against it ignore cover until the end of your next turn.');
    emit('burna-bomb-target','Burna Bomb · exposed target','Shooting','own','during','If this bomber’s bomb succeeded in the previous enemy Fight phase, its target cannot be hidden and ranged attacks against it ignore cover through the end of this turn.',roster.filter(orkHasRangedWeapon));break;
   case 'Blitza-bommer':
    emit('boom-bomb','Boom Bomb','Fight','opponent','end','Choose a visible enemy within 24″, excluding Lone Operatives. Roll a D6. On 1–3 inflict D3 mortal wounds, on 4–5 inflict 3, and on 6 inflict D3+3.');break;
   case 'Wazbom Blastajet':
    emit('weak-spot','Go fer da Weak Spot','Shooting','own','during','The Wazbom’s ranged attacks gain +1 to Wound against Monsters and Vehicles.');
    if(knightWeaponCount(s,'Blastajet Force Field'))for(const phase of ['Movement','Shooting','Fight'] as const)emit('blastajet-field','Blastajet Force Field',phase,'either','during','The installed force field gives this unit a 5+ invulnerable save. It loses the Smoke keyword.');
    break;
   case 'Warbuggies':
    emit('drive-by','Drive-by Skorchin’','Movement','own','during','Choose a visible enemy within 6″ of this unit, excluding Monsters and Vehicles. That enemy cannot be targeted with Fire Overwatch until this turn ends.');break;
   case 'Wartrakks':{
    const nearby=speed.filter(m=>m.unit!=='Wartrakks');
    if(nearby.length)emit('speednob','Speednob Support','Shooting','opponent','during','The Wartrakks have Lone Operative while each model is within 3″ of another friendly Speed Freeks unit, excluding other Wartrakks. Possible supporting units include '+nearby.map(m=>m.id).join(', ')+'.');
    emit('bust-em','Bust ’Em','Shooting','own','during','After the Wartrakks shoot, mark one enemy they hit as busted until end of turn. Friendly Speed Freeks attacks gain Lethal Hits against it.');
    emit('busted-target','Bust ’Em · busted enemy','Fight','own','during','Friendly Speed Freeks melee attacks gain Lethal Hits against the enemy this Wartrakk unit busted in your Shooting phase, through turn end.',speed);break;
   }
   case 'Gunwagon':
    emit('arsenal','Mobile Arsenal','Shooting','own','during','When the Gunwagon shoots in this phase, re-roll its ranged Hit rolls of 1.');break;
   case 'Battlewagon':
    for(const phase of ['Movement','Shooting'] as const)emit('fortress','Mobile Fortress',phase,'either','during','Ranged attacks targeting this Battlewagon have −1 Damage, including reactive shooting.');break;
   case 'Deff Dread':
    for(const phase of ['Movement','Shooting','Fight'] as const)emit('dread-ard','Dread ’Ard',phase,'either','during','Reduce the Damage of attacks targeting this Deff Dread by 1.');break;
   case 'Killa Kans':
    for(const phase of ['Shooting','Fight'] as const)emit('power-trip','Spiteful Power Trip',phase,phase==='Fight'?'either':'own','during','Add 1 to Hit only if every model in the targeted unit has Toughness 6 or less.');break;
   case 'Mek Gunz':{
    const selected=Object.entries(guns).filter(([gun])=>knightWeaponCount(s,gun)>0);
    if(selected.length===1){
     const [gun,effect]=selected[0];
     emit('artillery','Madcap Artillery · '+gun,'Shooting','own','during','After this unit shoots, choose an enemy it hit if the Mek Gun models still all have '+gun+'. '+effect+' This lasts until the start of your next turn.');
    }else if(selected.length>1){
     const effects=selected.map(([gun,effect])=>gun+' – '+effect).join(' ');
     emit('artillery','Madcap Artillery · surviving crew','Shooting','own','during','This roster has mixed guns. If casualties leave all surviving Mek Gun models with the same gun, choose an enemy hit after this unit shoots and apply only that gun’s effect until your next turn. '+effects);
    }break;
   }
  }
 }
 return rows;
}
