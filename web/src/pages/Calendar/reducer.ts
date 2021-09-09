import { AllCalendarDates } from "types/pages/HomePage";
import { Calendar, CalendarPlan } from "types/components/Calendar";
import { getDateByStr, getInitCalendarDates, getInitDateRange, getRangeDates, getRenderRange, getScrollRange } from "utils/dateUtil";
import { CalendarAction } from "types/components/Calendar/reducer";

let curAllDates: AllCalendarDates;
let curDateRange = getInitDateRange();

export const init = (allDates: AllCalendarDates): Calendar => {
    const { startDate, endDate } = curDateRange;

    return {
        dates: getInitCalendarDates(allDates, startDate, endDate), // TODO: error checking for valid local storage is incomplete
        shouldSyncDates: true,
        undoStack: [],
        redoStack: [],
    }
}

export const reducer = (state: Calendar, action: CalendarAction): Calendar => {
    if (action.type === 'state-callback') {
        action.callback(state);
        return state;
    } else if (action.type === 'accept-all-dates-update') {
        curAllDates = action.dates; // stash every update of new allDates

        if (!state.shouldSyncDates) return state; // if dates should not be synced, do nothing

        // else map dates to new dates from action
        return {
            ...state,
            // should always receive valid data from action.dates[date.dateStr]
            dates: state.dates.map(date => action.dates[date.dateStr] || date),
        }
    } else if (action.type === 'pause-data-sync') {
        if (!state.shouldSyncDates) return state; // already off, no need to update state
        return {
            ...state,
            shouldSyncDates: false,
        }
    } else if (action.type === 'resume-data-sync') {
        if (state.shouldSyncDates && !action.syncNow) return state; // already on and no updates needed
        return {
            ...state,
            shouldSyncDates: true,
            dates: action.syncNow ? state.dates.map(date => curAllDates[date.dateStr] || date) : state.dates,
        }
    } else if (action.type === 'move-render-range' || action.type === 'set-render-range') {
        let newRenderRange;
        if (action.type === 'set-render-range') {
            // new render range from action 
            newRenderRange = { ...action.renderRange }; 
        } else {
            // get render range from helper function
            newRenderRange = getScrollRange(getRenderRange(state.dates), action.dir, action.speed); 
        }
        
        // stash date range
        curDateRange = newRenderRange;

        return {
            ...state,
            dates: getRangeDates(curDateRange.startDate, curDateRange.endDate).map(dateStr => 
                getDateByStr(state.dates, dateStr) // use already rendered date if available
                || curAllDates[dateStr] // else use backup date stored in curAllDates
                || { dateStr, label: null, plans: [] } // use empty date if date has never been loaded
            ),
        }
    } else if (action.type === 'move-plans') {
        // we are given action.datesUpdate, which contains the array of planIds in that 
        // order for every dateStr key 
        // we must merge this in with our existing state.dates 

        // first make a list of the dateStr keys of action.datesUpdate (k keys)
        // if this is an empty list, we can short circuit our return, with no updates
        // sort the list in O(k log k)
        const dates = Object.keys(action.datesUpdate).sort();
        if (!dates.length) return state;

        // iterate the list at the same time as state.dates (d dates), O(k + d) worst case
        // and if the dateStr is part of the list, hash each plan -> O(p) where p is all plans subject to move
        // increment the list iterator / dates iterator accordingly to whichever is smalller
        // total O(k + d + p) time here
        // it is possible that dates is out of range of state.dates
        const allPlans: {[planId: string]: CalendarPlan | undefined } = {};
        const retDates: string[] = []; // the dates which actually appear
        let k = 0, d = 0;
        while (state.dates[d] && dates[k]) { 
            if (state.dates[d].dateStr < dates[k]) {
                d += 1;
            } else if (state.dates[d].dateStr > dates[k]) {
                k += 1;
            } else { 
                // matching dateStr, store all plans at date in our hash
                state.dates[d].plans.forEach(p => allPlans[p.planId] = p);
                retDates.push(dates[k]); // add to our used dates
                // increment both iterators
                d += 1;
                k += 1; 
            }
        }
        // note that here, we may not be able to find the state dates for a given dateStr key,
        // if the date has been unmounted due to scrolling. This makes no difference to the
        // final return, as we do not consider unmounted dates anyways.
        
        // now again iterate the dateStr list at the same time as state.dates, O(k + d)
        // if the dateStr is part of the list, map its plans to our previously hashed plans
        // else return the same date object
        // O(d) for all dates, with O(p) for mapping, total O(d + p)
        k = 0;
        return {
            ...state,
            dates: state.dates.map((date) => {
                if (date.dateStr === retDates[k]) {
                    k += 1; // increment k for next dateStr                    
                    return {
                        ...date,
                        plans: action.datesUpdate[date.dateStr]!.map(id => allPlans[id] || action.draggingPlans[id] ),
                    }
                }
                return date;
            }),
        }
    } else if (action.type === 'add-undo') {
        return {
            ...state,
            undoStack: [...state.undoStack, {...action.undo}],
            redoStack: [], // clear redo stack when a new action is added
        }
    } else if (action.type === 'use-undo' || action.type === 'use-redo') {
        const undoStack = [...state.undoStack];
        const redoStack = [...state.redoStack];

        if (action.type === 'use-undo') {
            const curUndo = undoStack.pop();
            if (curUndo) {
                curUndo.undo();
                redoStack.push(curUndo);
            }
        } else {
            const curRedo = redoStack.pop();
            if (curRedo) {
                curRedo.redo();
                undoStack.push(curRedo);
            }
        }

        return {
            ...state,
            undoStack,
            redoStack,
        }
    }  else { // this is never reached
        const _exhaustiveCheck: never = action;
        return _exhaustiveCheck;
    }
}