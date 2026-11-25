import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster} from './roster-instances';
import {weaponAbilityText} from './weapon-abilities-11th';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';

const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Movement','Shooting','Fight'] as const;
const titleCase=(s:string)=>s.replace(/\b[a-z]/g,l=>l.toUpperCase());
function weaponEffect(raw:string,snap:boolean){
 if(raw==='psychic assassin')return 'Psychic Assassin sets the animus speculum to 6 attacks against a Psyker unit';
 if(raw.startsWith('blast '))return 'Blast '+raw.slice(6)+' adds '+raw.slice(6)+' attacks per five models in the target';
 return weaponAbilityText(titleCase(raw),snap);
}

export function assignedAgentReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Imperial Knights')return [];
 const result:GeneratedReminder[]=[];
 for(const squad of expandRoster(army)){
  const data=ASSIGNED_AGENT_DATA.find(row=>row.sheet.unit===squad.unit);
  if(!data)continue;
  const unit=squad.unit,source=data.sheet.source;
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,turn:GeneratedReminder['turn']='either',timing:GeneratedReminder['timing']='during')=>{
   result.push({id:'11e-agent-'+squad.id+'-'+key+'-'+window,origin:'unit',units:[squad.id],title:squad.id+' · '+title,source,window,turn,timing,summary});
  };
  for(const phase of attacks){
   const snap=phase==='Movement',melee=phase==='Fight';
   const weapons=data.weapons.filter(w=>w.type===(melee?'Melee':'Ranged')).map(w=>{
    const effects=w.abilities.split(',').map(k=>k.trim()).filter(Boolean).map(k=>weaponEffect(k,snap)).filter(Boolean);
    return effects.length?w.name+' — '+effects.join('. '):'';
   }).filter(Boolean);
   if(weapons.length)emit('weapons',snap?'Snap shooting':melee?'Melee weapons':'Ranged weapons',phase,(snap?'When this agent snap shoots: ':'')+weapons.join('. '),snap?'opponent':melee?'either':'own');
   emit('save',data.invulnerable+'+ invulnerable save',phase,'When an attack is allocated to this agent, it may use its '+data.invulnerable+'+ invulnerable save.');
  }
  for(const phase of ['Movement','Shooting'] as const){
   emit('lone','Lone Operative',phase,'Enemy models more than 12″ away cannot see this agent or target it with Indirect Fire.');
   if(unit==='Vindicare Assassin'||unit==='Culexus Assassin')emit('stealth','Stealth',phase,'This agent receives the benefit of cover against ranged attacks.');
  }
  if(unit==='Callidus Assassin'||unit==='Vindicare Assassin')emit('infiltrators','Infiltrators','Pre-battle','During deployment, set up more than 8″ horizontally from the enemy deployment zone and all enemy units.');
  if(unit==='Callidus Assassin'||unit==='Culexus Assassin'){
   emit('reserves','Deep Strike','Pre-battle','You may declare this agent in Strategic Reserves for a Deep Strike ingress.');
   emit('ingress','Deep Strike','Movement','When making an ingress move, this agent may set up anywhere more than 8″ horizontally from all enemies, including in their deployment zone.');
  }
  if(unit==='Callidus Assassin'){
   for(const phase of phases)emit('reign','Reign of Confusion',phase,'Once per turn, when your opponent targets one of their units within 12″ of this model with a Stratagem, you may increase that use’s cost by 1CP.');
   emit('priority','Fights First','Fight','Resolve this model in the Fights First order.');
   emit('escape','Acrobatic Escape','Fight','At phase end, this model may Fall Back up to D6″ if engaged.','either','end');
   emit('escape','Acrobatic Escape','End of opponent turn','If more than 3″ from all enemies, this model may enter Strategic Reserves. It must make an ingress move in your next Movement phase, even on your first turn.','opponent','end');
   emit('escape','Acrobatic Escape return','Movement','If this model used Acrobatic Escape to enter reserves last turn, it must make an ingress move now, including on your first turn.','own');
  }
  if(unit==='Culexus Assassin'){
   emit('soulless','Soulless Horror','Command','Once per battle at phase start, each enemy unit within 9″ takes a Battle-shock test at −1, or −2 for a Psyker unit.','either','start');
   emit('etheric','Etheric Emergence','Movement','During your Movement phase, this model may Deep Strike more than 6″ horizontally from all enemies. Choosing this arrival prevents charging this turn.','own');
   emit('etheric','Etheric Emergence','Charge','If this model used Etheric Emergence this turn, it cannot declare a charge.','own');
   for(const phase of phases)emit('abomination','Abomination',phase,'Apply Feel No Pain 2+ against Psychic Attacks.');
  }
  if(unit==='Eversor Assassin'){
   emit('scout','Scouts 9″','Pre-battle','In the Resolve Pre-battle Abilities step, deploy from Strategic Reserves wholly inside your deployment zone, or scout up to 9″ if already wholly inside it. Finish the move more than 8″ horizontally from all enemies.');
   for(const phase of ['Movement','Shooting','Charge'] as const)emit('frenzon','Frenzon',phase,'This model may shoot and declare a charge during a turn in which it Advanced.','own');
   emit('overkill','Overkill','Movement','Once per battle, before making a Normal move, this model may gain +6″ Move and +3 melee Attacks until turn end.','own');
   emit('overkill','Overkill','Fight','If Overkill was activated this turn, add 3 to its melee weapons’ Attacks.','own');
   for(const phase of phases)emit('demise','Deadly Demise D3',phase,'On destruction, roll a D6. On a 6, each unit within 6″ suffers D3 mortal wounds, rolled separately for each unit.');
  }
  if(unit==='Vindicare Assassin'){
   for(const phase of ['Movement','Shooting'] as const){
    emit('deadshot','Deadshot',phase,'When this agent is selected to shoot, enemy units lose Lone Operative for its shooting and Hidden enemies have +15″ detection range.');
    emit('shieldbreaker','Shieldbreaker',phase,'Once per battle when declaring exitus rifle targets, choose a shieldbreaker round. Until phase end, add 1 to that rifle’s Wound rolls and every successful wound is critical.');
   }
  }
 }
 return result;
}
