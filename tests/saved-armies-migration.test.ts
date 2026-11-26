import {expect,it} from 'vitest';
import {createProfile,initialStore} from '../src/profiles';
import {openSavedArmies,storeSavedArmies} from '../src/saved-armies';

it('reopens a legal army when a sibling uses retired selections and preserves the original sibling on subsequent saves',()=>{
 const both=createProfile(initialStore(),'second','Tournament');
 const old={...both.profiles[0],army:{...both.profiles[0].army,units:{'Retired datasheet':1}}};
 const raw={activeId:old.id,profiles:[old,both.profiles[1]]};
 const session=openSavedArmies(raw);
 expect(session.store.activeId).toBe('second');
 expect(session.retained).toEqual([old]);
 const serialized=storeSavedArmies(session.store,session.retained);
 expect(JSON.parse(serialized).profiles).toContainEqual(old);
 expect(openSavedArmies(JSON.parse(serialized))).toEqual(session);
});
it('opens a separate draft when every previous army needs migration',()=>{
 const old={...initialStore().profiles[0],army:{units:{}}};
 const session=openSavedArmies({activeId:'default',profiles:[old]});
 expect(session.store.activeId).not.toBe(old.id);
 expect(session.retained).toEqual([old]);
 expect(openSavedArmies(JSON.parse(storeSavedArmies(session.store,session.retained)))).toEqual(session);
});
