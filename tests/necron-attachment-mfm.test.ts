import {describe,expect,it} from 'vitest';
import {CATALOG,newSelection,validateSelection} from '../src/catalog';
import {necronAttachmentRole} from '../src/attachments';
import {expandRoster,individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {necronFormationRoots} from '../src/necron-retinues';
import {generate11thReminders} from '../src/reminders-11th';

// Independent matched-play fixtures from Oct 14 MFM v1.6:
// https://github.com/richardsolomou/wh40k-11e-mfm/blob/main/data/necrons.yaml
const phalanx=['Immortals','Necron Warriors'];
const nobleBodies=[...phalanx,'Lychguard'];
const permissions:ReadonlyArray<[string,'leader'|'support',readonly string[]]>=[
 ['Imotekh the Stormlord','leader',nobleBodies],['Trazyn the Infinite','leader',nobleBodies],
 ['Overlord','leader',nobleBodies],['Overlord with translocation shroud','leader',nobleBodies],
 ['Lokhust Lord','leader',['Lokhust Destroyers','Lokhust Heavy Destroyers']],
 ['Skorpekh Lord','leader',['Skorpekh Destroyers']],['Royal Warden','leader',phalanx],
 ['Chronomancer','support',phalanx],['Orikan the Diviner','support',phalanx],
 ['Psychomancer','support',phalanx],['Plasmancer','support',phalanx],
 ['Geomancer','support',[...phalanx,'Canoptek Macrocytes']],
 ['Technomancer','support',[...phalanx,'Canoptek Wraiths']],
];

describe('MFM v1.6 Necron formation permissions',()=>{
 it.each(permissions)('enforces all base Bodyguard destinations when attaching %s', (unit,role,bodies)=>{
  expect(necronAttachmentRole(unit)).toBe(role);
  for(const target of CATALOG.Necrons.units){
   const a=individualArmy({...newSelection(),units:{[target]:1,[unit]:1},detachments2026:['Awakened Dynasty']});
   const attach=()=>setInstanceAttachment(a,unit+'#1',target+'#1');
   if(!bodies.includes(target)){
    expect(attach,target).toThrow();
    continue;
   }
   const joined=attach();
   expect(validateSelection(joined),target).toBe(true);
   expect(necronFormationRoots(joined).map(f=>f.id),target).toEqual([target+'#1']);
   const hitBonus=generate11thReminders(joined).find(r=>r.id==='11e-necron-awakened-command-Fight');
   expect(hitBonus?.units,target).toEqual([target+'#1']);
  }
 });
 it('keeps both legal attachment slots on one chosen instance across reopening',()=>{
  let a=individualArmy({...newSelection(),units:{Immortals:2,Overlord:1,Chronomancer:1}});
  for(const u of ['Overlord','Chronomancer'])a=setInstanceAttachment(a,u+'#1','Immortals#2');
  const reopened=JSON.parse(JSON.stringify(a));
  expect(validateSelection(reopened)).toBe(true);
  expect(necronFormationRoots(reopened).map(f=>f.members.map(s=>s.id))).toEqual([
   ['Immortals#1'],['Immortals#2','Overlord#1','Chronomancer#1']
  ]);
  expect(expandRoster(reopened)).toHaveLength(4);
 });
});
