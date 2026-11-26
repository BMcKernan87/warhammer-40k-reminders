import {isDeepStrictEqual} from 'node:util';

/** The independent Talos weapon retains a provisional revision marker and a
 * misspelled stable ID. Its complete profile matches the current v1.2 card:
 * https://wahapedia.ru/wh40k11ed/factions/drukhari/Talos
 * Keep the ID for loadout joins; require every printed characteristic before
 * allowing this one explicitly reviewed current-edition record. */
export function drukhariWeapons(records){
 return records.map(w=>{
  if(w.id!=='maco-scalpel')return w;
  if(!isDeepStrictEqual(w,{id:'maco-scalpel',name:'Macro-scalpel',type:'melee',profiles:[{name:'Macro-scalpel',range:'Melee',stats:{A:5,S:7,AP:-2,D:2,WS:3},keywords:[]}],game_version:{edition:'11th',dataslate:'pre-launch-provisional'}}))throw Error('Review current Talos macro-scalpel');
  return {...w,game_version:{edition:'11th',dataslate:'2026-10-14'}};
 });
}
