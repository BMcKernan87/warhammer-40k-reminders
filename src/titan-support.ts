import {WARHOUND_CARD} from './warhound-card.generated';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightWeaponCount} from './knight-loadouts';
import {imperialKnightDatasheetReminders} from './imperial-knight-datasheets';
import {DATASHEETS_2026} from './datasheets-2026';
import {expandRoster,type RosterInstance} from './roster-instances';
import type {RosterFinding} from './roster-findings';
import {alliedWarhound,freebladeHost,FREEBLADE_SHEETS,isFreeblade,isWarhound,WARHOUND_SOURCE} from './titan-support-data';

const plasma='Warhound plasma blastgun',bolter='Warhound vulcan mega-bolter',inferno='Warhound inferno gun';
function weaponProfile(profile:typeof WARHOUND_CARD.wargear[number]):string{
 const skill=profile.skill==='-'?'':(profile.range==='Melee'?'WS ':'BS ')+profile.skill+'+, ';
 const range=profile.range==='Melee'?'':profile.range+'″, ';
 return range+profile.attacks+' attacks, '+skill+'S'+profile.strength+', AP '+profile.ap+', damage '+profile.damage+(profile.abilities?' ('+profile.abilities+')':'')+'.';
}
export function alliedTitanAndKnightFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army),result:RosterFinding[]=[];
 const titan=alliedWarhound(army.faction);
 if(!titan)return result;
 const titans=roster.filter(s=>s.unit===titan);
 if(titans.length||freebladeHost(army.faction)&&roster.some(s=>isFreeblade(s.unit))){
  const alignment=titan==='Chaos Warhound Titan'?'CHAOS':'IMPERIUM';
  const missing=roster.filter(s=>{
   const sheet=DATASHEETS_2026.find(row=>row.unit===s.unit&&row.faction===army.faction);
   return !sheet?.keywords?.includes(alignment);
  });
  if(missing.length)result.push({severity:'error',code:'allied-model-keywords',message:'Every model must have '+alignment+' to include these allied units. Check '+missing.map(s=>s.id).join(', ')+'.'});
 }
 if(titans.length>1)result.push({severity:'error',code:'titanic-support-limit',message:'Titanic Support permits one allied Titan model.'});
 if(titans.length&&army.battleSize2026==='Incursion')result.push({severity:'error',code:'titanic-support-budget',message:'A Warhound costs 1,100 points and exceeds the Incursion limit.'});
 if(!freebladeHost(army.faction))return result;
 const allied=roster.filter(s=>isFreeblade(s.unit));
 const titanic=allied.filter(s=>FREEBLADE_SHEETS.find(row=>row.unit===s.unit)?.keywords?.includes('TITANIC')).length;
 if(titanic>1||(titanic>0&&allied.length>titanic)||allied.length>3)result.push({severity:'error',code:'freeblade-allowance',message:'Freeblades permit one Titanic Imperial Knight or up to three Armigers. Choose one of those groups.'});
 for(const knight of allied){
  if(army.warlordId===knight.id)result.push({severity:'error',code:'freeblade-warlord',unit:knight.unit,message:knight.id+' cannot be the Warlord as a Freeblade.'});
  if(knight.enhancement||army.enhancements?.[knight.unit]||army.upgrades2026?.[knight.id]||army.upgrades2026?.[knight.unit])result.push({severity:'error',code:'freeblade-enhancement',unit:knight.unit,message:knight.id+' cannot take an enhancement as a Freeblade.'});
 }
 return result;
}
export function alliedTitanAndKnightReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 const output:GeneratedReminder[]=[];
 const allies=freebladeHost(army.faction)?roster.filter(s=>isFreeblade(s.unit)):[];
 if(allies.length)output.push(...imperialKnightDatasheetReminders(army,allies));
 for(const s of roster.filter(s=>isWarhound(s.unit)&&s.unit===alliedWarhound(army.faction))){
  const add=(key:string,title:string,window:ReminderWindow,turn:'own'|'opponent'|'either',timing:GeneratedReminder['timing'],summary:string)=>
   output.push({id:'11e-warhound-'+s.id+'-'+key+'-'+window,title:s.id+' · '+title,window,turn,timing,summary,source:WARHOUND_SOURCE,origin:'unit',units:[s.id]});
  add('flank','Flank Speed','Movement','own','during','When this Warhound Advances, add 8″ to its Move for this phase in place of an Advance roll.');
  add('walker','Super-heavy Walker','Movement','own','during','When moving Normally, Advancing or Falling Back, pass through non-Titanic models and terrain up to 4″ high. You may pass through enemy Engagement Range but cannot finish there. If you cross higher terrain, roll a D6 after moving. On a 1 this Warhound is Battle-shocked.');
  for(const w of ['Command','Movement','Shooting','Charge','Fight'] as const){
   add('colossus','Striding Colossus',w,'either','during','Spend twice the stated CP cost whenever you target this Warhound with a Stratagem.');
   add('demise','Deadly Demise 2D6',w,'either','during','When destroyed, before removal roll one D6. On a 6, each unit within 6″ suffers 2D6 mortal wounds, rolled separately for each unit.');
   add('damaged','Damaged · 1–13 wounds',w,'either','during','While this model has 1–13 wounds remaining, its Objective Control is reduced by 8 and its attacks take −1 to hit.');
  }
  const selected=WARHOUND_CARD.wargear.filter(w=>w.range!=='Melee'&&knightWeaponCount(s,w.name)>0);
  const text=selected.map(w=>knightWeaponCount(s,w.name)+' × '+w.name+' — '+weaponProfile(w)).join(' ');
  const blast=selected.some(w=>w.abilities.includes('blast'));
  const extra=[blast?'Blast adds one attack per five models in the target and cannot target units engaged with your forces.':'',
   knightWeaponCount(s,plasma)?'Select standard or supercharge for each blastgun before choosing targets. Test Hazardous for each supercharged gun after shooting.':'',
   knightWeaponCount(s,inferno)?'The inferno gun’s attacks automatically hit and ignore the benefit of cover.':'',
   knightWeaponCount(s,bolter)?'A Critical Hit with the mega-bolter produces one additional hit.':''].filter(Boolean).join(' ');
  add('fire','Ranged weapon profiles','Shooting','own','during',text+' '+extra);
  add('feet','Warhound feet','Fight','either','during',weaponProfile(WARHOUND_CARD.wargear.find(w=>w.range==='Melee')!));
  for(const [w,t] of [['Shooting','opponent'],['Movement','own']] as const)add('shields','Ranged invulnerable save',w,t,'during','This model has a '+WARHOUND_CARD.rangedInvulnerable+'+ invulnerable save against ranged attacks, including snap shooting.');
 }
 return output;
}

export function applyWarhoundStratagemCost(rule:GeneratedReminder,warhounds:ReadonlySet<string>):GeneratedReminder{
 if(!warhounds.size||!rule.units||!rule.title.includes('CP'))return rule;
 const titanTargets=rule.units.filter(id=>warhounds.has(id));
 const stated=/\b(\d+)\s*CP\b/i.exec(rule.title);
 if(!stated||!titanTargets.length)return rule;
 const cost=2*Number(stated[1]);
 return {...rule,summary:rule.summary+' Striding Colossus costs '+cost+'CP when this Stratagem targets '+titanTargets.join(', ')+'.'};
}
