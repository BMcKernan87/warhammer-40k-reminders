// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {TYRANID_SHEETS,TYRANID_SYNAPSE_UNITS,TYRANID_SHADOW_SOURCES} from '../src/tyranid-data.generated';
import {tyranidFactionReminders,tyranidShadowSources,tyranidSynapseSources,tyranidSynapsePossible} from '../src/tyranid-synapse';
import {tyranidIntrinsicReminders} from '../src/tyranid-intrinsic';
import {tyranidKeywords} from '../src/tyranid-keywords';
import {tyranidFormations} from '../src/tyranid-transports';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:TYRANID_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Tyranids'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const rows=(a:ArmySelection,title:string,roster?:RosterInstance[])=>tyranidFactionReminders(a,roster).filter(r=>r.title===title);

it('reconciles all52 Synapse recipients and all17 native Shadow sources including mixed-model Raveners',()=>{
 expect(TYRANID_SYNAPSE_UNITS).toHaveLength(52);expect([...TYRANID_SYNAPSE_UNITS].sort()).toEqual(TYRANID_SHEETS.map(s=>s.unit).sort());
 const a=army(TYRANID_SHEETS.map(s=>s.unit));expect(tyranidShadowSources(a).map(s=>s.squad.unit).sort()).toEqual(TYRANID_SHADOW_SOURCES.map(s=>s.unit).sort());expect(tyranidShadowSources(a)).toHaveLength(17);
 expect(tyranidSynapseSources(a)).toHaveLength(17);
});
it('distinguishes physical Synapse models from the keyword shared by an attached unit',()=>{
 const a=join(army(['Hive Tyrant','Tyrant Guard','Tyrant Guard']),'Hive Tyrant','Tyrant Guard');
 expect(tyranidSynapseSources(a).map(s=>s.squad.id)).toEqual([id('Hive Tyrant')]);
 const reminder=rows(a,'Synapse · Battle-shock')[0];expect(reminder.summary).toContain('actual Synapse models');expect(reminder.units).toContain('Tyrant Guard#2');
 const shadow=rows(a,'Shadow in the Warp')[0];expect(shadow.summary).toContain('condition measures from the Synapse unit');
 expect(tyranidFormations(a)).toHaveLength(2);
});
it('uses only the actual Ravener Prime as the multi-model leader’s Synapse and Shadow source',()=>{
 const a=join(army(['Hyperadapted Raveners','Raveners']),'Hyperadapted Raveners','Raveners');
 const conduits=tyranidSynapseSources(a);expect(conduits).toHaveLength(1);expect(conduits[0].models).toEqual(['Ravener Prime']);
 expect(tyranidShadowSources(a)[0].model).toBe('Ravener Prime');
 expect(rows(a,'Shadow in the Warp')[0].summary).toContain('only while its Ravener Prime survives');
 expect(tyranidKeywords(a,a.instances![0],'Ravener')).not.toContain('SYNAPSE');
});
it('keeps Shadow once per battle in either Command phase and stacks Psychic Terror only once',()=>{
 const a=army(['Neurotyrant','Neurotyrant','Termagants']);
 const shadow=rows(a,'Shadow in the Warp');expect(shadow).toHaveLength(1);expect(shadow[0]).toMatchObject({window:'Command',turn:'either',timing:'during'});
 expect(shadow[0].summary).toMatch(/Once per battle.*Every enemy unit.*Subtract 1.*within 6″.*further 1.*do not stack/);
 expect(tyranidIntrinsicReminders(a).filter(r=>r.title==='Psychic Terror')).toHaveLength(2);
});
it('does not turn Neuroloids or Neurogaunts into unconditional Synapse keyword grants',()=>{
 const a=army(['Neurotyrant','Neurogaunts','Termagants']);
 expect(tyranidKeywords(a,a.instances![1]).has('SYNAPSE')).toBe(false);
 expect(tyranidSynapseSources(a).map(s=>s.squad.unit)).toEqual(['Neurotyrant']);
 const native=tyranidIntrinsicReminders(a);
 expect(native.find(r=>r.title==='Neuroloids')?.summary).toMatch(/up to two.*within 18″.*until the start of your next Command.*do not grant SYNAPSE/);
 expect(native.find(r=>r.title==='Neurocytes')?.summary).toMatch(/other than Neurogaunts.*Neuroloid token.*does not satisfy/);
});
it('retains only a previously selected Neuroloids duration after its source dies',()=>{
 const a=army(['Neurotyrant','Termagants']),active=a.instances!.filter(s=>s.unit!=='Neurotyrant');
 expect(tyranidSynapseSources(a,active)).toEqual([]);expect(tyranidSynapsePossible(a,active)).toBe(true);
 expect(rows(a,'Synapse · Melee strength',active)[0].summary).toContain('previously selected Neuroloids effect');
 expect(rows(a,'Synapse · Melee strength',active)[0].summary).toContain('including if its Neurotyrant has since been destroyed');
 expect(rows(a,'Shadow in the Warp',active)).toEqual([]);
 expect(tyranidIntrinsicReminders(a,active).some(r=>['Neuroloids','Psychic Terror','Node Lash'].includes(r.title))).toBe(false);
});
it('expires a destroyed innate conduit and Shadow source without inventing a replacement',()=>{
 const a=army(['Hive Tyrant','Termagants']),active=a.instances!.filter(s=>s.unit!=='Hive Tyrant');
 expect(tyranidFactionReminders(a,active)).toEqual([]);
 const b=army(['Hive Tyrant','Broodlord','Termagants']),survivors=b.instances!.filter(s=>s.unit!=='Hive Tyrant');
 expect(rows(b,'Shadow in the Warp',survivors)[0].units).toEqual([id('Broodlord')]);
});
it('treats a promoted Trygon with Trygon Prime as a Synapse model but not a Shadow source',()=>{
 const a={...army(['Trygon','Termagants'],['Subterranean Assault']),upgrades2026:{[id('Trygon')]:'Trygon Prime'}};
 a.instances=a.instances!.map(s=>s.unit==='Trygon'?{...s,characterPromotion:true}:s);
 expect(tyranidSynapseSources(a).map(s=>s.squad.unit)).toEqual(['Trygon']);expect(tyranidShadowSources(a)).toEqual([]);
 expect(rows(a,'Synapse · Melee strength')).toHaveLength(1);expect(rows(a,'Shadow in the Warp')).toEqual([]);
});
it('retains conditional Synapse benefits when Adaptive Optimisation is the only possible conduit',()=>{
 const a=army(['Mawloc','Termagants'],['Subterranean Assault']);expect(tyranidSynapseSources(a)).toEqual([]);
 expect(tyranidSynapsePossible(a)).toBe(true);expect(rows(a,'Synapse · Melee strength')[0].summary).toContain('only while the grant is active');
 expect(tyranidFactionReminders({...a,detachments2026:['Invasion Fleet']})).toEqual([]);
});
it('limits Synapse Strength to melee and prints Battle-shock effects in every possible phase',()=>{
 const a=army(['Broodlord','Termagants']);
 expect(rows(a,'Synapse · Battle-shock')).toHaveLength(5);expect(rows(a,'Synapse · Battle-shock').every(r=>r.summary.includes('3D6 instead of 2D6'))).toBe(true);
 expect(rows(a,'Synapse · Melee strength')[0]).toMatchObject({window:'Fight',turn:'either',summary:expect.stringContaining('add 1 to the Strength')});
 expect(tyranidFactionReminders({...a,faction:'Necrons'})).toEqual([]);expect(tyranidSynapsePossible({...a,faction:'Necrons'})).toBe(false);
 const output=tyranidFactionReminders(a);expect(new Set(output.map(r=>r.id)).size).toBe(output.length);
});
