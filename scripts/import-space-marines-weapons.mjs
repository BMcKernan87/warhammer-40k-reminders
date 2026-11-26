import {isDeepStrictEqual} from 'node:util';

/** Five current unit cards retain inherited weapon revision labels in the
 * independent extraction. These exact records are reconciled against the
 * current CSV and the current Indomitor card's explicit Hunter restrictions. */
export function spaceMarineWeapons(rows){
 const expected={
  'multi-melta-indomitor-kill-team':[
   {name:'Multi-melta',range:18,stats:{A:2,S:10,AP:-3,D:'D3+2',BS:3},keywords:[{keyword_id:'melta',parameters:{value:3}}]},
   {name:'Hunter',range:18,stats:{A:2,S:12,AP:-3,D:'D3+2',BS:2},keywords:[{keyword_id:'melta',parameters:{value:3}}]},
  ],
  'melta-rifle-indomitor-kill-team':[
   {name:'Melta Rifle',range:18,stats:{A:1,S:10,AP:-3,D:'D3+2',BS:3},keywords:[{keyword_id:'melta',parameters:{value:2}}]},
   {name:'Hunter',range:18,stats:{A:1,S:12,AP:-3,D:'D3+2',BS:2},keywords:[{keyword_id:'melta',parameters:{value:2}}]},
  ],
  'fragstorm-grenade-launcher-impulsor':[{name:'Fragstorm Grenade Launchers',range:18,stats:{A:6,BS:3,S:4,AP:-1,D:1},keywords:[{keyword_id:'blast',parameters:{value:2}}]}],
  'storm-bolter-impulsor':[{name:'Storm Bolters',range:24,stats:{A:4,BS:3,S:5,AP:-1,D:1},keywords:[{keyword_id:'rapid-fire',parameters:{value:4}}]}],
  'fragstorm-grenade-launcher-storm-speeder-hailstrike':[{name:'Fragstorm Grenade Launchers',range:18,stats:{A:6,BS:3,S:4,AP:-1,D:1},keywords:[{keyword_id:'blast',parameters:{value:2}},{keyword_id:'ignores-cover'}]}],
 };
 for(const [id,profiles] of Object.entries(expected)){
  const matches=rows.filter(w=>w.id===id);
  if(matches.length!==1||!isDeepStrictEqual(matches[0].game_version,{edition:'11th',dataslate:'pre-launch-provisional'})||!isDeepStrictEqual(matches[0].profiles,profiles))throw Error('Review independently reconciled Space Marine weapon '+id);
 }
 const plasma=rows.find(w=>w.id==='plasma-pistol-vanguard-veteran-squad-with-jump-packs');
 const plasmaProfile={name:'Plasma pistol',range:12,stats:{A:1,S:8,AP:-3,D:2,BS:3},keywords:[{keyword_id:'close-quarters'},{keyword_id:'hazardous'}]};
 if(!plasma||plasma.name!=='Plasma pistol'||plasma.game_version.dataslate!=='2026-10-14'||!isDeepStrictEqual(plasma.profiles,[plasmaProfile]))throw Error('Review Vanguard plasma modes');
 const blade=rows.find(w=>w.id==='talassarian-tempest-blade');
 const bladeProfiles=[
  {name:'Coup de Grace',range:'Melee',stats:{A:7,S:6,AP:-2,D:2,WS:2},keywords:[{keyword_id:'precision'}]},
  {name:'Strike',range:'Melee',stats:{A:5,S:6,AP:-3,D:3,WS:2},keywords:[{keyword_id:'devastating-wounds'}]},
  {name:'Sweep',range:'Melee',stats:{A:9,S:5,AP:-2,D:1,WS:2},keywords:[{keyword_id:'sustained-hits',parameters:{value:1,required_target_keywords_any:['Infantry']}}]},
 ];
 if(!blade||blade.game_version.dataslate!=='2026-10-14'||!isDeepStrictEqual(blade.profiles,bladeProfiles))throw Error('Review current Cato sword profiles');
 const singulars={
  'ironhail-heavy-stubber':['Ironhail Heavy Stubbers','Ironhail Heavy Stubber',{A:3,S:4,AP:-1,D:1,BS:3},36,'rapid-fire',3],
  'storm-bolter-astraeus':['Storm Bolters','Storm Bolter',{A:2,S:5,AP:-1,D:1,BS:3},24,'rapid-fire',2],
  'storm-bolter-deathwatch-terminator-squad':['Storm Bolters','Storm Bolter',{A:2,S:5,AP:-1,D:1,BS:3},24,'rapid-fire',2],
  'fragstorm-grenade-launcher':['Fragstorm Grenade Launchers','Fragstorm Grenade Launcher',{A:3,S:4,AP:-1,D:1,BS:3},18,'blast',1],
 };
 for(const [id,[name,printed,stats,range,ability,value]] of Object.entries(singulars)){
  const item=rows.find(w=>w.id===id);
  if(!item||item.name!==name||item.game_version.dataslate!=='2026-10-14'||!isDeepStrictEqual(item.profiles,[{name:printed,range,stats,keywords:[{keyword_id:ability,parameters:{value}}]}]))throw Error('Review singular printed weapon '+id);
 }
 return rows.map(w=>{
  if(w.id===blade.id)return {...w,profiles:[{...bladeProfiles[0],stats:{A:6,S:5,AP:-2,D:2,WS:2}},{...bladeProfiles[1],stats:{A:4,S:6,AP:-3,D:3,WS:2}},{...bladeProfiles[2],keywords:[{keyword_id:'sustained-hits',parameters:{value:1}}]}]};
  if(w.id===plasma.id)return {...w,profiles:[{name:'Standard',range:12,stats:{A:1,BS:3,S:7,AP:-2,D:1},keywords:[{keyword_id:'close-quarters'}]},{...plasmaProfile,name:'Supercharge'}]};
  if(singulars[w.id])return {...w,name:singulars[w.id][1]};
  return !expected[w.id]?w:{...w,game_version:{edition:'11th',dataslate:'2026-10-14'},profiles:w.profiles.map(p=>p.name!=='Hunter'?p:{...p,target_restrictions:{required_keywords_any:['Monster','Vehicle']}})};
 });
}
