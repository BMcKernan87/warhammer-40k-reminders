// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {csmArmyLoadout,csmArmyModelLoadouts,csmArmyWeaponCount} from '../src/csm-army-loadouts';
import {setCsmMark,selectCsmWarlord,resolvedCsmWarlord} from '../src/csm-muster';
import {csmCargoFormations,csmCargoFits,csmFormations} from '../src/csm-transports';
import {csmKeywords} from '../src/csm-keywords';
import {csmCanDarkPact} from '../src/csm-dark-pacts';
import type {CsmMark} from '../src/csm-muster-data';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const prince='Heretic Astartes Daemon Prince With Wings';
const masters='Masters of the Maelstrom';
const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
function gear(a:ArmySelection,unit:string,prefix:string,items:string[],n=1){
 const s=instance(a,unit,n),field=csmArmyLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No equipment choice: '+unit+' / '+prefix+' / '+items.join(', '));
 return setKnightGear(a,s.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}
function army(strike=false){
 let a=individualArmy({...newSelection('Chaos Space Marines'),battleSize2026:strike?'Strike Force':'Incursion',detachments2026:strike?['Cult of the Arkifane','Cabal of Chaos']:['Pactbound Zealots']});
 const units=strike?['Chaos Lord',masters,'Legionaries','Chaos Rhino','Dark Apostle','Chosen','Chaos Rhino','Vashtorr The Arkifane','Defiler','Forgefiend','Warpsmith','Obliterators','Legionaries','Chaos Bikers']:['Chaos Lord','Chosen','Master Of Executions','Chaos Rhino',prince,'Plague Marines','Cultist Mob','Raptors','Forgefiend'];
 for(const unit of units)a=addSelectionUnit(a,unit);
 a=gear(a,'Forgefiend','Forgefiend jaws',['Armoured limbs','Ectoplasma cannon']);
 a=gear(a,'Forgefiend','Hades autocannon',['Ectoplasma cannon','Ectoplasma cannon']);
 if(!strike){
  for(const [unit,mark] of [['Chaos Lord','Nurgle'],['Chosen','Nurgle'],['Master Of Executions','Nurgle'],['Chaos Rhino','Nurgle'],[prince,'Slaanesh'],['Cultist Mob','Tzeentch'],['Raptors','Khorne'],['Forgefiend','Nurgle']] as [string,CsmMark][])a=setCsmMark(a,id(unit),mark);
  a=selectCsmWarlord(a,id(prince));a=join(a,'Chaos Lord','Chosen');a=join(a,'Master Of Executions','Chosen');
  a=selectUpgrade2026(a,id('Chaos Lord'),'Orbs of Unlife');a=selectUpgrade2026(a,id(prince),'Intoxicating Elixir');
  a=gear(a,'Chosen','Chosen Champion ·',['Boltgun','Plasma pistol','Power fist']);a=gear(a,'Chosen','Chosen Champion ·',['Chaos icon']);
  a=gear(a,'Chosen','Chosen 1 ·',['Accursed weapon','Bolt pistol','Combi-weapon']);
  a=gear(a,'Plague Marines','Plague Champion ·',['Plasma pistol']);a=gear(a,'Plague Marines','Plague Champion ·',['Power fist']);
  a=gear(a,'Plague Marines','Plague Marine 1 ·',['Boltgun','Icon of despair']);a=gear(a,'Plague Marines','Plague Marine 2 ·',['Blight launcher']);
  a=gear(a,'Plague Marines','Plague Marine 3 ·',['Heavy plague weapon']);a=gear(a,'Plague Marines','Plague Marine 4 ·',['Plague spewer']);
 }else{
  a=setInstanceModelCount(a,id('Legionaries',2),10);a=setInstanceModelCount(a,id('Chaos Bikers'),6);
  a=selectCsmWarlord(a,id('Vashtorr The Arkifane'));a=join(a,'Chaos Lord','Legionaries');a=join(a,masters,'Legionaries');a=join(a,'Dark Apostle','Chosen');
  a=setInstanceAttachment(a,id('Warpsmith'),id('Legionaries',2));
  for(const [unit,upgrade] of [['Chaos Lord','Cybinfernal Font'],['Dark Apostle','Touched by the Warp'],['Warpsmith','Crown of Worms']])a=selectUpgrade2026(a,id(unit),upgrade);
  a=gear(a,'Defiler','Heavy baleflamer',['Hades lascannon','Hades lascannon']);a=gear(a,'Defiler','Hades battle cannon',['Ectoplasma destructor']);
  a=gear(a,'Legionaries','Aspiring Champion ·',['Heavy melee weapon','Plasma pistol']);a=gear(a,'Legionaries','Aspiring Champion ·',['Chaos icon']);
  a=gear(a,'Legionaries','Legionary 1 ·',['Lascannon']);a=gear(a,'Legionaries','Legionary 2 ·',['Balefire tome']);
  a=gear(a,'Legionaries','Aspiring Champion ·',['Accursed weapon','Accursed weapon'],2);
  a=gear(a,'Legionaries','Legionary 1 ·',['Heavy bolter'],2);a=gear(a,'Legionaries','Legionary 2 ·',['Missile launcher'],2);
  a=gear(a,'Chaos Bikers','Biker Champion ·',['Power fist']);a=gear(a,'Chaos Bikers','Biker Champion ·',['Chaos icon']);
  a=gear(a,'Chaos Bikers','Chaos Biker 1 ·',['Combi-bolter','Plasma gun']);a=gear(a,'Chaos Bikers','Chaos Biker 2 ·',['Combi-weapon']);
 }
 return a;
}
function reopen(a:ArmySelection){
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(a.instances);expect(saved.upgrades2026).toEqual(a.upgrades2026);expect(saved.warlordId).toEqual(a.warlordId);
 expect(validateSelection(saved)).toBe(true);expect(rosterFindings(saved).filter(f=>f.severity==='error')).toEqual([]);
 return saved;
}

it('saves and reopens an exact 1,000-point Pactbound army with Prince allegiance, Leader plus Support and matching native/Cult Rhino passengers',()=>{
 const a=reopen(army());expect(rosterCost2026(a).total).toBe(1000);
 expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([110,140,75,65,185,90,50,115,170]);
 expect(resolvedCsmWarlord(a)?.unit).toBe(prince);expect(instance(a,prince).csmMark).toBe('Slaanesh');
 expect(instance(a,'Cultist Mob').csmMark).toBe('Tzeentch');expect(instance(a,'Raptors').csmMark).toBe('Khorne');
 const formation=csmFormations(a).find(f=>f.root.unit==='Chosen')!;
 expect(formation.members.map(s=>s.unit)).toEqual(['Chosen','Chaos Lord','Master Of Executions']);
 for(const member of formation.members)expect(csmKeywords(a,member)).toContain('NURGLE');
 const carrier=instance(a,'Chaos Rhino'),cargo=csmCargoFormations(a,carrier);
 expect(cargo.find(f=>f.root.unit==='Chosen')).toMatchObject({models:7,spaces:7});
 expect(cargo.find(f=>f.root.unit==='Plague Marines')).toMatchObject({models:5,spaces:5});
 expect(csmCargoFits(a,carrier,[id('Chosen'),id('Plague Marines')])).toBe(true);
 for(const name of ['Cultist Mob','Raptors',prince,'Master Of Executions','Chaos Lord'])expect(cargo.map(f=>f.root.unit)).not.toContain(name);
 const cult=instance(a,'Plague Marines');expect(csmKeywords(a,cult)).toContain('HERETIC ASTARTES');expect(csmKeywords(a,cult)).not.toContain('DEATH GUARD');
 expect(csmCanDarkPact(a,[cult])).toBe(false);expect(csmArmyWeaponCount(cult,'Icon of despair')).toBe(1);
 expect(csmArmyWeaponCount(instance(a,'Forgefiend'),'Ectoplasma cannon')).toBe(3);
 const rows=generate11thReminders(a);
 const pact=rows.find(r=>r.title===id('Chosen')+' · Dark Pacts'&&r.window==='Shooting'&&r.turn==='own');
 expect(pact?.units).toEqual([id('Chosen'),id('Chaos Lord'),id('Master Of Executions')]);expect(pact?.summary).toContain('Chaos icon');
 expect(rows.some(r=>r.title===id('Plague Marines')+' · Dark Pacts')).toBe(false);
 expect(rows.find(r=>r.title===id('Chaos Rhino')+' · Declare passengers')?.summary).toContain('Chosen#1 (7 models; 7 spaces)');
 expect(rows.find(r=>r.title===id('Chaos Rhino')+' · Declare passengers')?.summary).toContain('Plague Marines#1 (5 models; 5 spaces)');
 expect(rows.find(r=>r.title==='Orbs of Unlife')?.units).toEqual([id('Chaos Lord')]);
 expect(rows.find(r=>r.title==='Intoxicating Elixir')?.units).toEqual([id(prince)]);
 expect(rows.find(r=>r.title==='Daemonic Allegiance')?.summary).toContain('Slaanesh');
 expect(rows.find(r=>r.title==='Daemonic Allegiance · Slaanesh')?.summary).toContain('2″');
});

it('saves and reopens an exact 2,000-point Arkifane/Cabal army with whole Font formation, personal Touched weapons and physical multi-model cargo',()=>{
 const a=reopen(army(true));expect(rosterCost2026(a).total).toBe(2000);
 expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([115,150,95,65,80,140,65,220,330,170,80,160,180,150]);
 expect(resolvedCsmWarlord(a)?.unit).toBe('Vashtorr The Arkifane');expect(Object.keys(a.upgrades2026??{})).toHaveLength(3);
 const font=csmFormations(a).find(f=>f.root.id===id('Legionaries'))!;
 expect(font.members.map(s=>s.unit)).toEqual(['Legionaries','Chaos Lord',masters]);
 expect(font.members.flatMap(csmArmyModelLoadouts)).toHaveLength(11);
 for(const member of font.members)for(const model of csmArmyModelLoadouts(member)){
  expect(csmKeywords(a,member,model.model)).toContain('SOUL FORGE');expect(csmKeywords(a,member,model.model)).not.toContain('DAEMON');
 }
 expect(csmKeywords(a,instance(a,'Legionaries',2))).not.toContain('SOUL FORGE');
 const apostle=instance(a,'Dark Apostle');expect(csmKeywords(a,apostle,'Dark Apostle')).toContain('PSYKER');
 expect(csmKeywords(a,apostle,'Dark Disciple')).not.toContain('PSYKER');expect(csmKeywords(a,instance(a,'Chosen'))).not.toContain('PSYKER');
 expect(csmArmyModelLoadouts(apostle).map(m=>m.model)).toEqual(['Dark Apostle','Dark Disciple','Dark Disciple']);
 for(const n of [1,2]){
  const carrier=instance(a,'Chaos Rhino',n),cargo=csmCargoFormations(a,carrier);
  expect(cargo.find(f=>f.root.id===id('Legionaries'))).toMatchObject({models:11,spaces:11});
  expect(cargo.find(f=>f.root.id===id('Chosen'))).toMatchObject({models:8,spaces:8});
  expect(cargo.find(f=>f.root.id===id('Legionaries',2))).toMatchObject({models:11,spaces:11});
  for(const name of ['Chaos Lord',masters,'Dark Apostle','Obliterators','Chaos Bikers'])expect(cargo.map(f=>f.root.unit)).not.toContain(name);
  expect(csmCargoFits(a,carrier,[id('Legionaries'),id('Chosen')])).toBe(false);
 }
 expect(csmArmyWeaponCount(instance(a,'Defiler'),'Hades lascannon')).toBe(2);expect(csmArmyWeaponCount(instance(a,'Defiler'),'Hades battle cannon')).toBe(0);
 expect(csmArmyWeaponCount(instance(a,'Forgefiend'),'Ectoplasma cannon')).toBe(3);
 expect(csmArmyWeaponCount(instance(a,'Legionaries',2),'Accursed weapon')).toBe(2);
 const rows=generate11thReminders(a),cargo=rows.find(r=>r.title===id('Chaos Rhino')+' · Declare passengers')!;
 expect(cargo.summary).toContain('Legionaries#1 (11 models; 11 spaces)');expect(cargo.summary).toContain('Chosen#1 (8 models; 8 spaces)');
 expect(rows.find(r=>r.title===id('Legionaries')+' · Dark Pacts'&&r.window==='Shooting'&&r.turn==='own')?.units).toEqual([id('Legionaries'),id('Chaos Lord'),id(masters)]);
 const soul=rows.find(r=>r.title==='Soul Forge Boons · 5+ invulnerable save');
 expect(soul?.units).toContain(id('Legionaries'));expect(soul?.units).not.toContain(id('Legionaries',2));
 const touched=rows.find(r=>r.title==='Touched by the Warp');expect(touched?.units).toEqual([id('Dark Apostle')]);
 expect(touched?.summary).toContain('Character');expect(touched?.summary).toContain('Dark Disciples');
 expect(rows.find(r=>r.title==='Empyric Wellspring'&&r.window==='Shooting')?.units).toEqual([id('Legionaries'),id('Chosen')]);
});
