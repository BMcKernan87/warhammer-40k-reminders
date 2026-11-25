import {daemonFortification,daemonHasRangedWeapon,type DaemonRuleContext} from './daemon-datasheet-context';
import {PHASES} from './engine';
import {knightWeaponCount} from './knight-loadouts';

// Matched-play Chaos Daemons faction pack. A personal rule naming a model uses
// its own roster ID. Rules applying to units use the legally joined formation.
export function daemonMartialAbilities(c:DaemonRuleContext):void {
 const {squad,body,add}=c;
 const unit=[c.formationId(squad)],bearer=[squad.id];
 const alliedGod=(god:string,ranged=false)=>[...new Set(c.roster.filter(s=>c.god(s)===god&&(!ranged||daemonHasRangedWeapon(s))).map(c.formationId))];
 const fight=(name:string,summary:string,targets=unit)=>add(name,'Fight','either','during',summary,targets);
 const pursuit=(name:string,summary:string,targets=unit)=>{
  add(name,'Movement','own','during',summary,targets);
  add(name,'Charge','either','during',summary,targets);
 };
 const hunt=(name:string,prey:string,summary:string,targets:string[])=>{
  add(name,'Start of battle round','either','start','At the start of round one, designate one enemy unit as this model’s '+prey+'.',bearer);
  for(const phase of PHASES)add(name,phase,'either','during',(phase==='Fight'?summary+' ':'')+'Each time the designated '+prey+' is destroyed, choose a new enemy unit as its replacement.',targets);
 };
 switch(squad.unit){
  case 'Karanak':
   if(body)pursuit('Pack Leader','While Karanak leads this formation, you can re-roll its Advance and Charge rolls.');
   hunt('Prey of the Blood God','prey','Models in Karanak’s unit may re-roll melee Wound rolls against its prey.',unit);
   for(const phase of PHASES)add('Brass Collar of Bloody Vengeance',phase,'either','during','Karanak has Feel No Pain 3+ against Psychic attacks and mortal wounds.',bearer);
   break;
  case 'Skarbrand':
   fight('Rage Embodied (Aura)','Friendly Khorne Legiones Daemonica units within 6″ of Skarbrand add 1 to their melee weapons’ Attacks.',alliedGod('Khorne'));
   pursuit('Murderlust','Skarbrand can declare a charge in a turn in which it Advanced.');
   break;
  case 'Skulltaker':
   if(body)fight('Lord of Decapitations','While Skulltaker leads this formation, its models’ melee weapons gain Devastating Wounds.');
   fight('Skulls for Khorne','When Skulltaker attacks an enemy Character unit, it can re-roll Hit and Wound rolls. Gain 1CP each time Skulltaker destroys an enemy Character unit.',bearer);
   break;
  case 'Rendmaster On Blood Throne':
   add('Blood Throne','Fight','either','start','Select one visible enemy within 18″. Until the phase ends, when a friendly Khorne Legiones Daemonica unit attacks that enemy, improve Strength, AP and Damage by 1.',alliedGod('Khorne'));
   fight('Champion Slayer','Re-roll Wound rolls when this model makes melee attacks against a Character or Monster unit. Whenever this model destroys such a unit, it regains up to D6 lost wounds.',bearer);
   break;
  case 'Flesh Hounds':
   for(const phase of PHASES)add('Collar of Khorne',phase,'either','during','Each Flesh Hound with its collar has Feel No Pain 3+ against Psychic attacks. Apply the roll to that bearer.',bearer);
   add('Hunters from the Warp','End of opponent turn','opponent','end','If the formation is unengaged, you may remove it and place it in Strategic Reserves.',unit);
   break;
  case 'Bloodletters':
  case 'Fiends':{
   const name=squad.unit==='Fiends'?'Soporific Musk':'Bane of Cowards';
   add(name,'Movement','opponent','during','When an engaged enemy other than a Monster or Vehicle Falls Back, its models must take Desperate Escape tests. Subtract 1 from those tests if it is battle-shocked. One or more units with this ability produce the same test requirement.',unit);
   break;
  }
  case 'Bloodcrushers':
   add('Brass Stampede','Charge','either','during','After this unit finishes a Charge move, choose one engaged enemy. Roll one D6 per model in this formation. Each 4+ inflicts D3 mortal wounds on the chosen enemy.',unit);
   break;
  case 'Skull Cannon':
   add('Skulls of the Fallen','Shooting','own','during','After this model shoots, choose one enemy hit by at least one of its attacks. The chosen unit takes a Battle-shock test.',bearer);
   break;
  case 'Bloodmaster':
   if(body)fight('Bloodmaster','While the Bloodmaster leads this formation, add 1 to Wound rolls for attacks made by models in it.');
   add('A Gory Path','Fight','either','during','Each time this formation consolidates, it may move up to 6″.',unit);
   break;
  case 'Skullmaster':
   if(body)for(const phase of ['Charge','Fight'] as const)add('Skullmaster’s Fury',phase,'either','during','When the formation finishes a Charge move, its Juggernauts’ bladed horns gain Devastating Wounds until turn end. Other melee weapons retain their own abilities.',unit);
   add('Devastating Charge','Charge','either','during','After this model’s unit finishes a Charge move, every enemy unit in Engagement Range of that formation must take a Battle-shock test.',unit);
   break;
  case 'Bloodthirster':
   fight('Daemon Lord of Khorne (Aura)','Friendly Khorne Legiones Daemonica units within 6″ of this model add 1 to melee Hit rolls.',alliedGod('Khorne'));
   add('Relentless Carnage','Fight','either','end','Select one enemy within Engagement Range of this model. Roll eight D6. Each 4+ inflicts one mortal wound on that enemy.',bearer);
   break;
  case 'Skull Altar':
   for(const phase of PHASES)add('Shadow of Khorne (Aura)',phase,'either','during','Friendly Khorne Legiones Daemonica units within 6″ of the Altar may re-roll Battle-shock tests.'+(c.army.faction==='Chaos Daemons'?' The battlefield area within 6″ of the Altar is within your army’s Shadow of Chaos.':''),alliedGod('Khorne'));
   daemonFortification(c,'Cover');
   break;
  case 'The Masque Of Slaanesh':
   add('The Eternal Dance','Fight','either','start','Select one enemy unit within 6″. For this phase friendly Slaanesh Legiones Daemonica models gain +1 to melee Wound rolls against it, and its own melee Wound rolls suffer −1.',alliedGod('Slaanesh'));
   pursuit('Dazzling Acrobatics','The Masque can declare a charge in a turn in which it Advanced or Fell Back.');
   break;
  case 'Keeper Of Secrets':
   fight('Daemon Lord of Slaanesh (Aura)','Friendly Slaanesh Legiones Daemonica units within 6″ of this model improve the AP of their melee weapons by 1.',alliedGod('Slaanesh'));
   for(const phase of ['Shooting','Fight'] as const)add('Mesmerising Form',phase,'either','during','Subtract 1 from Hit rolls for attacks targeting this model.',bearer);
   if(knightWeaponCount(squad,'Shining aegis')>0)for(const phase of ['Movement','Shooting','Fight'] as const)add('Shining Aegis',phase,'either','during','The equipped Keeper has a 3+ armour Save.',bearer);
   break;
  case 'Tranceweaver':
   for(const phase of ['Shooting','Fight'] as const){
    if(phase==='Fight'||c.roster.some(s=>c.formationId(s)===unit[0]&&daemonHasRangedWeapon(s))){
     add('Tranceweaver',phase,'either','during','When a model in this unit attacks, re-roll Hit rolls of 1. If its target is within range of an objective, you can re-roll any Hit roll instead.',unit);
    }
   }
   add('Symphony of Pain (Psychic)','Movement','own','end','Select one battle-shocked enemy within 12″ of the Tranceweaver. Until turn end, friendly Slaanesh Legiones Daemonica models attacking it may re-roll Hit and Wound rolls.',alliedGod('Slaanesh'));
   for(const phase of ['Shooting','Fight'] as const){
    const recipients=alliedGod('Slaanesh',phase==='Shooting');
    if(recipients.length)add('Symphony of Pain (Psychic)',phase,'own','during','If a battle-shocked enemy was selected at the end of Movement, friendly Slaanesh Legiones Daemonica models may re-roll Hit and Wound rolls against that enemy until turn end.',recipients);
   }
   break;
  case 'Daemonettes':
   add('Horrifying Beauty','Fight','either','start','Each enemy engaged with one or more units with this ability takes a Battle-shock test. Subtract 1 from its result if it is below half-strength.',unit);
   break;
  case 'Hellflayers':
   fight('Cutting Down the Foe','If this unit charged this turn, its models gain +1 Strength and +1 Damage on their melee attacks.');
   break;
  case 'Seekers':
   pursuit('Unholy Speed','You may re-roll this formation’s Advance and Charge rolls.');
   break;
  case 'Shalaxi Helbane':
   pursuit('No Prey Can Evade','You may re-roll Advance and Charge rolls for Shalaxi.',bearer);
   hunt('Monarch of the Hunt','quarry','When Shalaxi makes a melee attack against its quarry, you may re-roll Hit and Wound rolls.',bearer);
   break;
  case 'Syll’esske':
   if(body)fight('Prince of Slaanesh','While this model leads the formation, a successful unmodified melee Wound roll of 5+ scores a Critical Wound for its models.');
   for(const phase of PHASES)add('Delightful Agonies',phase,'either','end','The first time this model is destroyed, roll one D6 at the end of that phase. On 2+, return it at full wounds as close as possible to where it was destroyed and outside Engagement Range.',bearer);
   break;
  case 'Tormentbringer':
   fight('Tormentbringer (Aura)','Friendly Slaanesh Legiones Daemonica units within 6″ of this model gain Sustained Hits 1 on melee weapons.',alliedGod('Slaanesh'));
   for(const phase of PHASES)add('Hysterical Frenzy',phase,'either','during','When a model in this unit is destroyed and has not fought this phase, leave it in play. It can fight after the attacking unit finishes its attacks. Then remove that model.',unit);
   break;
  case 'Infernal Enrapturess':
   if(body)add('Harmonic Alignment','Command','own','during','Return D3 destroyed Bodyguard models to the formation this model leads.',unit);
   for(const phase of ['Movement','Shooting','Fight'] as const)add('Discordant Disruption (Aura)',phase,'either','during','Psychic weapons of models in an enemy Psyker unit within 12″ of the Enrapturess gain Hazardous.',bearer);
   break;
  case 'Contorted Epitome':{
   if(body)for(const phase of PHASES)add('Swallow Energy (Psychic)',phase,'either','during','While this model leads the formation, its models have Feel No Pain 4+ against mortal wounds and Psychic attacks.',unit);
   const psykers=c.roster.filter(s=>s.unit==='Contorted Epitome').map(s=>s.id);
   if(squad.id===psykers[0])add('Horrible Fascination (Psychic)','Shooting','opponent','start','One Psyker in your army with this ability may select one enemy visible to it within 12″ and roll a D6. On 1 the Psyker suffers D3 mortal wounds. On 2–5 the enemy suffers −1 to Hit for the phase. On 6 the enemy cannot shoot this phase.',psykers);
   break;
  }
 }
}
