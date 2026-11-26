import type {ArmySelection} from './catalog';
import type {RosterFinding} from './roster-findings';
import type {GeneratedReminder} from './generated-reminders';
import {DRUKHARI_NATIVE_SHEETS,DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariAllyAllowance,drukhariMusterUnits,drukhariUsesReapersWager,isDrukhariAlly,isDrukhariHarlequin} from './drukhari-muster-data';
import {drukhariDedicatedSatisfied} from './drukhari-transports';
import {BATTLE_SIZES_2026} from './edition-2026';
import {rosterCost2026} from './datasheets-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const native=new Set(DRUKHARI_NATIVE_SHEETS.map(s=>s.unit));
const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
const source='https://assets.warhammer-community.com/eng_wh40k_faction_pack_drukhari-p7mpvgnmnn-clii96hzh6.pdf';
export function drukhariUnitLimit(army:ArmySelection,unit:string):number{
 if(!drukhariMusterUnits(army).includes(unit))return 0;
 const tags=drukhariKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO')||unit==='Solitaire')return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function drukhariWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Drukhari')return [];
 return expandRoster(army).filter(s=>native.has(s.unit)&&drukhariKeywords(army,s).has('CHARACTER'));
}
export function resolvedDrukhariWarlord(army:ArmySelection){
 const candidates=drukhariWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectDrukhariWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!drukhariWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Drukhari Character. Corsair and Harlequin allies cannot be Warlord.');
 return {...army,warlordId:id??undefined};
}
export function drukhariMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Drukhari'||!roster.length)return [];
 const findings:RosterFinding[]=[],maximum=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points,cost=rosterCost2026(army);
 for(const [unit,count] of Object.entries(army.units)){
  const limit=drukhariUnitLimit(army,unit);
  if(!limit)findings.push({code:'drukhari-ineligible',severity:'error',unit,message:unit+' is unavailable for this Drukhari army. Reaper’s Wager replaces Corsairs and Travelling Players and only permits Harlequin allies.'});
  else if(count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 for(const squad of roster){
  const support=sheets.get(squad.unit)?.attachmentRole==='support';
  if((squad.attachedTo||support)&&!knightJoinedBodyguard(army,squad))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires an eligible Bodyguard with an available '+(support?'Support':'Leader')+' slot.'});
  if(isDrukhariAlly(squad.unit)&&(!drukhariUsesReapersWager(army)||!isDrukhariHarlequin(squad.unit))&&(army.upgrades2026?.[squad.id]||army.upgrades2026?.[squad.unit]||squad.enhancement))findings.push({code:'drukhari-allied-enhancement',severity:'error',unit:squad.unit,message:squad.id+' cannot receive an enhancement through Corsairs and Travelling Players.'});
 }
 if(army.warlordId&&!drukhariWarlordCandidates(army).some(s=>s.id===army.warlordId))findings.push({code:'drukhari-warlord-ineligible',severity:'error',message:'The selected Warlord must be a native Drukhari Character; Corsair and Harlequin allies cannot be Warlord.'});
 if(!resolvedDrukhariWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Drukhari Character as Warlord.'});
 const allied=cost.entries.filter(e=>isDrukhariAlly(e.unit)).reduce((n,e)=>n+(e.points??0),0),allowance=drukhariAllyAllowance(army);
 if(allied>allowance)findings.push({code:'drukhari-allied-allowance',severity:'error',message:(drukhariUsesReapersWager(army)?'Reaper’s Wager Harlequins':'Corsairs and Travelling Players')+' cost '+allied+' points, exceeding the combined '+allowance+'-point allowance.'});
 if(!drukhariDedicatedSatisfied(army,roster))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Raider, Venom and Starweaver must start with distinct eligible passengers within its capacity. Each Venom may split one Kabalite Warriors, Hand of the Archon or Wyches formation once, including its attached models.'});
 const aircraft=cost.entries.filter(e=>sheets.get(e.unit)?.keywords?.includes('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(aircraft>maximum/2)findings.push({code:'mandatory-reserves-limit',severity:'error',message:'Compulsory Aircraft reserves cost '+aircraft+' points, exceeding the '+maximum/2+'-point starting Strategic Reserves allowance.'});
 if(cost.knownPoints>maximum)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+maximum+' points.'});
 return findings;
}
export function drukhariAlliedReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const units=roster.filter(s=>isDrukhariAlly(s.unit)&&drukhariMusterUnits(army).includes(s.unit));if(!units.length)return [];
 const points=rosterCost2026(army).entries.filter(e=>isDrukhariAlly(e.unit)).reduce((n,e)=>n+(e.points??0),0),wager=drukhariUsesReapersWager(army);
 return [{id:'11e-drukhari-allied-allowance',title:wager?'Reaper’s Wager · Harlequin allies':'Corsairs and Travelling Players',window:'Pre-battle',turn:'either',timing:'during',origin:'army',units:units.map(s=>s.id),source,summary:(wager?'Reaper’s Wager replaces Corsairs and Travelling Players. Only Harlequin allies are permitted; the two allowances do not stack.':'The Harlequins and Anhrathe allies share one combined points allowance.')+' Selected allies cost '+points+' of '+drukhariAllyAllowance(army)+' points. None can be Warlord. '+(wager?'Eligible Harlequin Characters may receive the Reaper’s Wager enhancements permitted by their actual datasheets.':'Allies cannot receive enhancements.')+' Allied models retain their actual faction keywords; they do not gain Drukhari, Power from Pain or Aeldari army rules merely by joining this army.'}];
}
