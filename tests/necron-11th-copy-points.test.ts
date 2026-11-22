import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
import {rosterCost2026,type Datasheet2026} from '../src/datasheets-2026';
const source='https://www.warhammer-community.com/en-gb/downloads/warhammer-40000/';
describe('11th-edition size and copy-dependent pricing',()=>{
 it('prices explicit Immortal squad sizes, not guessed defaults',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  expect(rosterCost2026(army).total).toBeNull();
  expect(rosterCost2026(setInstanceModelCount(army,'Immortals#1',5)).total).toBe(65);
  expect(rosterCost2026(setInstanceModelCount(army,'Immortals#1',10)).total).toBe(130);
 });
 it('applies later-copy prices only to later copies',()=>{
  const registry:Datasheet2026[]=[{faction:'Necrons',unit:'Immortals',source,sizes:[5,10],verified:'sizes-and-points',pointsBySize:{5:65,10:130},laterCopyPointsBySize:{2:{5:75,10:150}}}];
  let army=addSelectionUnit(newSelection('Necrons'),'Immortals',3);
  for(const id of ['Immortals#1','Immortals#2','Immortals#3'])army=setInstanceModelCount(army,id,5);
  expect(rosterCost2026(army,registry).total).toBe(215);
  expect(rosterCost2026(army,registry).entries.map(e=>e.points)).toEqual([65,75,75]);
 });
 it('never fabricates missing size prices',()=>{
  const registry:Datasheet2026[]=[{faction:'Necrons',unit:'Immortals',source,sizes:[5,10],verified:'sizes',pointsBySize:{5:65}}];
  const army=setInstanceModelCount(addSelectionUnit(newSelection('Necrons'),'Immortals'),'Immortals#1',10);
  expect(rosterCost2026(army,registry).total).toBeNull();
 });
});
