// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {tauLoadout,tauModelLoadouts,tauWeaponCount} from '../src/tau-loadouts';
import {selectTauWarlord,resolvedTauWarlord} from '../src/tau-muster';
import {tauCargoFormations,tauCargoFits,tauFormations,tauTransportCapacity} from '../src/tau-transports';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';

const fireblade='Cadre Fireblade',breachers='Breacher Team',devilfish='Devilfish',coldstar='Commander In Coldstar Battlesuit';
const starscythes='Crisis Starscythe Battlesuits',pathfinders='Pathfinder Team',stealth='Stealth Battlesuits',riptide='Riptide Battlesuit';
const flesh='Kroot Flesh Shaper',war='Kroot War Shaper',trail='Kroot Trail Shaper',carnivores='Kroot Carnivores',farstalkers='Kroot Farstalkers';
const shieldline='Tidewall Shieldline',broadsides='Broadside Battlesuits',ghostkeel='Ghostkeel Battlesuit';
const id=(unit:string,n=1)=>unit+'#'+n;
const instance=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
function gear(a:ArmySelection,unit:string,owner:string,items:string[],n=1){
 const squad=instance(a,unit,n);
 const field=tauLoadout(unit,squad.models)!.slots.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('Missing equipment choice: '+unit+' / '+owner+' / '+items.join(', '));
 return setKnightGear(a,squad.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}
function army(strike=false){
 let a=individualArmy({...newSelection('T’au Empire'),battleSize2026:strike?'Strike Force':'Incursion',detachments2026:strike?['Kroot Hunting Pack','Advanced Acquisition Cadre']:['Mont’ka']});
 const units=strike?[flesh,war,carnivores,trail,farstalkers,'Kroot Lone-Spear','Krootox Rampagers','Krootox Riders','Kroot Hounds',carnivores,stealth,pathfinders,'Darkstrider',breachers,fireblade,devilfish,shieldline,'Strike Team',broadsides,ghostkeel,coldstar]:[fireblade,breachers,devilfish,coldstar,starscythes,pathfinders,stealth,riptide,'Kroot Hounds','Krootox Riders'];
 for(const unit of units)a=addSelectionUnit(a,unit);
 a=setInstanceModelCount(a,id('Krootox Riders'),3);
 a=join(a,fireblade,breachers);
 a=gear(a,fireblade,'',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 a=gear(a,breachers,'Breacher Fire Warrior Shas’ui ·',['Guardian Drone','Shield Drone']);
 a=gear(a,coldstar,'Drones',['Gun drone','Shield Drone','Twin pulse carbine']);
 a=gear(a,pathfinders,'Pathfinder Shas’ui ·',['Recon drone','Drone burst cannon']);
 a=gear(a,pathfinders,'Pathfinder Shas’ui ·',['Pulse carbine','Semi-automatic grenade launcher']);
 a=gear(a,stealth,'Stealth Shas’vre ·',['Gun drone','Marker drone','Twin pulse carbine']);
 a=gear(a,stealth,'Stealth Shas’ui 1 ·',['Homing beacon']);
 a=gear(a,stealth,'Stealth Shas’vre ·',['Fusion blaster']);a=gear(a,stealth,'Stealth Shas’ui 1 ·',['Fusion blaster']);
 if(!strike){
  a=join(a,coldstar,starscythes);a=selectTauWarlord(a,id(coldstar));
  a=selectUpgrade2026(a,id(fireblade),'Strategic Conqueror');a=selectUpgrade2026(a,id(coldstar),'Exemplar of the Mont’ka');
  for(const owner of ['Crisis Starscythe Shas’ui 1 ·','Crisis Starscythe Shas’ui 2 ·','Crisis Starscythe Shas’vre ·']){
   a=gear(a,starscythes,owner,['T’au flamer','T’au flamer']);
   a=gear(a,starscythes,owner,['Gun drone','Shield Drone','Twin pulse carbine']);
  }
  for(let n=1;n<=2;n++)a=gear(a,pathfinders,'Pathfinder '+n+' ·',['Ion rifle']);
  a=gear(a,pathfinders,'Pathfinder 3 ·',['Rail rifle']);
  a=gear(a,riptide,'',['Ion accelerator']);a=gear(a,riptide,'Drones',['Missile Drone','Missile Drone','Missile pod','Missile pod']);
 }else{
  for(let n=1;n<=2;n++)a=setInstanceModelCount(a,id(carnivores,n),20);
  a=setInstanceModelCount(a,id('Krootox Rampagers'),6);a=setInstanceModelCount(a,id('Kroot Hounds'),10);a=setInstanceModelCount(a,id(broadsides),2);
  a=join(a,flesh,carnivores);a=join(a,war,carnivores);a=join(a,trail,farstalkers);a=join(a,'Darkstrider',pathfinders);a=selectTauWarlord(a,id(war));
  for(const [unit,upgrade] of [[flesh,'Borthrod Gland'],[trail,'Nomadic Hunter'],[stealth,'Negation Emitters']] as const)a=selectUpgrade2026(a,id(unit),upgrade);
  for(let n=1;n<=2;n++)a=gear(a,carnivores,'Kroot Carnivore '+n+' ·',['Close combat weapon','Tanglebomb launcher']);
  a=gear(a,farstalkers,'Kroot Farstalker 1 ·',['Farstalker firearm','Pech’ra']);a=gear(a,farstalkers,'Kroot Farstalker 2 ·',['Dvorgite skinner']);
  a=gear(a,farstalkers,'Kroot Kill-broker ·',['T’au-tech rifle']);
  a=gear(a,shieldline,'',['Tidewall defence platform']);
  a=gear(a,'Strike Team','Fire Warrior Shas’ui ·',['Guardian Drone','Marker drone']);
  a=gear(a,'Strike Team','Fire Warrior 1 ·',['Pulse carbine']);
  for(const owner of ['Broadside Shas’ui 1 ·','Broadside Shas’vre ·'])a=gear(a,broadsides,owner,['High-yield missile pods']);
  a=gear(a,broadsides,'Broadside Shas’ui 1 ·',['Missile Drone','Missile Drone','Missile pod','Missile pod']);
  a=gear(a,broadsides,'Broadside Shas’vre ·',['Shield Drone','Shield Drone']);
  a=gear(a,ghostkeel,'',['Cyclic ion raker']);
  for(let n=1;n<=2;n++)a=gear(a,pathfinders,'Pathfinder '+n+' ·',['Ion rifle']);
 }
 return a;
}
function reopen(a:ArmySelection){
 const opened=openSavedArmies(JSON.parse(JSON.stringify(initialStore(a))));
 expect(opened.retained).toEqual([]);
 const saved=opened.store.profiles[0].army;
 expect(saved.instances).toEqual(a.instances);expect(saved.upgrades2026).toEqual(a.upgrades2026);
 expect(validateSelection(saved)).toBe(true);expect(rosterFindings(saved).filter(f=>f.severity==='error')).toEqual([]);
 return saved;
}

it('saves and reopens an exact 1,000-point Mont’ka army with full drone bearers, paid weapons and distinct guided formations',()=>{
 const saved=reopen(army()),cost=rosterCost2026(saved);
 expect(cost.total).toBe(1000);
 expect(cost.entries.map(e=>[e.id,e.points])).toEqual([[id(fireblade),65],[id(breachers),80],[id(devilfish),75],[id(coldstar),105],[id(starscythes),130],[id(pathfinders),95],[id(stealth),100],[id(riptide),215],[id('Kroot Hounds'),45],[id('Krootox Riders'),90]]);
 expect(resolvedTauWarlord(saved)?.unit).toBe(coldstar);
 expect(tauFormations(saved).find(g=>g.root.unit===starscythes)?.members.map(s=>s.unit)).toEqual([starscythes,coldstar]);
 expect(tauWeaponCount(instance(saved,starscythes),'T’au flamer')).toBe(6);expect(tauWeaponCount(instance(saved,starscythes),'Twin pulse carbine')).toBe(3);
 expect(tauModelLoadouts(instance(saved,starscythes))).toHaveLength(3);expect(tauWeaponCount(instance(saved,pathfinders),'Ion rifle')).toBe(2);
 expect(tauCargoFormations(saved,instance(saved,devilfish)).find(g=>g.root.unit===breachers)?.spaces).toBe(11);
 expect(tauCargoFormations(saved,instance(saved,devilfish)).map(g=>g.root.unit)).not.toContain(starscythes);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='For the Greater Good · Select Observers')?.units).toContain(id(starscythes));
 expect(rows.find(r=>r.title==='For the Greater Good · Guided attacks')?.summary).toContain('Spotted');
 expect(rows.find(r=>r.title==='Coldstar Commander')?.units).toContain(id(starscythes));
 expect(rows.find(r=>r.title==='Volley Fire'&&r.turn==='own')?.summary).toContain('drone');
 expect(rows.find(r=>r.title==='Nova Charge')?.summary).toContain('one ranged weapon');
 expect(rows.some(r=>r.title==='For the Greater Good · Guided attacks'&&r.window!=='Shooting')).toBe(false);
});

it('saves and reopens an exact 2,000-point Kroot and Acquisition force with two distinct Shapers and a single upgraded Shieldline',()=>{
 const saved=reopen(army(true)),cost=rosterCost2026(saved);
 expect(cost.total).toBe(2000);expect(Object.keys(saved.upgrades2026??{})).toHaveLength(3);
 expect(cost.entries.map(e=>e.points)).toEqual([60,60,130,70,75,80,170,90,65,130,115,95,60,80,50,75,105,70,160,165,95]);
 expect(resolvedTauWarlord(saved)?.unit).toBe(war);
 expect(tauFormations(saved).find(g=>g.root.id===id(carnivores))?.members.map(s=>s.unit)).toEqual([carnivores,flesh,war]);
 expect(tauFormations(saved).find(g=>g.root.id===id(carnivores,2))?.members).toHaveLength(1);
 expect(tauWeaponCount(instance(saved,carnivores),'Tanglebomb launcher')).toBe(2);
 expect(tauWeaponCount(instance(saved,broadsides),'High-yield missile pods')).toBe(2);expect(tauWeaponCount(instance(saved,broadsides),'Missile pod')).toBe(2);
 expect(tauModelLoadouts(instance(saved,shieldline))).toHaveLength(1);expect(tauTransportCapacity(instance(saved,shieldline))).toMatchObject({spaces:22});
 expect(tauCargoFits(saved,instance(saved,shieldline),[id(pathfinders),id(breachers)])).toBe(true);
 expect(tauCargoFormations(saved,instance(saved,shieldline)).map(g=>g.root.unit)).not.toContain(carnivores);
 const rows=generate11thReminders(saved);
 expect(rows.find(r=>r.title==='Rites of Feasting')?.units).toContain(id(carnivores));
 expect(rows.find(r=>r.title==='War Leader')?.units).toContain(id(carnivores));
 expect(rows.find(r=>r.title==='Kroot Ambush')?.summary).toContain('entire formation');
 expect(rows.find(r=>r.title==='Tidewall Defence Platform')?.summary).toContain('Wounds 15');
 expect(rows.some(r=>r.title===id(stealth)+' · Negation Emitters')).toBe(true);
});
