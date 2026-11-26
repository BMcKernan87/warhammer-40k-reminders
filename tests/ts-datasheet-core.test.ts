// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TS_CARDS} from '../src/ts-profiles.generated';
import {tsProfileReminders,thousandSonsPsychicWeapons} from '../src/ts-datasheet-core';
import {thousandSonsLoadout,thousandSonsModelLoadouts} from '../src/thousand-sons-loadouts';
import {THOUSAND_SONS_SHEETS} from '../src/thousand-sons-data.generated';
const s=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(roster:RosterInstance[],detachment='Changehost of Deceit'):ArmySelection=>({...newSelection('Thousand Sons'),units:Object.fromEntries(roster.map(v=>[v.unit,1])),instances:roster,detachments2026:[detachment]});
const rows=(...roster:RosterInstance[])=>tsProfileReminders(army(roster),roster);
const stockKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
it.each(THOUSAND_SONS_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s prints the phase and count of its actual purchased and issued equipment',(unit,sheet)=>{
 for(const size of sheet.sizes){
  const base=s(unit,size),kit=thousandSonsLoadout(unit,size)!;
  for(const choice of [base,...kit.slots.flatMap(slot=>slot.choices.slice(1).map(gear=>({...base,knightGear:{[slot.name]:gear.name}})))]){
   const guns=thousandSonsModelLoadouts(choice).flatMap(m=>m.items.map(stockKey)),print=rows(choice).filter(r=>r.title.includes('weapon profiles')&&r.window!=='Movement');
   for(const p of TS_CARDS[unit].weapons.filter(w=>w.abilities.length||w.mode)){
    const n=guns.filter(g=>g===stockKey(p.name)).length,text=print.find(r=>r.window===p.phase)?.summary??'',marker=' × '+p.name+(p.mode?' (':' —');
    if(n)expect(text).toContain(n+marker);else expect(text).not.toContain(marker);
   }
  }
 }
});
it('distinguishes Psychic weapon bearers from Psychic weapons carried by non-Psykers and active summoned factions',()=>{
 const rubric=s('Rubric Marines',10),scarabs=s('Scarab Occult Terminators',5),horrors=s('Pink Horrors',10),kairos=s('Kairos Fateweaver'),a=army([rubric,scarabs,horrors,kairos]);
 const guns=thousandSonsPsychicWeapons(a,rubric);
 expect(guns.filter(w=>w.phase==='Shooting')).toEqual([expect.objectContaining({model:'Aspiring Sorcerer',name:'Malefic Curse',count:1})]);
 expect(guns.every(w=>w.model==='Aspiring Sorcerer'&&w.abilities.includes('psychic'))).toBe(true);
 expect(thousandSonsPsychicWeapons(a,scarabs).every(w=>w.model==='Scarab Occult Sorcerer')).toBe(true);
 expect(thousandSonsPsychicWeapons(a,horrors)).toEqual([]);
 expect(thousandSonsPsychicWeapons(a,kairos).filter(w=>w.name.includes('Infernal Gateway'))).toHaveLength(2);
 expect(thousandSonsPsychicWeapons({...a,detachments2026:['Grand Coven']},kairos)).toEqual([]);
 expect(thousandSonsPsychicWeapons({...a,faction:'Chaos Daemons'},horrors)).toEqual([]);
});
it('allows actual Scouting with a Bray Lord only while the entire infantry formation qualifies; a bare Shaman does not grant Scouts',()=>{
 const goats=s('Tzaangors',10),rhino=s('Chaos Rhino'),lord={...s('Sorcerer'),attachedTo:goats.id},group=[goats,lord,rhino];
 const a={...army(group,'Warpmeld Pact'),upgrades2026:{[lord.id]:'Bray Lord'}};
 const yes=tsProfileReminders(a,group);
 expect(yes.find(r=>r.title.endsWith('Scouts 6″'))?.units).toEqual([goats.id,lord.id]);
 expect(yes.find(r=>r.title.endsWith('Dedicated Transport'))?.units).toEqual([rhino.id,goats.id,lord.id]);
 const shaman={...s('Tzaangor Shaman'),attachedTo:goats.id},without=[shaman,goats,rhino];
 expect(tsProfileReminders(army(without,'Warpmeld Pact'),without).some(r=>r.title.includes('Scouts'))).toBe(false);
 const marines=s('Rubric Marines',5),mixed=[marines,{...lord,attachedTo:marines.id}];
 expect(tsProfileReminders({...a,instances:mixed},mixed).some(r=>r.title.includes('Scouts'))).toBe(false);
});
it('keeps battlefield Split replacements separate from stock, with the correct inherited gun, skill, attack count and turn',()=>{
 const pink=s('Pink Horrors',10),blue=s('Blue Horrors',10),printed=rows(pink,blue);
 const shot=printed.find(r=>r.title===pink.id+' · Ranged weapon profiles'&&r.window==='Shooting')!;
 expect(shot.summary).toMatch(/10 × Coruscating pink flames/);expect(shot.summary).not.toMatch(/blue flames|yellow flames/);
 const replacement=printed.filter(r=>r.title===pink.id+' · Split models · weapons');
 expect(replacement).toHaveLength(3);
 expect(replacement.find(r=>r.window==='Shooting')?.summary).toMatch(/Blue Horror.*Coruscating blue flames.*BS 4\+.*Brimstone Horror.*Coruscating yellow flames.*BS 5\+/);
 expect(replacement.find(r=>r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end',summary:expect.stringContaining('unmodified 6')});
 expect(replacement.find(r=>r.window==='Fight')?.summary).toMatch(/Blue claws.*1 attack,.*Yellow claws.*2 attacks/);
 const fromBlue=printed.filter(r=>r.title===blue.id+' · Split models · weapons');expect(fromBlue.every(r=>r.summary.includes('Brimstone Horror')&&!r.summary.includes('Blue claws')&&!r.summary.includes('Coruscating blue flames'))).toBe(true);
 expect(tsProfileReminders(army([pink],'Grand Coven'),[pink])).toEqual([]);
});
it('emits the Thousand Sons’ native core rules and distinguishes the improved Kairos weapon from its reaction profile',()=>{
 const drake=s('Heldrake'),robot=s('Sekhetar Robots'),kairos=s('Kairos Fateweaver'),all=rows(drake,robot,kairos);
 expect(all.find(r=>r.title.endsWith('Hover'))).toMatchObject({units:[drake.id],turn:'own',window:'Movement'});
 expect(all.find(r=>r.title.endsWith('Stealth'))).toMatchObject({units:[robot.id],window:'Shooting',turn:'opponent'});
 expect(all.find(r=>r.title.endsWith('Infiltrators'))?.units).toEqual([robot.id]);
 const ka=all.filter(r=>r.title===kairos.id+' · Ranged weapon profiles');
 expect(ka.find(r=>r.window==='Shooting')?.summary).toMatch(/Infernal Gateway.*Indirect Fire.*Focused Witchfire.*Hazardous/);
 expect(ka.find(r=>r.window==='Movement')?.summary).not.toContain('Indirect Fire');
 expect(all.find(r=>r.title===kairos.id+' · Damaged')?.summary).toContain('1–7');
});
it('limits a Rhino’s deck to actual bearer guns, not a Terminator group or every psychic weapon in the army',()=>{
 const rubric=s('Rubric Marines',5),term=s('Scarab Occult Terminators',5),rhino=s('Chaos Rhino'),all=rows(rubric,term,rhino);
 const deck=all.find(r=>r.title.endsWith('Firing Deck 2'))!;
 expect(deck).toMatchObject({units:[rhino.id,rubric.id],turn:'own',window:'Shooting'});
 expect(deck.summary).toMatch(/1 × Aspiring Sorcerer.*Malefic Curse/);expect(deck.summary).toMatch(/4 × Rubric Marine/);expect(deck.summary).not.toContain('Scarab Occult');
});
