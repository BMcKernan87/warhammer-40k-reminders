import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {VOTANN_REVISION,VOTANN_SHEETS} from './votann-data.generated';
import {eligibleVotannUpgrades} from './votann-detachment-data';
import {votannCharacterWeapons,votannHasRangedWeapon} from './votann-loadouts';

const sheets=new Map(VOTANN_SHEETS.map(s=>[s.unit,s]));
const has=(s:RosterInstance,kw:string)=>sheets.get(s.unit)?.keywords?.includes(kw)??false;
const rules='https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/';
const packPages:Record<string,number>={'Armoured Trailblazers':2,'Farseekers':3,'Hearthguard Covenant':4,'Hearthband':5,'Mercenary Oathband':7};
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];

export function votannEnhancementReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Leagues of Votann'||!army.upgrades2026)return [];
 const joined=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 const groups=roster.filter(s=>!joined.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>joined.get(s.id)===root.id)]}));
 const targets=(match:(s:RosterInstance)=>boolean)=>groups.filter(g=>g.members.some(match)).map(g=>g.root.id);
 const out:GeneratedReminder[]=[];
 for(const bearer of roster){
  const chosen=army.upgrades2026[bearer.id]??army.upgrades2026[bearer.unit];
  if(!chosen)continue;
  const upgrade=eligibleVotannUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===chosen);
  if(!upgrade)continue;
  const group=groups.find(g=>g.members.some(s=>s.id===bearer.id))!;
  const root=group.root.id,formation=[root],personal=[bearer.id];
  const guns=group.members.some(votannHasRangedWeapon),ownGuns=votannCharacterWeapons(bearer,'Ranged'),ownMelee=votannCharacterWeapons(bearer,'Melee');
  const source=upgrade.name==='Dêlvewerke Navigator'?VOTANN_REVISION.pack+'#page=11':
   packPages[upgrade.detachment]?VOTANN_REVISION.pack+'#page='+packPages[upgrade.detachment]:rules+'#'+upgrade.detachment.replaceAll(' ','-');
  const splitPossible=joined.get(bearer.id)&&group.root.unit==='Hearthkyn Warriors'&&roster.some(s=>s.unit==='Sagitaur');
  function add(window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units=formation,part=''){
   if(units.length)out.push({id:'11e-votann-enh-'+upgrade!.id+'-'+bearer.id+'-'+window+part,title:upgrade!.name+' · '+bearer.id,window,turn,timing,summary:summary+(splitPossible&&units===formation?' If this unit splits for a Sagitaur, this effect follows the bearer’s half.':''),units:[...new Set(units)],source,origin:'detachment'});
  }
  function ranged(summary:string,react=true,units=formation){
   if(guns){add('Shooting','own','during',summary,units);if(react)add('Movement','either','during',summary,units);}
  }
  function fighting(summary:string,units=formation){add('Fight','either','during',summary,units);}
  function endTurns(summary:string,units=formation){
   add('End of your turn','own','end',summary,units);add('End of opponent turn','opponent','end',summary,units);
  }
  function attacks(summary:string){ranged(summary);fighting(summary);}
  switch(upgrade.name){
   case 'Fârstrydr Node':
    add('Pre-battle','either','start','Every model in this formation gains Deep Strike. If placed in Strategic Reserves, the entire formation can use Deep Strike on ingress, including its attached models.');break;
   case 'Bastion Shield':{
    const text='Against ranged attacks from within 12″ of this formation, worsen AP by 1. You can spend 1 Yield Point (YP) to extend that distance to 18″ until the end of this phase.';
    add('Movement','either','during',text);add('Shooting','either','during',text);break;
   }
   case 'Mercenary Prospector':
    attacks('Gain 2 Yield Points each time this formation destroys an enemy unit.');break;
   case 'Oathbound Speculator':
    attacks('Re-roll Wound rolls of 1 for this formation’s attacks. When selected to shoot or fight, you may spend 3 YP to add 1 to its Wound rolls for the rest of that phase.');break;
   case 'Dêlvewerke Navigator':{
    const beserks=targets(s=>s.unit==='Cthonian Beserks');
    if(beserks.length)add('Movement','own','during','During the Move Units step select one visible friendly Cthonian Beserks formation and spend any number of YP, including zero. Return one destroyed non-Character model to that unit, plus up to one more per 2 YP spent. Place returning models in coherency with models that started this phase on the battlefield, engaging only enemies already engaged with the formation.',[bearer.id,...beserks]);
    break;
   }
   case 'Tactical Alchemy':
    add('Command','own','during','If this formation is within range of a controlled objective outside your deployment zone, you may spend 1 YP. On a D6 roll of 4+, gain 1CP.');break;
   case 'Eye for Weakness':
    attacks('Add 1 to this formation’s Wound rolls when it attacks an assailed enemy. Guerrilla Adepts can mark a non-Monster, non-Vehicle target hit in your Shooting phase until the start of your next Shooting phase.');break;
   case 'Saturation Rounds':
    ranged('This Sagitaur’s ranged attacks ignore the Benefit of Cover.');break;
   case 'Pan-Spectral Lockons':
    add('Shooting','own','during','Select one visible enemy unit within 12″ of these Pioneers. It becomes spotted. Its detection range increases by 3″ while spotted, allowing hidden models to be seen from farther away.');break;
   case 'High Kâhl':
    if(upgrade.detachment==='Hearthband')fighting('If a melee attack destroys a model in this formation that has not fought this phase, roll one D6. On 4+, it fights after the attacking unit finishes its attacks, then is removed.');
    else fighting('When a model in this formation is destroyed before the formation has been selected to fight this phase, roll one D6. On 4+, leave it on the battlefield. Remove it after this formation has fought or at phase end, whichever occurs first.');
    break;
   case 'Metaphysical Brokerage':
    add('End of your turn','own','end','If the Strategist is on the battlefield and you gained fewer than 3 YP this turn, gain enough YP to bring this turn’s gains to 3.',personal);break;
   case 'Trivärg Cyber Implant':
    ranged('When selected to shoot in your Shooting phase, gain Sustained Hits 2 on this formation’s ranged weapons until phase end if it disembarked this turn or you spend 2 YP. Each Critical Hit scores two extra hits.',false);break;
   case 'Multiwave System Jammer':{
    const cthonians=targets(s=>has(s,'CTHONIAN'));
    if(cthonians.length)add('Movement','own','during','Once per battle while the bearer is on the battlefield, select one friendly Cthonian formation in reserves. For setting it up this phase, count the battle round as one higher.',[bearer.id,...cthonians]);break;
   }
   case 'Calculated Tenacity':
    if(joined.get(bearer.id)){const text='While the bearer is leading this formation, add 1 to each model’s Objective Control when determining control of an objective.';add('Command','either','during',text);endTurns(text);}
    break;
   case 'Quake Multigenerator':{
    if(ownGuns.length){
     add('Shooting','own','during','After the Kâhl shoots, select one non-Titanic enemy the bearer hit with '+ownGuns.join(' or ')+'. Its attacks take −1 to Hit until the start of your next turn.',personal);
     add('Shooting','opponent','during','Apply −1 to Hit to attacks made by the enemy suppressed by this Kâhl until the start of your next turn.',personal,'-suppression');
     fighting('A surviving enemy suppressed by the Kâhl’s shooting takes −1 to Hit in melee until the start of your next turn.',personal);
    }
    break;
   }
   case 'Optimised Attack Lines':
    add('Movement','own','during','This Sagitaur gains Mobile and can move horizontally through dense terrain. Apply Solid restrictions to where it ends its move.');
    add('Charge','own','during','The Sagitaur’s Mobile keyword also allows horizontal movement through dense terrain on a charge.');break;
   case 'Writ of Acquisition':
    ranged('After this formation shoots in your Shooting phase, gain 1 YP for each different assailed enemy unit hit, up to 3 YP.',false);break;
   case 'Shroudwërke Talismans':{
    const text='These Yaegirs reduce their detection range by 3″. When hidden, they can normally be seen only from within 12″. Hidden requires suitable terrain and no ranged attacks by their unit this turn or the previous turn.';
    add('Movement','either','during',text);add('Shooting','opponent','during',text);break;
   }
   case 'Ironskein':{
    const text='Add 2 to the bearer’s Wounds characteristic. Other models in the formation keep their own Wounds.';
    add('Pre-battle','either','start',text,personal);for(const phase of ['Movement','Shooting','Fight'] as const)add(phase,'either','during',text,personal);break;
   }
   case 'Dead Reckoning':
    endTurns('If the bearer is on the battlefield and you spent no YP this turn, you may gain 1 YP.',personal);break;
   case 'Iron Ambassador':
    if(ownGuns.some(g=>g.toLowerCase()==='autoch-pattern combi-bolter'))ranged('Once per battle when this formation is selected to shoot, you may spend up to 3 YP. Add the amount spent to Damage on the bearer’s '+ownGuns.join(' and ')+' until phase end. Only the bearer’s ranged weapons improve.',true,personal);break;
   case 'Surgical Saboteur':
    if(guns){
     ranged('After this formation shoots in your Shooting phase, select one enemy Monster or Vehicle hit by its attacks. Pin it until the start of your next Shooting phase. Subtract 2″ from its Move and 2 from its Charge rolls.',false);
     add('Movement','opponent','during','A Monster or Vehicle pinned by this formation has −2″ Move until the start of your next Shooting phase.');
     add('Charge','opponent','during','Subtract 2 from the pinned Monster or Vehicle’s Charge rolls until the start of your next Shooting phase.');
    }break;
   case 'Quake Supervisor':{
    const artillery=targets(s=>has(s,'ARTILLERY'));
    if(artillery.length){
     const lone=joined.get(bearer.id)?'Lone Operative protects an attached unit only while every surviving model has it.':'While the bearer benefits from Lone Operative, enemies beyond 12″ cannot see or target its unit with Indirect Fire.';
     const units=[bearer.id,...artillery],text='Within 3″ of friendly Leagues of Votann Artillery the bearer has Lone Operative. '+lone+' That Artillery adds 1 to Hit with ranged attacks against an enemy visible to the bearer.';
     add('Movement','either','during',text+' Snap shots still use their unmodified hit threshold.',units);add('Shooting','either','during',text,units);
    }break;
   }
   case 'Mantle of Elders':
    if(guns&&group.members.some(s=>has(s,'BRÔKHYR')||has(s,'IRONKIN STEELJACKS')||s.unit==='Arkanyst Evaluator'))
     add('Shooting','own','during','When this formation is selected to shoot and spends YP on Optimal Application, roll one D6. On 2+, gain 1 YP.');break;
   case 'Precursive Judgement':{
    const transports=targets(s=>has(s,'TRANSPORT'));
    if(guns&&transports.length)add('Movement','opponent','end','At the end of the opponent’s Movement phase, an unengaged formation wholly within 6″ of a friendly Leagues of Votann Transport can use Fire Overwatch for 0CP. Target one visible eligible enemy within 24″. Its snap shots hit on unmodified 5+ and cannot re-roll Hit rolls.',[root,...transports]);break;
   }
   case 'Etacarn SB9 Targeting Implant':{
    const text='Re-roll Hit rolls of 1 for this formation’s attacks. When selected to shoot or fight, spend 3 YP to gain Sustained Hits 1 until phase end. Each Critical Hit scores one extra hit.';
    ranged(text,false);fighting(text);
    if(guns)add('Movement','either','during','When selected to shoot, you can spend 3 YP for Sustained Hits 1 until phase end. Each Critical Hit scores one extra hit. Snap shots cannot re-roll Hit rolls.');
    break;
   }
   case 'Graviton Vault':{
    const text=(weapon:string)=>'After the Iron-master attacks with '+weapon+', select one enemy Monster or Vehicle hit by the bearer. Its attacks take −1 to Hit until the start of your next turn.';
    if(ownGuns.length)add('Shooting','own','during',text(ownGuns.join(' or ')),personal);if(ownMelee.length)fighting(text(ownMelee.join(' or ')),personal);break;
   }
   case 'Asset Manipulator':{
    const text='At the start of either Command phase, you may spend 3 YP. Until turn end, enemy models in a unit within 3″ of the bearer have −1 Objective Control.';
    add('Command','either','start',text,personal);endTurns('If you spent 3 YP on Asset Manipulator this Command phase, apply −1 Objective Control to models in enemy units within 3″ of the bearer until the turn ends.',personal);break;
   }
   case 'Nomad Strategist':{
    const hernkyn=targets(s=>has(s,'HERNKYN'));
    if(hernkyn.length)add('Fight','opponent','end','Once per battle if the bearer is on the battlefield, spend up to 4 YP. Move one friendly Hernkyn formation into Strategic Reserves, plus up to one more for each 2 YP spent. A selected unit may be engaged only with assailed enemies.',[bearer.id,...hernkyn]);break;
   }
   case 'Ancestral Crest':
    for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const)add(phase,'either','during','Once per turn when you target this formation with Command Re-roll, you may spend 1 YP to reduce that use’s cost by 1CP. All ordinary restrictions on which rolls can be re-rolled apply.');break;
   case 'Signature Restoration':{
    const repair=targets(s=>has(s,'VEHICLE')||has(s,'EXOFRAME')||has(s,'IRONKIN STEELJACKS'));
    if(repair.length)add('Movement','own','end','At the end of your Movement phase, Forgewrought Expertise can repair one friendly Vehicle, Exoframe or Ironkin Steeljacks formation within 3″. The repaired model regains one extra lost wound, for D3+1 total or up to 4 if the Ironkin Assistant survives. A unit can be repaired only once per turn.',[bearer.id,...repair]);break;
   }
   case 'Piledriver':
    if(ownMelee.length)fighting('When this formation is selected to fight you may spend up to 2 YP. Add the amount spent to Damage on the bearer’s '+ownMelee.join(' and ')+' until phase end. Other models use their normal weapon Damage.',personal);break;
  }
 }
 return out;
}
