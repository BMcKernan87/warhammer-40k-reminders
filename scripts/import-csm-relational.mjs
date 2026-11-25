import {isDeepStrictEqual} from 'node:util';

/** Current Defiler replacements retain two provisional IDs in the independent
 * extraction. The publisher card supplies the current names and sweep mode;
 * import-csm-profiles checks every resulting field against the current CSV.
 * https://assets.warhammer-community.com/eng_wh40k_faction_pack_chaos_space_marines-vs0xkzuia9-omgej8huqu.pdf */
export function csmWeapons(records){
 return records.map(w=>{
  if(!['defiler-cannon','defiler-claws'].includes(w.id))return w;
  if(w.game_version.edition!=='11th'||w.game_version.dataslate!=='pre-launch-provisional'||w.profiles.length!==1)throw Error('Review Defiler replacement metadata');
  const p=w.profiles[0],cannon=w.id==='defiler-cannon';
  const expected=cannon?{name:'Defiler cannon',range:48,stats:{A:'D6+3',S:10,AP:-1,D:3,BS:3},keywords:[{keyword_id:'blast'}]}:{name:'Defiler claws',range:'Melee',stats:{A:5,S:16,AP:-3,D:'D6+1',WS:3},keywords:[]};
  if(!isDeepStrictEqual(p,expected)||w.name!==expected.name)throw Error('Review Defiler replacement characteristics');
  const name=cannon?'Hades battle cannon':'Shearing claws';
  const profiles=cannon?[{...p,name}]:[{...p,name:'strike'},{name:'sweep',range:'Melee',stats:{A:10,S:6,AP:-2,D:1,WS:3},keywords:[]}];
  return {...w,name,profiles,game_version:{edition:'11th',dataslate:'2026-10-14'}};
 });
}
