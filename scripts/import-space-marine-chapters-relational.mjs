import {isDeepStrictEqual} from 'node:util';
import {spaceMarineCompositions,spaceMarineModelName,spaceMarineNameKey} from './import-space-marines-relational.mjs';

export const CHAPTER_SPECS=[
 {faction:'Blood Angels',slug:'blood-angels',sourceId:'000000021',cards:14,membership:83,paid:0},
 {faction:'Dark Angels',slug:'dark-angels',sourceId:'000000023',cards:16,membership:85,paid:1},
 {faction:'Black Templars',slug:'black-templars',sourceId:'000000162',cards:15,membership:75,paid:6},
 {faction:'Space Wolves',slug:'space-wolves',sourceId:'000000036',cards:21,membership:88,paid:2},
];
export const chapterNameKey=spaceMarineNameKey;
export const chapterModelName=spaceMarineModelName;
export const chapterCompositions=(rows,units)=>spaceMarineCompositions(rows,units);
const modelKey=n=>chapterNameKey(n).replace(/[^a-z0-9]/g,'');
export const chapterEquivalent=(a,b)=>modelKey(a)===modelKey(b)||modelKey(a)+'s'===modelKey(b)||modelKey(a)===modelKey(b)+'s';
export const chapterProfileMatches=(name,desired)=>name.split(/,\s*/).some(n=>chapterEquivalent(n,desired));

export function chapterIndependent(units,name,faction){
 const found=units.filter(u=>chapterNameKey(u.name)===chapterNameKey(name)&&u.faction_keywords.includes(faction)&&!u.is_legend&&u.game_version.edition==='11th'&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(found.length!==1)throw Error('Unresolved current '+faction+' card '+name);
 const row=found[0];
 if(row.id==='wolf-guard-headtakers'){
  const previous=[
   {models:3,cost:115,unit_count_min:1,unit_count_max:2},{models:6,cost:170,unit_count_min:1,unit_count_max:2},{models:12,cost:230,unit_count_min:1,unit_count_max:2},
   {models:3,cost:125,unit_count_min:3,unit_count_max:null},{models:6,cost:180,unit_count_min:3,unit_count_max:null},{models:12,cost:240,unit_count_min:3,unit_count_max:null},
  ];
  if(row.game_version.dataslate!=='pre-launch-provisional'||!isDeepStrictEqual(row.points,previous)||row.points_provisional!==false)throw Error('Review inherited Headtaker metadata and collapsed points');
  // Current CSV/live characteristics and the independently current composition
  // record are reconciled by both generators. The old unit-level price array
  // cannot represent its two distinct six-model configurations; never use it.
  return {...row,game_version:{...row.game_version,dataslate:'2026-10-14'},points:[]};
 }
 if(row.game_version.dataslate!=='2026-10-14')throw Error('Unreviewed provisional chapter card '+name);
 return row;
}

export function chapterManual(raw,spec){
 if(raw.slug!==spec.slug||raw.version!=='1.6'||raw.firstSeen!=='2026-10-14')throw Error('Review '+spec.faction+' MFM revision');
 const manual=structuredClone(raw);manual.units=manual.units.filter(u=>!u.legends);
 if(spec.faction==='Space Wolves'){
  const duplicate=manual.units.filter(u=>u.name==='Venerable Dreadnought');
  const expected=[
   {name:'Venerable Dreadnought',pricing:[{range:'[1,2]',label:'Your 1st To 2nd Units Cost',costs:[{models:1,points:130}]},{range:'[3,)',label:'Your 3rd + Unit Costs',costs:[{models:1,points:140}]}]},
   {name:'Venerable Dreadnought',pricing:[{range:'[1,)',label:'Your Unit Costs',costs:[{models:1,points:165}]}]},
  ];
  if(!isDeepStrictEqual(duplicate,expected))throw Error('Review duplicated Venerable Dreadnought MFM entries');
  // The flat 165-point entry is the same-named Legends Space Marine card
  // (source 000000356), not the current Space Wolves card (000000036).
  manual.units=manual.units.filter(u=>u!==duplicate[1]);
 }
 if(manual.units.length!==spec.membership||new Set(manual.units.map(u=>chapterNameKey(u.name))).size!==spec.membership)throw Error('Review '+spec.faction+' matched-play membership');
 return manual;
}
