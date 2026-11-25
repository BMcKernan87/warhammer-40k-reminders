/** The current unit points to this unchanged weapon, whose revision tag was
 * not advanced in the independent extraction. Every statistic is also
 * compared against the current 11e card by import-tyranid-profiles.mjs. */
export function tyranidWeapons(records){
 return records.map(w=>{
  if(w.id!=='scream-killer-talons'||w.game_version.dataslate!=='pre-launch-provisional')return w;
  const p=w.profiles[0];
  if(w.name!=='Screamer-Killer talons'||w.game_version.edition!=='11th'||w.profiles.length!==1||p.range!=='Melee'||p.stats.A!==10||p.stats.WS!==3||p.stats.S!==10||p.stats.AP!==-2||p.stats.D!==3||p.keywords.length)throw Error('Review Screamer-Killer talons revision');
  return {...w,game_version:{edition:'11th',dataslate:'2026-10-14'}};
 });
}
