import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';

function army(...units:string[]){
  return individualArmy({...newSelection('Imperial Knights'),units:Object.fromEntries(units.map(unit=>[unit,1]))});
}
describe('Knight and ally core reminders',()=>{
  it('restricts reactions to individually armed non-Titanic units and each Assassin’s actual keywords',()=>{
    const a=army('Knight Paladin','Armiger Helverin','Culexus Assassin','Vindicare Assassin');
    const sheet=generate11thReminders(a);
    const byId=(id:string)=>sheet.find(rule=>rule.id==='11e-core-'+id);
    expect(byId('overwatch')).toMatchObject({turn:'opponent',timing:'end',units:['Armiger Helverin#1','Culexus Assassin#1','Vindicare Assassin#1']});
    expect(byId('explosives')).toMatchObject({turn:'own',units:['Culexus Assassin#1']});
    expect(byId('smokescreen')).toMatchObject({turn:'opponent',timing:'start',units:['Vindicare Assassin#1']});
    const onlyTitanic=generate11thReminders(army('Knight Paladin'));
    for(const id of ['overwatch','smokescreen','explosives'])expect(onlyTitanic.find(r=>r.id==='11e-core-'+id)).toBeUndefined();
    expect(sheet.filter(r=>r.id==='11e-formation-towering-fire')[0]?.units).toEqual(['Knight Paladin#1']);
    expect(sheet.find(r=>r.id==='11e-formation-engaged-shooting')?.units).toEqual(['Knight Paladin#1','Armiger Helverin#1']);
  });
  it('declares a Forgepact formation once and directs incoming attacks to its Bodyguard',()=>{
    let a={...army('Skitarii Rangers','Tech-priest Dominus','Skitarii Marshal'),detachments2026:['Questor Forgepact']};
    a={...a,...setInstanceAttachment(a,'Tech-priest Dominus#1','Skitarii Rangers#1')};
    a={...a,...setInstanceAttachment(a,'Skitarii Marshal#1','Skitarii Rangers#1')};
    const sheet=generate11thReminders(a);
    for(const id of ['11e-formation-reserve-declaration','11e-formation-reserve-arrival','11e-formation-attached-defence-Shooting','11e-core-epic-challenge']){
      expect(sheet.find(r=>r.id===id)?.units).toEqual(['Skitarii Rangers#1']);
    }
    expect(sheet.some(r=>r.id==='11e-movement-reserves')).toBe(false);
    expect(new Set(sheet.map(r=>r.id)).size).toBe(sheet.length);
  });
});
