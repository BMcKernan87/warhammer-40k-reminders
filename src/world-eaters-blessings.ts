import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {worldEaterWeaponCount} from './world-eater-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {worldEatersKeywords,worldEatersMusterUnits} from './world-eaters-data';
import {BLESSING_DICE,BLESSING_RECIPIENTS} from './world-eaters-blessings.generated';

const source='https://wahapedia.ru/wh40k11ed/factions/world-eaters/#Blessings-of-Khorne';
const publisher='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_world_eaters-rxxj1fzeoh-kfx1cectxb.pdf';
const native=new Set(BLESSING_RECIPIENTS);
const effects:Record<keyof typeof BLESSING_DICE,string>={
 'Unbridled Bloodlust':'Add 1 to the unit’s Charge rolls.',
 'Rage-Fuelled Invigoration':'Its models can move up to 6″ when piling in or consolidating.',
 'Total Carnage':'If a melee attack destroys a model that has not fought this phase, roll a D6. On 4+, it fights after the attacking unit finishes its attacks and is then removed.',
 'Martial Excellence':'Melee weapons gain Sustained Hits 1. Each critical hit scores one extra hit.',
 'Warp Blades':'Melee weapons gain Lethal Hits. A critical hit may automatically wound.',
 'Decapitating Strikes':'Against Infantry, melee attacks gain Devastating Wounds. A critical wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage.',
};
const choice=(army:ArmySelection,s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;

export function worldEatersBlessingReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const legal=new Set(worldEatersMusterUnits(army));
 const selected=roster.filter(s=>legal.has(s.unit));
 const root=(s:RosterInstance)=>knightJoinedBodyguard(army,s)?.id??s.id;
 const roots=(squads:readonly RosterInstance[])=>[...new Set(squads.map(root))];
 const ordinary=roots(selected.filter(s=>native.has(s.unit)));
 const blood=roots(selected.filter(s=>worldEatersKeywords(army,s).has('BLOOD LEGIONS'))).filter(id=>!ordinary.includes(id));
 if(!ordinary.length&&!blood.length)return [];
 const favoured=selected.filter(s=>choice(army,s)==='Favoured of Khorne'&&army.detachments2026?.includes('Berzerker Warband')&&worldEatersKeywords(army,s).has('WORLD EATERS')&&worldEatersKeywords(army,s).has('CHARACTER')&&!worldEatersKeywords(army,s).has('EPIC HERO'));
 const iconsOfWar=selected.filter(s=>choice(army,s)==='Icon of War'&&army.detachments2026?.includes('Khorne Daemonkin')&&worldEatersKeywords(army,s).has('WORLD EATERS')&&worldEatersKeywords(army,s).has('CHARACTER')&&!worldEatersKeywords(army,s).has('EPIC HERO'));
 const recipients=[...ordinary,...blood];
 const scope=blood.length?' Conditional Blood Legions formations: '+blood.join(', ')+'. They benefit only after Might of Khorne is active'+(iconsOfWar.length?' or while within 6″ of an Icon of War bearer ('+iconsOfWar.map(s=>s.id).join(', ')+')':'')+'.':'';
 const output:GeneratedReminder[]=[];
 function add(id:string,title:string,window:GeneratedReminder['window'],turn:GeneratedReminder['turn'],timing:GeneratedReminder['timing'],summary:string,units=recipients,url=source){
  output.push({id:'11e-we-blessings-'+id,title,window,turn,timing,summary,source:url,units,origin:'army'});
 }
 const icons=selected.filter(s=>['Khorne Berzerkers','Jakhals'].includes(s.unit)&&worldEaterWeaponCount(s,'Icon of Khorne')>0);
 const skulls=selected.filter(s=>s.unit==='Khorne Lord of Skulls');
 const angron=selected.find(s=>s.unit==='Angron');
 const menu=(Object.keys(effects) as (keyof typeof BLESSING_DICE)[]).map(name=>name+' ('+BLESSING_DICE[name]+')');
 const pool=[
  favoured.length?'When its bearer is on the battlefield, Favoured of Khorne permits re-rolling up to two dice on any Blessings roll ('+favoured.map(s=>s.id).join(', ')+'). No die can be re-rolled twice.':'',
  skulls.length?'At this round-start roll, add one die for each listed Idol of Blessed Blood on the battlefield: '+skulls.map(s=>s.id).join(', ')+'.':'',
  icons.length?'On any Blessings roll, add one D6 per accumulated Bloodshed point and then lose those points.':'',
  angron?'If Angron is on the battlefield and The Blood God’s Favour is his chosen Wrathful Presence, re-roll up to six dice on any Blessings roll.':'',
 ].filter(Boolean).join(' ');
 add('choose','Blessings of Khorne','Start of battle round','either','start',
  'Roll eight D6. Spend distinct dice to activate up to two different Blessings. Discard unused dice. An activated Blessing lasts to round end and can be activated only once this round. '+menu.join('. ')+'. '+pool+scope);
 for(const name of Object.keys(effects) as (keyof typeof effects)[]){
  const charge=name==='Unbridled Bloodlust';
  add(name,name+' · '+BLESSING_DICE[name],charge?'Charge':'Fight',charge?'own':'either','during','If active this round: '+effects[name]+scope);
 }
 if(icons.length)for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const){
  add('icon-'+phase,'Icon of Khorne · Bloodshed',phase,'either','during','Each time one of these formations destroys an enemy unit, gain one Bloodshed point if it still contains an icon bearer. Multiple icons in the same formation grant one point for that destruction.',roots(icons),publisher);
 }
 if(angron){
  add('reborn','Angron · Reborn in Blood','Start of battle round','either','start','If Angron is destroyed, spend triple 6 on this round-start roll to return him instead of activating any round-start Blessings.'+(army.detachments2026?.includes('Vessels of Wrath')?' Wrath of Khorne remains available.':''),[angron.id],publisher);
  add('return','Angron · Reborn in Blood arrival','Movement','own','during','If returned by Reborn in Blood, set Angron up using Deep Strike in the Reinforcements step of your next Movement phase with eight wounds left.',[angron.id],'https://wahapedia.ru/wh40k11ed/factions/world-eaters/Angron');
 }
 return output;
}
