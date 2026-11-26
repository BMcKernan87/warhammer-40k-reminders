import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {chaosKnightDetachmentReminders as generate,eligibleChaosKnightUpgrades,resolvedWarDogCharacterIds} from '../src/chaos-knight-detachments';
import {detachmentBudget} from '../src/edition-2026';

function army(detachment:string,...units:string[]){
 const counts:Record<string,number>={};
 const instances=units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}));
 return {...newSelection('Chaos Knights'),units:counts,detachments2026:[detachment],instances};
}
describe('Chaos Knights faction and detachment reminders',()=>{
 it('resolves round one and later Dread choices before either turn and applies the bearer-only re-roll in its actual rounds',()=>{
  const a=army('Traitoris Lance','Knight Desecrator','War Dog Brigand');
  const rows=generate({...a,upgrades2026:{'Knight Desecrator#1':'Malevolent Heraldry'}});
  const choices=rows.filter(r=>r.title.includes('Harbingers of Dread · round')||r.title==='Paragons of Terror'||r.title.includes('Malevolent Heraldry'));
  expect(choices).toHaveLength(5);
  expect(choices.every(r=>r.window==='Start of battle round'&&r.timing==='start'&&r.previousSheetEntry)).toBe(true);
  expect(new Set(choices.map(r=>r.id)).size).toBe(5);
  expect(choices.filter(r=>r.title.includes('Malevolent Heraldry')).every(r=>r.units?.join()==='Knight Desecrator#1')).toBe(true);
  expect(choices.find(r=>r.title==='Paragons of Terror')?.summary).toMatch(/round one.*after choosing or rolling/);
  expect(generate(army('Infernal Lance','Knight Desecrator')).some(r=>r.title==='Paragons of Terror')).toBe(false);
 });
 it.each([
  ['Traitoris Lance','Knight Desecrator','000008517002','Fight','Once per battle round'],
  ['Bastions of Tyranny','Knight Tyrant','000011013003','Movement','Fall Back'],
  ['Lords of Dread','Knight Rampager','000010309005','Fight','Titanic'],
  ['Infernal Lance','War Dog Karnivore','000010305002','Charge','once per battle round'],
  ['Helhunt Lance','War Dog Brigand','000010752007','Shooting','surge'],
  ['Houndpack Lance','War Dog Stalker','000010313007','Fight','Strategic Reserves'],
  ['Hunting Warpack','War Dog Huntsman','000011017003','Shooting','starting an action'],
  ['Iconoclast Fiefdom','Cultist Mob','000009766004','Shooting','detection range'],
 ])('%s emits the timed rule for the actual recipient',(detachment,unit,id,phase,effect)=>{
  const row=generate(army(detachment,unit,'Vindicare Assassin')).find(r=>r.id==='11e-chaos-knight-'+id+'-'+phase);
  expect(row?.units).toEqual([unit+'#1']);expect(row?.summary).toContain(effect);
 });
 it('enforces three specific Character nominations on duplicate War Dog squads',()=>{
  const base=army('Houndpack Lance','War Dog Stalker','War Dog Stalker','War Dog Brigand','War Dog Huntsman');
  expect(resolvedWarDogCharacterIds(base)).toEqual([]);
  const ids=['War Dog Stalker#2','War Dog Brigand#1','War Dog Huntsman#1'];
  const selected={...base,chaosWarDogCharacterIds:ids};
  expect(resolvedWarDogCharacterIds(selected)).toEqual(ids);
  expect(eligibleChaosKnightUpgrades(selected,'War Dog Stalker','War Dog Stalker#1')).toEqual([]);
  expect(eligibleChaosKnightUpgrades(selected,'War Dog Stalker','War Dog Stalker#2').map(r=>r.name)).toContain('Final Howl (Aura)');
  const vox=generate(selected).filter(r=>r.title.includes('Vox-Howl'));
  expect(vox.map(r=>[r.window,r.turn,r.timing])).toEqual([['Shooting','either','start'],['Fight','either','start']]);
  expect(vox[0].units).toEqual(ids);
  expect(resolvedWarDogCharacterIds({...base,chaosWarDogCharacterIds:[...ids,'War Dog Stalker#1']})).toEqual([]);
 });
 it('auto-resolves the only possible three nominations and honors their combined-detachment eligibility',()=>{
  const a=army('Houndpack Lance','War Dog Brigand','War Dog Karnivore','War Dog Stalker');
  const b={...a,detachments2026:['Houndpack Lance','Iconoclast Fiefdom']};
  expect(resolvedWarDogCharacterIds(b)).toHaveLength(3);
  expect(eligibleChaosKnightUpgrades(b,'War Dog Brigand','War Dog Brigand#1').map(r=>r.name)).toContain('Iconoclast Idol (Aura)');
  const separate=army('Hunting Warpack','War Dog Huntsman');
  expect(eligibleChaosKnightUpgrades(separate,'War Dog Huntsman','War Dog Huntsman#1')[0]).toMatchObject({name:'Soul-Spoor Auspicator',repeatable:true,points:15});
  expect(eligibleChaosKnightUpgrades(separate,'War Dog Brigand','War Dog Brigand#1')).toEqual([]);
 });
 it('rejects allied Dread abilities, omits impossible Dark Sacrifice, and names qualifying allies',()=>{
  const a=army('Iconoclast Fiefdom','Knight Desecrator','Cultist Mob','Accursed Cultists');
  const cue=generate(a).find(r=>r.title.includes('Dark Sacrifice'));
  expect(cue?.units).toEqual(['Cultist Mob#1']);
  expect(generate(a).filter(r=>r.origin==='army').every(r=>r.units?.length===1&&r.units[0]==='Knight Desecrator#1')).toBe(true);
  expect(generate(army('Iconoclast Fiefdom','Accursed Cultists','Knight Tyrant')).some(r=>r.title.includes('Dark Sacrifice'))).toBe(false);
 });
 it('requires two War Dogs and a qualifying Titanic aura for Masters; excludes Acastus',()=>{
  const a=army('Helhunt Lance','Knight Desecrator','Chaos Acastus Knight Asterius','War Dog Brigand','War Dog Huntsman');
  const masters=generate(a).filter(r=>r.title==='Masters of the Pack');
  expect(masters.length).toBeGreaterThan(0);expect(masters.every(r=>r.units?.join()==='Knight Desecrator#1')).toBe(true);
  expect(generate(army('Helhunt Lance','Knight Desecrator','War Dog Brigand')).some(r=>r.title==='Masters of the Pack')).toBe(false);
 });
 it('prices and applies Panoply to the chosen War Dog instead of increasing its saving characteristic',()=>{
  const a=army('Houndpack Lance','War Dog Brigand','War Dog Karnivore','War Dog Stalker');
  const b={...a,upgrades2026:{'War Dog Stalker#1':'Panoply of the Cursed Knight'}};
  expect(generate(b).filter(r=>r.title.includes('Panoply')).map(r=>[r.units,r.window])).toEqual([[['War Dog Stalker#1'],'Shooting'],[['War Dog Stalker#1'],'Fight']]);
  expect(generate(b).find(r=>r.title.includes('Panoply'))?.summary).toContain('AP');
 });
 it('uses detachment dispositions from the current point manual',()=>{
  expect(detachmentBudget('Chaos Knights',['Infernal Lance'],'Strike Force').dispositions).toEqual(['Priority Assets','Purge the Foe']);
  expect(detachmentBudget('Chaos Knights',['Lords of Dread','Bastions of Tyranny'],'Strike Force').dispositions).toEqual(['Take and Hold','Priority Assets']);
 });
});
