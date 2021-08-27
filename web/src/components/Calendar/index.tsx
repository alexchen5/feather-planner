import React, { createContext, useReducer } from "react";

import { getRenderRange } from '../../utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { Calendar, CalendarAction } from "types/calendar";
import { FeatherContext } from "pages/FeatherPlanner";
import { AllCalendarDates } from "types";
import { init, reducer } from "reducers/calendarReducer";
import PlanDragHandler from "./PlanDragHandler";
import { DocumentListenerContext } from "components/DocumentEventListener";
import { key } from "utils/keyUtil";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: React.Dispatch<CalendarAction> });

function CalendarComponent({ allDates } : {allDates: AllCalendarDates}) {
  const [calendar, dispatch] = useReducer(reducer, allDates, init);
  const { dispatch: dispatchFeather } = React.useContext(FeatherContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  
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

  React.useEffect(() => {
    // set up drag listeners
    dispatchListeners({ 
      type: 'register-focus', 
      focusId: 'calendar-key-events',
      listeners: [
        { 
          focusId: 'calendar-key-events', 
          type: 'keydown', 
          callback: handleKeydown as (e: DocumentEventMap[keyof DocumentEventMap]) => void, 
        },
      ],
    });
    return () => dispatchListeners({ type: 'deregister-focus', focusId: 'calendar-key-events', removeListeners: true });
    // only run at mount 
    // eslint-disable-next-line
  }, []);

  const handleKeydown = React.useCallback((e: KeyboardEvent) => {
    if (key.isMeta(e) && !e.shiftKey && e.key === 'z') {
      dispatch({ type: "use-undo" });
    } else if (key.isMeta(e) && e.shiftKey && e.key === 'z') {
      dispatch({ type: "use-redo" });
    }
  }, []);

  return (
    <CalendarContext.Provider value={{ calendar, dispatch }}>
      <PlanDragHandler>
        <div style={{textAlign: 'right'}}>
          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); dispatch({type:"use-undo"}) }}>Undo ({calendar.undoStack.length})</button>
          <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); dispatch({type:"use-redo"}) }}>Redo ({calendar.redoStack.length})</button>
        </div>
        <CalendarContainer>
          {calendar.dates.map(date => 
            <Date
              key={date.dateStr}
              dateStr={date.dateStr}
              label={date.label}
            >
              {date.plans.map((plan, i) => 
                <Plan
                  key={plan.planId}
                  plan={plan}
                  index={i}
                />
              )}
            </Date>
          )}
        </CalendarContainer>
      </PlanDragHandler>
    </CalendarContext.Provider>
  );
}

export default CalendarComponent;
