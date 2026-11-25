import {expect,test,type Page} from '@playwright/test';

async function begin(page:Page,size:string,detachment:string,units:string[]){
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Adeptus Custodes');
 await page.getByLabel('2026 battle size').selectOption(size);
 await page.getByRole('checkbox',{name:new RegExp(detachment)}).check();
 for(const unit of units){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
}
const setBody=(page:Page,leader:string,unit:string)=>page.getByLabel('Attach squad '+leader+'#1',{exact:true}).selectOption(unit+'#1');
const panel=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
const cue=(page:Page,title:string)=>panel(page).locator('.check').filter({has:page.getByText(title,{exact:true})});
const valid=async(page:Page,points:number)=>{
 await expect(page.getByText('Recorded 11th-edition total: '+points+' points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
};

test('reopens a legal 1,000-point Custodes army on mobile with separate Scout Rhino and Coronus passengers',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await begin(page,'Incursion','Emissaries Imperatus',['Blade Champion','Custodian Guard Sodality','Anathema Psykana Rhino','Coronus Grav-Carrier','Knight-Centura','Witchseeker Squad','Allarus Custodians']);
 await setBody(page,'Blade Champion','Custodian Guard Sodality');
 await setBody(page,'Knight-Centura','Witchseeker Squad');
 await valid(page,1000);
 await page.reload();
 await expect(page.getByLabel('Attach squad Blade Champion#1')).toHaveValue('Custodian Guard Sodality#1');
 await expect(page.getByLabel('Attach squad Knight-Centura#1')).toHaveValue('Witchseeker Squad#1');
 await expect(page.getByText('Warlord: Blade Champion#1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Play reminders'}).click();
 await panel(page).getByLabel('Show phase').selectOption('Pre-battle');
 const scout=cue(page,'Anathema Psykana Rhino#1 · Scouts 7″');
 await expect(scout).toContainText('Witchseeker Squad#1');
 const grav=cue(page,'Coronus Grav-Carrier#1 · starting passengers');
 await expect(grav).toContainText('Custodian Guard Sodality#1 + Blade Champion#1 (4)');
 await expect(grav).not.toContainText('Witchseeker');
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-sheet').getByText('Anathema Psykana Rhino#1 · Scouts 7″',{exact:true})).toBeVisible();
 await expect(page.locator('.print-sheet').getByText('Saving throws for attached formations',{exact:true})).toHaveCount(3);
});

test('builds a 2,000-point Trajann army with a mixed Orion, separately occupied Rhino and reserve budget',async({page})=>{
 await begin(page,'Strike Force','Null Maiden Vigil',['Orion Assault Dropship','Telemon Heavy Dreadnought','Trajann Valoris','Custodian Wardens','Venatari with Kinetic Destroyers','Anathema Psykana Rhino','Knight-Centura','Vigilator Squad']);
 await page.getByLabel('Models for squad Custodian Wardens#1').selectOption('3');
 await page.getByLabel('Models for squad Vigilator Squad#1').selectOption('9');
 await setBody(page,'Trajann Valoris','Custodian Wardens');
 await setBody(page,'Knight-Centura','Vigilator Squad');
 await valid(page,2000);
 await expect(page.getByText('Warlord: Trajann Valoris#1',{exact:true})).toBeVisible();
 await page.reload();
 await valid(page,2000);
 await expect(page.getByLabel('Models for squad Vigilator Squad#1')).toHaveValue('9');
 await page.getByRole('button',{name:'Play reminders'}).click();
 await panel(page).getByLabel('Show phase').selectOption('Pre-battle');
 const ship=cue(page,'Orion Assault Dropship#1 · starting passengers');
 await expect(ship).toContainText('With a Dreadnought, choose at most one of Custodian Wardens#1 and Venatari with Kinetic Destroyers#1.');
 await expect(ship).toContainText('These formations cannot start aboard it in reserve: Custodian Wardens#1.');
 await expect(panel(page).getByText('Anathema Psykana Rhino#1 · Scouts 7″',{exact:true})).toHaveCount(0);
 await page.emulateMedia({media:'print'});
 const print=page.locator('.print-sheet');
 await expect(print.getByText('Anathema Psykana Rhino#1 · starting passengers',{exact:true}).locator('..')).toContainText('Vigilator Squad#1 + Knight-Centura#1 (10)');
 await expect(print.getByText('Destroyed transport · emergency disembark',{exact:true})).toHaveCount(5);
});
