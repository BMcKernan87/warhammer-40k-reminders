// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {sororitasLoadout} from '../src/sororitas-loadouts';
import {setKnightGear} from '../src/knight-loadouts';
import {sororitasFaithFormations,sororitasFaithReminders} from '../src/sororitas-faith';
import {SORORITAS_SHEETS} from '../src/sororitas-data.generated';

const id=(name:string)=>name+'#1';
function army(names:string[],detachments=['Hallowed Martyrs']){
 let a=individualArmy({...newSelection('Adepta Sororitas'),detachments2026:detachments});
 for(const name of names)a=addSelectionUnit(a,name);return a;
}
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const get=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-sororitas-faith:')&&r.title===title);
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const s=a.instances!.find(s=>s.unit===unit)!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=sororitasLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)))!;
 if(!slot)throw Error('Missing test kit '+unit+' / '+prefix);
 return setKnightGear(a,s.id,slot.name,slot.choices.find(c=>key(c.items)===key(items))!.name);
}

it('all 33 printed native Acts of Faith sources enter the real generator; standalone borrowed units never acquire the army rule',()=>{
 for(const sheet of SORORITAS_SHEETS){
  const a=army([sheet.unit]);
  expect(get(a,'Acts of Faith · Substitute one die').length,sheet.unit).toBeGreaterThan(0);
 }
 for(const unit of ['Sisters of Battle Squad','Sanctifiers (Assigned Agent)','Ministorum Priest (Assigned Agent)','Inquisitor','Armiger Warglaive'])
  expect(sororitasFaithReminders(army([unit])),unit).toEqual([]);
 expect(sororitasFaithReminders({...army(['Battle Sisters Squad']),faction:'Imperial Agents'})).toEqual([]);
});
it('grants one die at each turn start and only makes the own-turn die a six while the actual Triumph is on the battlefield',()=>{
 const base=army(['Battle Sisters Squad','Battle Sisters Squad']);
 expect(get(base,'Acts of Faith · Gain a Miracle die')).toHaveLength(1);
 expect(get(base,'Acts of Faith · Gain a Miracle die')[0]).toMatchObject({window:'Start of turn',turn:'either',timing:'start'});
 expect(get(base,'Acts of Faith · Gain a Miracle die')[0].summary).not.toContain('Solemn Procession');
 const blessed=get(addSelectionUnit(base,'Triumph Of Saint Katherine'),'Acts of Faith · Gain a Miracle die')[0];
 expect(blessed.summary).toContain('At the start of your own turn');expect(blessed.summary).toContain('is on the battlefield');
 expect(blessed.summary).toContain('does not change the opponent-turn die');
});
it('shares one allowance among actual attached models and preserves separate units after an Immolator split',()=>{
 let a=army(['Battle Sisters Squad','Battle Sisters Squad','Canoness','Dialogus','Immolator']);
 a=join(a,'Canoness','Battle Sisters Squad');a=join(a,'Dialogus','Battle Sisters Squad');
 const forms=sororitasFaithFormations(a);
 expect(forms.find(f=>f.root.id===id('Battle Sisters Squad'))?.members.map(s=>s.id)).toEqual([id('Battle Sisters Squad'),id('Canoness'),id('Dialogus')]);
 const use=get(a,'Acts of Faith · Substitute one die')[0];
 expect(use.summary).toContain('shared by its attached members');expect(use.summary).toContain('separate phase allowances');
 expect(use.summary).toContain('only the half actually containing that Dialogus');
 const losses=get(a,'Acts of Faith · A unit is destroyed');expect(losses).toHaveLength(5);
 expect(losses[0].summary).toContain('only when its last model is destroyed');
 expect(losses[0].summary).toContain('each half is now a separate unit');expect(losses[0].summary).toContain('without waiting for the other half');
});
it('shares the native unit-wide army ability with an actual attached Inquisitor, without granting it to a separate agent',()=>{
 let a=army(['Battle Sisters Squad','Inquisitor','Inquisitor Greyfax']);
 a=join(a,'Inquisitor','Battle Sisters Squad');
 expect(sororitasFaithFormations(a)).toHaveLength(1);
 expect(get(a,'Acts of Faith · Substitute one die')[0].units).toContain(id('Inquisitor'));
 expect(get(a,'Acts of Faith · Substitute one die')[0].units).not.toContain(id('Inquisitor Greyfax'));
});
it('keeps Sacred Rites and Ebon Chalice at a maximum of two Acts per phase and never allows two dice in one roll',()=>{
 const a=army(['Battle Sisters Squad','Triumph Of Saint Katherine'],['Army of Faith']);
 const uses=get(a,'Acts of Faith · Substitute one die');
 expect(uses[0].summary).toContain('Sacred Rites allows up to two');expect(uses[0].summary).toContain('limit of two');
 expect(uses[0].summary).toContain('substitute only one die');expect(uses[0].summary).not.toContain('up to three');
 expect(get({...a,detachments2026:[]},'Acts of Faith · Substitute one die')[0].summary).toContain('one Act of Faith per phase');
 expect(get({...a,detachments2026:[]},'Acts of Faith · Substitute one die')[0].summary).toContain('selected Simulacrum of the Ebon Chalice');
});
it('does not apply unattached Dialogus rhetoric and keeps spent dice consumed during rerolls',()=>{
 let a=army(['Battle Sisters Squad','Dialogus']);
 expect(get(a,'Acts of Faith · Substitute one die')[0].summary).not.toContain('Stirring Rhetoric');
 a=join(a,'Dialogus','Battle Sisters Squad');
 const uses=get(a,'Acts of Faith · Substitute one die');
 expect(uses[0].summary).toContain('first changes the Miracle die');expect(uses[0].summary).toContain('original Act of Faith still counts');
 expect(uses.find(r=>r.window==='Shooting'&&r.turn==='own')?.summary).toContain('saving throw against permitted enemy reaction shots');
 expect(uses.find(r=>r.window==='Command')?.summary).toContain('a Battle-shock test');
});
it('uses Triptych only on its selected eligible bearer saving throw while still spending the die and allowance',()=>{
 let a=army(['Canoness','Battle Sisters Squad'],['Army of Faith']);a=join(a,'Canoness','Battle Sisters Squad');
 const title='Acts of Faith · Triptych of the Macharian Crusade';
 expect(get(a,title)).toEqual([]);
 a={...a,upgrades2026:{[id('Canoness')]:'Triptych of the Macharian Crusade'}};
 const rules=get(a,title);expect(rules).toHaveLength(4);
 expect(rules[0].units).toEqual([id('Canoness')]);expect(rules[0].summary).toContain('own saving throw');
 expect(rules[0].summary).toContain('automatically succeeds');expect(rules[0].summary).toContain('Spend that die');
 expect(get({...a,detachments2026:['Hallowed Martyrs']},title)).toEqual([]);
});
it('allows Acts of Faith for source-triggered Battle-shock in every phase, including Desperate Escape and enemy shooting',()=>{
 const uses=get(army(['Battle Sisters Squad']),'Acts of Faith · Substitute one die');
 expect(uses.every(r=>r.summary.includes('Battle-shock test'))).toBe(true);
 expect(uses.find(r=>r.window==='Movement'&&r.turn==='own')?.summary).toContain('Desperate Escape');
 expect(uses.find(r=>r.window==='Shooting'&&r.turn==='opponent')?.summary).toContain('a Battle-shock test');
});
it('aggregates Simulacrum per objective and names actual separate equipped physical bearers',()=>{
 let a=army(['Battle Sisters Squad','Dominion Squad']);expect(get(a,'Simulacrum Imperialis')).toEqual([]);
 a=equip(a,'Battle Sisters Squad','Battle Sister 3 ·',['Boltgun','Simulacrum imperialis']);
 a=equip(a,'Dominion Squad','Dominion 2 ·',['Boltgun','Simulacrum imperialis']);
 const rules=get(a,'Simulacrum Imperialis');expect(rules).toHaveLength(1);
 expect(rules[0]).toMatchObject({window:'Command',turn:'own',timing:'end'});
 expect(rules[0].summary).toContain('Roll once per objective');expect(rules[0].summary).toContain('Battle Sister 3');
 expect(rules[0].summary).toContain('Dominion 2');expect(rules[0].summary).toContain('showing that exact result');
 expect(rules[0].summary).toContain('only the half containing the actual bearer');
});
it('preserves one-use and two-use Cherubs with only one retained Cherub for an optional split',()=>{
 const a=army(['Battle Sisters Squad','Dominion Squad','Retributor Squad','Sanctifiers','Immolator']);
 expect(get(a,'Cherub')).toHaveLength(15);expect(get(a,'Cherubs')).toHaveLength(5);
 const battle=get(a,'Cherub').find(r=>r.units?.includes(id('Battle Sisters Squad')))!;
 expect(battle.summary).toContain('Once per battle');expect(battle.summary).toContain('just one resulting half');
 expect(get(a,'Cherubs')[0].summary).toContain('Twice per battle');
 expect(get(a,'Cherubs')[0].summary).toContain('does not refund the spent die');
});
