import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {setKnightGear} from '../src/knight-loadouts';
import {generate11thReminders} from '../src/reminders-11th';

const kin:ArmySelection={...newSelection('Leagues of Votann'),detachments2026:['Armoured Trailblazers'],instances:[
 {id:'carrier',unit:'Sagitaur'},{id:'warriors',unit:'Hearthkyn Warriors'},{id:'leader',unit:'Kâhl',attachedTo:'warriors'},
 {id:'beserks',unit:'Cthonian Beserks'},{id:'artillery',unit:'Cthonian Earthshakers'},{id:'kapricus',unit:'Kapricus Carrier'},
]};
it('prints embark and destruction opportunities for whole formations and legally splittable Kin',()=>{
 const sheet=generate11thReminders(kin);
 expect(sheet.find(r=>r.id==='11e-votann-passenger-embark')?.units).toEqual(['warriors','beserks']);
 const cargo=sheet.find(r=>r.id==='11e-votann-cargo-carrier')!;
 expect(cargo.summary).toContain('warriors (split half)');
 expect(cargo.summary).toContain('5 models using 5 spaces');
 expect(cargo.summary).not.toContain('artillery');
 const destroyed=sheet.filter(r=>r.id.startsWith('11e-votann-emergency-disembark-'));
 expect(destroyed.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 expect(destroyed.every(r=>r.units?.join(',')==='carrier')).toBe(true);
 expect(sheet.find(r=>r.id==='11e-votann-cargo-kapricus')?.summary).toContain('No eligible passengers');
});
it('adds a Beserk’s purchased ranged weapon to core Overwatch while keeping the attached Leader with the Warriors',()=>{
 const watchers=(a:ArmySelection)=>generate11thReminders(a).find(r=>r.id==='11e-core-overwatch')?.units??[];
 expect(watchers(kin)).toContain('warriors');
 expect(watchers(kin)).not.toContain('leader');
 expect(watchers(kin)).not.toContain('beserks');
 const armed=setKnightGear(kin,'beserks','Mole launchers on axe or maul bearers','Mole grenade launcher');
 expect(watchers(armed)).toContain('beserks');
});
