import type {ArmySelection} from './catalog';
import {DEATH_GUARD_REVISION} from './death-guard-data.generated';
import {deathGuardKeywords,deathGuardMusterUnits} from './death-guard-data';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export const deathGuardPlagueText={
 'Skullsquirm Blight':'Targets receive Benefit of Cover against this afflicted unit’s ranged attacks. Subtract 1 from its melee Hit rolls.',
 'Rattlejoint Ague':'Worsen the Save characteristic of each afflicted model by 1.',
 'Scabrous Soulrot':'Worsen each afflicted model’s Move, Leadership and Objective Control by 1. Objective Control can only be reduced to a minimum of 1 by this plague.'
} as const;

export function deathGuardContagionRange(round:number,modifier=0):number{
 const base=round<=1?3:round===2?6:9;
 return Math.min(12,base+modifier);
}
function progression(modifier:number):string{
 return [1,2,3].map(round=>deathGuardContagionRange(round,modifier)+'″').join(' / ');
}

export function deathGuardContagionReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Death Guard')return [];
 const legal=new Set(deathGuardMusterUnits(army));
 const squads=roster.filter(s=>legal.has(s.unit));
 const native=squads.filter(s=>deathGuardKeywords(army,s).has('DEATH GUARD'));
 const generated=army.detachments2026?.includes('Shamblerot Vectorium')?'Poxwalkers (Numberless Horde reinforcements)':undefined;
 if(!native.length&&!generated)return [];
 const hasParagons=army.detachments2026?.includes('Paragons of Putrescence');
 const hasTallyband=army.detachments2026?.includes('Tallyband Summoners');
 const legions=hasTallyband?squads.filter(s=>deathGuardKeywords(army,s).has('PLAGUE LEGIONS')):[];
 const groups=new Map<string,RosterInstance[]>();
 for(const s of native){
  const id=knightJoinedBodyguard(army,s)?.id??s.id;
  const members=groups.get(id)??[];
  members.push(s);
  groups.set(id,members);
 }
 const sources=[...groups.keys(),...(generated?[generated]:[]),...legions.map(s=>s.id)];
 const cards:GeneratedReminder[]=[];
 const pack=DEATH_GUARD_REVISION.pack;
 const codex='https://wahapedia.ru/wh40k11ed/factions/death-guard/#Nurgle-s-Gift-Aura';
 function add(key:string,title:string,window:ReminderWindow,turn:GeneratedReminder['turn'],summary:string,source=codex,timing:GeneratedReminder['timing']=window==='Start of battle round'?'start':'during'){
  cards.push({id:'11e-dg-gift-'+key,origin:'army',title,source,summary,units:sources,turn,window,timing});
 }
 const options=Object.entries(deathGuardPlagueText).map(([name,rule])=>name+' — '+rule).join(' ');
 add('choice','Nurgle’s Gift · Choose a plague','Pre-battle','either','During Declare Battle Formations, choose one plague for the battle. Every Afflicted enemy loses 1 Toughness and suffers that plague. '+options);
 const modifiers:string[]=[];
 for(const [id,members] of groups){
  const characterBonus=hasParagons&&members.some(s=>deathGuardKeywords(army,s).has('CHARACTER'))?3:0;
  const hasBodyguard=members.length>1;
  const lonePoxes=members.length===1&&members[0].unit==='Lord of Poxes';
  const bonus=characterBonus+(lonePoxes?3:0);
  const local=(modifier:number)=>progression(modifier)+(legions.length?' (within 7″ of a listed Plague Legions unit: '+progression(modifier+3)+')':'');
  if(bonus||legions.length)modifiers.push(id+' uses '+local(bonus)+'.');
  if(hasBodyguard){
   for(const lord of members.filter(s=>s.unit==='Lord of Poxes'))modifiers.push('From '+lord.id+' itself, use '+local(characterBonus+3)+' for Gift of Poxes. The other models in '+id+' use '+local(characterBonus)+'.');
  }
 }
 if(legions.length){
  modifiers.push(legions.map(s=>s.id).join(', ')+' gain Nurgle’s Gift only while within 7″ of a friendly Death Guard unit. Measure '+progression(0)+' from those daemon models. The nearby native unit gains +3″ once.');
 }
 if(generated)modifiers.push(generated+' projects the normal aura after it is set up on the battlefield.');
 add('range','Nurgle’s Gift · Contagion Range','Start of battle round','either','Measure from models on the battlefield. Round 1 / round 2 / round 3 onwards: '+progression(0)+'. The range caps at 12″ after all modifiers. An enemy within one or more applicable ranges is Afflicted once, with −1 Toughness and your chosen plague. '+modifiers.join(' '),pack);
 const debuff='While an enemy is Afflicted, its models have −1 Toughness. ';
 add('shoot','Nurgle’s Gift · Ranged attacks','Shooting','either',debuff+'If you chose Rattlejoint Ague, worsen the enemy’s Save characteristic by 1. Under Skullsquirm Blight the targets of that enemy’s own ranged attacks receive Benefit of Cover.',pack);
 add('overwatch','Nurgle’s Gift · Overwatch','Movement','either',debuff+'These effects also apply when resolving Overwatch at the end of either player’s Movement phase. Rattlejoint Ague worsens the afflicted enemy’s Save characteristic by 1 against your shots. Skullsquirm Blight grants the targets of an afflicted enemy’s Overwatch the Benefit of Cover.',pack,'end');
 add('fight','Nurgle’s Gift · Melee attacks','Fight','either',debuff+'If you chose Skullsquirm Blight, the afflicted enemy subtracts 1 from its melee Hit rolls. Under Rattlejoint Ague, worsen its Save characteristic by 1.',pack);
 add('move','Scabrous Soulrot · Enemy movement','Movement','either','If Scabrous Soulrot applies, models in an Afflicted enemy unit have −1 Move while affected.');
 add('command','Scabrous Soulrot · Leadership and objectives','Command','either','If Scabrous Soulrot applies, models in an Afflicted enemy unit have −1 Leadership and −1 Objective Control (minimum OC 1 from this effect).');
 return cards;
}
