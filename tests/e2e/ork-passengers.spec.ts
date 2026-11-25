import {expect,test,type Page} from '@playwright/test';

async function muster(page:Page,size:string,detachment:string,units:string[]){
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Orks');
 await page.getByLabel('2026 battle size').selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
const chooseBody=(page:Page,leader:string,body:string)=>page.getByLabel('Attach squad '+leader+'#1',{exact:true}).selectOption(body+'#1');
const setSize=(page:Page,unit:string,models:number)=>page.getByLabel('Models for squad '+unit+'#1',{exact:true}).selectOption(String(models));
const panel=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
const cue=(page:Page,title:string)=>panel(page).locator('.check').filter({has:page.getByText(title,{exact:true})});
async function valid(page:Page,points:number){
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
}

test('a 1,000-point mobile Runt Swarm keeps both Gretchin characters and prints legal full Trukk alternatives',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await muster(page,'Incursion','Runt Swarm',['Zodgrod Wortsnagga','Gretchin','Runtherd','Trukk','Battlewagon','Ghazghkull Thraka','Boyz','Warboss','Bannernob','Big’ed Bossbunka']);
 await setSize(page,'Gretchin',20);
 for(const [leader,body] of [['Zodgrod Wortsnagga','Gretchin'],['Runtherd','Gretchin'],['Warboss','Boyz'],['Bannernob','Boyz']])await chooseBody(page,leader,body);
 await valid(page,1000);
 await page.reload();
 await valid(page,1000);
 await expect(page.getByLabel('Attach squad Runtherd#1')).toHaveValue('Gretchin#1');
 await expect(page.getByLabel('Attach squad Zodgrod Wortsnagga#1')).toHaveValue('Gretchin#1');
 await expect(page.getByText('Warlord: Ghazghkull Thraka#1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Play reminders'}).click();
 await panel(page).getByLabel('Show phase').selectOption('Pre-battle');
 const trukk=cue(page,'Trukk#1 · starting passengers');
 await expect(trukk).toContainText('Gretchin#1 + Zodgrod Wortsnagga#1 + Runtherd#1 (12)');
 await expect(trukk).toContainText('Boyz#1 + Warboss#1 + Bannernob#1 (12)');
 await expect(trukk).not.toContainText('Ghazghkull');
 await page.emulateMedia({media:'print'});
 const print=page.locator('.print-sheet');
 await expect(print.getByText('Battlewagon#1 · starting passengers',{exact:true}).locator('..')).toContainText('Ghazghkull Thraka#1 (4)');
 await expect(print.getByText('Destroyed transport · emergency disembark',{exact:true})).toHaveCount(5);
});

test('a 2,000-point Da Big Hunt prints the whole 22-seat Snagga mob only for its Hunta Rig',async({page})=>{
 await muster(page,'Strike Force','Da Big Hunt',['Gargantuan Squiggoth','Ghazghkull Thraka','Hunta Rig','Beastboss','Beast Snagga Boyz','Painboss','Kill Rig','Trukk','Meganobz','Warboss In Mega Armour','Boyz','Gretchin','Zodgrod Wortsnagga']);
 await setSize(page,'Meganobz',6);
 await setSize(page,'Beast Snagga Boyz',20);
 for(const [leader,body] of [['Beastboss','Beast Snagga Boyz'],['Painboss','Beast Snagga Boyz'],['Warboss In Mega Armour','Meganobz'],['Zodgrod Wortsnagga','Gretchin']])await chooseBody(page,leader,body);
 await valid(page,2000);
 await page.reload();
 await expect(page.getByLabel('Models for squad Meganobz#1')).toHaveValue('6');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await panel(page).getByLabel('Show phase').selectOption('Pre-battle');
 await expect(cue(page,'Hunta Rig#1 · starting passengers')).toContainText('Beast Snagga Boyz#1 + Beastboss#1 + Painboss#1 (22)');
 await expect(cue(page,'Kill Rig#1 · starting passengers')).toHaveCount(0);
 await expect(cue(page,'Trukk#1 · starting passengers')).not.toContainText('Meganobz#1');
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-sheet').getByText('Gargantuan Squiggoth#1 · starting passengers',{exact:true}).locator('..')).toContainText('Ghazghkull Thraka#1 (18)');
});
