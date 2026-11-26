// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,addSelectionUnit,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {setKnightGear} from '../src/knight-loadouts';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {rosterFindings} from '../src/roster-findings';
import {thousandSonsIntrinsicReminders as reminders} from '../src/thousand-sons-intrinsic';
import {thousandSonsLoadout} from '../src/thousand-sons-loadouts';
import {selectThousandSonsWarlord} from '../src/thousand-sons-muster';
import {selectUpgrade2026} from '../src/upgrades-2026';

const id=(s:string)=>s+'#1';
function army(names:string[],det='Grand Coven',size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:[det],battleSize2026:size});
 for(const n of names)a=addSelectionUnit(a,n);
 return a;
}
const join=(a:ArmySelection,leader:string,troops:string)=>setInstanceAttachment(a,id(leader),id(troops));
const get=(a:ArmySelection,title:string)=>reminders(a).filter(r=>r.title===title);
function gear(a:ArmySelection,unit:string,items:string[],role=''){
 const s=a.instances!.find(s=>s.unit===unit)!;
 const choices=thousandSonsLoadout(unit,s.models)!.slots;
 const matches=(xs:readonly string[])=>[...xs].sort().join('|')===[...items].sort().join('|');
 const slot=choices.find(f=>f.name.startsWith(role)&&f.choices.some(c=>matches(c.items)))!;
 return setKnightGear(a,s.id,slot.name,slot.choices.find(c=>matches(c.items))!.name);
}
it('resolves a legal 1000-point Warpmeld roster, two distinct Predators, a Bray Lord in the Land Raider and actual disembarking psykers',()=>{
 let a=army(['Sorcerer In Terminator Armour','Tzaangors','Chaos Land Raider','Chaos Rhino','Rubric Marines','Infernal Master','Chaos Predator Annihilator','Chaos Predator Destructor'],'Warpmeld Pact','Incursion');
 a=selectUpgrade2026(a,id('Sorcerer In Terminator Armour'),'Bray Lord');
 a=join(a,'Sorcerer In Terminator Armour','Tzaangors');a=join(a,'Infernal Master','Rubric Marines');
 a=selectThousandSonsWarlord(a,id('Infernal Master'));
 expect(rosterCost2026(a).total).toBe(1000);expect(rosterFindings(a).filter(f=>f.severity==='error')).toEqual([]);
 expect(get(a,'Sorcerous Support')[0].summary).toMatch(/Aspiring Sorcerer – Malefic Curse/);
 expect(get(a,'Sorcerous Support')[0].units).toEqual([id('Chaos Rhino'),id('Rubric Marines')]);
 expect(get(a,'Sorcerous Support')[0].summary).not.toContain('Terminator');
 expect(get(a,'Assault Ramp')[0].units).toContain(id('Tzaangors'));
 expect(get(a,'Empyric Guidance')[0].units).toContain(id('Tzaangors'));
 expect(get(a,'Marked by Fate')[0]).toMatchObject({window:'Shooting',timing:'start',turn:'own'});
 expect(get(a,'Ambushing Hunters')[0]).toMatchObject({window:'End of opponent turn',summary:expect.stringContaining('first turn')});
 expect(get(a,'Ensorcelled Annihilation')[0].summary).toMatch(/Monster or Vehicle, re-roll Hit and Damage/);
 expect(get(a,'Ensorcelled Destruction')[0].summary).toMatch(/neither a Monster nor a Vehicle, improve Strength and AP/);
 expect(get(a,'Ensorcelled Destruction')[0].units).toEqual([id('Chaos Predator Destructor'),id('Tzaangors'),id('Rubric Marines')]);
 expect(get(a,'Malefic Maelstrom').map(r=>r.window)).toEqual(['Shooting','Fight']);
 expect(get(a,'Glimpse of Eternity').every(r=>r.units?.length===1&&r.summary.includes('Infernal Master'))).toBe(true);
});
it('keeps allied psychic shooters, Horror splits, auras and redeployment distinct in a legal 2000-point Changehost',()=>{
 let a=army(['Magnus The Red','Kairos Fateweaver','Lord of Change','Pink Horrors','Blue Horrors','Flamers','Screamers','Rubric Marines','Ahriman','Chaos Rhino','Heldrake'],'Changehost of Deceit');
 a=setInstanceModelCount(a,id('Rubric Marines'),10);a=join(a,'Ahriman','Rubric Marines');
 expect(rosterCost2026(a).total).toBe(2000);expect(rosterFindings(a).filter(f=>f.severity==='error')).toEqual([]);
 expect(get(a,'Unearthly Power')[0].window).toBe('Start of battle round');
 expect(get(a,'Treason of Tzeentch')[0]).toMatchObject({window:'Shooting',turn:'opponent',timing:'start'});
 expect(get(a,'One Head Looks Forward')[0]).toMatchObject({window:'Command',turn:'own',timing:'end'});
 expect(get(a,'Daemon Lord of Tzeentch')[0].units).toEqual([id('Lord of Change'),id('Kairos Fateweaver'),id('Pink Horrors'),id('Blue Horrors'),id('Flamers')]);
 expect(get(a,'Time Flux')[0].units).not.toContain(id('Lord of Change'));
 expect(get(a,'Scryer of Fates')[0].units).toContain(id('Rubric Marines'));
 expect(get(a,'Scryer of Fates')[0].units).not.toContain(id('Screamers'));
 expect(get(a,'Split').some(r=>r.units?.includes(id('Pink Horrors'))&&r.summary.includes('two Blue Horrors'))).toBe(true);
 expect(get(a,'Split models · weapons')).toEqual([]);
 expect(get(a,'Exploding Horrors').find(r=>r.units?.includes(id('Pink Horrors')))?.summary).toContain('after the last Pink');
 expect(get(a,'Slashing Dive')[0]).toMatchObject({window:'Movement',turn:'own'});
 expect(get(a,'Bounding Leaps')[0].summary).toContain('Fell Back');
 expect(get(a,'Flame-wreathed')[0].summary).toContain('Normal move');
 const all=reminders(a);expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 expect(get({...a,detachments2026:['Grand Coven']},'Split')).toEqual([]);
});
it('uses actual weapon and model slots for the Icon, battle-only Sorcerer effect and Helbrute extra attacks',()=>{
 let a=army(['Sorcerer','Rubric Marines','Helbrute']);
 expect(get(a,'Empyric Guidance')).toEqual([]);expect(get(a,'Icon of Flame')).toEqual([]);
 a=join(a,'Sorcerer','Rubric Marines');
 a=gear(a,'Rubric Marines',['Icon of flame'],'Rubric Marine 1 ·');
 a=gear(a,'Rubric Marines',['Warpflamer'],'Rubric Marine 1 ·');
 const icon=get(a,'Icon of Flame')[0];
 expect(icon.summary).toContain('Aspiring Sorcerer – Malefic Curse');
 expect(icon.summary).not.toContain('Pandaemonic Delusion');expect(icon.summary).not.toContain('Warpflamer');
 expect(icon.units).toEqual([id('Rubric Marines')]);
 expect(get(a,'Twisted Sorceries').find(r=>r.window==='Shooting')!.summary).toContain('Pandaemonic Delusion');
 a=gear(a,'Sorcerer',['Prosperine khopesh']);
 const boosted=get(a,'Twisted Sorceries').find(r=>r.window==='Fight')!;
 expect(boosted.summary).toContain('Force weapon');expect(boosted.summary).not.toContain('khopesh');
 expect(get(a,'Devoted to Destruction')).toEqual([]);
 a=gear(a,'Helbrute',['Helbrute fist','Helbrute hammer']);
 expect(get(a,'Devoted to Destruction')[0].summary).toContain('Helbrute fist and Helbrute hammer');
 expect(get(a,'Terrifying Assault').map(r=>r.window)).toEqual(['Fight']);
});
it('evaluates psyker, Infantry and faction independently across legal allies and mixed roles',()=>{
 let a=army(['Kairos Fateweaver','Pink Horrors','Chaos Predator Destructor','Maulerfiend','Daemon Prince of Tzeentch'],'Changehost of Deceit');
 expect(get(a,'Ensorcelled Destruction')[0].units).toEqual([id('Chaos Predator Destructor'),id('Daemon Prince of Tzeentch')]);
 expect(get(a,'Snarling Protector · charge')[0].units).toContain(id('Kairos Fateweaver'));
 expect(get(a,'Snarling Protector · charge')[0].units).not.toContain(id('Pink Horrors'));
 expect(get(a,'Servile Pawns')).toEqual([]);
 a=addSelectionUnit(a,'Scarab Occult Terminators');a=addSelectionUnit(a,'Sorcerer In Terminator Armour');a=join(a,'Sorcerer In Terminator Armour','Scarab Occult Terminators');
 expect(get(a,'Glamour of Tzeentch')[0].units).toEqual([id('Daemon Prince of Tzeentch'),id('Scarab Occult Terminators')]);
 expect(get(a,'Rites of Coalescence')[0].summary).toMatch(/Scarab Occult Sorcerer.*Sorcerer in Terminator Armour/i);
 expect(get(army(['Lord of Change','Blue Horrors','Chaos Predator Annihilator'],'Changehost of Deceit'),'Ensorcelled Annihilation')).toEqual([]);
});
it('uses actual command, movement, charge and defensive windows including cases that only apply to a legal attachment',()=>{
 let a=army(['Exalted Sorcerer','Rubric Marines','Tzaangor Shaman','Tzaangor Enlightened','Exalted Sorcerer on Disc of Tzeentch','Tzaangor Enlightened with Fatecaster Greatbows','Chaos Spawn','Chaos Vindicator','Defiler','Forgefiend','Mutalith Vortex Beast','Daemon Prince of Tzeentch with Wings','Sekhetar Robots']);
 expect(get(a,'Rebind Rubricae')).toEqual([]);expect(get(a,'Sacrificial Blessing')).toEqual([]);
 a=join(a,'Exalted Sorcerer','Rubric Marines');a=join(a,'Tzaangor Shaman','Tzaangor Enlightened');a=join(a,'Exalted Sorcerer on Disc of Tzeentch','Tzaangor Enlightened with Fatecaster Greatbows');
 expect(get(a,'Rebind Rubricae')[0]).toMatchObject({window:'Command',turn:'own',summary:expect.stringContaining('On 6')});
 expect(get(a,'Arcane Shield')[0].units).toContain(id('Rubric Marines'));
 expect(get(a,'Sacrificial Blessing').find(r=>r.window==='Fight')!.summary).toMatch(/Bodyguard model.*Force stave/i);
 expect(get(a,'Bestial Prophet').some(r=>r.window==='Movement')).toBe(false);
 expect(get(a,'Prophesied Doom')[0].summary).toContain('per model in this formation within Engagement Range');
 expect(get(a,'Illusions of Tzeentch')[0].units).toContain(id('Tzaangor Enlightened with Fatecaster Greatbows'));
 expect(get(a,'Malign Trickery')[0]).toMatchObject({turn:'opponent',summary:expect.stringContaining('ends any move within 8″')});
 expect(get(a,'Binding Tendrils')[0].summary).toMatch(/Infantry.*Arcane Fire/);
 expect(get(a,'Regenerating Monstrosities')[0]).toMatchObject({turn:'either',timing:'start'});
 expect(get(a,'Siege Shield')[0].summary).toContain('no other friendly unit');
 expect(get(a,'Blazing Salvoes')[0].summary).toContain('until your next turn starts');
 expect(get(a,'Destroyer of Futures').map(r=>r.turn)).toEqual(['opponent']);
 expect(get(a,'Mutating Vortex')[0]).toMatchObject({turn:'own',timing:'end',summary:expect.stringContaining('including on a roll of 1')});
 expect(get(a,'Aetherstride')[0]).toMatchObject({turn:'own',window:'Movement',summary:expect.stringContaining('Dark Blessing')});
 expect(get(a,'Hunter of Souls').find(r=>r.window==='Movement')!.summary).not.toContain('Hit rolls');
 expect(get(a,'Prophetic Sentinels').map(r=>[r.window,r.turn,r.timing])).toEqual([['Movement','opponent','end'],['Charge','opponent','end']]);
});
