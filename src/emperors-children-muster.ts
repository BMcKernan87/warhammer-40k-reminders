import {emperorsChildrenKeywords,emperorsChildrenMusterUnits,isLegionsOfExcess} from './emperors-children-data';
import {emperorsChildrenCargoFormations} from './emperors-children-transports';
import {legionMuster} from './legion-muster';

export const {
 unitLimit:emperorsChildrenUnitLimit,warlordCandidates:emperorsChildrenWarlordCandidates,
 resolvedWarlord:resolvedEmperorsChildrenWarlord,selectWarlord:selectEmperorsChildrenWarlord,findings:emperorsChildrenMusterFindings,
}=legionMuster({
 faction:'Emperor’s Children',primarch:'Fulgrim',groupName:'Legions of Excess',detachment:'Carnival of Excess',idPrefix:'ec',allowanceCode:'legions-of-excess-allowance',
 musterUnits:emperorsChildrenMusterUnits,keywords:emperorsChildrenKeywords,isSummoned:isLegionsOfExcess,cargo:emperorsChildrenCargoFormations,
});
