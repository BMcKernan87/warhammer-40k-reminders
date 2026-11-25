import {expect,test,type Page} from '@playwright/test';

const scions='Tempestus Scions',tempestus='Militarum Tempestus Command Squad';
const cadianCommand='Cadian Command Squad',shock='Cadian Shock Troops',commander='Leman Russ Commander';
async function begin(page:Page,size:string,detachment:string){
 await page.goto('./');
 await page.getByLabel('Army faction',{exact:true}).selectOption('Astra Militarum');
 await page.getByLabel('2026 battle size',{exact:true}).selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
}
async function add(page:Page,units:string[]){
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
async function total(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}
function attachment(page:Page,leader:string){return page.getByLabel('Attach squad '+leader+'#1',{exact:true});}
function protector(page:Page,unit:string){return page.getByLabel('Command Squad for '+unit+'#1',{exact:true});}
function printRow(page:Page,title:string){
 return page.getByRole('region',{name:'Printable army reminders'}).getByText(title,{exact:true}).locator('..');
}
function orderTargets(page:Page,officer:string){
 const panel=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
 return panel.locator('.check').filter({has:page.getByText(officer+'#1 · Voice of Command',{exact:true})}).locator('.rule-subjects');
}

test('mobile 1,000-point Bridgehead Strike remembers mixed Scions and counts Nork as three seats in a nested formation',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion','Bridgehead Strike');
 await add(page,[tempestus,scions,'Nork Deddog','Taurox Prime',scions,'Tempestus Aquilons','Leman Russ Battle Tank','Cadian Castellan','Kasrkin','Chimera','Catachan Jungle Fighters']);
 await page.getByLabel('Warlord',{exact:true}).selectOption(tempestus+'#1');
 await attachment(page,tempestus).selectOption(scions+'#1');
 await protector(page,'Nork Deddog').selectOption(tempestus+'#1');
 await attachment(page,'Cadian Castellan').selectOption('Kasrkin#1');
 await page.getByLabel('Models for squad Catachan Jungle Fighters#1',{exact:true}).selectOption('20');
 const plasma=page.getByLabel('Tempestus Scion 1 · Hot-shot lasgun alternatives for '+scions+'#1',{exact:true});
 const melta=page.getByLabel('Tempestus Scion 2 · Hot-shot lasgun alternatives for '+scions+'#1',{exact:true});
 await plasma.selectOption({label:'Plasma gun'});
 await melta.selectOption({label:'Meltagun'});
 await total(page,1000);
 page.once('dialog',dialog=>dialog.accept('Alternate army'));
 await page.getByRole('button',{name:'New army'}).click();
 await page.getByLabel('Saved army').selectOption('default');
 await page.reload();
 await total(page,1000);
 await expect(plasma).toHaveValue('Plasma gun');
 await expect(melta).toHaveValue('Meltagun');
 await expect(protector(page,'Nork Deddog')).toHaveValue(tempestus+'#1');
 await expect(attachment(page,tempestus)).toHaveValue(scions+'#1');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Command');
 await expect(orderTargets(page,tempestus)).toContainText(scions+'#2');
 await expect(orderTargets(page,tempestus)).not.toContainText('Leman Russ Battle Tank#1');
 await page.emulateMedia({media:'print'});
 await expect(page.getByRole('region',{name:'Printable army reminders'}).locator('h3')).toHaveCount(11);
 const taurox=printRow(page,'Taurox Prime#1 · Declare passengers');
 await expect(taurox).toContainText(scions+'#2');
 await expect(taurox).not.toContainText(scions+'#1');
 await expect(printRow(page,'Nork Deddog#1 · Loyal Protector')).toContainText(tempestus+'#1');
 await expect(printRow(page,'Chimera#1 · Declare passengers')).toContainText('Kasrkin#1');
});

test('desktop 2,000-point Hammer of the Emperor saves a paid turret, filters Orders and fits two Leaders and an Ogryn in the Stormlord',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:1440,height:900});
 await begin(page,'Strike Force','Hammer of the Emperor');
 await add(page,['Ursula Creed',cadianCommand,shock,'Ogryn Bodyguard','Stormlord',commander,'Armiger Warglaive','Callidus Assassin','Kasrkin','Chimera','Cadian Heavy Weapons Squad','Hellhound','Rogal Dorn Battle Tank','Basilisk','Death Korps Of Krieg']);
 await page.getByLabel('Models for squad '+shock+'#1',{exact:true}).selectOption('20');
 await attachment(page,cadianCommand).selectOption(shock+'#1');
 await attachment(page,'Ursula Creed').selectOption(shock+'#1');
 await protector(page,'Ogryn Bodyguard').selectOption(cadianCommand+'#1');
 await page.getByLabel('Warlord',{exact:true}).selectOption('Ursula Creed#1');
 const turret=page.getByLabel('Leman Russ battle cannon alternatives for '+commander+'#1',{exact:true});
 await turret.selectOption({label:'Demolisher battle cannon'});
 const enhancement=page.getByLabel('11th upgrade for squad '+commander+'#1',{exact:true});
 await enhancement.selectOption('Calm Under Fire');
 await total(page,2000);
 await page.reload();
 await total(page,2000);
 await expect(turret).toHaveValue('Demolisher battle cannon');
 await expect(enhancement).toHaveValue('Calm Under Fire');
 await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Ursula Creed#1');
 await expect(attachment(page,'Ursula Creed')).toHaveValue(shock+'#1');
 await expect(protector(page,'Ogryn Bodyguard')).toHaveValue(cadianCommand+'#1');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await page.getByLabel('Show phase').selectOption('Command');
 const orders=orderTargets(page,commander);
 await expect(orders).toContainText('Rogal Dorn Battle Tank#1');
 await expect(orders).not.toContainText('Armiger Warglaive#1');
 await expect(orders).not.toContainText('Callidus Assassin#1');
 await page.emulateMedia({media:'print'});
 await expect(page.getByRole('region',{name:'Printable army reminders'}).locator('h3')).toHaveCount(11);
 await expect(printRow(page,'Stormlord#1 · Declare passengers')).toContainText(shock+'#1');
 const chimera=printRow(page,'Chimera#1 · Declare passengers');
 await expect(chimera).toContainText('Kasrkin#1');
 await expect(chimera).not.toContainText(shock+'#1');
});
