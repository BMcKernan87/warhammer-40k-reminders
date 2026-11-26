import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TAU_SHEETS} from '../src/tau-data';
import {TAU_DETACHMENTS,TAU_STRATAGEMS,TAU_UPGRADES,TAU_TRAITS} from '../src/tau-detachments.generated';
import {currentTauDetachment,eligibleTauUpgrades,tauSelectedDetachments} from '../src/tau-detachment-data';
import {tauDetachmentReminders} from '../src/tau-detachments';
import {tauLoadout,tauWeaponCount} from '../src/tau-loadouts';
import {tauKeywords} from '../src/tau-keywords';
import {tauFormations} from '../src/tau-transports';

const kauyon='Kauyon',montka='Mont’ka',retaliation='Retaliation Cadre',hunting='Kroot Hunting Pack',auxiliary='Auxiliary Cadre',prototype='Experimental Prototype Cadre',acquisition='Advanced Acquisition Cadre';
const coldstar='Commander In Coldstar Battlesuit',enforcer='Commander In Enforcer Battlesuit',fireblade='Cadre Fireblade',ethereal='Ethereal',breachers='Breacher Team',strike='Strike Team',pathfinders='Pathfinder Team',stealth='Stealth Battlesuits',ghostkeel='Ghostkeel Battlesuit',crisis='Crisis Fireknife Battlesuits',carnivores='Kroot Carnivores',farstalkers='Kroot Farstalkers',war='Kroot War Shaper',flesh='Kroot Flesh Shaper',trail='Kroot Trail Shaper',riders='Krootox Riders',hounds='Kroot Hounds',vespid='Vespid Stingwings';
const id=(u:string,n=1)=>u+'#'+n;
function force(dets:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('T’au Empire'),detachments2026:dets,units:counts,instances:units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1)}))};
}
const edit=(a:ArmySelection,u:string,changes:Partial<RosterInstance>,n=1)=>({...a,instances:a.instances!.map(s=>s.id===id(u,n)?{...s,...changes}:s)});
const join=(a:ArmySelection,u:string,bodyguard:string)=>edit(a,u,{attachedTo:id(bodyguard)});
const equip=(a:ArmySelection,u:string,name:string,n=1)=>({...a,upgrades2026:{...a.upgrades2026,[id(u,n)]:name}});
const generate=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>tauDetachmentReminders(a,roster);
const by=(a:ArmySelection,key:string)=>generate(a).filter(r=>r.sourceRuleId===key);
const named=(a:ArmySelection,title:string)=>generate(a).filter(r=>r.title===title);
function gun(a:ArmySelection,u:string,weapon:string):ArmySelection{
 const squad=a.instances!.find(s=>s.id===id(u))!,normal=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const slot=tauLoadout(u,squad.models)!.slots.find(s=>s.choices.some(c=>c.items.some(i=>normal(i)===normal(weapon))));
 if(!slot)throw Error('No native choice '+u+': '+weapon);
 const choice=slot.choices.find(c=>c.items.some(i=>normal(i)===normal(weapon)))!;
 return edit(a,u,{knightGear:{...squad.knightGear,[slot.name]:choice.name}});
}

describe('current T’au Empire detachment source and execution',()=>{
 it('reconciles seven current detachments,31 Stratagems,23 upgrades and the exclusion groups',()=>{
  expect(TAU_DETACHMENTS).toHaveLength(7);expect(TAU_STRATAGEMS).toHaveLength(31);expect(TAU_UPGRADES).toHaveLength(23);expect(TAU_TRAITS).toHaveLength(9);
  expect(TAU_DETACHMENTS.find(d=>d.name===retaliation)).toMatchObject({dp:3,tag:'Battlesuit'});
  expect(TAU_DETACHMENTS.find(d=>d.name===prototype)).toMatchObject({dp:1,tag:'Battlesuit'});
  expect(TAU_DETACHMENTS.filter(d=>'tag'in d&&d.tag==='Auxiliary').map(d=>d.name)).toEqual([hunting,auxiliary]);
  expect(TAU_DETACHMENTS.some(d=>/Boarding|Raiding|Starfire/.test(d.name))).toBe(false);
  expect(TAU_UPGRADES.filter(u=>u.repeatable).map(u=>u.name)).toEqual(['Negation Emitters','Unmasking Suite']);
 });
 it('migrates known saved spellings and case without duplicate detachment names',()=>{
  expect(currentTauDetachment("Mont'ka")).toBe(montka);expect(currentTauDetachment('Mont’Ka')).toBe(montka);
  expect(currentTauDetachment('Auxillary Cadre')).toBe(auxiliary);
  expect(tauSelectedDetachments(force([montka,"Mont'ka",'Auxillary Cadre']))).toEqual([montka,auxiliary]);
 });
 it('executes every imported Stratagem and trait, including three unquoted multiline Auxiliary records',()=>{
  const a=force(TAU_DETACHMENTS.map(d=>d.name),...TAU_SHEETS.map(s=>s.unit));
  const rows=generate(a),ids=new Set(rows.map(r=>r.sourceRuleId));
  expect(TAU_STRATAGEMS.filter(r=>!ids.has(r.id)).map(r=>r.name)).toEqual([]);
  expect(TAU_TRAITS.filter(r=>!ids.has(r.id)).map(r=>r.name)).toEqual([]);
  expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  expect(rows.every(r=>r.units?.length&&r.source&&r.summary)).toBe(true);
 });
 it.each(TAU_UPGRADES)('executes $name for an eligible equipped bearer',upgrade=>{
  const u=upgrade.units[0],sheet=TAU_SHEETS.find(s=>s.unit===u)!;
  let a=force([upgrade.detachment],...TAU_SHEETS.map(s=>s.unit));
  if(sheet.bodyguards?.length)a=join(a,u,sheet.bodyguards[0]);
  const required:Record<string,string>={'Thermoneutronic Projector':'T’au flamer','Plasma Accelerator Rifle':'Plasma rifle','Supernova Launcher':'Airbursting fragmentation projector'};
  if(required[upgrade.name])a=gun(a,u,required[upgrade.name]);
  a=equip(a,u,upgrade.name);
  expect(by(a,upgrade.id).length).toBeGreaterThan(0);
  expect(new Set(generate(a).map(r=>r.id)).size).toBe(generate(a).length);
 });
 it('filters foreign armies,unselected detachments,Legends and illegal bearers',()=>{
  expect(generate({...force([kauyon],breachers),faction:'Necrons'})).toEqual([]);
  expect(generate(force([],breachers))).toEqual([]);
  expect(generate(force([kauyon,retaliation],"Aun’shi",'Tactical Drones','Broadside Battlesuit','Imaginary Battlesuit'))).toEqual([]);
  expect(eligibleTauUpgrades(force([retaliation],breachers),breachers)).toEqual([]);
  expect(by(equip(force([retaliation],breachers),breachers,'Internal Grenade Racks'),'000008815002')).toEqual([]);
 });
 it('uses current phase/turn windows and start-phase Observer selection',()=>{
  const a=force(TAU_DETACHMENTS.map(d=>d.name),...TAU_SHEETS.map(s=>s.unit));
  expect(by(a,'000009840002').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Fight','either']]);
  expect(by(a,'000008822004').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Fight','either']]);
  expect(by(a,'000008816003').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Fight','either']]);
  expect(by(a,'000008443004')[0]).toMatchObject({window:'Shooting',turn:'own',timing:'start'});
  expect(by(a,'000008443007')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end'});
  expect(by(a,'000010897002')[0]).toMatchObject({window:'Movement',turn:'own',timing:'end'});
  expect(by(a,'000008822002')).toHaveLength(5);
 });
 it('keeps Kauyon at SustainedHits1 and limits Guided protection to Spotted targets in ownShooting',()=>{
  const a=force([kauyon],breachers,riders,carnivores);
  expect(named(a,'Patient Hunter')[0].summary).toMatch(/rounds 3–5.*Sustained Hits 1.*Guided.*Spotted.*does not grant extra/);
  expect(named(a,'Patient Hunter · reaction shooting')[0].units).toEqual([id(riders)]);
  expect(named(a,'Patient Hunter · reaction shooting')[0].summary).toMatch(/Kroot Packmates.*Sustained Hits 1.*inactive outside/);
  expect(generate(a).filter(r=>r.title.startsWith('Patient Hunter')&&r.window==='Movement')).toEqual([]);
 });
 it('gives Mont’ka Assault to auxiliaries without inventing their Guided eligibility',()=>{
  const a=force([montka],breachers,carnivores,vespid,riders);
  expect(named(a,'Killing Blow · Assault')[0].units).toEqual([id(breachers),id(carnivores),id(vespid),id(riders)]);
  expect(named(a,'Killing Blow')[0].summary).toMatch(/rounds 1–3.*Only formations actually Guided.*Observer cannot be Guided/);
  expect(generate(a).filter(r=>r.title==='Killing Blow'&&r.turn==='opponent')).toEqual([]);
 });
 it('uses12″Strength and8″AP for actual Battlesuits,excluding theFrame-only Ta’unar',()=>{
  const a=force([retaliation],crisis,'Ta’unar Supremacy Armour','The Twin Lance',breachers);
  expect(named(a,'Bonded Heroes')[0].units).toEqual([id(crisis),id('The Twin Lance')]);
  expect(named(a,'Bonded Heroes')[0].summary).toMatch(/BATTLESUIT models.*within 12″.*within 8″.*Other models do not inherit/);
  expect(named(a,'Bonded Heroes · snap shooting')[0]).toMatchObject({window:'Movement',turn:'opponent',timing:'end'});
 });
 it('retains only Kroot Wound bonuses for snap shots and fullHit/Wound bonuses for normalreturnfire',()=>{
  const a=force([hunting],carnivores,riders,vespid);
  expect(named(a,'Hunter’s Instincts')[0].units).toEqual([id(carnivores),id(riders)]);
  expect(named(a,'Hunter’s Instincts · snap shooting')[0].summary).toMatch(/retain \+1 to Wound.*Below Half-strength.*ignores Hit modifiers/);
  expect(named(a,'Hunter’s Instincts · reaction shooting')[0].summary).toMatch(/\+1 to Hit.*Starting Strength.*\+1 to Wound.*Below Half-strength/);
  expect(named(a,'Skirmish Fighters')[0].summary).toMatch(/Only KROOT.*5\+.*ranged.*6\+.*melee/);
  expect(tauKeywords(a,a.instances![0]).has('BATTLELINE')).toBe(true);
  expect(tauKeywords(force([],carnivores),a.instances![0]).has('BATTLELINE')).toBe(false);
 });
 it('allows gunless auxiliaries to prey-mark,withphase-endexpiry,andrequiresactualprojector sources',()=>{
  const a=force([auxiliary],hounds,vespid,carnivores,riders,ghostkeel);
  expect(named(a,'Harnessed Alien Instincts')[0].units).toContain(id(hounds));
  expect(named(a,'Harnessed Alien Instincts')[0].summary).toMatch(/visible enemy within 12″.*\+3″.*Shooting phase ends.*does not require.*ranged/);
  expect(named(a,'Localised Stealth Projectors')[0].summary).toMatch(/within 6″.*hidden.*Ghostkeel Battlesuit#1/);
  expect(named(a,'Localised Stealth Projectors · reaction shooting')[0].units).toEqual([id(riders)]);
  expect(named(force([auxiliary],vespid),'Localised Stealth Projectors')).toEqual([]);
  expect(generate(a,a.instances!.filter(s=>s.unit!==ghostkeel)).some(r=>r.title.startsWith('Localised Stealth Projectors'))).toBe(false);
 });
 it('applies Experimentalunit-levelrange to joinedCrisis,butlosesitwhenCharacterisgone',()=>{
  const a=join(force([prototype],coldstar,crisis,crisis),coldstar,crisis);
  expect(named(a,'Superior Craftsmanship')[0].units).toEqual([id(crisis)]);
  expect(named(a,'Superior Craftsmanship')[0].summary).toMatch(/\+6″ Range.*attached Bodyguard.*no Character remains/);
  expect(by(a,'000009984002')[0].units).toEqual([id(crisis)]);
  expect(by(a,'000009984002')[0].summary).toMatch(/all of its models.*Hazardous.*phase ends.*attached Bodyguard/);
  expect(generate(a,a.instances!.filter(s=>s.unit!==coldstar)).some(r=>r.title==='Superior Craftsmanship')).toBe(false);
 });
 it('keeps AdvancedAcquisition own-phasefieldcraft separatefromunphasedUnmaskingSuite',()=>{
  const a=equip(force([acquisition],pathfinders,stealth,ghostkeel),pathfinders,'Unmasking Suite');
  expect(named(a,'Expert Fieldcraft').map(r=>[r.window,r.turn])).toEqual([['Shooting','own']]);
  expect(named(a,'Expert Fieldcraft')[0].units).toEqual([id(pathfinders),id(stealth)]);
  expect(by(a,'000010896003').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Movement','opponent']]);
  expect(by(a,'000010896003')[0].summary).toMatch(/within 24″.*\+9″.*until this formation finishes shooting.*not shared/);
  expect(by(a,'000010897004')[0].summary).toMatch(/hidden.*Save by 1.*phase ends/);
 });
 it('requires two distinct shooting formations for FocusedFire,notLeader+Bodyguard as separatetargets',()=>{
  expect(by(join(force([montka],fireblade,breachers),fireblade,breachers),'000008812004')).toEqual([]);
  const a=force([montka],breachers,strike);expect(by(a,'000008812004')[0].units).toEqual([id(breachers),id(strike)]);
  expect(by(a,'000008812004')[0].summary).toMatch(/start.*rounds 1–3.*two distinct.*only that enemy/);
 });
 it('allows current mobile Tidewalls to use Aggressive Mobility but excludes Aircraft Advances',()=>{
  const a=force([montka],'Tidewall Shieldline','Tidewall Gunrig','Tiger Shark','Manta',breachers);
  expect(by(a,'000008812003')[0].units).toEqual([id('Tidewall Shieldline'),id('Tidewall Gunrig'),id(breachers)]);
 });
 it('requires a realObserver for CoordinateToEngage and does not grantGuidedstatus',()=>{
  const a=force([kauyon],breachers,carnivores,vespid,'Tidewall Gunrig');
  expect(by(a,'000008443004')[0].units).toEqual([id(breachers)]);
  expect(by(a,'000008443004')[0].summary).toMatch(/Observer at the start.*own Spotted.*remains an Observer/);
 });
 it('checks completecargo forCombatEmbarkation andCombatDebarkation,includingMantaauxiliaries',()=>{
  const a=join(force([kauyon,montka],breachers,fireblade,'Devilfish','Tidewall Gunrig',carnivores,vespid),fireblade,breachers);
  expect(by(a,'000008443005')[0].units).toEqual([id(breachers)]);
  expect(by(a,'000008443005')[0].summary).toContain('Breacher Team#1 → Devilfish#1, Tidewall Gunrig#1');
  expect(by(a,'000008812005')[0].units).toEqual([id(breachers)]);
  const b=force([kauyon,montka],'Manta',carnivores,vespid);
  expect(by(b,'000008443005')[0].units).toEqual([id(carnivores),id(vespid)]);
  expect(by(b,'000008812005')[0].units).toEqual([id(carnivores),id(vespid)]);
 });
 it('usesactualInfantry/nonKroot eligibility forPulseOnslaught,notbroadCSVrecipientlinks',()=>{
  const a=force([montka],breachers,stealth,vespid,carnivores,'Riptide Battlesuit','Hammerhead Gunship');
  expect(by(a,'000008812006')[0].units).toEqual([id(breachers),id(stealth),id(vespid)]);
  expect(by(a,'000008812006')[0].summary).toMatch(/excluding Monsters and Vehicles.*opponent’s next turn.*−2″ Move/);
 });
 it('enablesgunlessShieldline shooting effects onlywithlegalFiringDeckguns,neverborrowedObservers',()=>{
  const a=force([kauyon,montka],'Tidewall Shieldline',breachers);
  expect(named(a,'Patient Hunter')[0].units).toContain(id('Tidewall Shieldline'));
  expect(by(a,'000008443003')[0].units).toContain(id('Tidewall Shieldline'));
  expect(by(a,'000008812004')[0].units).toEqual([id('Tidewall Shieldline'),id(breachers)]);
  expect(by(a,'000008443004')[0].units).not.toContain(id('Tidewall Shieldline'));
  expect(named(force([kauyon],'Tidewall Shieldline',carnivores),'Patient Hunter')[0].units).not.toContain(id('Tidewall Shieldline'));
  expect(by(force([kauyon],'Tidewall Shieldline',ethereal),'000008443003')).toEqual([]);
 });
 it('usescurrent6″ShortenedBlade onlywithall-modelDeepStrike andownMovement',()=>{
  const a=join(force([retaliation],coldstar,crisis,ghostkeel,'Riptide Battlesuit',stealth,'The Twin Lance'),coldstar,crisis);
  expect(by(a,'000008816004')[0].units).toEqual([id(crisis),id('The Twin Lance')]);
  expect(by(a,'000008816004')[0]).toMatchObject({window:'Movement',turn:'own'});
  expect(by(a,'000008816004')[0].summary).toMatch(/more than 6″.*cannot declare a charge.*Every model.*cannot be activated with Rapid Ingress/);
 });
 it('requiresflyingBattlesuits forTorchstar and keepsGravInhibitoratCharge declaration',()=>{
  const a=force([retaliation],'Broadside Battlesuits',crisis,'Ta’unar Supremacy Armour');
  expect(by(a,'000008816006')[0].units).toEqual([id(crisis)]);
  expect(by(a,'000008816006')[0].summary).toMatch(/resolves its attacks.*unengaged.*Normal move.*cannot declare a charge/);
  expect(by(a,'000008816007')[0].summary).toMatch(/declares a charge.*Battle-shock.*one D6 per model/);
 });
 it('preserves Krootreplacement restrictions and HiddenHunters return-fire FAQ',()=>{
  const a=join(force([hunting],war,carnivores,hounds,riders),war,carnivores);
  expect(by(a,'000008822002')[0].units).toEqual([id(carnivores),id(hounds)]);
  expect(by(a,'000008822002')[0].summary).toMatch(/Once per battle.*Starting Strength.*last model that started the battle.*losing only its Bodyguard or a Character does not trigger.*cannot return destroyed Characters.*War Shaper cannot.*own just-destroyed Bodyguard/);
  expect(by(a,'000008822007')[0].summary).toMatch(/within 18″.*no eligible attacks.*does not trigger/);
 });
 it('targets whole non-Kroot formations for Pinpoint, triggering only after their final original model dies',()=>{
  const a=join(join(force([montka],fireblade,breachers,war,carnivores),fireblade,breachers),war,carnivores);
  expect(by(a,'000008812002')).toHaveLength(5);
  expect(by(a,'000008812002').every(r=>JSON.stringify(r.units)===JSON.stringify([id(breachers)]))).toBe(true);
  expect(by(a,'000008812002')[0].summary).toMatch(/last model that started the battle.*losing only its Bodyguard or a Character does not trigger/);
 });
 it('requiresrealAuxiliary proximitysources forGuidedByUnity butnotObserverstatus',()=>{
  expect(by(force([auxiliary],breachers),'000009840004')).toEqual([]);
  const a=force([auxiliary],breachers,hounds,vespid);
  expect(by(a,'000009840004')[0].units).toEqual([id(breachers)]);
  expect(by(a,'000009840004')[0].summary).toMatch(/within 9″.*does not require Observer or Guided.*Kroot Hounds#1.*Vespid Stingwings#1/);
 });
 it('keeps each Observer-enhancement tiedtoitsactualleadingbearer andotherGuidedformations',()=>{
  for(const [det,up,rule] of [[kauyon,'Through Unity, Devastation','000008442005'],[montka,'Coordinated Exploitation','000008811002']]){
   const a=equip(join(force([det],fireblade,breachers,strike,crisis,carnivores),fireblade,breachers),fireblade,up);
   expect(by(a,rule)[0].units).toEqual([id(breachers),id(strike),id(crisis)]);
   expect(by(a,rule)[0].summary).toMatch(/survives and leads.*start of your Shooting.*every eligible Guided formation.*not a single paired/);
   expect(by(edit(a,fireblade,{attachedTo:undefined}),rule)).toEqual([]);
   expect(generate(a,a.instances!.filter(s=>s.unit!==fireblade)).some(r=>r.sourceRuleId===rule)).toBe(false);
  }
 });
 it('keeps Exemplar round extensions onactualledformation only',()=>{
  const a=equip(join(force([kauyon],fireblade,breachers,breachers),fireblade,breachers),fireblade,'Exemplar of the Kauyon');
  expect(by(a,'000008442002')[0].units).toEqual([id(breachers)]);
  expect(by(a,'000008442002')[0].summary).toContain('battle round 2');
  expect(by(edit(a,fireblade,{attachedTo:undefined}),'000008442002')).toEqual([]);
  const b=equip(join(force([montka],fireblade,breachers),fireblade,breachers),fireblade,'Exemplar of the Mont’ka');
  expect(by(b,'000008811003').map(r=>r.window)).toEqual(['Movement','Shooting']);
  expect(by(b,'000008811003').every(r=>r.summary.includes('battle round 4'))).toBe(true);
 });
 it('usesbearer-only GrenadeRacks andnormal-move paths,includingTorchstar',()=>{
  const a=equip(join(force([retaliation],coldstar,crisis),coldstar,crisis),coldstar,'Internal Grenade Racks');
  expect(tauKeywords(a,a.instances![0]).has('GRENADES')).toBe(true);
  expect(tauKeywords(a,a.instances![1]).has('GRENADES')).toBe(false);
  expect(by(a,'000008815002').map(r=>[r.window,r.turn])).toEqual([['Movement','own'],['Shooting','own']]);
  expect(by(a,'000008815002').every(r=>r.units?.[0]===id(coldstar))).toBe(true);
  expect(by(a,'000008815002')[0].summary).toMatch(/bearer’s actual path.*Scout, Advance, Fall Back and ingress.*not Normal/);
 });
 it.each([['Thermoneutronic Projector','T’au flamer','000009983002'],['Plasma Accelerator Rifle','Plasma rifle','000009983003'],['Supernova Launcher','Airbursting fragmentation projector','000009983004']])('requires an equipped weapon and enhancesonlyone physicalcopy for%s',(upgrade,weapon,rule)=>{
  const a=force([prototype],coldstar,crisis);
  expect(eligibleTauUpgrades(a,coldstar,id(coldstar)).some(u=>u.name===upgrade)).toBe(false);
  const b=equip(gun(a,coldstar,weapon),coldstar,upgrade);
  expect(tauWeaponCount(b.instances![0],weapon)).toBeGreaterThan(0);
  expect(eligibleTauUpgrades(b,coldstar,id(coldstar)).some(u=>u.name===upgrade)).toBe(true);
  expect(by(b,rule).map(r=>r.window)).toEqual(['Pre-battle','Shooting','Movement']);
  expect(by(b,rule).every(r=>r.units?.[0]===id(coldstar)&&r.summary.includes('one physical')&&r.summary.includes('other copies and Bodyguard'))).toBe(true);
 });
 it('appliesRootcarvedPrecision/DevastatingWounds onlytoWarShaper,includingCriticalWoundsinsnapfire',()=>{
  const a=equip(join(force([hunting],war,carnivores),war,carnivores),war,'Root-carved Weapons');
  expect(by(a,'000008821005').map(r=>[r.window,r.turn])).toEqual([['Fight','either'],['Shooting','own'],['Movement','opponent']]);
  expect(by(a,'000008821005').every(r=>r.units?.[0]===id(war))).toBe(true);
  expect(by(a,'000008821005')[0].summary).toMatch(/Allocation Order.*visible Character.*mortal wounds first apply.*Bodyguard weapons receive neither/);
 });
 it('usesKroothawk actualbearer denialradius andbodyguard-wideIgnoresCover',()=>{
  const a=equip(join(force([hunting],war,carnivores,carnivores),war,carnivores),war,'Kroothawk Flock');
  expect(by(a,'000008821003').filter(r=>r.window==='Shooting')[0].units).toEqual([id(carnivores)]);
  expect(by(a,'000008821003').find(r=>r.turn==='either')?.units).toEqual([id(war)]);
  expect(by(a,'000008821003').find(r=>r.turn==='either')?.summary).toMatch(/12″ horizontally.*closer ingress.*bearer itself/);
 });
 it('keepsnonleadingpersonalPrecision butremovesleading-onlyBorthrod andNomadicHunter',()=>{
  const a=equip(force([kauyon],fireblade,breachers),fireblade,'Precision of the Patient Hunter');
  expect(by(a,'000008442003')[0].units).toEqual([id(fireblade)]);
  expect(by(a,'000008442003').find(r=>r.window==='Movement')?.summary).toMatch(/\+1 to Wound.*battle round 3.*ignores the Hit modifier/);
  expect(by(equip(force([hunting],flesh,carnivores),flesh,'Borthrod Gland'),'000008821002')).toEqual([]);
  expect(by(equip(force([hunting],trail,carnivores),trail,'Nomadic Hunter'),'000008821004')).toEqual([]);
 });
 it('keepsPuretideCPrefund ratherthanrepeatedStratagem use,andStarflareatendofopponentturn',()=>{
  const a=equip(force([retaliation],coldstar),coldstar,'Puretide Engram Neurochip');
  expect(by(a,'000008815004')).toHaveLength(5);expect(by(a,'000008815004')[0].summary).toMatch(/4\+.*1CP.*refund.*not permission to reuse.*normal limit/);
  const b=equip(join(force([retaliation],coldstar,crisis),coldstar,crisis),coldstar,'Starflare Ignition System');
  expect(by(b,'000008815005')[0]).toMatchObject({window:'End of opponent turn',turn:'opponent',timing:'end',units:[id(crisis)]});
 });
 it('limitsStudent andStrikeSwiftly toactualrecipientformations andcurrentdeploymenttiming',()=>{
  const a=equip(join(force([auxiliary],war,carnivores,farstalkers,hounds),war,carnivores),war,'Student of Kauyon');
  expect(by(a,'000009839002')[0].units).toEqual([id(war),id(carnivores),id(farstalkers)]);
  expect(by(a,'000009839002')[0].summary).toMatch(/Declare Battle Formations.*up to three.*Deep Strike.*attached/);
  const b=equip(force([montka],fireblade,breachers,pathfinders),fireblade,'Strike Swiftly');
  expect(by(b,'000008811005')[0].summary).toMatch(/Resolve Pre-battle Abilities.*up to two.*within 6″.*All models.*Scouts 6″.*until battle end.*more than 8″/);
  expect(by(b,'000008811005')[0].units).not.toContain(id(pathfinders));
 });
 it('preservesvalidtwo-Shaperformation afterCarnivorecasualties andsource expiry',()=>{
  const a=equip(join(join(edit(force([hunting],carnivores,flesh,trail),carnivores,{models:20}),flesh,carnivores),trail,carnivores),flesh,'Borthrod Gland');
  const surviving=a.instances!.map(s=>s.unit===carnivores?{...s,models:10}:s);
  expect(tauFormations(a,surviving)).toHaveLength(1);
  expect(generate(a,surviving).find(r=>r.sourceRuleId==='000008821002')?.units).toEqual([id(carnivores)]);
  expect(generate(a,surviving.filter(s=>s.unit!==flesh)).some(r=>r.sourceRuleId==='000008821002')).toBe(false);
 });
 it('retains a surviving former Leader’s own leading enhancement after its Bodyguard dies',()=>{
  const a=equip(join(force([kauyon],fireblade,breachers,strike),fireblade,breachers),fireblade,'Through Unity, Devastation');
  const survivors=a.instances!.filter(s=>s.unit!==breachers);
  expect(generate(a,survivors).find(r=>r.sourceRuleId==='000008442005')?.units).toEqual([id(fireblade),id(strike)]);
  const b=equip(a,fireblade,'Exemplar of the Kauyon');
  expect(generate(b,survivors).find(r=>r.sourceRuleId==='000008442002')?.units).toEqual([id(fireblade)]);
  expect(generate(a,survivors.filter(s=>s.unit!==fireblade)).some(r=>r.sourceRuleId==='000008442005')).toBe(false);
 });
 it('retains the new root Shaper’s leading enhancement while both former Leaders remain together',()=>{
  const a=equip(join(join(edit(force([hunting],carnivores,flesh,trail),carnivores,{models:20}),flesh,carnivores),trail,carnivores),flesh,'Borthrod Gland');
  const survivors=a.instances!.filter(s=>s.unit!==carnivores);
  expect(tauFormations(a,survivors)).toHaveLength(1);
  expect(generate(a,survivors).find(r=>r.sourceRuleId==='000008821002')?.units).toEqual([id(flesh)]);
 });
});
