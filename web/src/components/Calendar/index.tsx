import React, { createContext, useReducer } from "react";

import { getDateByStr, getInitCalendarDates, getInitDateRange, getRangeDates, getRenderRange, getScrollRange } from './utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { Calendar, CalendarAction } from "types/calendar";
import { FeatherContext } from "pages/HomePage";
import { AllCalendarDates } from "types";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: React.Dispatch<CalendarAction> });

let curAllDates: AllCalendarDates;
let curDateRange = getInitDateRange();

const init = (allDates: AllCalendarDates): Calendar => {
  const { startDate, endDate } = curDateRange;

  return {
    dates: getInitCalendarDates(allDates, startDate, endDate), // TODO: error checking for valid local storage is incomplete
    shouldSyncDates: true,
    undoStack: [],
    redoStack: [],
  }
}

const reducer = (state: Calendar, action: CalendarAction): Calendar => {
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

function CalendarComponent({ allDates } : {allDates: AllCalendarDates}) {
  const [calendar, dispatch] = useReducer(reducer, allDates, init);
  const { dispatch: dispatchFeather } = React.useContext(FeatherContext);
  
  React.useEffect(() => {
    // we can expect that the allDates handed down to us is error free, 
    // and every dateStr we will need to index will grant us a valid 
    // CalendarDate to render directly
    dispatch({ type: 'accept-all-dates-update', dates: allDates });
  }, [allDates])

  React.useEffect(() => {
    // we are letting the higher feather component know that we are 
    // trying to render a new range of dates, and that they may need to 
    // prepare for us a new allDates object
    dispatchFeather({ 
      type: 'update-date-ranges', 
      newRenderRange: getRenderRange(calendar.dates),
    })
  }, [calendar.dates, dispatchFeather])

  return (
    <CalendarContext.Provider value={{ calendar, dispatch }}>
      <div style={{textAlign: 'right'}}>
        <button onClick={() => dispatch({type:"use-undo"})}>Undo ({calendar.undoStack.length})</button>
        <button onClick={() => dispatch({type:"use-redo"})}>Redo ({calendar.redoStack.length})</button>
      </div>
      <CalendarContainer>
        {calendar.dates.map(date => 
          <Date
            key={date.dateStr}
            dateStr={date.dateStr}
            label={date.label}
          >
            {date.plans.map(plan => 
              <Plan
                key={plan.planId}
                plan={plan}
              />
            )}
          </Date>
        )}
      </CalendarContainer>
    </CalendarContext.Provider>
  );
}

export default CalendarComponent;
