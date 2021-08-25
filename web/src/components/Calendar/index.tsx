import React, { createContext, useReducer } from "react";

import { getRenderRange } from '../../utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { Calendar, CalendarAction } from "types/calendar";
import { FeatherContext } from "pages/FeatherPlanner";
import { AllCalendarDates } from "types";
import { init, reducer } from "reducers/calendarReducer";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: React.Dispatch<CalendarAction> });

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
