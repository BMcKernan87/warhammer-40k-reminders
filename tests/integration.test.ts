import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {changeBattleSize} from '../src/roster-battle-size';
import {createProfile,initialStore,updateProfile,validateStore} from '../src/profiles';
import {individualArmy} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';

describe('editing a saved roster',()=>{
  const army=selectUpgrade2026({...individualArmy(addSelectionUnit(newSelection(),'Overlord')),detachments2026:['Awakened Dynasty']},'Overlord#1','Veil of Darkness');
  it('preserves the detachment, bearer and generated reminder when either battle size permits them',()=>{
    const changed=changeBattleSize(army,'Incursion');
    expect(changed.upgrades2026).toEqual({'Overlord#1':'Veil of Darkness'});
    expect(generate11thReminders(changed).some(r=>r.title.includes('Veil of Darkness'))).toBe(true);
    expect(changeBattleSize(changed,'Strike Force').instances).toEqual(army.instances);
  });
  it('keeps the original roster intact when a smaller battle cannot fit its combination',()=>{
    const combined={...army,detachments2026:['Canoptek Court','Hand of the Dynasty']};
    expect(()=>changeBattleSize(combined,'Incursion')).toThrow(/Remove a detachment/);
    expect(combined.detachments2026).toHaveLength(2);
  });
  it('can reopen all profiles after creating one with a long name',()=>{
    const first=updateProfile(initialStore(),'default',{army});
    const created=createProfile(first,'second','X'.repeat(110));
    expect(validateStore(JSON.parse(JSON.stringify(created)))).toBe(true);
    expect(created.profiles[0].army.upgrades2026).toEqual(army.upgrades2026);
  });
});
