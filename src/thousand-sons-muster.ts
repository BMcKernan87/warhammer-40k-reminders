import {thousandSonsKeywords,thousandSonsMusterUnits,isScintillatingLegions} from './thousand-sons-data';
import {thousandSonsCargoFormations} from './thousand-sons-transports';
import {legionMuster} from './legion-muster';

export const {
 unitLimit:thousandSonsUnitLimit,warlordCandidates:thousandSonsWarlordCandidates,
 resolvedWarlord:resolvedThousandSonsWarlord,selectWarlord:selectThousandSonsWarlord,findings:thousandSonsMusterFindings,
}=legionMuster({
 faction:'Thousand Sons',primarch:'Magnus The Red',groupName:'Scintillating Legions',detachment:'Changehost of Deceit',idPrefix:'ts',allowanceCode:'scintillating-legions-allowance',
 musterUnits:thousandSonsMusterUnits,keywords:thousandSonsKeywords,isSummoned:isScintillatingLegions,cargo:thousandSonsCargoFormations,
});
