// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {sororitasLoadout,sororitasModelLoadouts,sororitasWeaponCount} from '../src/sororitas-loadouts';
import {sororitasKeywords,sororitasAgentName} from '../src/sororitas-army-data';
import {selectSororitasWarlord,resolvedSororitasWarlord} from '../src/sororitas-muster';
import {sororitasCargoFormations,sororitasSplitCargoFormations,sororitasDedicatedSatisfied,sororitasFormations} from '../src/sororitas-transports';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const battleSisters='Battle Sisters Squad',dominions='Dominion Squad',rhino='Sororitas Rhino';
const borrowedPriest='Ministorum Priest (Assigned Agent)',borrowedSanctifiers='Sanctifiers (Assigned Agent)';
const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string,n=1)=>setInstanceAttachment(a,id(leader),id(body,n));
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
function gear(a:ArmySelection,unit:string,owner:string,items:string[],n=1){
 const squad=instance(a,unit,n);
 const field=sororitasLoadout(unit,squad.models)!.slots.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('Missing equipment choice: '+unit+' / '+owner+' / '+items.join(', '));
 return setKnightGear(a,squad.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}
function army(strike=false){
 let a=individualArmy({...newSelection('Adepta Sororitas'),battleSize2026:strike?'Strike Force':'Incursion',detachments2026:[strike?'Hallowed Martyrs':'Army of Faith']});
 const units=['Canoness','Hospitaller',dominions,rhino,battleSisters,'Immolator','Retributor Squad','Mortifiers','Seraphim Squad','Palatine',strike?borrowedSanctifiers:battleSisters];
 if(strike)units.push('Morvenn Vahl','Paragon Warsuits','Castigator','Exorcist','Arco-flagellants','Ministorum Priest',borrowedPriest);
 for(const unit of units)a=addSelectionUnit(a,unit);
 for(const [unit,n] of [[dominions,10],[battleSisters,10],['Retributor Squad',5],['Mortifiers',2],['Seraphim Squad',5]] as const)a=setInstanceModelCount(a,id(unit),n);
 a=join(a,'Canoness',dominions);a=join(a,'Hospitaller',dominions);
 a=join(a,'Palatine',battleSisters,strike?1:2);
 a=selectUpgrade2026(a,id('Canoness'),strike?'Chaplet of Sacrifice':'Divine Aspect');
 a=selectSororitasWarlord(a,id(strike?'Morvenn Vahl':'Canoness'));
 a=gear(a,'Canoness','',['Plasma pistol','Power weapon','Rod of Office']);
 for(let n=1;n<=4;n++){
  a=gear(a,dominions,'Dominion '+n+' ·',['Meltagun']);
  a=gear(a,'Retributor Squad','Retributor '+n+' ·',['Multi-melta']);
 }
 a=gear(a,dominions,'Dominion 5 ·',['Boltgun','Simulacrum imperialis']);
 a=gear(a,battleSisters,'Battle Sister 1 ·',['Multi-melta']);
 a=gear(a,battleSisters,'Battle Sister 2 ·',['Meltagun']);
 a=gear(a,battleSisters,'Battle Sister 3 ·',['Boltgun','Simulacrum imperialis']);
 a=gear(a,'Immolator','',['Twin multi-melta']);
 a=gear(a,'Mortifiers','Mortifier 1 ·',['Anchorite sarcophagus']);
 for(let n=1;n<=2;n++)a=gear(a,'Seraphim Squad','Seraphim '+n+' ·',['Ministorum hand flamer','Ministorum hand flamer']);
 if(strike){
  a=setInstanceModelCount(a,id('Paragon Warsuits'),3);a=setInstanceModelCount(a,id('Arco-flagellants'),10);
  a=join(a,'Morvenn Vahl','Paragon Warsuits');a=join(a,'Ministorum Priest','Arco-flagellants');a=join(a,borrowedPriest,borrowedSanctifiers);
  for(const owner of ['Paragon Superior ·','Paragon 1 ·','Paragon 2 ·'])a=gear(a,'Paragon Warsuits',owner,['Multi-melta']);
 }
 return a;
}
function reopen(a:ArmySelection){
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(a.instances);expect(saved.upgrades2026).toEqual(a.upgrades2026);
 expect(validateSelection(saved)).toBe(true);
 expect(rosterFindings(saved).filter(f=>f.severity==='error')).toEqual([]);
 return saved;
}

it('saves and reopens an exact 1,000-point Army of Faith with mixed physical guns, Leader plus Support, Rhino passengers and an Immolator split',()=>{
 const saved=reopen(army()),cost=rosterCost2026(saved);
 expect(cost.total).toBe(1000);
 expect(cost.entries.map(e=>[e.id,e.points])).toEqual([
  [id('Canoness'),65],[id('Hospitaller'),65],[id(dominions),110],[id(rhino),65],[id(battleSisters),100],
  [id('Immolator'),115],[id('Retributor Squad'),125],[id('Mortifiers'),130],[id('Seraphim Squad'),75],[id('Palatine'),50],[id(battleSisters,2),100],
 ]);
 expect(cost.entries.filter(e=>e.wargearPoints).map(e=>[e.unit,e.wargearPoints])).toEqual([[dominions,20],['Immolator',15],['Retributor Squad',20]]);
 expect(sororitasWeaponCount(instance(saved,dominions),'Meltagun')).toBe(4);
 expect(sororitasWeaponCount(instance(saved,'Retributor Squad'),'Multi-melta')).toBe(4);
 expect(sororitasWeaponCount(instance(saved,'Seraphim Squad'),'Ministorum hand flamer')).toBe(4);
 const bearer=sororitasModelLoadouts(instance(saved,battleSisters)).find(m=>m.items.includes('Simulacrum imperialis'))!;
 expect(bearer.items).toContain('Boltgun');expect(bearer.items).not.toContain('Multi-melta');
 expect(sororitasFormations(saved).find(g=>g.root.unit===dominions)?.members.map(s=>s.unit)).toEqual([dominions,'Canoness','Hospitaller']);
 expect(sororitasCargoFormations(saved,instance(saved,rhino)).find(g=>g.root.unit===dominions)?.spaces).toBe(12);
 expect(sororitasSplitCargoFormations(saved,instance(saved,'Immolator')).find(g=>g.root.id===id(battleSisters))?.halves).toEqual([5,5]);
 expect(sororitasDedicatedSatisfied(saved)).toBe(true);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='Sacred Healing')?.units).toContain(id(dominions));
 expect(rows.find(r=>r.title==='Acts of Faith · Substitute one die'&&r.window==='Command')?.summary).toContain('up to two Acts of Faith');
 expect(rows.find(r=>r.title===id(rhino)+' · Declare passengers')?.summary).toContain(id(dominions)+' (12 spaces)');
 expect(rows.find(r=>r.title===id('Immolator')+' · Declare passengers')?.summary).toContain(id(battleSisters)+' (5 + 5 models)');
});

it('saves and reopens an exact 2,000-point Hallowed Martyrs force with Vahl, paid Paragon guns and distinct native Leader and assigned Support Priests',()=>{
 const saved=reopen(army(true)),cost=rosterCost2026(saved);
 expect(cost.total).toBe(2000);
 expect(cost.entries.map(e=>[e.id,e.points])).toEqual([
  [id('Canoness'),85],[id('Hospitaller'),65],[id(dominions),110],[id(rhino),65],[id(battleSisters),100],
  [id('Immolator'),115],[id('Retributor Squad'),125],[id('Mortifiers'),130],[id('Seraphim Squad'),75],[id('Palatine'),50],
  [id(borrowedSanctifiers),100],[id('Morvenn Vahl'),215],[id('Paragon Warsuits'),195],[id('Castigator'),165],
  [id('Exorcist'),175],[id('Arco-flagellants'),140],[id('Ministorum Priest'),50],[id(borrowedPriest),40],
 ]);
 expect(resolvedSororitasWarlord(saved)?.unit).toBe('Morvenn Vahl');
 expect(sororitasWeaponCount(instance(saved,'Paragon Warsuits'),'Multi-melta')).toBe(3);
 expect(cost.entries.find(e=>e.unit==='Paragon Warsuits')?.wargearPoints).toBe(30);
 expect(sororitasAgentName('Ministorum Priest')).toBeUndefined();expect(sororitasAgentName(borrowedPriest)).toBe('Ministorum Priest');
 expect(sororitasKeywords(saved,instance(saved,'Ministorum Priest'))).toContain('ADEPTA SORORITAS');
 expect(sororitasKeywords(saved,instance(saved,borrowedPriest))).not.toContain('ADEPTA SORORITAS');
 expect(sororitasFormations(saved).find(g=>g.root.unit===borrowedSanctifiers)?.members.map(s=>s.unit)).toEqual([borrowedSanctifiers,borrowedPriest]);
 expect(sororitasCargoFormations(saved,instance(saved,rhino)).map(g=>g.root.unit)).not.toContain(borrowedSanctifiers);
 expect(sororitasSplitCargoFormations(saved,instance(saved,'Immolator')).find(g=>g.root.unit===battleSisters)?.halves).toEqual([5,6]);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='Abbess Sanctorum'&&r.window==='Shooting')?.units).toContain(id('Paragon Warsuits'));
 const faith=rows.find(r=>r.title==='Acts of Faith · Substitute one die'&&r.window==='Command')!;
 expect(faith.units).toContain(id('Ministorum Priest'));expect(faith.units).not.toContain(id(borrowedPriest));
 expect(faith.units).not.toContain(id(borrowedSanctifiers));expect(faith.summary).toContain('one Act of Faith per phase');
});
