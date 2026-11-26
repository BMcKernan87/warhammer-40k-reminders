import {spaceMarineWeapons} from './import-space-marines-weapons.mjs';
import {isDeepStrictEqual} from 'node:util';

/** Chapter cards share audited weapons with the base Adeptus Astartes data.
 * Preserve the independent weapon IDs so identically named chapter vehicles
 * remain distinct. Additional chapter corrections are exact-record guards. */
export function chapterWeapons(rows){
 const normalized=spaceMarineWeapons(rows),byId=new Map(normalized.map(w=>[w.id,w]));
 function checked(id,name,profiles){
  const row=byId.get(id);
  if(!row||row.name!==name||!isDeepStrictEqual(row.game_version,{edition:'11th',dataslate:'2026-10-14'})||!isDeepStrictEqual(row.profiles,profiles))throw Error('Review chapter weapon correction '+id);
  return row;
 }
 const singulars=['storm-bolter','storm-bolter-deathwing-terminator-squad','storm-bolter-murderfang','storm-bolter-wulfen-dreadnought','storm-bolter-baal-predator'];
 for(const id of singulars)checked(id,'Storm Bolters',[{name:'Storm Bolter',range:24,stats:{A:2,S:5,AP:-1,D:1,BS:3},keywords:[...(id==='storm-bolter-baal-predator'?[{keyword_id:'assault'}]:[]),{keyword_id:'rapid-fire',parameters:{value:2}}]}]);
 checked('bolt-rifle','Bolt Rifles',[
  {name:'Focused Fire',range:24,stats:{A:1,S:6,AP:-1,D:2,BS:3},keywords:[{keyword_id:'heavy'},{keyword_id:'rapid-fire',parameters:{value:1}}]},
  {name:'Saturation',range:24,stats:{A:2,S:5,AP:-1,D:1,BS:3},keywords:[{keyword_id:'assault'},{keyword_id:'rapid-fire',parameters:{value:1}}]},
 ]);
 checked('chainfist-deathwing-terminator-squad','Chainfist',[
  {name:'Chainfist',range:'Melee',stats:{A:2,S:8,AP:-2,D:2,WS:4},keywords:[]},
  {name:'Chainfist',range:'Melee',stats:{A:3,S:12,AP:-2,D:3,WS:3},keywords:[{keyword_id:'hunter',parameters:{target_keyword:'Monster'}},{keyword_id:'hunter',parameters:{target_keyword:'Vehicle'}}],target_restrictions:{required_keywords_any:['Monster','Vehicle']}},
 ]);
 checked('assault-cannon-bjorn-the-fell-handed','Assault cannon',[{name:'Assault Cannon',range:24,stats:{A:6,S:6,AP:-2,D:1,BS:3},keywords:[{keyword_id:'sustained-hits',parameters:{value:1}}]}]);
 checked('heavy-bolt-pistol-castellan','Heavy Bolt Pistol',[{name:'Heavy Bolt Pistol',range:18,stats:{A:1,S:5,AP:-1,D:1,BS:2},keywords:[{keyword_id:'close-quarters'}]}]);
 return normalized.map(w=>{
  if(singulars.includes(w.id))return {...w,name:'Storm Bolter'};
  if(w.id==='bolt-rifle')return {...w,name:'Bolt Rifle'};
  if(w.id==='chainfist-deathwing-terminator-squad')return {...w,profiles:w.profiles.map((p,i)=>({...p,name:i?'Hunter':'Standard'}))};
  if(w.id==='assault-cannon-bjorn-the-fell-handed')return {...w,profiles:w.profiles.map(p=>({...p,stats:{...p.stats,BS:2}}))};
  // Both the live current card and CSV retain S4/Pistol. Preserve that printed
  // label; Core 24.27 explicitly makes Pistol identical to Close-quarters.
  if(w.id==='heavy-bolt-pistol-castellan')return {...w,profiles:w.profiles.map(p=>({...p,stats:{...p.stats,S:4},keywords:[{keyword_id:'pistol'}]}))};
  return w;
 });
}
