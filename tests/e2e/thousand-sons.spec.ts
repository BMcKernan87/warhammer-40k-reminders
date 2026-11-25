import {expect,test,type Page,type TestInfo} from '@playwright/test';

const rubric='Rubric Marines',scarabs='Scarab Occult Terminators',terminator='Sorcerer In Terminator Armour',disc='Exalted Sorcerer on Disc of Tzeentch';
const rhino='Chaos Rhino',raider='Chaos Land Raider',keeper='Lord of Change',psychic='Cabal of Sorcerers · Psychic tests';
async function begin(page:Page,size:string,detachment:string){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Thousand Sons');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function add(page:Page,units:string[]){
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
function field(page:Page,kind:string,unit:string){return page.getByLabel(kind+' '+unit+'#1',{exact:true});}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
function card(page:Page,title:string){
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 return panel.locator('.check').filter({has:page.getByText(title,{exact:true})});
}
function printCard(page:Page,title:string){return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');}
async function verifyPrint(page:Page,info:TestInfo){
 const headings=await page.getByRole('region',{name:'Printable army reminders'}).locator('h3').allTextContents();
 expect(headings).toHaveLength(11);
 const pdf=await page.pdf({path:info.outputPath('reminders.pdf'),format:'A4',outline:true,tagged:true});
 expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 // Chromium's tagged output exposes genuine PDF outline entries for each printed phase.
 const bookmarks=Array.from(pdf.toString('latin1').matchAll(/\/Title\s+\(([^)]*)\)/g),m=>m[1]);
 for(const phase of headings)expect(bookmarks).toContain(phase);
}

test('mobile 1,000-point Grand Coven saves physical Rubric gear and prints rituals and weighted passenger lists to a full PDF',async({page},info)=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion','Grand Coven');
 await expect(page.getByLabel('Select unit',{exact:true}).locator('option').filter({hasText:/^Flamers$/})).toHaveCount(0);
 await add(page,['Ahriman',rubric,rhino,terminator,scarabs,raider,'Forgefiend']);
 await field(page,'Attach squad','Ahriman').selectOption(rubric+'#1');
 await field(page,'Attach squad',terminator).selectOption(scarabs+'#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption('Ahriman#1');
 const upgrade=field(page,'11th upgrade for squad',terminator);
 await upgrade.selectOption('Lord of Forbidden Lore');
 const cannon=field(page,'Rubric Marine 1 · Inferno boltgun alternatives for',rubric);
 const icon=field(page,'Rubric Marine 1 · Icon of flame for',rubric);
 await cannon.selectOption({label:'Soulreaper cannon'});
 await icon.selectOption({label:'Icon of flame'});
 const ecto=field(page,'Forgefiend jaws + Hades autocannon + Hades autocannon alternatives for','Forgefiend');
 await ecto.selectOption({label:'3 × Ectoplasma cannon + Forgefiend claws'});
 await total(page,1000);
 page.once('dialog',d=>d.accept('Separate force'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await total(page,1000);
 await expect(cannon).toHaveValue('Soulreaper cannon');
 await expect(icon).toHaveValue('Icon of flame');
 await expect(upgrade).toHaveValue('Lord of Forbidden Lore');
 await expect(ecto).toHaveValue('3 × Ectoplasma cannon + Forgefiend claws');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Shooting');
 const ritual=card(page,psychic);
 await expect(ritual).toContainText('Aspiring Sorcerer only');
 await expect(ritual).toContainText('Scarab Occult Sorcerer only');
 await expect(ritual.locator('.rule-subjects')).toContainText('Ahriman#1');
 await expect(ritual.locator('.rule-subjects')).not.toContainText('Forgefiend#1');
 await page.emulateMedia({media:'print'});
 const small=printCard(page,rhino+'#1 · Declare passengers');
 await expect(small).toContainText(rubric+'#1 (6 spaces)');
 await expect(small).not.toContainText(scarabs+'#1');
 await expect(printCard(page,raider+'#1 · Declare passengers')).toContainText(scarabs+'#1 (12 spaces)');
 await verifyPrint(page,info);
});

test('desktop 2,000-point Changehost applies source-dependent Ritual eligibility to a borrowed Psyker and preserves its paid Defiler',async({page},info)=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await begin(page,'Strike Force','Changehost of Deceit');
 await add(page,['Magnus The Red',keeper,'Pink Horrors','Screamers','Flamers',disc,rubric,'Tzaangor Shaman','Tzaangor Enlightened','Defiler','Tzaangors','War Dog Karnivore']);
 await field(page,'Attach squad',disc).selectOption(rubric+'#1');
 await field(page,'Attach squad','Tzaangor Shaman').selectOption('Tzaangor Enlightened#1');
 await field(page,'Models for squad','Tzaangors').selectOption('20');
 const upgrade=field(page,'11th upgrade for squad',disc);
 await upgrade.selectOption('Diabolic Savant');
 const defiler=field(page,'Heavy baleflamer + Heavy missile launcher alternatives for','Defiler');
 await defiler.selectOption({label:'2 × Hades lascannon'});
 await expect(page.getByText('Warlord: Magnus The Red#1',{exact:true})).toBeVisible();
 await total(page,2000);
 await page.reload();
 await total(page,2000);
 await expect(defiler).toHaveValue('2 × Hades lascannon');
 await expect(field(page,'Attach squad','Tzaangor Shaman')).toHaveValue('Tzaangor Enlightened#1');
 await expect(upgrade).toHaveValue('Diabolic Savant');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Shooting');
 const cast=card(page,psychic),subjects=cast.locator('.rule-subjects');
 await expect(subjects).toContainText('Magnus The Red#1');
 await expect(subjects).toContainText(keeper+'#1');
 await expect(subjects).not.toContainText('Flamers#1');
 await expect(subjects).not.toContainText('War Dog Karnivore#1');
 await expect(cast).toContainText('6″');
 await expect(cast).toContainText('visible');
 await expect(card(page,disc+'#1 · Rituals')).toContainText('add 1 to the test');
 await page.emulateMedia({media:'print'});
 await expect(printCard(page,'Magnus The Red#1 · Rituals')).toContainText('two different Rituals');
 await verifyPrint(page,info);
});
