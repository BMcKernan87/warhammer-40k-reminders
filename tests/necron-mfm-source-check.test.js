// @vitest-environment node
import {expect,it} from 'vitest';
import {verifyMfm} from '../scripts/check-necron-mfm.mjs';

function sources(){
 const snapshot={edition:11,faction:'Necrons',revision:'wahapedia-test',datasheets:[
  {unit:'Chronomancer',pointsBySize:{1:70},laterCopyPointsBySize:{2:{1:80}},attachmentRole:'support',bodyguards:['Immortals']},
  {unit:'Immortals',pointsBySize:{5:65,10:130}},
 ]};
 const review={edition:11,revision:'test',detachments:[{id:'D',name:'Court',dp:'2',force_disposition:'Take and Hold'}],enhancements:[{detachment_id:'D',name:'Control (Aura)',cost:'10'}]};
 const mfm={slug:'necrons',version:'1.6',firstSeen:'2026-10-14',units:[
  {name:'Chronomancer',supportTo:['Immortals'],pricing:[{range:'[1,1]',costs:[{models:1,points:70}]},{range:'[2,)',costs:[{models:1,points:80}]}]},
  {name:'Immortals',pricing:[{range:'[1,)',costs:[{models:5,points:65},{models:10,points:130}]}]},
  {name:'Example',legends:true},
 ],detachments:[{name:'Court',dp:2,objectives:['TAKE AND HOLD'],enhancements:[{name:'Control',points:10}]}]};
 return {snapshot,review,mfm};
}
it('reconciles matched-play inventory, size/copy costs, attachment roles and detachment prices',()=>{
 const {snapshot,review,mfm}=sources();
 expect(verifyMfm(snapshot,review,mfm)).toMatchObject({units:2,costs:4,attachments:1,detachments:1,enhancements:1});
});
it('retains an explicit known Legends exclusion without treating unknown targets as Legends',()=>{
 const {snapshot,review,mfm}=sources();
 mfm.units[0].supportTo.push('Example');
 expect(verifyMfm(snapshot,review,mfm)).toMatchObject({units:2,attachments:1,mfmVersion:'1.6',effectiveDate:'2026-10-14'});
});
it.each([
 [s=>s.mfm.version='1.5',/pinned.*version/],
 [s=>s.mfm.firstSeen='2026-09-30',/effective date/],
 [s=>s.mfm.version=1.6,/pinned.*version/],
 [s=>delete s.mfm.firstSeen,/effective date/],
 [s=>s.snapshot.datasheets[0].laterCopyPointsBySize[2][1]++,/costs/],
 [s=>s.snapshot.datasheets[0].attachmentRole='leader',/attachments/],
 [s=>s.mfm.units[0].pricing[1].range='[3,)',/interval/],
 [s=>s.review.detachments[0].force_disposition='Disruption',/dispositions/],
 [s=>s.review.enhancements[0].cost='0',/control/],
 [s=>s.review.revision='other',/revision/],
 [s=>s.mfm.units[0].supportTo.push('Immotals'),/unknown attachment/],
 [s=>s.mfm.units[0].supportTo.push('Immortals'),/duplicate.*attachment/],
 [s=>s.mfm.units[0].leaderTo=['Immortals'],/conflicting attachment roles/],
 [s=>s.mfm.units[2].legends='true',/Legends flag/],
 [s=>s.mfm.units.push({...s.mfm.units[0],legends:true}),/Duplicate MFM unit/],
 [s=>s.review.enhancements.push({name:'Orphan',detachment_id:'missing',cost:'5'}),/unknown detachment/],
 [s=>s.mfm.units[0].pricing=[],/missing pricing/],
])('rejects a discrepancy between independent source tables',(mutate,reason)=>{
 const s=sources();mutate(s);
 expect(()=>verifyMfm(s.snapshot,s.review,s.mfm)).toThrow(reason);
});
