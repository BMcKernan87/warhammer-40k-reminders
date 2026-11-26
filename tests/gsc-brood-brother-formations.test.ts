// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {autoAttachUnambiguousInstances,individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {gscFormations} from '../src/gsc-transports';
import {gscTransportOptions} from '../src/gsc-army-transports';
const build=(units:string[])=>units.reduce((a,unit)=>addSelectionUnit(a,unit),individualArmy({...newSelection('Genestealer Cults'),detachments2026:['Brood Brothers Auxilia']}));
const id=(u:string)=>u+'#1';
it('applies the bodyguard’s printed exception to allied Guard squads, calculates the whole formation size and rejects two Command Squads',()=>{
 for(const [body,command] of [['Cadian Shock Troops','Cadian Command Squad'],['Death Korps Of Krieg','Krieg Command Squad'],['Catachan Jungle Fighters','Catachan Command Squad']]){
  let a=build([body,command,command,'Primaris Psyker','Chimera','Stormlord']);
  a=setInstanceAttachment(a,id(command),id(body));a=setInstanceAttachment(a,id('Primaris Psyker'),id(body));
  expect(gscFormations(a,a.instances!).find(g=>g.body.id===id(body))?.members).toHaveLength(3);
  expect(gscTransportOptions(a).find(t=>t.transport.unit==='Chimera')?.passengers).not.toContain(id(body));
  expect(gscTransportOptions(a).find(t=>t.transport.unit==='Stormlord')?.passengers).toContain(id(body));
  a=setInstanceAttachment(a,id('Primaris Psyker'),null);expect(()=>setInstanceAttachment(a,command+'#2',id(body))).toThrow();
 }
});
it('can auto-assign two compatible allied Leaders with exactly one destination and keeps a third or a second Kasrkin Leader out',()=>{
 let a=autoAttachUnambiguousInstances(build(['Cadian Shock Troops','Cadian Castellan','Cadian Command Squad']));
 expect(a.instances!.filter(s=>s.attachedTo===id('Cadian Shock Troops'))).toHaveLength(2);
 a=addSelectionUnit(a,'Primaris Psyker');expect(()=>setInstanceAttachment(a,id('Primaris Psyker'),id('Cadian Shock Troops'))).toThrow();
 let kas=build(['Kasrkin','Primaris Psyker','Cadian Castellan']);kas=setInstanceAttachment(kas,id('Primaris Psyker'),id('Kasrkin'));
 expect(()=>setInstanceAttachment(kas,id('Cadian Castellan'),id('Kasrkin'))).toThrow();
});
