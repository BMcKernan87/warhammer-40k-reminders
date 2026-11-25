// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {mechanicusLoadout,mechanicusModelLoadouts,mechanicusWeaponCount} from '../src/mechanicus-loadouts';
import {selectMechanicusWarlord,resolvedMechanicusWarlord} from '../src/mechanicus-muster';
import {mechanicusCargoFormations,mechanicusCargoFits,mechanicusFormations} from '../src/mechanicus-transports';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const dominus='Tech-priest Dominus',manipulus='Tech-priest Manipulus',marshal='Skitarii Marshal';
const rangers='Skitarii Rangers',vanguard='Skitarii Vanguard',dunerider='Skorpius Dunerider',transvector='Archaeopter Transvector';
const walkers='Ironstrider Ballistarii',robots='Kastelan Robots',datasmith='Cybernetica Datasmith',battleclade='Servitor Battleclade';
const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(a:ArmySelection,unit:string)=>a.instances!.find(s=>s.id===id(unit))!;
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
function gear(a:ArmySelection,unit:string,owner:string,items:string[]){
 const squad=instance(a,unit);
 const field=mechanicusLoadout(unit,squad.models)!.slots.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('Missing equipment choice: '+unit+' / '+owner+' / '+items.join(', '));
 return setKnightGear(a,squad.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}
function army(strike=false){
 let a=individualArmy({...newSelection('Adeptus Mechanicus'),battleSize2026:strike?'Strike Force':'Incursion',detachments2026:[strike?'Haloscreed Battle Clade':'Skitarii Hunter Cohort']});
 const units=[dominus,marshal,rangers,dunerider,vanguard,walkers,'Pteraxii Skystalkers','Kataphron Breachers','Onager Dunecrawler','Hastarii Exterminators'];
 if(strike)units.push('Thulia Ghuld',datasmith,robots,transvector,manipulus,'Technoarcheologist',battleclade,'Hastarii Exterminators','Serberys Raiders');
 for(const unit of units)a=addSelectionUnit(a,unit);
 a=setInstanceModelCount(a,id(walkers),2);
 a=join(a,dominus,rangers);a=join(a,marshal,rangers);
 if(!strike)a=selectUpgrade2026(a,id(marshal),'Clandestine Infiltrator');
 a=selectMechanicusWarlord(a,id(strike?'Thulia Ghuld':dominus));
 for(let n=1;n<=2;n++)a=gear(a,walkers,'Ironstrider Ballistarii '+n+' ·',['Twin cognis lascannon']);
 for(const [unit,role,gun,device] of [[rangers,'Skitarii Ranger','Galvanic rifle','Omnispex'],[vanguard,'Skitarii Vanguard','Radium carbine','Enhanced data-tether']] as const){
  for(const [n,weapon] of [[1,'Arc rifle'],[2,'Plasma caliver'],[3,'Transuranic arquebus']] as const)a=gear(a,unit,role+' '+n+' ·',[weapon]);
  a=gear(a,unit,role+' 4 ·',[gun,device]);
 }
 a=gear(a,rangers,'Skitarii Ranger Alpha ·',['Mechanicus pistol']);a=gear(a,rangers,'Skitarii Ranger Alpha ·',['Alpha combat weapon']);
 a=gear(a,'Kataphron Breachers','Kataphron Breacher 1 ·',['Torsion cannon']);
 a=gear(a,'Kataphron Breachers','Kataphron Breacher 2 ·',['Hydraulic claw']);
 a=gear(a,'Onager Dunecrawler','',['Neutron laser','Cognis heavy stubber','Cognis heavy stubber']);
 a=gear(a,'Onager Dunecrawler','',['Broad spectrum data-tether']);
 if(strike){
  a=setInstanceModelCount(a,id(robots),4);
  a=join(a,datasmith,robots);a=join(a,manipulus,'Hastarii Exterminators');a=join(a,'Technoarcheologist',battleclade);
  a=selectUpgrade2026(a,id(datasmith),'Transoracular Dyad Wafers');a=selectUpgrade2026(a,id(manipulus),'Inloaded Lethality');
  a=gear(a,robots,'Kastelan Robot 1 ·',['Close combat weapon','Twin Kastelan phosphor blaster']);
  a=gear(a,robots,'Kastelan Robot 1 ·',['Heavy phosphor blaster']);
  a=gear(a,robots,'Kastelan Robot 2 ·',['Kastelan fist','Kastelan phosphor blaster']);
  a=gear(a,battleclade,'Combat Servitor 1 ·',['Meltagun','Servo-claw']);
  for(let n=2;n<=4;n++)a=gear(a,battleclade,'Combat Servitor '+n+' ·',['Incendine igniter','Servo-claw']);
  a=gear(a,transvector,'',['Chaff launcher']);
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

it('saves and reopens an exact 1,000-point Hunter force with a twelve-model Leader and Support formation, legal specialists and paid walker weapons',()=>{
 const saved=reopen(army()),cost=rosterCost2026(saved);
 expect(cost.total).toBe(1000);
 expect(cost.entries.map(e=>[e.id,e.points])).toEqual([
  [id(dominus),60],[id(marshal),50],[id(rangers),85],[id(dunerider),75],[id(vanguard),85],
  [id(walkers),180],[id('Pteraxii Skystalkers'),75],[id('Kataphron Breachers'),140],[id('Onager Dunecrawler'),150],[id('Hastarii Exterminators'),100],
 ]);
 expect(cost.entries.find(e=>e.unit===walkers)?.wargearPoints).toBe(20);
 expect(mechanicusWeaponCount(instance(saved,walkers),'Twin cognis lascannon')).toBe(2);
 expect(mechanicusWeaponCount(instance(saved,rangers),'Galvanic rifle')).toBe(6);
 expect(mechanicusWeaponCount(instance(saved,'Onager Dunecrawler'),'Cognis heavy stubber')).toBe(2);
 expect(mechanicusModelLoadouts(instance(saved,rangers)).find(m=>m.items.includes('Omnispex'))?.items).toContain('Galvanic rifle');
 expect(mechanicusFormations(saved).find(g=>g.root.unit===rangers)?.members.map(s=>s.unit)).toEqual([rangers,dominus,marshal]);
 expect(mechanicusCargoFormations(saved,instance(saved,dunerider)).find(g=>g.root.unit===rangers)?.spaces).toBe(12);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='Doctrina Imperatives · Select an imperative')?.units).toContain(id(rangers));
 expect(rows.find(r=>r.title==='Lord of the Machine Cult'&&r.window==='Fight')?.units).toContain(id(rangers));
 expect(rows.find(r=>r.title==='Control Edict'&&r.window==='Shooting'&&r.turn==='own')?.units).toContain(id(rangers));
 expect(rows.find(r=>r.title===id(marshal)+' · Clandestine Infiltrator')?.summary).toContain('another attached Leader or Support');
 expect(rows.find(r=>r.title===id(dunerider)+' · Scouts · passengers')?.summary).toContain(id(rangers)+' (6″)');
});

it('saves and reopens an exact 2,000-point Haloscreed army with Thulia, permanent Halo robots, actual servitor guns and distinct transport capacities',()=>{
 const saved=reopen(army(true)),cost=rosterCost2026(saved);
 expect(cost.total).toBe(2000);
 expect(cost.entries.map(e=>[e.id,e.points])).toEqual([
  [id(dominus),60],[id(marshal),35],[id(rangers),85],[id(dunerider),75],[id(vanguard),85],
  [id(walkers),180],[id('Pteraxii Skystalkers'),75],[id('Kataphron Breachers'),140],[id('Onager Dunecrawler'),150],[id('Hastarii Exterminators'),100],
  [id('Thulia Ghuld'),180],[id(datasmith),35],[id(robots),300],[id(transvector),145],[id(manipulus),75],
  [id('Technoarcheologist'),45],[id(battleclade),75],[id('Hastarii Exterminators',2),100],[id('Serberys Raiders'),60],
 ]);
 expect(resolvedMechanicusWarlord(saved)?.unit).toBe('Thulia Ghuld');
 expect(mechanicusFormations(saved).find(g=>g.root.unit===robots)?.members.map(s=>s.unit)).toEqual([robots,datasmith]);
 expect(mechanicusFormations(saved).find(g=>g.root.unit===battleclade)?.members.map(s=>s.unit)).toEqual([battleclade,'Technoarcheologist']);
 const cargo=mechanicusCargoFormations(saved,instance(saved,transvector));
 expect(cargo.find(g=>g.root.unit==='Hastarii Exterminators')?.spaces).toBe(6);
 expect(mechanicusCargoFits(saved,instance(saved,transvector),[id('Hastarii Exterminators'),id('Hastarii Exterminators',2)])).toBe(true);
 expect(cargo.map(g=>g.root.unit)).not.toContain(rangers);expect(cargo.map(g=>g.root.unit)).not.toContain(battleclade);
 expect(mechanicusCargoFormations(saved,instance(saved,dunerider)).find(g=>g.root.unit===battleclade)?.spaces).toBe(10);
 expect(mechanicusWeaponCount(instance(saved,battleclade),'Heavy arc rifle')).toBe(1);expect(mechanicusWeaponCount(instance(saved,battleclade),'Heavy bolter')).toBe(1);
 expect(mechanicusWeaponCount(instance(saved,battleclade),'Incendine igniter')).toBe(3);expect(mechanicusWeaponCount(instance(saved,battleclade),'Meltagun')).toBe(1);
 expect(mechanicusWeaponCount(instance(saved,robots),'Incendine combustor')).toBe(3);expect(mechanicusWeaponCount(instance(saved,robots),'Heavy phosphor blaster')).toBe(1);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='Battle Protocols'&&r.window==='Command')?.units).toContain(id(robots));
 expect(rows.find(r=>r.title==='Noospheric Transference')?.summary).toContain('already have Halo Override');
 expect(rows.find(r=>r.title===id(datasmith)+' · Transoracular Dyad Wafers')?.units).toContain(id(robots));
 expect(rows.find(r=>r.title==='Aerial Deployment')?.summary).toContain('first Movement phase');
 expect(rows.find(r=>r.title==='Rod of the War Forge')?.units).toContain(id('Thulia Ghuld'));
 expect(rows.some(r=>r.title===id(dunerider)+' · Scouts · passengers'&&r.summary.includes(id(rangers)+' (6″)'))).toBe(false);
});
