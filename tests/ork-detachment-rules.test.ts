import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {orkDetachmentReminders as sheet,eligibleOrkUpgrades,orkHasRangedAttack} from '../src/ork-detachments';

function army(detachments:string[],...units:string[]){
 const counts:Record<string,number>={};
 return {...newSelection('Orks'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
describe('October Orks native army and detachment behavior',()=>{
 it.each([
  ['Blitz Brigade','Battlewagon','Impending Krunch','Charge','own','−1'],
  ['Brute Bosses','Warboss','’Ard as Nails','Fight','either','3+'],
  ['Bully Boyz','Meganobz','Hulking Brutes','Shooting','opponent','extra 1CP'],
  ['Da Big Hunt','Beast Snagga Boyz','Instinctive Hunters','Fight','opponent','6″'],
  ['Dread Mob','Deff Dread','Crazed Rampage','Fight','either','4+'],
  ['Flyboyz','Dakkajet',"Flyin' Headbutt",'Command','either','eight D6'],
  ['Green Tide','Boyz','Unbridled Carnage','Fight','either','1 Attack'],
  ['Kult of Speed','Warbikers','Speediest Freeks','Shooting','opponent','1–3'],
  ['Madcap Meks','Mek Gunz','Vindictive Artillerists','Shooting','own','Hazardous'],
  ['Runt Swarm','Gretchin','Scarper!','Movement','opponent','Normal move'],
  ['Shoota Boyz','Boyz',"Glowin' Dakka",'Shooting','own','9″'],
  ['Taktikal Brigade','Kommandos','While Their Backs Are Turned','Movement','opponent','6″'],
  ['War Horde','Boyz',"Hit 'em Harder",'Fight','either','Lethal Hits'],
  ['Wreckas','Flash Gitz','Gun-Crazy Show-Offs','Shooting','opponent','normal shooting'],
  ['Wurrband','Weirdboy','Roar of Mork','Movement','own','Battle-shock'],
 ])('%s generates the conditional timed reminder for a real qualifying unit',(det,unit,title,phase,turn,text)=>{
  const row=sheet(army([det],unit,'Vindicare Assassin')).find(r=>r.title.startsWith(title)&&r.window===phase);
  expect(row).toMatchObject({turn,units:[unit+'#1']});expect(row?.summary).toContain(text);
 });
 it('uses either Command start for War Cry and separates charging/Assault from invulnerable saves',()=>{
  const rows=sheet(army(['Flyboyz'],'Boyz','Dakkajet','Callidus Assassin'));
  expect(rows.find(r=>r.id==='11e-orks-war-cry')).toMatchObject({window:'Command',timing:'start',turn:'either',units:['Boyz#1','Dakkajet#1']});
  expect(rows.find(r=>r.id==='11e-orks-riled-charge')?.units).toEqual(['Boyz#1']);
  expect(rows.find(r=>r.id==='11e-orks-riled-assault')?.units).toContain('Dakkajet#1');
 });
 it('offers Dubious Restraint at both boundaries of the friendly Movement phase',()=>{
  const rows=sheet(army(['Taktikal Brigade'],'Stormboyz','Nobz')).filter(r=>r.title.startsWith('Dubious Restraint'));
  expect(rows.map(r=>[r.window,r.turn,r.timing,r.units])).toEqual(['start','end'].map(t=>['Movement','own',t,['Stormboyz#1']]));
  expect(new Set(rows.map(r=>r.id)).size).toBe(2);
 });
 it('requires thirteen models for Mob Mentality and limits Grot Shields to rosters with another Infantry unit',()=>{
  const small=army(['Green Tide'],'Boyz');
  expect(sheet({...small,instances:small.instances.map(s=>({...s,models:10}))}).some(r=>r.title.startsWith('Mob Mentality'))).toBe(false);
  expect(sheet({...small,instances:small.instances.map(s=>({...s,models:20}))}).find(r=>r.title.startsWith('Mob Mentality'))).toMatchObject({timing:'during',window:'Command'});
  expect(sheet(army(['Runt Swarm'],'Gretchin','Gretchin')).some(r=>r.title.startsWith('Grot Shields'))).toBe(false);
  expect(sheet(army(['Runt Swarm'],'Gretchin','Boyz')).find(r=>r.title.startsWith('Grot Shields'))?.units).toEqual(['Gretchin#1']);
 });
 it('requires qualifying embarkable cargo for firing-deck and Wagon disembark abilities',()=>{
  const none=army(['Blitz Brigade','Wreckas'],'Battlewagon','Stompa');
  expect(sheet(none).some(r=>r.title.startsWith('Readied Brawlers')||r.title.startsWith('Drive-By'))).toBe(false);
  const cargo=army(['Blitz Brigade','Wreckas'],'Battlewagon','Flash Gitz');
  expect(sheet(cargo).find(r=>r.title.startsWith('Readied Brawlers'))?.units).toEqual(['Battlewagon#1']);
  expect(sheet(cargo).find(r=>r.title.startsWith('Drive-By'))?.units).toEqual(['Battlewagon#1']);
 });
 it('applies the selected Psyker and Warlord, independent of other copies',()=>{
  const a=army(['Wurrband'],'Weirdboy','Weirdboy','Warboss','Beastboss');
  const rows=sheet({...a,warlordId:'Warboss#1',upgrades2026:{'Weirdboy#2':'Warphead'}});
  expect(rows.find(r=>r.title==='Da Boss')).toMatchObject({window:'Start of battle round',units:['Warboss#1']});
  expect(rows.find(r=>r.title==='Unstable Energies · Weirdboy#1')?.summary).toContain('level 1');
  expect(rows.find(r=>r.title==='Unstable Energies · Weirdboy#2')?.summary).toContain('level 2');
  expect(rows.filter(r=>r.title.startsWith('Visions of Violence')&&r.window==='Fight')).toHaveLength(2);
 });
 it('resolves the two distinct Warpath disciplines and suppresses Beastscent without fitting Beast Snagga cargo',()=>{
  const a=army(['Wurrband'],'Weirdboy','Kill Rig','Boyz','Beast Snagga Boyz');
  const rows=sheet(a);
  expect(rows.find(r=>r.title==='Warpath · Weirdboy#1')?.summary).toContain('re-roll Wound rolls of 1');
  expect(rows.find(r=>r.title==='Warpath · Kill Rig#1')?.summary).toContain('Lethal Hits');
  expect(rows.find(r=>r.title==='Da Jump · Weirdboy#1')).toMatchObject({window:'Movement',turn:'own',units:['Weirdboy#1']});
  expect(rows.find(r=>r.title==='Beastscent · Kill Rig#1')?.units).toEqual(['Beast Snagga Boyz#1']);
  expect(sheet(army(['Wurrband'],'Kill Rig','Boyz')).some(r=>r.title.startsWith('Beastscent'))).toBe(false);
 });
 it('prices the actual eligible upgrades and retains model-only restrictions',()=>{
  const a=army(['Flyboyz','Wreckas','Bully Boyz'],'Dakkajet','Big Mek','Warboss');
  expect(eligibleOrkUpgrades(a,'Dakkajet')).toContainEqual(expect.objectContaining({name:'Flyboss',points:20,repeatable:true}));
  expect(eligibleOrkUpgrades(a,'Warboss')).toContainEqual(expect.objectContaining({name:"Kaptin's Hat",points:25,repeatable:false}));
  expect(eligibleOrkUpgrades(a,'Dakkajet').some(u=>u.name==="Kaptin's Hat")).toBe(false);
 });
 it('selects the Supreme Commander as Da Boss in a roster with multiple Characters',()=>{
  const a=army(['War Horde'],'Ghazghkull Thraka','Warboss','Beastboss');
  expect(sheet({...a,warlordId:'Warboss#1'}).find(r=>r.title==='Da Boss')?.units).toEqual(['Ghazghkull Thraka#1']);
 });
 it('uses the actual weapon loadout and requires a qualifying selected bearer for a psychic gun',()=>{
  const a=army(['Wurrband'],'Weirdboy','Big Mek In Mega Armour');
  const weirdboy=a.instances[0],mek={...a.instances[1],knightGear:{Firearm:'Killsaw'}};
  expect(orkHasRangedAttack(a,mek)).toBe(false);
  const forged={...a,upgrades2026:{[mek.id]:'Da Krunch'}};
  expect(orkHasRangedAttack(forged,mek)).toBe(false);
  expect(sheet(forged).some(r=>r.title.includes('Da Krunch'))).toBe(false);
  const legal={...a,upgrades2026:{[weirdboy.id]:'Da Krunch'}};
  expect(orkHasRangedAttack(legal,weirdboy)).toBe(true);
  expect(sheet(legal).find(r=>r.title.includes('Da Krunch'))?.units).toEqual([weirdboy.id]);
  expect(sheet({...legal,detachments2026:['War Horde']}).some(r=>r.title.includes('Da Krunch'))).toBe(false);
 });
 it('uses verified DP and both War Horde dispositions',()=>{
  expect(detachmentBudget('Orks',['Blitz Brigade','Wurrband'],'Incursion')).toMatchObject({valid:true,spent:2,dispositions:['Take and Hold','Disruption']});
  expect(detachmentBudget('Orks',['War Horde'],'Strike Force')).toMatchObject({valid:true,spent:3,dispositions:['Take and Hold','Purge the Foe']});
 });
});
