import { FeatherPlanner } from "types/pages/HomePage";
import { FeatherPlannerReducer } from "types/pages/HomePage/reducer";
import { addRangeListeners, getInitDateRange } from "utils/dateUtil";
import { IS_CACHE_ON } from "utils/globalContext";

export const init = (_noArg: never): FeatherPlanner => {
    const { startDate, endDate } = getInitDateRange();
  
    // TODO: trim local storage when it inevitably gets too big to load in at once
    let localDatesAll, localPlanStyles = {}
    if (IS_CACHE_ON) {
        console.time("Cache Loading Time")
        localDatesAll = JSON.parse(localStorage.getItem('datesAll')!);
        localPlanStyles = JSON.parse(localStorage.getItem('planStyles')!);
        console.timeEnd("Cache Loading Time"); // not sure why this function is called twice...
    }
  
    for (const [styleId, style] of Object.entries(localPlanStyles)) {
        // @ts-ignore
        if (style?.color) document.documentElement.style.setProperty(`--plan-color-${styleId}`, style.color);
        // @ts-ignore
        if (style?.colorDone) document.documentElement.style.setProperty(`--plan-color-done-${styleId}`, style.colorDone);
    }
  
    return {
        calendarDates: localDatesAll || {}, 
        calendarPlanStyles: localPlanStyles || {},
        dateRanges: addRangeListeners([], {startDate, endDate}),
    };
}
  
/**
 * Wrapper for storing an object in localStorage. Does not store if 
 * IS_CACHE_ON is false.
 * 
 * TODO: define error cases
 * @precondition object is valid JSON 
 * @param name name of object to be stored as 
 * @param object object to store
 */
const tryCacheItem = (name: string, object: any) => {
    if (IS_CACHE_ON) {
        try {
            localStorage.setItem(name, JSON.stringify(object));
        } catch (error) {
            console.error(error);
        }
    }
  }
  
export const reducer: FeatherPlannerReducer = (state, action) => {
    if (action.type === 'set-styles') {
        tryCacheItem('planStyles', action.planStyles);
    
        return {
            ...state,
            calendarPlanStyles: {...action.planStyles},
        }
    } else if (action.type === 'set-labels' || action.type === 'set-plans') {
        const dateStrs = action.type === 'set-labels' ? Object.keys(action.labels) : Object.keys(action.plans); // date strings for action
        const newDatesAll = {...state.calendarDates}; // instantiate the new object for datesAll
    
        dateStrs.forEach(dateStr => {
            let label = newDatesAll[dateStr]?.label || null; // initiate date label
            let plans = newDatesAll[dateStr]?.plans || []; // initiate date plans
            if ('labels' in action) {
                label = action.labels[dateStr]; // update label from action
            } else {
                plans = action.plans[dateStr]; // or update plans from action
            }
    
            newDatesAll[dateStr] = { dateStr, label, plans }; // update date
        });
        tryCacheItem('datesAll', newDatesAll); // cache the resultant datesAll
    
        return {
            ...state,
            calendarDates: newDatesAll, // updated datesAll
        }
    } else if (action.type === 'update-date-ranges') {
        return {
            ...state,
            dateRanges: addRangeListeners(state.dateRanges, action.newRenderRange),
        }
    } else if (action.type === 'clean-date-ranges') {
        // escape reducer if there are no listeners off the screen
        if (!state.dateRanges.some(listener => !listener.onScreen)) return state;

        return {
            ...state,
            dateRanges: state.dateRanges.filter(listener => listener.onScreen), 
        }
    } else {
        const _exhaustiveCheck: never = action;
        return _exhaustiveCheck;
    }
  }