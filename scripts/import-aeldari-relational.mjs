import {isDeepStrictEqual} from 'node:util';

/** These three unchanged profiles retain stale metadata in the independent
 * relational export. Every characteristic and keyword is checked against the
 * current card here and again by the complete profile importer. */
export function aeldariWeapons(rows){
 const expected={
  'chainsabres':[
   {name:'Ranged',range:12,stats:{A:1,S:4,AP:-1,D:1,BS:3},keywords:[{keyword_id:'assault'},{keyword_id:'pistol'},{keyword_id:'twin-linked'}]},
   {name:'Melee',range:'Melee',stats:{A:5,S:4,AP:-1,D:1,WS:3},keywords:[{keyword_id:'sustained-hits',parameters:{value:1}},{keyword_id:'twin-linked'}]},
  ],
  'kha-vir-the-sword-of-sorrows':[{name:'Kha-vir, the Sword of Sorrows',range:'Melee',stats:{A:5,S:4,AP:-3,D:2,WS:2},keywords:[{keyword_id:'devastating-wounds'}]}],
  'the-fire-axe':[{name:'The Fire Axe',range:'Melee',stats:{A:6,S:5,AP:-4,D:3,WS:2},keywords:[]}],
 };
 for(const [id,profiles] of Object.entries(expected)){
  const matches=rows.filter(w=>w.id===id);
  if(matches.length!==1||!isDeepStrictEqual(matches[0].game_version,{edition:'11th',dataslate:'pre-launch-provisional'})||!isDeepStrictEqual(matches[0].profiles,profiles))throw Error('Review independently reconciled Aeldari weapon '+id);
 }
 return rows.map(w=>expected[w.id]?{...w,game_version:{edition:'11th',dataslate:'2026-10-14'}}:w);
}
