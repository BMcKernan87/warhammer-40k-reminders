import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {AELDARI_CARDS} from './aeldari-card-profiles.generated';
import {aeldariFormations,type AeldariFormation} from './aeldari-formations';
import {aeldariHasDetachment,aeldariKeywords} from './aeldari-keywords';
import {expandRoster,type RosterInstance} from './roster-instances';

const source='https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf';
export const aeldariBattleFocusTokens=(army:ArmySelection)=>({Incursion:2,'Strike Force':4}[army.battleSize2026??'Strike Force'])+(aeldariHasDetachment(army,'Warhost')?1:0);
export function aeldariBattleFocusReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const forms=aeldariFormations(army,roster);if(!forms.length)return [];
 const tag=(f:AeldariFormation,k:string)=>f.members.some(s=>aeldariKeywords(army,s,undefined,roster).has(k));
 const seers=roster.filter(s=>{const keys=aeldariKeywords(army,s,undefined,roster);return keys.has('ASURYANI')&&keys.has('PSYKER');});
 const conditional=(f:AeldariFormation)=>aeldariHasDetachment(army,'Spirit Conclave')&&seers.length>0&&f.members.some(s=>['Wraithguard','Wraithblades','Wraithlord'].includes(s.unit));
 const native=(f:AeldariFormation)=>f.members.some(s=>AELDARI_CARDS[s.unit]?.factionAbilities.includes('Battle Focus'));
 const eligible=forms.filter(f=>native(f)||conditional(f)),warhost=aeldariHasDetachment(army,'Warhost');
 if(!eligible.length)return [];
 const rows:GeneratedReminder[]=[];
 const allowance='Spend 1 Battle Focus token. A unit can perform at most one Agile Manoeuvre per phase; the same manoeuvre can normally be triggered only once per phase unless a specific rule makes an exception. ';
 const conditions=(fs:readonly AeldariFormation[])=>{
  const gated=fs.filter(f=>!native(f)&&conditional(f));
  return gated.length?' Spirit Guides candidates '+gated.map(f=>f.root.id).join(', ')+' qualify only while within 12″ of a surviving Asuryani Psyker model ('+seers.map(s=>s.id).join(', ')+'). Check that range when activating; a destroyed or embarked source supplies no aura.':'';
 };
 const emit=(id:string,title:string,window:ReminderWindow,turn:GeneratedReminder['turn'],timing:GeneratedReminder['timing'],summary:string,fs:readonly AeldariFormation[])=>{
  if(fs.length)rows.push({id:'11e-aeldari-focus-'+id+'-'+window+'-'+turn,title,window,turn,timing,summary:summary+conditions(fs),units:fs.map(f=>f.root.id),origin:'army',source});
 };
 emit('pool','Battle Focus · receive tokens','Start of battle round','either','start','At the start of every battle round receive '+aeldariBattleFocusTokens(army)+' Battle Focus tokens'+(warhost?' including Warhost’s additional token':'')+'. Add any other currently eligible token-generating effects. Tokens are shared across your army and expire at the end of this battle round. Each Agile Manoeuvre costs 1 token and requires the unit to have Battle Focus when used.',eligible);
 emit('expire','Battle Focus · discard unspent tokens','End of battle round','either','end','Discard all unspent Battle Focus tokens at the end of this battle round; they do not carry into the next round.',eligible);
 for(const [window,turn] of [['Movement','either'],['Shooting','either'],['Fight','either']] as const){
  emit('swift','Swift as the Wind',window,turn,'during','When this unit is selected to make a Normal, Advance or Fall Back move: '+allowance+'Add '+(warhost?'3″ (2″ plus Warhost’s additional 1″)':'2″')+' to its models’ Move characteristic until this phase ends. Swift as the Wind may be triggered more than once in the phase only if a different eligible unit performs it each time. This changes the Move characteristic; it does not increase a separate fixed-distance move limit.',eligible);
 }
 for(const [window,turn] of [['Command','either'],['Movement','either'],['Shooting','either'],['Charge','either'],['Fight','either']] as const){
  emit('flitting','Flitting Shadows',window,turn,'during','Only when this unit is selected for a Normal, Advance or Fall Back move, is set up on the battlefield, or declares a charge: '+allowance+'Until this turn ends, enemy units cannot use Fire Overwatch to shoot at it. This prevents that Stratagem; it does not prevent every other source of snap shooting.',eligible);
 }
 const vehicles=eligible.filter(f=>tag(f,'VEHICLE'));
 emit('engines','Star Engines','Movement','either','during','When an eligible Vehicle unit is selected to Advance: '+allowance+'Its equipped ranged weapons gain Assault until this turn ends, allowing those weapons to shoot after Advancing. This does not grant another move or a fixed Advance distance.',vehicles);
 emit('strike','Sudden Strike','Charge','either','during','When this unit ends a charge move: '+allowance+'Until this turn ends, its models may pile in and consolidate up to 6″ instead of 3″. Continue to obey the normal eligibility, direction and end-position requirements.',eligible);
 emit('strike-effect','Sudden Strike · active effect','Fight','either','during','Only if this unit activated Sudden Strike after its charge move this turn, its models may pile in and consolidate up to 6″ instead of 3″. The permission ends with this turn; the normal direction and end-position requirements still apply.',eligible);
 const mobile=eligible.filter(f=>!tag(f,'TITANIC'));
 for(const window of ['Movement','Shooting','Fight'] as const)emit('opportunity','Opportunity Seized',window,'either','during','When an enemy unit ends a Fall Back move: '+allowance+'Choose one eligible non-Titanic unit that started this phase within Engagement Range of that enemy unit. It may make a Normal move of up to '+(warhost?'D6+2″ (including Warhost)':'D6+1″')+'. Resolve normal movement restrictions; the trigger does not permit the unit to ignore engagement.',mobile);
 const fleet=(f:AeldariFormation)=>f.members.some(s=>s.unit==='Guardian Defenders');
 emit('fade','Fade Back','Shooting','opponent','during','Just after an enemy unit has shot in your opponent’s Shooting phase: '+allowance+'Choose one eligible non-Titanic unit hit by at least one of those attacks. It may make a Normal move of up to '+(warhost?'D6+2″ (including Warhost)':'D6+1″')+'. Being targeted without being hit does not qualify. Resolve normal movement restrictions; do not activate a second Agile Manoeuvre on this unit in the same phase.',mobile.filter(f=>!fleet(f)));
 emit('fleet','Fleet of Foot · Fade Back','Shooting','opponent','during','After an enemy unit has shot in your opponent’s Shooting phase, if this formation was hit by at least one of those attacks, it may perform Fade Back without spending a Battle Focus token. It can do so even if another unit already performed Fade Back this phase, and this does not prevent another unit from performing Fade Back. Make a Normal move of up to '+(warhost?'D6+2″ (including Warhost)':'D6+1″')+'. This unit still cannot perform more than one Agile Manoeuvre in a phase. The exception lasts only while its Guardian Defenders source survives.',mobile.filter(fleet));
 return rows;
}
