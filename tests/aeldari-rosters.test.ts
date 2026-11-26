// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {aeldariLoadout,aeldariModelLoadouts,aeldariWeaponCount,validAeldariGear} from '../src/aeldari-loadouts';
import {selectAeldariWarlord,resolvedAeldariWarlord} from '../src/aeldari-muster';
import {aeldariMusterUnits} from '../src/aeldari-muster-data';
import {aeldariFormations,aeldariCargoFormations,aeldariCargoFits,aeldariSplitCargoFormations,aeldariDedicatedSatisfied} from '../src/aeldari-transports';
import {aeldariKeywords} from '../src/aeldari-keywords';
import {aeldariHasDeepStrike,aeldariHasInfiltrators} from '../src/aeldari-upgrades';
import {setAeldariArtillery,aeldariArtilleryHosts} from '../src/aeldari-artillery';
import {knightJoinedBodyguard,isModeledLeader} from '../src/leader-eligibility';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {AELDARI_ACCEPTANCE_ARMIES,AELDARI_WARHOST_ARMY,AELDARI_CORSAIR_ARMY,AELDARI_ASPECT_ARMY,AELDARI_YNNARI_ARMY,AELDARI_HARLEQUIN_ARMY,AELDARI_WRAITH_ARMY,AELDARI_WINDRIDER_ARMY,type AeldariAcceptanceArmy} from './fixtures/aeldari-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const key=(items:readonly string[])=>items.map(s=>s.toLowerCase()).sort().join('|');
function build(plan:AeldariAcceptanceArmy){
 let army=individualArmy({...newSelection('Aeldari'),battleSize2026:plan.battleSize,detachments2026:[plan.detachment]});
 const copies=new Map<string,number>();
 for(const row of plan.units){
  const n=(copies.get(row.unit)??0)+1;copies.set(row.unit,n);army=addSelectionUnit(army,row.unit);
  if(row.models!==undefined)army=setInstanceModelCount(army,id(row.unit,n),row.models);
 }
 for(const s of army.instances!)if(isModeledLeader(army.faction,s.unit))army=setInstanceAttachment(army,s.id,null);
 army=selectAeldariWarlord(army,plan.warlord);
 for(const [leader,body] of plan.attachments)army=setInstanceAttachment(army,leader,body);
 for(const [artillery,body] of plan.artillery??[])army=setAeldariArtillery(army,artillery,body);
 for(const [bearer,upgrade] of plan.upgrades)army=selectUpgrade2026(army,bearer,upgrade);
 for(const change of plan.gear){
  const squad=instance(army,change.unit,change.copy),matches=aeldariLoadout(change.unit,squad.models)!.slots.flatMap(field=>
   field.name.startsWith(change.owner)?field.choices.filter(choice=>change.choice?choice.name===change.choice:key(choice.items)===key(change.items!)).map(choice=>({field,choice})):[]);
  expect(matches,'Exact equipment choice for '+squad.id+' / '+change.owner).toHaveLength(1);
  army=setKnightGear(army,squad.id,matches[0].field.name,matches[0].choice.name);
 }
 return army;
}
function reopen(plan:AeldariAcceptanceArmy){
 const army=build(plan),opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(army))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(army.instances);expect(saved.upgrades2026).toEqual(army.upgrades2026);expect(saved.warlordId).toEqual(army.warlordId);
 expect(validateSelection(saved)).toBe(true);
 expect(rosterFindings(saved).filter(f=>f.severity!=='info')).toEqual([]);
 expect(rosterFindings(saved).map(f=>[f.code,f.severity])).toEqual([['detachment-points','info']]);
 const cost=rosterCost2026(saved);
 expect(cost.total).toBe(plan.points);expect(cost.entries.map(e=>e.points)).toEqual(plan.units.map(u=>u.points));
 expect(resolvedAeldariWarlord(saved)?.id).toBe(plan.warlord);
 for(const squad of saved.instances!)expect(validAeldariGear(squad.unit,squad.knightGear??{},squad.models),squad.id).toBe(true);
 expect(aeldariDedicatedSatisfied(saved)).toBe(true);
 return saved;
}

for(const plan of AELDARI_ACCEPTANCE_ARMIES)it('saves and reopens exactly '+plan.points+' '+plan.detachment+' points with every physical model, upgrade and legal formation',()=>{
 const army=reopen(plan),rows=generate11thReminders(army);
 expect(rows.some(r=>r.title==='Disparate Paths')).toBe(true);
 expect(rows.every(r=>r.source&&r.summary)).toBe(true);
 for(const s of army.instances!)expect(rows.some(r=>r.units?.includes(s.id)),s.id+' appears in generated reminders').toBe(true);
});

it('keeps a fourteen-model Guardian formation separate from its Wave Serpent passengers',()=>{
 const army=build(AELDARI_WARHOST_ARMY),formation=aeldariFormations(army).find(f=>f.root.unit==='Guardian Defenders')!;
 expect(formation.models).toBe(14);expect(formation.members.map(s=>s.unit)).toEqual(['Guardian Defenders','Autarch','Warlock','D-cannon Platform']);
 expect(aeldariArtilleryHosts(army,id('D-cannon Platform')).map(s=>s.id)).toContain(id('Guardian Defenders'));
 const carrier=instance(army,'Wave Serpent');
 expect(aeldariCargoFormations(army,carrier).map(f=>f.root.unit)).not.toContain('Guardian Defenders');
 expect(aeldariCargoFits(army,carrier,[id('Dire Avengers')])).toBe(true);
 const dragon=aeldariFormations(army).find(f=>f.root.unit==='Dragon Knights')!;
 expect(dragon.models).toBe(5);expect(dragon.members.map(s=>s.unit)).toEqual(['Dragon Knights','Clanblade','Stonesinger']);
 expect(aeldariWeaponCount(instance(army,'Dragon Knights'),'Drakolithe')).toBe(2);
 expect(aeldariWeaponCount(instance(army,'Leystalker'),'Drakolithe')).toBe(2);
 const rows=generate11thReminders(army),artillery=rows.find(r=>r.title==='D-cannon Platform#1 · Support Artillery')!;
 expect(artillery.summary).toContain('Guardian Defenders#1');expect(artillery.summary).toContain('cannot embark');
 expect(rows.find(r=>r.title==='Wave Serpent#1 · Declare passengers')!.summary).not.toContain('Guardian Defenders#1');
});

it('keeps actual Corsair specialist models, Epic Hero upgrades and unit-granted Deep Strike',()=>{
 const army=build(AELDARI_CORSAIR_ARMY),s=instance(army,'Corsair Voidscarred'),models=aeldariModelLoadouts(s);
 expect(models).toHaveLength(8);
 expect(models.map(m=>m.model).sort()).toEqual(['Voidscarred Felarch',...Array(4).fill('Corsair Voidscarred'),'Shade Runner','Soul Weaver','Way Seeker'].sort());
 expect(aeldariKeywords(army,s).has('PSYKER')).toBe(true);
 for(const m of models)expect(aeldariKeywords(army,s,m.model).has('PSYKER')).toBe(m.model==='Way Seeker');
 for(const name of ['Executioner','Channeller Stones','Faolchú','Mistshield','Paired Hekatarii blades'])expect(aeldariWeaponCount(s,name)).toBe(1);
 expect(aeldariHasDeepStrike(army,s)).toBe(true);expect(aeldariHasDeepStrike(army,instance(army,'Kharseth'))).toBe(true);
 expect(aeldariHasDeepStrike(army,instance(army,'Prince Yriel'))).toBe(false);
 expect(army.upgrades2026?.['Prince Yriel#1']).toBe('Archraider');expect(army.upgrades2026?.['Corsair Voidscarred#1']).toBe('Webway Pathstone');
});

it('preserves separate Aspect champions, Shrine tokens and the third Fire Dragon copy price',()=>{
 const army=build(AELDARI_ASPECT_ARMY),cost=rosterCost2026(army);
 expect(cost.entries.filter(e=>e.unit==='Fire Dragons').map(e=>e.points)).toEqual([110,110,120]);
 expect(aeldariWeaponCount(instance(army,'Dire Avengers'),'Avenger shuriken catapult')).toBe(11);
 expect(aeldariWeaponCount(instance(army,'Dire Avengers'),'Aspect Shrine token')).toBe(2);
 for(const [n,weapon] of [[1,'Firepike'],[2,'Dragon axe'],[3,'Dragon’s breath flamer']] as const){
  expect(aeldariWeaponCount(instance(army,'Fire Dragons',n),weapon)).toBe(1);
  expect(aeldariWeaponCount(instance(army,'Fire Dragons',n),'Aspect Shrine token')).toBe(1);
 }
 expect(aeldariWeaponCount(instance(army,'Striking Scorpions'),'Chainsabres')).toBe(1);
 expect(aeldariWeaponCount(instance(army,'Striking Scorpions',2),'Biting blade')).toBe(1);
 expect(aeldariCargoFits(army,instance(army,'Falcon'),[id('Fire Dragons')])).toBe(true);
});

it('splits the twelve-model Ynnari Kabalite formation into two six-model Venom cargoes',()=>{
 const army=build(AELDARI_YNNARI_ARMY),formation=aeldariFormations(army).find(f=>f.root.unit==='Ynnari Kabalite Warriors')!;
 expect(formation.models).toBe(12);expect(formation.members.map(s=>s.unit)).toEqual(['Ynnari Kabalite Warriors','Yvraine','The Visarch']);
 for(const n of [1,2]){
  const carrier=instance(army,'Ynnari Venom',n);
  expect(aeldariSplitCargoFormations(army,carrier).find(f=>f.root.id===formation.root.id)).toMatchObject({models:12,halves:[6,6]});
  expect(aeldariCargoFits(army,carrier,[formation.root.id])).toBe(false);
 }
 expect(aeldariCargoFits(army,instance(army,'Ynnari Raider'),[id('Ynnari Incubi')])).toBe(true);
 expect(aeldariCargoFits(army,instance(army,'Ynnari Raider',2),[id('Ynnari Wyches')])).toBe(true);
 expect(aeldariCargoFits(army,instance(army,'Wave Serpent'),[id('Guardian Defenders')])).toBe(true);
 expect(aeldariCargoFormations(army,instance(army,'Wave Serpent')).map(f=>f.root.unit)).not.toContain('Ynnari Incubi');
 expect(aeldariKeywords(army,instance(army,'Farseer')).has('YNNARI')).toBe(true);
 expect(aeldariKeywords(army,instance(army,'Ynnari Archon')).has('ASURYANI')).toBe(false);
 expect(aeldariWeaponCount(instance(army,'Ynnari Kabalite Warriors'),'Splinter rifle')).toBe(5);
 expect(aeldariWeaponCount(instance(army,'Ynnari Venom'),'Splinter cannon')).toBe(2);
 const rows=generate11thReminders(army);
 expect(rows.find(r=>r.title==='Ynnari Venom#1 · Declare passengers')!.summary).toContain('6 + 6 models');
 expect(rows.find(r=>r.title==='Ynnari Venom#1 · Lithe Embarkation')!.summary).toContain('this same transport');
});

it('applies the Harlequin host Warlord and Battleline rules with bearer-specific Mistweave',()=>{
 const army=build(AELDARI_HARLEQUIN_ARMY);
 expect(resolvedAeldariWarlord(army)?.unit).toBe('Troupe Master');expect(aeldariMusterUnits(army)).not.toContain('Yvraine');
 for(const n of [1,2,3]){
  expect(aeldariKeywords(army,instance(army,'Troupe',n)).has('BATTLELINE')).toBe(true);
  expect(aeldariCargoFits(army,instance(army,'Starweaver',n),[id('Troupe',n)])).toBe(true);
 }
 expect(aeldariHasInfiltrators(army,instance(army,'Troupe',2))).toBe(true);
 expect(aeldariHasInfiltrators(army,instance(army,'Troupe'))).toBe(false);
 expect(rosterCost2026(army).entries.find(e=>e.unit==='Shadowseer')?.enhancementPoints).toBe(15);
});

it('keeps Wraith Construct transport spaces and per-model paid cannon counts',()=>{
 const army=build(AELDARI_WRAITH_ARMY),carrier=instance(army,'Wave Serpent');
 for(const [unit,n] of [['Wraithguard',1],['Wraithguard',2],['Wraithblades',1]] as const){
  expect(aeldariCargoFormations(army,carrier).find(f=>f.root.id===id(unit,n))).toMatchObject({models:5,spaces:10});
 }
 expect(aeldariCargoFits(army,carrier,[id('Wraithguard'),id('Wraithblades')])).toBe(false);
 expect(aeldariWeaponCount(instance(army,'Wraithknight'),'Heavy wraithcannon')).toBe(1);
 expect(aeldariWeaponCount(instance(army,'Wraithknight with Ghostglaive'),'Heavy wraithcannon')).toBe(1);
 expect(rosterCost2026(army).entries.find(e=>e.unit==='Wraithknight')?.wargearPoints).toBe(10);
 expect(rosterCost2026(army).entries.find(e=>e.unit==='Wraithknight with Ghostglaive')?.wargearPoints).toBeUndefined();
 expect(aeldariModelLoadouts(instance(army,'Wraithguard')).every(m=>m.items.includes('D-scythe'))).toBe(true);
 expect(aeldariModelLoadouts(instance(army,'Wraithguard',2)).every(m=>m.items.includes('Wraithcannon'))).toBe(true);
});

it('preserves a nested Farseer and mandatory Warlock Support on the same Windrider formation',()=>{
 const army=build(AELDARI_WINDRIDER_ARMY),farseer=instance(army,'Farseer Skyrunner'),support=instance(army,'Warlock Skyrunners'),root=instance(army,'Windriders');
 expect(farseer.attachedTo).toBe(support.id);expect(support.attachedTo).toBe(root.id);
 expect(knightJoinedBodyguard(army,farseer)?.id).toBe(root.id);expect(knightJoinedBodyguard(army,support)?.id).toBe(root.id);
 const f=aeldariFormations(army).find(f=>f.root.id===root.id)!;
 expect(f.models).toBe(8);expect(new Set(f.members.map(s=>s.id))).toEqual(new Set([root.id,farseer.id,support.id]));
 expect(aeldariKeywords(army,root).has('BATTLELINE')).toBe(true);expect(aeldariKeywords(army,instance(army,'Vypers')).has('VYPER')).toBe(true);
 expect(aeldariWeaponCount(instance(army,'Shining Spears'),'Shimmershield')).toBe(1);
 expect(aeldariModelLoadouts(instance(army,'Shining Spears')).find(m=>m.items.includes('Shimmershield'))?.model).toBe('Shining Spear Exarch');
});
