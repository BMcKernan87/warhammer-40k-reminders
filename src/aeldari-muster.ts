import type {ArmySelection} from './catalog';
import type {RosterFinding} from './roster-findings';
import type {GeneratedReminder} from './generated-reminders';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariKeywords,aeldariHasDetachment,aeldariHarlequinHost} from './aeldari-keywords';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {aeldariDedicatedSatisfied} from './aeldari-transports';
import {BATTLE_SIZES_2026} from './edition-2026';
import {rosterCost2026} from './datasheets-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
const players=new Set(['Death Jester','Shadowseer','Troupe Master']);
const ynnead=new Set(['Yvraine','The Visarch','The Yncarne']);
const source='https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf';
export function aeldariUnitLimit(army:ArmySelection,unit:string):number{
 if(!aeldariMusterUnits(army).includes(unit))return 0;
 const tags=aeldariKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO')||unit==='Solitaire')return 1;
 if(players.has(unit))return aeldariHarlequinHost(army)?3:1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function aeldariWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Aeldari')return [];
 const allowed=new Set(aeldariMusterUnits(army)),devoted=aeldariHasDetachment(army,'Devoted of Ynnead');
 return expandRoster(army).filter(s=>{
  const tags=aeldariKeywords(army,s);
  return allowed.has(s.unit)&&tags.has('CHARACTER')&&s.unit!=='Solitaire'&&(devoted?['Yvraine','The Yncarne'].includes(s.unit):tags.has('ASURYANI')||aeldariHarlequinHost(army)&&tags.has('HARLEQUINS'));
 });
}
export function resolvedAeldariWarlord(army:ArmySelection){
 const candidates=aeldariWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectAeldariWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!aeldariWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Aeldari Warlord. Devoted of Ynnead requires Yvraine or The Yncarne; Solitaire cannot be Warlord.');
 return {...army,warlordId:id??undefined};
}
export function aeldariMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Aeldari'||!roster.length)return [];
 const findings:RosterFinding[]=[],maximum=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points,cost=rosterCost2026(army);
 for(const [unit,count] of Object.entries(army.units)){
  const limit=aeldariUnitLimit(army,unit);
  if(!limit)findings.push({code:'aeldari-ineligible',severity:'error',unit,message:unit+' requires Devoted of Ynnead to include its Ynnari faction datasheet in an Asuryani army.'});
  else if(count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit.'+(players.has(unit)?' Ghosts of the Webway or Serpent’s Brood permits up to three of each Travelling Players character.':'')});
 }
 for(const squad of roster){
  const support=sheets.get(squad.unit)?.attachmentRole==='support';
  if((squad.attachedTo||support)&&!knightJoinedBodyguard(army,squad))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires an eligible Bodyguard with an available '+(support?'Support':'Leader')+' slot.'});
 }
 if(roster.some(s=>ynnead.has(s.unit))){
  const prohibited=roster.filter(s=>{const tags=aeldariKeywords(army,s);return tags.has('EPIC HERO')&&!tags.has('YNNARI');});
  if(prohibited.length)findings.push({code:'aeldari-ynnari-epic-heroes',severity:'error',message:'Yvraine, The Visarch and The Yncarne cannot share an army with non-Ynnari Epic Heroes: '+prohibited.map(s=>s.id).join(', ')+'. Devoted of Ynnead does not grant Ynnari to Asuryani Epic Heroes.'});
 }
 if(aeldariHasDetachment(army,'Devoted of Ynnead')&&!roster.some(s=>['Yvraine','The Yncarne'].includes(s.unit)))findings.push({code:'aeldari-devoted-warlord',severity:'error',message:'Devoted of Ynnead requires Yvraine and/or The Yncarne, and one must be Warlord.'});
 if(army.warlordId&&!aeldariWarlordCandidates(army).some(s=>s.id===army.warlordId))findings.push({code:'aeldari-warlord-ineligible',severity:'error',message:'The selected Warlord is ineligible for this Aeldari army and its detachments.'});
 if(!resolvedAeldariWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Aeldari Character as Warlord.'});
 if(!aeldariDedicatedSatisfied(army,roster))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Every Wave Serpent, Starweaver, Ynnari Raider and Ynnari Venom must start with distinct eligible passengers within its printed capacity. Each Ynnari Venom may split one eligible Kabalite Warriors or Wyches formation once, including its attached models.'});
 const aircraft=cost.entries.filter(e=>sheets.get(e.unit)?.keywords?.includes('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(aircraft>maximum/2)findings.push({code:'mandatory-reserves-limit',severity:'error',message:'Compulsory Aircraft reserves cost '+aircraft+' points, exceeding the '+maximum/2+'-point starting Strategic Reserves allowance.'});
 if(cost.knownPoints>maximum)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+maximum+' points.'});
 return findings;
}
export function aeldariArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari'||!roster.length)return [];
 const allowed=new Set(aeldariMusterUnits(army)),legal=roster.filter(s=>allowed.has(s.unit));if(!legal.length)return [];
 return [{id:'11e-aeldari-disparate-paths',title:'Disparate Paths',window:'Pre-battle',turn:'either',timing:'during',origin:'army',units:legal.map(s=>s.id),source,summary:'This army uses the Asuryani Army Faction. Disparate Paths also permits Harlequins units without changing their actual faction keywords.'+(aeldariHasDetachment(army,'Devoted of Ynnead')?' Devoted of Ynnead additionally permits Ynnari datasheets and grants Ynnari to Asuryani units other than Epic Heroes. Include Yvraine and/or The Yncarne, with one as Warlord. Yvraine, The Visarch and The Yncarne exclude all non-Ynnari Epic Heroes.':' Ynnari-only datasheets require Devoted of Ynnead.')+(aeldariHarlequinHost(army)?' The selected Harlequin host permits up to three Death Jesters, Shadowseers and Troupe Masters, grants Troupes Battleline and their Troupe models OC 2, and permits a Harlequins Character as Warlord. Solitaire remains ineligible.':' Travelling Players permits at most one Death Jester, one Shadowseer and one Troupe Master. Harlequins cannot be Warlord without a specific exception.')}];
}
