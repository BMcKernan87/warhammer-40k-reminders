import {afterEach, expect, it} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {ReminderSheet} from '../src/ReminderSheet';
import {addSelectionUnit, newSelection} from '../src/catalog';
import {setInstanceModelCount} from '../src/roster-instances';
import {initialStore, validateStore} from '../src/profiles';
import {completionKey} from '../src/rules';

afterEach(cleanup);

it('reopens a grouped save with independent Starstele checkmarks and preserves the purchased roster',()=>{
  const unit='Convergence Of Dominion',purchase=unit+'#1';
  const army=addSelectionUnit(setInstanceModelCount(addSelectionUnit(newSelection('Necrons'),unit),purchase,3),'Necron Warriors');
  const profile=JSON.parse(JSON.stringify(initialStore(army).profiles[0]));
  const originalArmy=JSON.stringify(profile.army);
  profile.completed=[
    'sheet:'+JSON.stringify(['Command','11e-necron-nodes',['Necron Warriors#1']]),
    completionKey('11e-necron-nodes',profile.battle),
  ];
  let completed=profile.completed;
  const onCompleted=(keys:string[])=>{completed=keys;};
  const view=render(<ReminderSheet profile={profile} onCompleted={onCompleted}/>);
  fireEvent.change(screen.getByLabelText('Show phase'),{target:{value:'Command'}});
  const name=/Starstele [123] · Reanimation Nodes/;
  const sources=screen.getAllByRole('checkbox',{name}) as HTMLInputElement[];
  expect(sources).toHaveLength(3);
  expect(sources.every(box=>!box.checked)).toBe(true);

  fireEvent.click(sources[0]);
  expect(completed).toHaveLength(profile.completed.length+1);
  expect(completed.at(-1)).toContain('Starstele 1');
  const reopened=JSON.parse(JSON.stringify({...profile,completed}));
  expect(validateStore({activeId:reopened.id,profiles:[reopened]})).toBe(true);
  view.rerender(<ReminderSheet profile={reopened} onCompleted={onCompleted}/>);
  expect(screen.getAllByRole('checkbox',{name})).toHaveLength(2);
  fireEvent.click(screen.getByLabelText('Show completed reminders'));
  expect((screen.getAllByRole('checkbox',{name}) as HTMLInputElement[]).map(box=>box.checked)).toEqual([true,false,false]);
  expect(JSON.stringify(reopened.army)).toBe(originalArmy);
  expect(view.container.querySelectorAll('.print-sheet strong').length).toBeGreaterThan(0);
  expect([...view.container.querySelectorAll('.print-sheet strong')].filter(row=>name.test(row.textContent??''))).toHaveLength(15);
});
