import { AllCalendarDates } from "types";
import { Calendar, CalendarAction } from "types/calendar";
import { getDateByStr, getInitCalendarDates, getInitDateRange, getRangeDates, getRenderRange, getScrollRange } from "utils/dateUtil";

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
    if (action.type === 'accept-all-dates-update') {
      curAllDates = action.dates; // stash every update of new allDates
  
      if (!state.shouldSyncDates) return state; // if dates should not be synced, do nothing
  
      // else map dates to new dates from action
      return {
        ...state,
        // should always receive valid data from action.dates[date.dateStr]
        dates: state.dates.map(date => action.dates[date.dateStr] || date),
      }
    } else if (action.type === 'set-data-sync') {
      if (action.value) console.log('turning sync on');
      else console.log('turning sync off');
  
      return {
        ...state,
        shouldSyncDates: action.value,
        // re-map dates to allDates if turning sync on
        dates: action.value ? state.dates.map(date => curAllDates[date.dateStr] || date) : state.dates,
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