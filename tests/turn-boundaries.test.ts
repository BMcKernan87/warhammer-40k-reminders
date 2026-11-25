import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {individualArmy} from '../src/roster-instances';
import {generate11thReminders,grouped11thReminders} from '../src/reminders-11th';

const knights=individualArmy({...newSelection('Imperial Knights'),detachments2026:['Questoris Companions'],units:{'Knight Paladin':1,'Armiger Warglaive':1}});
const necrons=individualArmy({...newSelection('Necrons'),units:{'Ophydian Destroyers':1,'Monolith':1,'Doom Scythe':1}});
const selected=(army:typeof knights,title:string)=>generate11thReminders(army).filter(r=>r.title.includes(title));

describe('turn and round boundaries in core 07.01–03',()=>{
 it('presents separate digital and print groups for both players’ turn ends before the round ends',()=>{
  for(const a of [knights,necrons]){
   expect(grouped11thReminders(a).map(g=>g.window)).toEqual(['Pre-battle','Start of battle round','Start of turn','Command','Movement','Shooting','Charge','Fight','End of your turn','End of opponent turn','End of battle round']);
   const finals=selected(a,'Strategic Reserves · final turn');
   expect(finals.map(r=>[r.window,r.turn])).toEqual([['End of your turn','own'],['End of opponent turn','opponent']]);
   expect(finals.every(r=>r.summary.includes('Only if this is the final player turn'))).toBe(true);
   expect(selected(a,'round three deadline')).toMatchObject([{window:'End of battle round'}]);
  }
  expect(selected(necrons,'Aircraft · return to Strategic Reserves')).toMatchObject([{window:'End of opponent turn',turn:'opponent'}]);
  expect(selected(necrons,'Tunnelling Horrors').filter(r=>r.window!=='Movement')).toMatchObject([{window:'End of opponent turn',turn:'opponent'}]);
 });
 it('checks each Imperial Knight deed exactly when it can be fulfilled, then grants the next oath only at the start of your turn',()=>{
  expect(selected(knights,'Lay Low the Tyrant')).toMatchObject([
   {window:'End of your turn',turn:'own',previousSheetEntry:{window:'Fight'}},
   {window:'End of opponent turn',turn:'opponent'}
  ]);
  expect(selected(knights,'Reclaim the Realm')).toMatchObject([{window:'End of opponent turn',turn:'opponent'}]);
  expect(selected(knights,'Reap a Great Tally')).toMatchObject([{window:'End of battle round'}]);
  expect(selected(knights,'Heroes of Legend')).toMatchObject([{id:'11e-knight-heroes-Command',window:'Start of turn',turn:'own',timing:'start',previousSheetEntry:{window:'Command'}}]);
  expect(selected({...knights,detachments2026:['Valourstrike Lance']},'Heroes of Legend')).toEqual([]);
 });
 it('refreshes only purchased Questoris enhancements at the three possible oath-fulfilment steps',()=>{
  expect(selected(knights,'Valour’s Reward')).toEqual([]);
  const army={...knights,upgrades2026:{'Knight Paladin#1':'Pennant of Silvered Fury'}};
  const rewards=selected(army,'Valour’s Reward');
  expect(rewards.map(r=>r.window)).toEqual(['End of your turn','End of opponent turn','End of battle round']);
  expect(rewards.every(r=>r.units?.join()==='Knight Paladin#1'&&r.timing==='end')).toBe(true);
  expect(new Set(generate11thReminders(army).map(r=>r.id)).size).toBe(generate11thReminders(army).length);
  expect(rewards[0].previousSheetEntry).toMatchObject({window:'Command',units:['Knight Paladin#1','Armiger Warglaive#1']});
 });
});
