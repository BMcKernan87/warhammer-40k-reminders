import {writeFileSync} from 'node:fs';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,out]=process.argv.slice(2);
if(!out)throw Error('Usage: node scripts/import-world-eaters-blessings.mjs 11E_CSV_DIR OUTPUT_TS');
const {tables}=await loadExport({directory});
const rule=tables.Abilities.find(a=>a.faction_id==='WE'&&a.name==='Blessings of Khorne');
const cards=tables.Datasheets.filter(s=>s.faction_id==='WE'&&s.source_id==='000000210');
if(cards.length!==30||!rule)throw Error('Review the World Eaters matched roster or army rule');
const ruleText=Object.values(rule).find(v=>v.includes('cruWEwrap'));
const dice={};
for(const m of ruleText.matchAll(/class="impact18">([^<]+)<\/p><p><div class="cruWEwrapAll"><div class="cruWEwrap">([\s\S]*?)<\/div><div class="cruWEright"/g)){
 const name=m[1].toLowerCase().replace(/(^|[ -])\w/g,letter=>letter.toUpperCase());
 dice[name]=m[2].split('<div class="cruORw"></div>').map(option=>{
  const faces=[...option.matchAll(/class="cruD(\d)w"/g)].map(face=>Number(face[1]));
  if(![2,3].includes(faces.length)||new Set(faces).size!==1)throw Error('Unknown dice requirement '+name);
  const amount=faces.length===2?'double':'triple';
  return faces[0]===1?'any '+amount:amount+' '+faces[0]+(option.includes('cruPlusw')?'+':'');
 }).join(' or ');
}
const recipients=cards.filter(s=>tables.Datasheets_abilities.some(a=>a.datasheet_id===s.id&&a.ability_id===rule.id)).map(s=>s.name).sort();
if(Object.keys(dice).length!==6||recipients.length!==25)throw Error('Review the six Blessings and 25 cards with the printed ability');
writeFileSync(out,'// Generated from the 11e World Eaters rules and matched-play datasheets.\nexport const BLESSING_DICE='+JSON.stringify(dice,null,1)+' as const;\nexport const BLESSING_RECIPIENTS:readonly string[]='+JSON.stringify(recipients)+';\n');
