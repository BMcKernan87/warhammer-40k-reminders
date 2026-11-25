import {SORORITAS_DETACHMENTS} from './sororitas-detachments.generated';
import {currentEcDetachment} from './emperors-children-detachment-data';
import {EMP_CHILDREN_DETACHMENTS} from './emperors-children-detachments.generated';
import {TS_DETACHMENTS} from './thousand-sons-detachments.generated';
import {currentDeathGuardDetachment} from './death-guard-detachment-data';
import {DG_DETACHMENTS} from './death-guard-detachments.generated';
import {ASTRA_DETACHMENTS} from './astra-detachments.generated';
import {GSC_DETACHMENTS} from './gsc-detachments.generated';
import {currentGscDetachment} from './gsc-detachment-data';
import {WORLD_EATERS_DETACHMENTS} from './world-eaters-detachments.generated';
import {VOTANN_DETACHMENTS} from './votann-detachments.generated';
import type {Faction} from './catalog';
import {DAEMON_DETACHMENTS} from './chaos-daemon-detachments.generated';
export type ForceDisposition='Take and Hold'|'Disruption'|'Purge the Foe'|'Priority Assets'|'Reconnaissance';
export interface Detachment2026 {name:string;disposition:ForceDisposition;dp:1|2|3;additionalDispositions?:readonly ForceDisposition[]}
export const EDITION_2026_SOURCE='https://www.warhammer-community.com/en-gb/articles/fchkklcq/new40k-download-new-xenos-faction-packs-today/';
export const DETACHMENTS_2026:Partial<Record<Faction,readonly Detachment2026[]>>={
 'Space Marines':[
 {name:"Fulguris Task Force",disposition:"Disruption",dp:1},
 {name:"Librarius Conclave",disposition:"Reconnaissance",dp:1},
 {name:"Subversion Assets",disposition:"Reconnaissance",dp:1},
 {name:"1st Company Task Force",disposition:"Priority Assets",dp:2},
 {name:"Anvil Siege Force",disposition:"Take and Hold",dp:2},
 {name:"Armoured Speartip",disposition:"Take and Hold",dp:3},
 {name:"Bastion Task Force",disposition:"Take and Hold",dp:2},
 {name:"Blade of Ultramar",disposition:"Priority Assets",dp:3},
 {name:"Ceramite Sentinels",disposition:"Take and Hold",dp:3},
 {name:"Emperor's Shield",disposition:"Priority Assets",dp:2},
 {name:"Firestorm Assault Force",disposition:"Purge the Foe",dp:2},
 {name:"Forgefather's Seekers",disposition:"Purge the Foe",dp:2},
 {name:"Gladius Task Force",disposition:"Priority Assets",dp:3},
 {name:"Hammer of Avernii",disposition:"Priority Assets",dp:2},
 {name:"Headhunter Task Force",disposition:"Priority Assets",dp:2},
 {name:"Ironstorm Spearhead",disposition:"Purge the Foe",dp:2},
 {name:"Orbital Assault Force",disposition:"Take and Hold",dp:2},
 {name:"Reclamation Force",disposition:"Take and Hold",dp:2},
 {name:"Shadowmark Talon",disposition:"Disruption",dp:2},
 {name:"Spearpoint Task Force",disposition:"Disruption",dp:2},
 {name:"Stormlance Task Force",disposition:"Disruption",dp:3},
 {name:"Vanguard Spearhead",disposition:"Reconnaissance",dp:2},
 ],
 "Chaos Space Marines":[
  {name:"Cabal of Chaos",disposition:"Disruption",dp:1},
  {name:"Devotees of Destruction",disposition:"Priority Assets",dp:1},
  {name:"Murdertalon Raiders",disposition:"Purge the Foe",dp:1},
  {name:"Chaos Cult",disposition:"Priority Assets",dp:2},
  {name:"Creations of Bile",disposition:"Purge the Foe",dp:3},
  {name:"Cult of the Arkifane",disposition:"Priority Assets",dp:2},
  {name:"Deceptors",disposition:"Disruption",dp:2},
  {name:"Dread Talons",disposition:"Disruption",dp:2},
  {name:"Fellhammer Siege-host",disposition:"Take and Hold",dp:2},
  {name:"Huron's Marauders",disposition:"Disruption",dp:3},
  {name:"Nightmare Hunt",disposition:"Disruption",dp:2},
  {name:"Pactbound Zealots",disposition:"Priority Assets",dp:3},
  {name:"Renegade Raiders",disposition:"Reconnaissance",dp:3},
  {name:"Renegade Warband",disposition:"Priority Assets",dp:2},
  {name:"Soulforged Warpack",disposition:"Purge the Foe",dp:2},
  {name:"Veterans of the Long War",disposition:"Take and Hold",dp:2},
  {name:"Warpstrike Champions",disposition:"Disruption",dp:2},
 ],
 'World Eaters':WORLD_EATERS_DETACHMENTS,
 'Emperor’s Children':EMP_CHILDREN_DETACHMENTS,
 'Death Guard':DG_DETACHMENTS,
 'Thousand Sons':TS_DETACHMENTS,
 "Chaos Knights":[
  {name:"Bastions of Tyranny",disposition:"Priority Assets",dp:1},
  {name:"Hunting Warpack",disposition:"Reconnaissance",dp:1},
  {name:"Iconoclast Fiefdom",disposition:"Take and Hold",dp:1},
  {name:"Helhunt Lance",disposition:"Disruption",dp:2},
  {name:"Houndpack Lance",disposition:"Reconnaissance",dp:2},
  {name:"Infernal Lance",disposition:"Priority Assets",additionalDispositions:["Purge the Foe"],dp:3},
  {name:"Lords of Dread",disposition:"Take and Hold",dp:2},
  {name:"Traitoris Lance",disposition:"Purge the Foe",dp:2},
 ],
 "Chaos Daemons":DAEMON_DETACHMENTS.map(det=>({
  name:det.name,dp:det.dp as 1|2|3,disposition:det.objectives[0] as ForceDisposition,
  additionalDispositions:det.objectives.slice(1) as ForceDisposition[],
 })),
 'Astra Militarum':ASTRA_DETACHMENTS,

 "Adeptus Mechanicus":[
  {name:"Cohort Acquisitus",disposition:"Reconnaissance",dp:1},
  {name:"Lords of the Forge",disposition:"Priority Assets",dp:1},
  {name:"Luminen Auto-Choir",disposition:"Disruption",dp:1},
  {name:"Cohort Cybernetica",disposition:"Take and Hold",dp:2},
  {name:"Data-psalm Conclave",disposition:"Disruption",dp:2},
  {name:"Eradication Cohort",disposition:"Purge the Foe",dp:3},
  {name:"Explorator Maniple",disposition:"Priority Assets",dp:2},
  {name:"Haloscreed Battle Clade",disposition:"Purge the Foe",dp:3},
  {name:"Rad-zone Corps",disposition:"Take and Hold",dp:2},
  {name:"Skitarii Hunter Cohort",disposition:"Reconnaissance",dp:2},
 ],
 "Imperial Knights":[
  {name:"Dominus Foebreakers",disposition:"Priority Assets",dp:1},
  {name:"Questor Forgepact",disposition:"Disruption",dp:1},
  {name:"Throne-bonded Outriders",disposition:"Reconnaissance",dp:1},
  {name:"Freeblade Company",disposition:"Priority Assets",additionalDispositions:["Purge the Foe"],dp:3},
  {name:"Gate Warden Lance",disposition:"Take and Hold",dp:2},
  {name:"Questoris Companions",disposition:"Take and Hold",additionalDispositions:["Reconnaissance"],dp:3},
  {name:"Spearhead-at-arms",disposition:"Reconnaissance",dp:2},
  {name:"Valourstrike Lance",disposition:"Purge the Foe",dp:2},
 ],
 "Adeptus Custodes":[
  {name:"Aquilan Shield",disposition:"Take and Hold",dp:1},
  {name:"Auric Champions",disposition:"Purge the Foe",dp:1},
  {name:"Dread Host",disposition:"Purge the Foe",dp:1},
  {name:"Emissaries Imperatus",disposition:"Priority Assets",dp:1},
  {name:"Emperor’s Chosen",disposition:"Priority Assets",dp:1},
  {name:"Grav-Assault Force",disposition:"Reconnaissance",dp:1},
  {name:"Guardians of the Throne",disposition:"Priority Assets",additionalDispositions:["Purge the Foe"],dp:3},
  {name:"Honoured Companions",disposition:"Take and Hold",dp:1},
  {name:"Lions of the Emperor",disposition:"Disruption",dp:1},
  {name:"Might of the Moritoi",disposition:"Take and Hold",dp:1},
  {name:"Null Maiden Vigil",disposition:"Disruption",dp:1},
  {name:"Shadowkeepers",disposition:"Purge the Foe",dp:1},
  {name:"Solar Watch",disposition:"Reconnaissance",dp:1},
 ],
 "Imperial Agents":[
  {name:"Imperialis Fleet",disposition:"Reconnaissance",dp:2},
  {name:"Ordo Hereticus, Purgation Force",disposition:"Take and Hold",dp:2},
  {name:"Ordo Malleus, Daemon Hunters",disposition:"Priority Assets",dp:2},
  {name:"Ordo Xenos, Alien Hunters",disposition:"Purge the Foe",dp:2},
  {name:"Veiled Blade Elimination Force",disposition:"Disruption",dp:1},
 ],
 "Aeldari":[
  {name:"Armoured Warhost",disposition:"Reconnaissance",dp:1},
  {name:"Fateful Performance",disposition:"Disruption",dp:1},
  {name:"Path of the Outcast",disposition:"Reconnaissance",dp:1},
  {name:"Twilight Flickers",disposition:"Take and Hold",dp:1},
  {name:"Aspect Host",disposition:"Disruption",dp:3},
  {name:"Corsair Coterie",disposition:"Priority Assets",dp:2},
  {name:"Devoted of Ynnead",disposition:"Priority Assets",dp:2},
  {name:"Eldritch Raiders",disposition:"Disruption",dp:2},
  {name:"Ghosts of the Webway",disposition:"Disruption",dp:2},
  {name:"Guardian Battlehost",disposition:"Take and Hold",dp:2},
  {name:"Seer Council",disposition:"Priority Assets",dp:2},
  {name:"Serpent's Brood",disposition:"Purge the Foe",dp:2},
  {name:"Spirit Conclave",disposition:"Take and Hold",dp:2},
  {name:"Warhost",disposition:"Purge the Foe",dp:3},
  {name:"Windrider Host",disposition:"Disruption",dp:2},
 ],
 "Drukhari":[
  {name:"Exhibition of Slaughter",disposition:"Disruption",dp:1},
  {name:"Kabalite Agonysts",disposition:"Purge the Foe",dp:1},
  {name:"Tools of Torment",disposition:"Take and Hold",dp:1},
  {name:"Covenite Coterie",disposition:"Purge the Foe",dp:2},
  {name:"Kabalite Cartel",disposition:"Disruption",dp:2},
  {name:"Realspace Raiders",disposition:"Priority Assets",dp:2},
  {name:"Reaper's Wager",disposition:"Purge the Foe",dp:3},
  {name:"Skysplinter Assault",disposition:"Reconnaissance",dp:2},
  {name:"Spectacle of Spite",disposition:"Purge the Foe",dp:2},
 ],
 'Genestealer Cults':GSC_DETACHMENTS,
 'Leagues of Votann':VOTANN_DETACHMENTS,
 "T’au Empire":[
  {name:"Advanced Acquisition Cadre",disposition:"Reconnaissance",dp:1},
  {name:"Auxillary Cadre",disposition:"Disruption",dp:1},
  {name:"Experimental Prototype Cadre",disposition:"Priority Assets",dp:1},
  {name:"Kauyon",disposition:"Priority Assets",dp:2},
  {name:"Kroot Hunting Pack",disposition:"Take and Hold",dp:2},
  {name:"Mont'ka",disposition:"Purge the Foe",dp:3},
  {name:"Retaliation Cadre",disposition:"Purge the Foe",dp:2},
 ],
 "Dark Angels":[
  {name:"Dark Age Arsenal",disposition:"Priority Assets",dp:1},
  {name:"Darkflight Pursuit",disposition:"Reconnaissance",dp:1},
  {name:"Interrogation Conclave",disposition:"Purge the Foe",dp:1},
  {name:"Company of Hunters",disposition:"Disruption",dp:2},
  {name:"Inner Circle Task Force",disposition:"Priority Assets",dp:2},
  {name:"Lion's Blade Task Force",disposition:"Purge the Foe",dp:2},
  {name:"Unforgiven Task Force",disposition:"Take and Hold",dp:2},
  {name:"Wrath of the Rock",disposition:"Priority Assets",dp:3},
 ],
 "Blood Angels":[
  {name:"Encarmine Speartip",disposition:"Disruption",dp:1},
  {name:"Legacy of Grace",disposition:"Priority Assets",dp:1},
  {name:"Wrath of the Doomed",disposition:"Purge the Foe",dp:1},
  {name:"Angelic Inheritors",disposition:"Priority Assets",dp:3},
  {name:"Liberator Assault Group",disposition:"Take and Hold",dp:3},
  {name:"Rage-cursed Onslaught",disposition:"Purge the Foe",dp:3},
  {name:"The Angelic Host",disposition:"Disruption",dp:2},
  {name:"The Lost Brethren",disposition:"Purge the Foe",dp:2},
 ],
 "Space Wolves":[
  {name:"Champions of Fenris",disposition:"Purge the Foe",dp:1},
  {name:"Legends of Saga and Song",disposition:"Take and Hold",dp:1},
  {name:"Veterans of the Fang",disposition:"Disruption",dp:1},
  {name:"Saga of the Beastslayer",disposition:"Purge the Foe",dp:2},
  {name:"Saga of the Bold",disposition:"Priority Assets",dp:2},
  {name:"Saga of the Great Wolf",disposition:"Take and Hold",dp:2},
  {name:"Saga of the Hunter",disposition:"Disruption",dp:2},
 ],
 "Black Templars":[
  {name:"Marshal's Household",disposition:"Priority Assets",dp:1},
  {name:"The Living Miracle",disposition:"Purge the Foe",dp:1},
  {name:"Wrathful Procession",disposition:"Take and Hold",dp:1},
  {name:"Companions of Vehemence",disposition:"Purge the Foe",dp:2},
  {name:"Godhammer Assault Force",disposition:"Disruption",dp:2},
  {name:"Vindication Task Force",disposition:"Priority Assets",dp:2},
 ],
 'Adepta Sororitas':SORORITAS_DETACHMENTS,
 'Grey Knights':GK_DETACHMENTS,
 Necrons:[
 {name:'Hand of the Dynasty',disposition:'Take and Hold',dp:1},
 {name:'Skysword Spearhead',disposition:'Reconnaissance',dp:1},
 {name:"The Phaeron's Armoury",disposition:'Priority Assets',dp:1},
 {name:'Annihilation Legion',disposition:'Purge the Foe',dp:2},
 {name:'Awakened Dynasty',disposition:'Take and Hold',additionalDispositions:['Priority Assets'],dp:3},
 {name:'Canoptek Court',disposition:'Take and Hold',dp:2},
 {name:'Cryptek Conclave',disposition:'Priority Assets',dp:2},
 {name:'Cursed Legion',disposition:'Purge the Foe',dp:2},
 {name:'Hypercrypt Legion',disposition:'Reconnaissance',dp:2},
 {name:'Obeisance Phalanx',disposition:'Disruption',dp:2},
 {name:'Pantheon of Woe',disposition:'Disruption',dp:2},
 {name:'Starshatter Arsenal',disposition:'Priority Assets',additionalDispositions:['Purge the Foe'],dp:3}],
 Orks:[
 {name:'Blitz Brigade',disposition:'Take and Hold',dp:1},
 {name:'Brute Bosses',disposition:'Purge the Foe',dp:1},
 {name:'Bully Boyz',disposition:'Purge the Foe',dp:1},
 {name:'Da Big Hunt',disposition:'Purge the Foe',dp:1},
 {name:'Dread Mob',disposition:'Purge the Foe',dp:1},
 {name:'Flyboyz',disposition:'Reconnaissance',dp:1},
 {name:'Green Tide',disposition:'Take and Hold',dp:1},
 {name:'Kult of Speed',disposition:'Reconnaissance',dp:1},
 {name:'Madcap Meks',disposition:'Disruption',dp:1},
 {name:'Runt Swarm',disposition:'Priority Assets',dp:1},
 {name:'Shoota Boyz',disposition:'Purge the Foe',dp:1},
 {name:'Taktikal Brigade',disposition:'Take and Hold',dp:1},
 {name:'War Horde',disposition:'Take and Hold',additionalDispositions:['Purge the Foe'],dp:3},
 {name:'Wreckas',disposition:'Priority Assets',dp:1},
 {name:'Wurrband',disposition:'Disruption',dp:1}],
 Tyranids:[
 {name:'Ambush Predators',disposition:'Disruption',dp:1},
 {name:'Talons of the Norn Queen',disposition:'Take and Hold',dp:1},
 {name:'Warrior Bioform Onslaught',disposition:'Take and Hold',dp:1},
 {name:'Assimilation Swarm',disposition:'Priority Assets',dp:2},
 {name:'Crusher Stampede',disposition:'Purge the Foe',dp:2},
 {name:'Invasion Fleet',disposition:'Take and Hold',dp:3},
 {name:'Subterranean Assault',disposition:'Disruption',dp:3},
 {name:'Synaptic Nexus',disposition:'Disruption',dp:2},
 {name:'Unending Swarm',disposition:'Take and Hold',dp:2},
 {name:'Vanguard Onslaught',disposition:'Reconnaissance',dp:2}]
};
export type BattleSize2026='Incursion'|'Strike Force';
export const BATTLE_SIZES_2026:Record<BattleSize2026,{points:number;dp:number;enhancements:number;unitLimit:number}>={
 Incursion:{points:1000,dp:2,enhancements:2,unitLimit:2},
 'Strike Force':{points:2000,dp:3,enhancements:4,unitLimit:3}
};
export function detachmentBudget(faction:Faction,selected:readonly string[],size:BattleSize2026){
 const available=DETACHMENTS_2026[faction];
 if(!available)return {supported:false,spent:0,limit:BATTLE_SIZES_2026[size].dp,valid:false,dispositions:[] as ForceDisposition[]};
 const names=faction==='Death Guard'?selected.map(currentDeathGuardDetachment):faction==='Emperor’s Children'?selected.map(currentEcDetachment):faction==='Genestealer Cults'?selected.map(currentGscDetachment):selected;
 const entries=names.map(name=>available.find(d=>d.name===name));
 const spent=entries.reduce((sum,d)=>sum+(d?.dp||0),0);
 const groups=faction==='Adepta Sororitas'?[['Champions of Faith','Sacred Champions']]:faction==='Thousand Sons'?[['Servants of Change','Warpmeld Pact']]:faction==='Astra Militarum'?[['Abhuman Auxiliaries','Grizzled Company'],['Recon Element','Designation Force']]:faction==='Genestealer Cults'?[['Host of Ascension','Xenocult Masses']]:faction==='Adeptus Custodes'?[['Aquilan Shield','Dread Host','Emissaries Imperatus','Emperor’s Chosen','Shadowkeepers','Solar Watch']]:faction==='Necrons'?[['Awakened Dynasty','Hand of the Dynasty'],['Hypercrypt Legion',"The Phaeron's Armoury"]]:faction==='Imperial Knights'?[['Spearhead-at-arms','Throne-bonded Outriders']]:[];
 const conflicts=groups.some(group=>names.filter(d=>group.includes(d)).length>1);
 const limit=BATTLE_SIZES_2026[size].dp;
 const soloThreeDP=size==='Incursion'&&entries.length===1&&entries[0]?.dp===3;
 return {supported:true,spent,limit:soloThreeDP?3:limit,valid:selected.length>0&&new Set(names).size===names.length&&entries.every(Boolean)&&!conflicts&&(spent<=limit||soloThreeDP),dispositions:[...new Set(entries.filter((d):d is Detachment2026=>!!d).flatMap(d=>[d.disposition,...(d.additionalDispositions??[])]))]};
}
import {GK_DETACHMENTS} from './grey-knights-detachments.generated';
