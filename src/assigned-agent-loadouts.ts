import {chassis,slot,type KnightEquipment} from './knight-gear-options';

const close='Close combat weapon',bolt='Boltgun',pistol='Bolt pistol';
const shotgun='Arbites combat shotgun',shotpistol='Arbites shotpistol';
const copies=(name:string,count:number)=>Array<string>(count).fill(name);
const nuncio=slot('Proctor equipment',[],'Nuncio aquila');
const specialistWeapons=['Executioner shotgun','Arbites grenade launcher','Heavy stubber','Webber'];
const arbitesSpecialists=['First specialist','Second specialist'].map(label=>slot(label,shotgun,...specialistWeapons));
const arbitesStandard=[...copies(shotgun,8),...copies(shotpistol,10),...copies(close,10),'Mechanical bite'];
const breacherCharge={name:'Demolition charge bearer',choices:[
  {name:'None',items:[]},...['Las-volley gunner','Endurant shield bearer','Power weapon Armsman','Chainfist Armsman','Other shotgun Armsman']
    .map(name=>({name,items:['Demolition charge']})),
]};
const tracks='Armoured tracks', missile='Hunter-killer missile';
const hunter=slot('Hunter-killer missile',[],missile);

// Native and Assigned Agents use the same printed model equipment. Their
// separate points and muster limits are resolved using the army faction.
const loadouts: Readonly<Record<string,KnightEquipment>>={
  'Imperial Navy Breachers':chassis([...copies(close,10),...copies('Navis shotgun',5),'Navis heavy shotgun','Endurant shield'],
    slot('Sergeant weapons','Navis shotgun',['Autopistol','Chainsword'],[pistol,'Power weapon']),
    slot('Las-volley gunner','Navis las-volley','Meltagun','Plasma gun'),
    slot('Power weapon Armsman','Navis shotgun',['Autopistol','Power weapon']),
    slot('Chainfist Armsman','Navis shotgun',['Autopistol','Chainfist']),breacherCharge),
  'Vigilant Squad':chassis(arbitesStandard,...arbitesSpecialists,nuncio),
  'Subductor Squad':chassis([...copies(shotpistol,10),...copies('Shock maul',10),'Mechanical bite'],nuncio),
  // Each optional tool belongs to a different Vigilant retaining a standard shotgun.
  'Exaction Squad':chassis(arbitesStandard,...arbitesSpecialists,nuncio,
    ...['Excruciator maul','Arbites medi-kit','Soulguilt scanner'].map(item=>slot(item+' shotgun bearer',[],item))),
  'Grey Knights Terminator Squad':chassis([...copies('Nemesis force weapon',5),...copies('Storm bolter',3)],
    slot('Heavy gunner','Storm bolter','Incinerator','Psilencer','Psycannon'),
    slot('Apothecary equipment','Storm bolter','Narthecium'),slot('Storm bolter banner bearer',[],'Ancient’s banner')),
  'Sisters of Battle Squad':chassis([...copies(pistol,10),...copies(close,10),...copies(bolt,7)],
    slot('Sister Superior firearm',bolt,pistol,'Combi-weapon','Condemnor boltgun','Inferno pistol','Ministorum hand flamer','Plasma pistol'),
    slot('Sister Superior melee weapon',[],'Chainsword','Power weapon'),
    slot('Special gunner',bolt,'Artificer-crafted storm bolter','Meltagun','Ministorum flamer'),
    slot('Special or heavy gunner',bolt,'Artificer-crafted storm bolter','Heavy bolter','Meltagun','Ministorum flamer','Ministorum heavy flamer','Multi-melta'),
    slot('Boltgun icon bearer',[],'Simulacrum imperialis')),
  'Sanctifiers':chassis(['Holy fire','Burning hands',close,'Salvationist medikit','Death Cult blades','Ministorum flamer',
    ...copies('Sanctifier melee weapon',4),...copies('Ministorum hand flamer',4)],
    slot('Plasma Missionary','Plasma gun',['Plasma gun','Holy fire'],'Meltagun'),
    slot('Hand flamer Sanctifier','Sanctifier melee weapon',['Ministorum hand flamer',close]),
    slot('Icon Sanctifier','Sanctifier melee weapon',[close,'Simulacrum imperialis'])),
  'Inquisitor':chassis([],slot('Firearm','Bolt pistol','Combi-weapon'),slot('Inquisitorial gifts',
    ['Blessed wardings','Inquisitorial melee weapon'],
    ['Psychic gifts','Psychic Shock Wave','Inquisitorial melee weapon'],
    ['Psychic gifts','Psychic Shock Wave','Force weapon'])),
  'Inquisitor Kroyle':chassis(['Jindarii tox-cycler','Stubcarbine','Butcher blade','Garralisk’s claws and teeth']),
  'Ministorum Priest':chassis([],slot('Priest weapons','Zealot’s vindictor',['Holy pistol','Power weapon'])),
  'Corvus Blackstar':chassis(['Armoured hull','Auspex array'],slot('Main gun','Twin assault cannon','Twin lascannon'),
    slot('Missile launchers',['Blackstar rocket launcher','Blackstar rocket launcher'],['Stormstrike missile launcher','Stormstrike missile launcher']),
    slot('Hurricane bolter',[],'Hurricane bolter')),
  'Sisters of Battle Immolator':chassis(['Heavy bolter',tracks],slot('Turret','Immolation flamers','Twin heavy bolter','Twin multi-melta'),hunter),
  'Inquisitorial Chimera':chassis(['Lasgun array',tracks],slot('Hull gun','Heavy bolter','Heavy flamer'),
    slot('Turret','Multi-laser','Heavy bolter','Heavy flamer'),slot('Pintle weapon',[],'Heavy stubber','Storm bolter'),hunter),
  'Imperial Rhino':chassis(['Storm bolter',tracks],hunter),
};

function inquisitorialAgents(models:number):KnightEquipment {
  const servitors=models===12?2:1,agents=models-servitors,groups=Math.floor(agents/5);
  const slots=[];
  for(let i=1;i<=servitors;i++)slots.push(slot('Gun Servitor '+i,'Heavy bolter','Multi-melta','Plasma cannon'));
  for(let i=1;i<=groups;i++){
    slots.push(slot('Tome-skull '+i,[],'Tome-skull'));
    for(const item of ['Plasma pistol','Eviscerator','Mystic stave'])slots.push(slot(item+' bearer '+i,[],item));
  }
  return chassis([...copies('Agent firearm',agents),...copies('Agent melee weapon',models)],...slots);
}

const dwStandard=[bolt,'Power weapon'],knives='Knives and fists',shield='Storm shield';
const dwChoices=[dwStandard,'Heavy thunder hammer','Black Shield blades',['Stalker-pattern boltgun',knives],
  ['Deathwatch shotgun',knives],[bolt,shield],['Power weapon',shield],['Infernus heavy bolter',knives],['Frag cannon',knives]];
function deathwatchTeam(models:number):KnightEquipment {
  const veterans=Array.from({length:models-1},(_,i)=>slot('Deathwatch Veteran '+(i+1),...dwChoices));
  return chassis([],slot('Watch Sergeant firearm',bolt,'Combi-weapon'),slot('Watch Sergeant melee weapon','Power weapon','Xenophase blade'),...veterans);
}
// October MFM buildable compositions have fixed five- and ten-model groups.
// At ten models add one of each specialist and the one Xenophase Veteran.
function aquilaTeam(models:number):KnightEquipment {
  const groups=models/5;
  const fixed=['Plasma pistol','Power weapon',...copies('Special-issue bolt pistol',groups),...copies('Deathwatch marksman bolt carbine',groups),
    ...copies('Knives and fists',3*groups),...copies('Bolt pistol',3*groups)];
  if(models===10)fixed.push('Special-issue bolt pistol','Xenophase blade');
  const slots=[];
  for(let i=1;i<=groups;i++){
    slots.push(slot('Stalker Veteran '+i,'Stalker bolt rifle','Plasma incinerator'));
    slots.push(slot('Hammer Veteran '+i,'Heavy thunder hammer',['Power weapon','Storm shield']));
    slots.push(slot('Gravis Veteran '+i,'Infernus heavy bolter','Frag cannon',['Hellstorm bolt rifle','Astartes grenade launcher']));
  }
  return chassis(fixed,...slots);
}
export function agentLoadout(unit:string,models?:number):KnightEquipment|undefined {
  if(unit==='Aquila Kill Team')return models===undefined||models===5||models===10?aquilaTeam(models??5):undefined;
  if(unit==='Inquisitorial Agents'){
    const size=models??6;
    return Number.isInteger(size)&&size>=6&&size<=12?inquisitorialAgents(size):undefined;
  }
  if(unit==='Deathwatch Kill Team'){
    const size=models??5;
    return Number.isInteger(size)&&size>=5&&size<=10?deathwatchTeam(size):undefined;
  }
  return Object.hasOwn(loadouts,unit)?loadouts[unit]:undefined;
}

export function validAgentGear(unit:string,gear:Record<string,string>,models?:number):boolean {
  if(unit==='Exaction Squad'||unit==='Vigilant Squad'){
    const first=gear['First specialist'];
    if(first&&first!=='Arbites combat shotgun'&&first===gear['Second specialist'])return false;
  }
  if(unit==='Deathwatch Kill Team'){
    const group=Math.floor((models??5)/5);
    const selections=Object.entries(gear).filter(([slot])=>slot.startsWith('Deathwatch Veteran ')).map(([,choice])=>choice.split(' + '));
    const limits:Record<string,number>={'Black Shield blades':1,'Heavy thunder hammer':2*group,'Deathwatch shotgun':2*group,
      [shield]:2*group,'Stalker-pattern boltgun':group,'Infernus heavy bolter':group,'Frag cannon':group};
    return Object.entries(limits).every(([item,limit])=>selections.filter(kit=>kit.includes(item)).length<=limit);
  }
  return true;
}

export function resizeAgentGear(unit:string,gear:Record<string,string>,models:number):Record<string,string> {
  if(!['Deathwatch Kill Team','Aquila Kill Team','Inquisitorial Agents'].includes(unit))return gear;
  const result:Record<string,string>={};
  for(const slot of agentLoadout(unit,models)?.slots??[]){
    const chosen=gear[slot.name];
    if(slot.choices.some(c=>c.name===chosen)&&validAgentGear(unit,{...result,[slot.name]:chosen},models))result[slot.name]=chosen;
  }
  return result;
}
