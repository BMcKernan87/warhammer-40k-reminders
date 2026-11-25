// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {tyranidLoadout,tyranidModelLoadouts,tyranidWeaponCount} from '../src/tyranid-loadouts';
import {setTyranidCharacter,selectTyranidWarlord,resolvedTyranidWarlord} from '../src/tyranid-muster';
import {tyranidCargoFormations,tyranidFormations} from '../src/tyranid-transports';
import {tyranidKeywords} from '../src/tyranid-keywords';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
function gear(a:ArmySelection,unit:string,prefix:string,items:string[],n=1){
 const s=instance(a,unit,n),field=tyranidLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No equipment choice: '+unit+' / '+prefix+' / '+items.join(', '));
 return setKnightGear(a,s.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}
function brood(a:ArmySelection,base:string,specialists:number,n=1){
 return gear(a,'Termagants','Brood weapons',[...Array(20-specialists*3).fill(base),...Array(specialists).fill('Shardlauncher'),...Array(specialists).fill('Spike rifle'),...Array(specialists).fill('Strangleweb')],n);
}
function army(strike=false){
 let a=individualArmy({...newSelection('Tyranids'),battleSize2026:strike?'Strike Force':'Incursion',detachments2026:[strike?'Invasion Fleet':'Subterranean Assault']});
 const units=strike?['Hive Tyrant','Tyrant Guard','Neurotyrant','Zoanthropes','Tervigon','Termagants','Termagants','Tyrannofex','Biovores','Tyrannocyte','Exocrine','Deathleaper','Lictor','Venomthropes','Psychophage','Gargoyles','Ripper Swarms']:['Trygon','Hyperadapted Raveners','Raveners','Tyrannocyte','Broodlord','Genestealers','Termagants','Biovores','Gargoyles','Mucolid Spores','Neurogaunts'];
 for(const unit of units)a=addSelectionUnit(a,unit);
 a=setInstanceModelCount(a,id('Termagants'),20);
 if(!strike){
  a=setTyranidCharacter(a,id('Trygon'),true);a=selectTyranidWarlord(a,id('Trygon'));
  a=selectUpgrade2026(a,id('Trygon'),'Trygon Prime');
  a=join(a,'Hyperadapted Raveners','Raveners');a=join(a,'Broodlord','Genestealers');
  a=brood(a,'Termagant devourer',2);
 }else{
  a=setInstanceModelCount(a,id('Termagants',2),20);a=setInstanceModelCount(a,id('Tyrant Guard'),6);a=setInstanceModelCount(a,id('Zoanthropes'),6);a=setInstanceModelCount(a,id('Ripper Swarms'),3);
  a=join(a,'Hive Tyrant','Tyrant Guard');a=join(a,'Neurotyrant','Zoanthropes');a=selectTyranidWarlord(a,id('Hive Tyrant'));
  for(const [unit,upgrade] of [['Hive Tyrant','Adaptive Biology'],['Neurotyrant','Perfectly Adapted'],['Tervigon','Synaptic Linchpin']])a=selectUpgrade2026(a,id(unit),upgrade);
  a=gear(a,'Hive Tyrant','',['Heavy venom cannon','Monstrous bonesword and lash whip']);
  a=gear(a,'Tyrant Guard','Tyrant Guard 1 ·',['Crushing claws and rending claws']);
  a=gear(a,'Tyrant Guard','Tyrant Guard 2 ·',['Bone cleaver, lash whip and rending claws']);
  a=brood(a,'Fleshborer',1);a=brood(a,'Termagant spinefists',2,2);
  a=gear(a,'Tyrannofex','',['Rupture cannon']);a=gear(a,'Ripper Swarms','Brood ranged weapons',Array(3).fill('Spinemaws'));
 }
 return a;
}
function reopen(a:ArmySelection){
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(a.instances);expect(saved.upgrades2026).toEqual(a.upgrades2026);
 expect(validateSelection(saved)).toBe(true);expect(rosterFindings(saved).filter(f=>f.severity==='error')).toEqual([]);
 return saved;
}

it('saves and reopens an exact 1,000-point Subterranean army with promoted Trygon, multi-model Leader and weighted transport capacity',()=>{
 const a=reopen(army());expect(rosterCost2026(a).total).toBe(1000);
 expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([155,165,125,80,80,75,110,60,75,30,45]);
 expect(resolvedTyranidWarlord(a)?.unit).toBe('Trygon');expect(instance(a,'Trygon').characterPromotion).toBe(true);
 for(const tag of ['TYRANIDS','CHARACTER','SYNAPSE'])expect(tyranidKeywords(a,instance(a,'Trygon'))).toContain(tag);
 expect(tyranidFormations(a).find(f=>f.root.unit==='Raveners')?.members.map(s=>s.unit)).toEqual(['Raveners','Hyperadapted Raveners']);
 expect(tyranidModelLoadouts(instance(a,'Hyperadapted Raveners'))).toHaveLength(5);
 const cargo=tyranidCargoFormations(a,instance(a,'Tyrannocyte'));
 expect(cargo.find(f=>f.root.unit==='Genestealers')).toMatchObject({models:6,spaces:18});
 expect(cargo.find(f=>f.root.unit==='Termagants')).toMatchObject({models:20,spaces:20});
 expect(cargo.map(f=>f.root.unit)).not.toContain('Raveners');
 expect(tyranidWeaponCount(instance(a,'Termagants'),'Termagant devourer')).toBe(14);expect(tyranidWeaponCount(instance(a,'Termagants'),'Strangleweb')).toBe(2);
 const rows=generate11thReminders(a);
 expect(rows.find(r=>r.title==='Synapse · Melee strength')?.units).toContain(id('Raveners'));
 expect(rows.find(r=>r.title===id('Tyrannocyte')+' · Aerial Seeding reserves')?.summary).toContain('do not count');
 expect(rows.find(r=>r.title===id('Tyrannocyte')+' · Declare passengers')?.summary).toContain('Genestealers#1 (6 models; 18 spaces)');
 expect(rows.some(r=>r.title===id('Trygon')+' · Trygon Prime')).toBe(true);
});

it('saves and reopens an exact 2,000-point Invasion army with distinct uniform broods, paid rupture cannon and model-specific support effects',()=>{
 const a=reopen(army(true));expect(rosterCost2026(a).total).toBe(2000);
 expect(rosterCost2026(a).entries.map(e=>e.points)).toEqual([220,170,135,190,170,110,110,190,60,80,135,80,60,55,110,75,50]);
 expect(Object.keys(a.upgrades2026??{})).toHaveLength(3);expect(resolvedTyranidWarlord(a)?.unit).toBe('Hive Tyrant');
 expect(tyranidFormations(a).find(f=>f.root.unit==='Tyrant Guard')?.members.map(s=>s.unit)).toEqual(['Tyrant Guard','Hive Tyrant']);
 expect(tyranidWeaponCount(instance(a,'Termagants'),'Fleshborer')).toBe(17);expect(tyranidWeaponCount(instance(a,'Termagants',2),'Termagant spinefists')).toBe(14);
 expect(tyranidWeaponCount(instance(a,'Tyrannofex'),'Rupture cannon')).toBe(1);expect(tyranidWeaponCount(instance(a,'Ripper Swarms'),'Spinemaws')).toBe(3);
 const cargo=tyranidCargoFormations(a,instance(a,'Tyrannocyte'));
 expect(cargo.find(f=>f.root.unit==='Psychophage')).toMatchObject({models:1,spaces:1});
 expect(cargo.filter(f=>f.root.unit==='Termagants')).toHaveLength(2);
 expect(cargo.map(f=>f.root.unit)).not.toContain('Tyrant Guard');expect(cargo.map(f=>f.root.unit)).not.toContain('Zoanthropes');
 const rows=generate11thReminders(a);
 const guardian=rows.find(r=>r.title==='Guardian Organism');
 expect(guardian?.units).toEqual([id('Tyrant Guard'),id('Hive Tyrant')]);
 expect(guardian?.summary).toContain('actual Character models, not every Tyrant Guard model');
 expect(rows.find(r=>r.title==='Brood Progenitor')?.units).toEqual([id('Tervigon'),id('Termagants'),id('Termagants',2)]);
 expect(rows.find(r=>r.title==='Shadow in the Warp')?.summary).toContain('Psychic Terror');
 expect(rows.find(r=>r.title==='Foul Spores')?.units).toContain(id('Tyrannofex'));
});
