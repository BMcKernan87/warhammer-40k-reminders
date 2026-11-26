// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import type {RosterInstance} from '../src/roster-instances';
import {astraDatasheetReminders} from '../src/astra-datasheets';
import {broodBrotherIntrinsicReminders} from '../src/brood-brother-reminders';
import {generate11thReminders} from '../src/reminders-11th';

// Core §§05.03–05.04, 19.04 and 24.24: personal protection stays on the
// specified model; originally attached surviving Leaders keep leading rules;
// Lone Operative's visibility protection requires an unattached unit.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Opponent-Movement shooting is real: Aquilons' Servo-sentry, pack v1.3 p24.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24
// Own-Movement/own-Shooting incoming attacks: Hyperspace Hunters and
// Multi-threat Eliminator in the reproduced Nov 23, 2026 app export.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Named Guard clauses are reproduced Codex records, not a full primary Codex
// audit: 000001396 Enginseer/Blessing (3", selected Vehicle model, next own
// Command, once/model/turn); 000000702 and 000000764 Rolling Fortress;
// 000002741 Urban Warfare; 000000889 Malign Wardings; 000002617 Ablative Plating.
// https://wahapedia.ru/wh40k11ed/factions/astra-militarum/

type Host='Astra Militarum'|'Genestealer Cults';
const hosts=['Astra Militarum','Genestealer Cults'] as const;
const s=(unit:string,n=1,extra:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#'+n,...extra});
function army(host:Host,...instances:RosterInstance[]):ArmySelection{
 const units:Record<string,number>={};
 for(const member of instances)units[member.unit]=(units[member.unit]??0)+1;
 return {...newSelection(host),detachments2026:[host==='Astra Militarum'?'Combined Arms':'Brood Brothers Auxilia'],units,instances};
}
const native=(...instances:RosterInstance[])=>army('Astra Militarum',...instances);
function rows(a:ArmySelection,name:string,current?:readonly RosterInstance[]):GeneratedReminder[]{
 const generated=current?(a.faction==='Astra Militarum'?astraDatasheetReminders(a,current):broodBrotherIntrinsicReminders(a,current)):generate11thReminders(a);
 return generated.filter(r=>r.title===name||r.title.endsWith(' · '+name));
}
const stages=(rs:GeneratedReminder[])=>rs.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const ranged=['Movement:own:during','Movement:opponent:during','Shooting:own:during','Shooting:opponent:during'].sort();
const attacks=[...ranged,'Fight:either:during'].sort();
const blessing='Omnissiah’s Blessing',warding='Malign Wardings(Psychic)';
const carry=(a:ArmySelection,current?:readonly RosterInstance[])=>rows(a,blessing,current).filter(r=>r.window!=='Command');
const activation=(a:ArmySelection,current?:readonly RosterInstance[])=>rows(a,blessing,current).filter(r=>r.window==='Command');
function unique(a:ArmySelection,current?:readonly RosterInstance[]){
 const rs=current?(a.faction==='Astra Militarum'?astraDatasheetReminders(a,current):broodBrotherIntrinsicReminders(a,current)):generate11thReminders(a);
 expect(new Set(rs.map(r=>r.id)).size).toBe(rs.length);
}
function legacyNamed(rs:GeneratedReminder[],source:RosterInstance,name:string,melee=false){
 const stem='11e-brood-'+source.id+'-'+name+'-';
 expect(rs.find(r=>r.window==='Movement'&&r.turn==='own')).toMatchObject({id:stem+'Movement-own-end',timing:'during'});
 expect(rs.find(r=>r.window==='Shooting'&&r.turn==='opponent')?.id).toBe(stem+'Shooting-opponent-during');
 if(melee)expect(rs.find(r=>r.window==='Fight')?.id).toBe(stem+'Fight-either-during');
 expect(rs.find(r=>r.window==='Movement'&&r.turn==='opponent')?.id).toBe(stem+'Movement-opponent-during');
 expect(rs.find(r=>r.window==='Shooting'&&r.turn==='own')?.id).toBe(stem+'Shooting-own-during');
 expect(rs.every(r=>!r.previousSheetEntry)).toBe(true);
}

describe('Enginseer personal protection and a previously selected Vehicle model',()=>{
 it('retains old Enginseer IDs and the unattached, personal, 3-inch visibility conditions in all ranged windows',()=>{
  const eng=s('Tech-Priest Enginseer'),tank=s('Chimera'),body=s('Cadian Shock Troops'),a=native(eng,tank,body),rs=rows(a,'Enginseer');
  expect(stages(rs)).toEqual(ranged);
  for(const r of rs){
   expect(r).toMatchObject({units:[eng.id,tank.id],source:'https://wahapedia.ru/wh40k11ed/factions/astra-militarum/Tech-Priest-Enginseer'});
   expect(r.summary).toMatch(/Enginseer is unattached and within 3″.*Astra Militarum Vehicle unit.*outside 12″.*Indirect Fire/);
   expect(r.summary).toContain('personal protection does not extend to attached models');
  }
  expect(rs.map(r=>r.id)).toEqual(expect.arrayContaining(['11e-native-guard:'+eng.id+':Enginseer:Shooting:opponent','11e-native-guard:'+eng.id+':Enginseer:Movement:own']));
  const attached={...eng,attachedTo:body.id},joined=native(attached,tank,body);
  expect(rows(joined,'Enginseer').every(r=>r.summary.includes('unattached')&&!r.summary.includes('every surviving model'))).toBe(true);
  expect(rows(a,'Enginseer',[eng,body])).toEqual([]);
  expect(rows(a,'Enginseer',[tank,body])).toEqual([]);
  unique(a);
 });

 it('keeps one Command activation separate from five conditional protection rows and retains every old ID',()=>{
  const eng=s('Tech-Priest Enginseer'),sentinels=s('Scout Sentinels',1,{models:3}),a=native(eng,sentinels),rs=carry(a),start=activation(a);
  expect(start).toMatchObject([{id:'11e-native-guard:'+eng.id+':'+blessing+':Command:own',turn:'own',timing:'during',units:[eng.id,sentinels.id]}]);
  expect(start[0].summary).toMatch(/one friendly Astra Militarum Vehicle model within 3″.*D3.*4\+.*start of your next Command.*once per turn/);
  expect(stages(rs)).toEqual(attacks);
  expect(rs.map(r=>r.id)).toEqual(expect.arrayContaining([
   '11e-native-guard:'+eng.id+':'+blessing+':Shooting:opponent',
   '11e-native-guard:'+eng.id+':'+blessing+':Fight:either',
   '11e-native-guard:'+eng.id+':'+blessing+':Movement:own',
  ]));
  expect(rs.every(r=>r.summary.includes('Only if '+eng.id)&&r.summary.includes('in your last Command phase')&&r.summary.includes('that same selected model survives')&&r.summary.includes('until the start of your next Command phase'))).toBe(true);
  expect(rs.every(r=>r.summary.includes('Only the selected physical model benefits')&&r.summary.includes('neither heals again nor activates another blessing'))).toBe(true);
  expect(rs.every(r=>r.id!==start[0].id&&!r.previousSheetEntry)).toBe(true);
  unique(a);
 });

 it('retains an earlier save after the source dies, using only surviving original recipient identities',()=>{
  const eng=s('Tech-Priest Enginseer'),chosen=s('Scout Sentinels',1,{models:3}),other=s('Chimera'),a=native(eng,chosen,other);
  const reduced={...chosen,models:1},live=[reduced],rs=carry(a,live);
  expect(stages(rs)).toEqual(attacks);
  expect(rs.every(r=>r.units?.join()===eng.id+','+chosen.id&&r.summary.includes('Enginseer is destroyed')&&r.summary.includes('selected model moves farther away'))).toBe(true);
  expect(activation(a,live)).toEqual([]);
  expect(rows(a,'Enginseer',live)).toEqual([]);
  expect(carry(a,[])).toEqual([]);
  unique(a,live);
 });

 it.each([
  ['changed ID',(m:RosterInstance)=>({...m,id:'Replacement Sentinel#1'})],
  ['changed datasheet',(m:RosterInstance)=>({...m,unit:'Armoured Sentinels'})],
  ['new attachment',(m:RosterInstance)=>({...m,attachedTo:'Cadian Shock Troops#1'})],
  ['new retinue',(m:RosterInstance)=>({...m,retinueTo:'Cadian Command Squad#1'})],
 ] as const)('does not transfer an earlier selected model’s blessing to a recipient with %s',(_label,change)=>{
  const eng=s('Tech-Priest Enginseer'),sent=s('Scout Sentinels'),a=native(eng,sent);
  expect(carry(a,[change(sent)])).toEqual([]);
 });

 it.each([
  ['changed source datasheet',{unit:'Commissar'}],
  ['changed source attachment',{attachedTo:'Cadian Shock Troops#1'}],
  ['changed source retinue',{retinueTo:'Cadian Command Squad#1'}],
 ] as const)('rejects a repurposed source identity with %s',(_label,change)=>{
  const eng=s('Tech-Priest Enginseer'),tank=s('Chimera'),a=native(eng,tank),changed={...eng,...change};
  expect(rows(a,blessing,[changed,tank])).toEqual([]);
  expect(rows(a,'Enginseer',[changed,tank])).toEqual([]);
 });

 it('rejects original illegal joins, non-Vehicle recipients and newly introduced source/vehicle identities',()=>{
  const eng=s('Tech-Priest Enginseer'),tank=s('Chimera'),body=s('Cadian Shock Troops');
  const illegalSource={...eng,attachedTo:tank.id};
  expect(rows(native(illegalSource,tank),blessing)).toEqual([]);
  expect(carry(native(eng,{...tank,attachedTo:body.id},body),[{...tank,attachedTo:body.id},body])).toEqual([]);
  expect(carry(native(eng,body),[tank])).toEqual([]);
  const impostor={...eng,unit:'Cadian Castellan'};
  expect(rows(native(impostor,tank),blessing,[eng,tank])).toEqual([]);
  expect(rows(native(tank),blessing,[eng,tank])).toEqual([]);
 });

 it('keeps independent source IDs without creating a new activation for a destroyed Enginseer',()=>{
  const first=s('Tech-Priest Enginseer'),second=s('Tech-Priest Enginseer',2),tank=s('Chimera'),a=native(first,second,tank),live=[second,tank];
  expect(activation(a,live)).toHaveLength(1);
  expect(activation(a,live)[0].id).toContain(':'+second.id+':');
  const after=carry(a,live);
  expect(after).toHaveLength(10);
  for(const eng of [first,second])expect(after.filter(r=>r.id.includes(':'+eng.id+':'))).toHaveLength(5);
  expect(after.every(r=>r.summary.includes('Only if')&&r.summary.includes('same selected model survives'))).toBe(true);
  unique(a,live);
 });

 it('treats a zero-model Enginseer as destroyed and excludes zero-model current or original Vehicles',()=>{
  const eng=s('Tech-Priest Enginseer'),tank=s('Chimera'),a=native(eng,tank);
  const deadSource={...eng,models:0},deadTarget={...tank,models:0};
  expect(rows(a,'Enginseer',[deadSource,tank])).toEqual([]);
  expect(activation(a,[deadSource,tank])).toEqual([]);
  expect(carry(a,[deadSource,tank])).toHaveLength(5);
  expect(rows(a,'Enginseer',[eng,deadTarget])).toEqual([]);
  expect(rows(a,blessing,[eng,deadTarget])).toEqual([]);
  expect(carry(native(eng,deadTarget),[tank])).toEqual([]);
  expect(rows(native(deadSource,tank),blessing,[eng,tank])).toEqual([]);
 });
});

describe('shared named Guard defenses keep actual sources and recipients',()=>{
 it.each(hosts)('%s keeps Rolling Fortress conditional on the actual source and the obscured Astra Militarum model',host=>{
  const fortress=s('Baneblade'),target=s('Chimera'),outsider=s(host==='Astra Militarum'?'Inquisitor':'Neophyte Hybrids'),a=army(host,fortress,target,outsider),rs=rows(a,'Rolling Fortress');
  expect(stages(rs)).toEqual(ranged);
  expect(rs.every(r=>r.units?.join()===target.id&&r.summary.includes('ranged attack is allocated to a friendly Astra Militarum model')&&r.summary.includes('fully visible to every model')&&r.summary.includes('Source: '+fortress.id))).toBe(true);
  legacyNamed(rs,fortress,'Rolling Fortress');
  expect(rows(a,'Rolling Fortress',[target,outsider])).toEqual([]);
  unique(a);
 });

 it('keeps multiple Baneblade sources distinct and prevents each source from obscuring itself',()=>{
  const first=s('Baneblade'),second=s('Baneblade',2),target=s('Chimera'),a=native(first,second,target);
  for(const [source,other] of [[first,second],[second,first]]){
   const rs=rows(a,'Rolling Fortress').filter(r=>r.id.startsWith('11e-brood-'+source.id+'-'));
   expect(stages(rs)).toEqual(ranged);
   expect(rs.every(r=>r.summary.includes('Source: '+source.id)&&r.units?.join()===other.id+','+target.id)).toBe(true);
   legacyNamed(rs,source,'Rolling Fortress');
  }
  unique(a);
 });

 it.each(hosts)('%s gives the same Rolling Fortress candidates when an original Bodyguard is removed or has zero models',host=>{
  const fortress=s('Baneblade'),body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id};
  const a=army(host,fortress,body,psyker),removed=rows(a,'Rolling Fortress',[fortress,psyker]),zero=rows(a,'Rolling Fortress',[fortress,{...body,models:0},psyker]);
  expect(stages(removed)).toEqual(ranged);
  expect(removed.every(r=>r.units?.join()===psyker.id&&r.summary.includes('friendly Astra Militarum model'))).toBe(true);
  expect(removed).toEqual(zero);
  legacyNamed(removed,fortress,'Rolling Fortress');
  unique(a,[fortress,psyker]);
 });

 it.each([
  ['changed surviving ID',(psyker:RosterInstance)=>[{...psyker,id:'New Psyker#1'}]],
  ['changed surviving datasheet',(psyker:RosterInstance)=>[{...psyker,unit:'Cadian Castellan'}]],
  ['changed original join',(psyker:RosterInstance)=>[{...psyker,attachedTo:undefined}]],
  ['new independent identity',(_psyker:RosterInstance)=>[s('Primaris Psyker',2)]],
  ['newly attached survivor',(psyker:RosterInstance)=>[psyker,{...s('Cadian Castellan'),attachedTo:psyker.attachedTo}]],
 ] as const)('does not recover Rolling Fortress candidates through a %s after a GSC Bodyguard is removed',(_label,change)=>{
  const fortress=s('Baneblade'),body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id};
  const a=army('Genestealer Cults',fortress,body,psyker);
  expect(rows(a,'Rolling Fortress',[fortress,...change(psyker)])).toEqual([]);
 });

 it('rejects reused original survivor IDs when recovering an ungrouped Rolling Fortress recipient',()=>{
  const fortress=s('Baneblade'),body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id},officer={...s('Cadian Castellan'),attachedTo:body.id};
  const a=army('Genestealer Cults',fortress,body,psyker,officer),changed={...officer,unit:'Cadian Command Squad'};
  expect(rows(a,'Rolling Fortress',[fortress,psyker,changed])).toEqual([]);
 });

 it.each(hosts)('%s keeps Urban Warfare ranged-only, conditional on cover and personal to its Eradicator',host=>{
  const tank=s('Leman Russ Eradicator'),other=s('Leman Russ Eradicator',2),a=army(host,tank,other);
  const rs=rows(a,'Urban Warfare').filter(r=>r.units?.includes(tank.id));
  expect(stages(rs)).toEqual(ranged);
  expect(rs.every(r=>r.units?.join()===tank.id&&r.summary.includes('Benefit of Cover against that attack')&&r.summary.includes('subtract 1')&&r.summary.includes('Other models receive no protection'))).toBe(true);
  legacyNamed(rs,tank,'Urban Warfare');
  expect(rows(a,'Urban Warfare').filter(r=>r.units?.includes(other.id))).toHaveLength(4);
  unique(a);
 });

 it.each(hosts)('%s keeps Ablative Plating as one use per actual Rogal Dorn model across every phase',host=>{
  const tank=s('Rogal Dorn Battle Tank'),other=s('Rogal Dorn Battle Tank',2),a=army(host,tank,other);
  const rs=rows(a,'Ablative Plating').filter(r=>r.units?.includes(tank.id));
  expect(stages(rs)).toEqual(attacks);
  expect(rs.every(r=>r.units?.join()===tank.id&&r.summary.includes('Once per battle for this actual model')&&r.summary.includes('single use is unspent')&&r.summary.includes('that attack’s Damage to 0')&&r.summary.includes('one use is shared across every phase'))).toBe(true);
  legacyNamed(rs,tank,'Ablative Plating',true);
  expect(rows(a,'Ablative Plating').filter(r=>r.units?.includes(other.id))).toHaveLength(5);
  unique(a);
 });

 it.each(hosts)('%s keeps Malign Wardings on the original legal formation and its surviving Psyker',host=>{
  const body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id},other=s('Cadian Shock Troops',2),a=army(host,body,psyker,other),rs=rows(a,warding);
  expect(stages(rs)).toEqual(attacks);
  expect(rs.every(r=>r.units?.join()===body.id&&r.summary.includes('Feel No Pain 4+ against Psychic attacks'))).toBe(true);
  legacyNamed(rs,psyker,warding,true);
  const remnant=rows(a,warding,[psyker,other]);
  expect(stages(remnant)).toEqual(attacks);
  expect(remnant.every(r=>r.units?.join()===psyker.id&&r.summary.includes('after its Bodyguard is destroyed'))).toBe(true);
  expect(rows(a,warding,[body,other])).toEqual([]);
  expect(rows(army(host,s('Primaris Psyker'),body),warding)).toEqual([]);
  expect(rows(army(host,{...psyker,attachedTo:'Chimera#1'},s('Chimera')),warding)).toEqual([]);
  expect(rows(a,warding,[body,{...psyker,attachedTo:other.id},other])).toEqual([]);
  unique(a,[psyker,other]);
 });

 it.each(hosts)('%s excludes zero-model named sources and targets while preserving a living original Psyker after Bodyguard loss',host=>{
  const fortress=s('Baneblade'),tank=s('Chimera'),body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id};
  const cover=army(host,fortress,tank);
  expect(rows(cover,'Rolling Fortress',[{...fortress,models:0},tank])).toEqual([]);
  expect(rows(cover,'Rolling Fortress',[fortress,{...tank,models:0}])).toEqual([]);
  for(const [unit,name] of [['Leman Russ Eradicator','Urban Warfare'],['Rogal Dorn Battle Tank','Ablative Plating']] as const){
   const source=s(unit);
   expect(rows(army(host,source),name,[{...source,models:0}])).toEqual([]);
  }
  const warded=army(host,body,psyker);
  expect(rows(warded,warding,[body,{...psyker,models:0}])).toEqual([]);
  const remnant=rows(warded,warding,[{...body,models:0},psyker]);
  expect(remnant).toHaveLength(5);
  expect(remnant.every(r=>r.units?.join()===psyker.id)).toBe(true);
  expect(rows(army(host,{...body,models:0},psyker),warding)).toEqual([]);
 });

 it.each([
  ['new attachment',(body:RosterInstance,_psyker:RosterInstance,officer:RosterInstance)=>[{...officer,id:'New Castellan#1',attachedTo:body.id}]],
  ['new retinue',(_body:RosterInstance,psyker:RosterInstance,officer:RosterInstance)=>[{...officer,id:'New Castellan#1',retinueTo:psyker.id}]],
  ['reused surviving member ID',(_body:RosterInstance,_psyker:RosterInstance,officer:RosterInstance)=>[{...officer,unit:'Cadian Command Squad'}]],
  ['duplicate original source ID',(_body:RosterInstance,psyker:RosterInstance,_officer:RosterInstance)=>[psyker]],
 ] as const)('rejects %s even when the surviving GSC Psyker has no current formation group',(_label,change)=>{
  const body=s('Cadian Shock Troops'),psyker={...s('Primaris Psyker'),attachedTo:body.id},officer={...s('Cadian Castellan'),attachedTo:body.id};
  const a=army('Genestealer Cults',body,psyker,officer);
  expect(rows(a,warding,[psyker])).toHaveLength(5);
  expect(rows(a,warding,[psyker,...change(body,psyker,officer)])).toEqual([]);
 });

 it('retains unrelated activation and outgoing reaction windows',()=>{
  const a=native(s('Primaris Psyker'),s('Krieg Heavy Weapons Squad'),s('Catachan Heavy Weapons Squad'));
  expect(rows(a,'Psychic Barrier (Psychic)')).toMatchObject([{window:'Shooting',turn:'opponent',timing:'start'}]);
  expect(stages(rows(a,'Final Duty'))).toEqual(['Shooting:opponent:during','Movement:own:end','Fight:either:during'].sort());
  expect(rows(a,'Bring it Down!').find(r=>r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end',summary:expect.stringContaining('Snap shots cannot re-roll Hit rolls')});
 });
});
