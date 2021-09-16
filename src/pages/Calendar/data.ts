import React from "react";
import { DateRange } from "types";
import { CalendarDate, CalendarDateLabel, CalendarPlan, CalendarPlanStyle } from "types/components/Calendar";
import { addRangeListeners, getInitDateRange } from "utils/dateUtil";
import { IS_CACHE_ON } from "utils/globalContext";
import { ListenerDateRange } from "./listeners/DateRangeListener";

export interface CalendarData {
    state: CalendarDataState,
    dispatch: React.Dispatch<CalendarDataAction>,
}

interface CalendarDataState {
    /**
     * Contains the data of all dates which have been loaded from db. Data is also 
     * loaded in initially from localStorage. 
     * 
     * TODO: error checking for data integrity, particularly when loading from localStorage
     */
    calendarDates: AllCalendarDates; 
    
    /**
     * Contains the custom styling for plans. This is loaded from db, and also 
     * initially loaded from localStorage.
     */
    calendarPlanStyles: { [styleId: string]: CalendarPlanStyle | undefined }; 

    /**
     * The ranges of date listeners which we have attached to the db.
     */
    dateRanges: ListenerDateRange[]; 
}

export type AllCalendarDates = {
    [dateStr: string]: CalendarDate | undefined;
}

type CalendarDataReducer = (state: CalendarDataState, action: CalendarDataAction) => CalendarDataState;
type CalendarDataAction = UpdateDateRanges | CleanDateRanges | SetLabels | SetStyles | SetPlans;

/**
 * Given a new render range which the calendar component is loading at the moment, 
 * update the db listeners in FeatherPlanner.dateRanges
 */
export interface UpdateDateRanges {
    type: 'update-date-ranges';
    newRenderRange: DateRange;
}

export interface CleanDateRanges {
    type: 'clean-date-ranges';
}

/**
 * Update all planStyles
 * 
 * The method updates FeatherPlanner.calendarPlanStyles and the cached planStyles.
 */
export interface SetStyles {
    type: 'set-styles';
    planStyles: { [styleId: string] : CalendarPlanStyle };
}

/**
 * Update labels in the range of dates in SetLabels.labels. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
export interface SetLabels {
    type: 'set-labels';
    labels: { [dateStr: string]: CalendarDateLabel | null };
}

/**
 * Update plans in the range of dates in SetPlans.plans. 
 * 
 * The method updates FeatherPlanner.calendarDates and the cached datesAll.
 */
export interface SetPlans {
    type: 'set-plans';
    plans: { [dateStr: string] : CalendarPlan[] };
}


export function useCalendar(): CalendarData {
    const [calendarDataState, calendarDataDispatcher] = React.useReducer(reducer, null as never, init);

    React.useEffect(() => {
        // attach listener to clean up unused date range listeners after 60 seconds
        // of no changes to featherPlanner.dateRanges
        let t = setTimeout(() => calendarDataDispatcher({ type: 'clean-date-ranges' }), 60000);
        return () => clearTimeout(t);
      }, [calendarDataState.dateRanges])

    return { state: calendarDataState, dispatch: calendarDataDispatcher }
}   

const init = (_noArg: never): CalendarDataState => {
    const { startDate, endDate } = getInitDateRange();
  
    // TODO: trim local storage when it inevitably gets too big to load in at once
    let localDatesAll, localPlanStyles = {}
    if (IS_CACHE_ON) {
        console.time("Cache Loading Time")
        localDatesAll = JSON.parse(localStorage.getItem('datesAll')!) || {};
        localPlanStyles = JSON.parse(localStorage.getItem('planStyles')!) || {};
        console.timeEnd("Cache Loading Time"); 
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
  
const reducer: CalendarDataReducer = (state, action) => {
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