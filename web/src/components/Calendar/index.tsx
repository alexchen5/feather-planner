import React, { useReducer } from "react";

import { getRenderRange } from 'utils/dateUtil';
import { key } from "utils/keyUtil";
import { init, reducer } from "./reducer";
import { CalendarContext } from "./context";

import { FeatherContext } from "pages/HomePage/context";
import { DocumentListenerContext } from "components/DocumentEventListener/context";

import CalendarContainer from "./CalendarContainer";
import PlanDragHandler from "./PlanDragHandler";
import Date from "./Date";
import PlanWrapper from "./PlanDragHandler/PlanWrapper";
import Plan from './Plan'

import { AllCalendarDates } from "types/pages/HomePage";

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
                <PlanWrapper key={plan.planId} planId={plan.planId} moveTrigger={'' + i}>
                  <Plan plan={{
                    ...plan,
                    nxt: date.plans[i + 1] ? date.plans[i + 1].planId : '',
                    prv: date.plans[i - 1] ? date.plans[i - 1].planId : '',
                  }} />
                </PlanWrapper>
              )}
            </Date>
          )}
        </CalendarContainer>
      </PlanDragHandler>
    </CalendarContext.Provider>
  );
}

export default CalendarComponent;
