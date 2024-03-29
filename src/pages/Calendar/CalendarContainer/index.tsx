import React, { ReactNode, UIEventHandler } from "react";

import { dateToStr, getInitDateRange, getRenderedDates } from 'utils/dateUtil';
import DayHeaders from "./DayHeaders";

import style from "./container.module.scss";
import { CalendarContext } from "../context";
import { ScrollHandlerContext } from "./context";
import { ScrollEventListener } from "types/components/Calendar/CalendarContainer";
import { Button } from "@material-ui/core";
import { useDateDisplay } from "utils/useDateUtil";
import UndoRedo from "components/UndoRedo";
import { UndoRedoContext } from "utils/useUndoRedo";

let prvScrollHeight: number;

function getInitScrollHeight(datenodeEl: Element) {
  const targetY = -150;
  let todayY = document.querySelector(`[fp-role="calendar-date-root"][data-date="${dateToStr()}"]`)?.getBoundingClientRect()?.y || 0;
  let calendarY = datenodeEl.getBoundingClientRect().y;
  // console.log(targetY - (calendarY - todayY));
  if (Math.abs(targetY - (calendarY - todayY)) > 20) return datenodeEl.scrollTop + targetY - (calendarY - todayY);
  return datenodeEl.scrollTop;
}

function CalendarContainer({children} : {children: ReactNode}) {
  const { dispatch } = React.useContext(CalendarContext);
  const datesContainer = React.useRef<HTMLUListElement>(null);
  const [ scrollEventListeners, setScrollEventListeners ] = React.useState<ScrollEventListener[]>([]);
  const dateDisplay = useDateDisplay();

  const { undo, redo, undoLength, redoLength } = React.useContext(UndoRedoContext);

  React.useLayoutEffect(() => {
    if (datesContainer.current) {
      datesContainer.current.scrollTop = prvScrollHeight || getInitScrollHeight(datesContainer.current);
    }
  }, []);

  /**
   * Add a scroll event listener to the calendar component. Give an id and a callback,
   * previous callbacks with the id will be replaced with the new one.
   * @param id the desired callback id
   * @param callback function to be called on scroll event
   */
  const addScrollEventListener = React.useCallback((id: string, callback: (e?: React.UIEvent<Element, UIEvent>) => void) => {
    setScrollEventListeners(listeners => [...listeners.filter(l => l.id !== id), { id, callback }]);
  }, []);

  /**
   * Remove the scroll event listener with the given id. Note that if you're removing a 
   * listener to update its callback function, just use addScrollEventListener since it
   * automatically replaces the listener of the same id.
   * @param id id of the listener to be removed
   */
  const removeScrollEventListener = React.useCallback((id: string) => {
    setScrollEventListeners(listeners => [...listeners.filter(l => l.id !== id)]);
  }, []);

  const handleScroll: UIEventHandler = (event) => {
    prvScrollHeight = datesContainer.current ? datesContainer.current.scrollTop : prvScrollHeight;
    if (event.currentTarget.scrollTop < 60) { 
      if (datesContainer.current && datesContainer.current.scrollTop === 0) datesContainer.current.scrollTop = 1;  
      dispatch({ type: 'move-render-range', dir: 'up', speed: 3 });
    } else if (event.currentTarget.scrollTop < 67) {
      dispatch({ type: 'move-render-range', dir: 'up', speed: 2 });
    } else if (event.currentTarget.scrollTop < 70) {
      dispatch({ type: 'move-render-range', dir: 'up', speed: 1 });
    } else if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop < 60 + event.currentTarget.clientHeight) {
      dispatch({ type: 'move-render-range', dir: 'down', speed: 3 });
    } else if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop < 67 + event.currentTarget.clientHeight) {
      dispatch({ type: 'move-render-range', dir: 'down', speed: 2 });
    } else if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop < 70 + event.currentTarget.clientHeight) {
      dispatch({ type: 'move-render-range', dir: 'down', speed: 1 });
    } 
    scrollEventListeners.forEach(l => l.callback(event));
  }

  const handleToday = () => {
    console.time("Today Event Render Time");
    // could possibly hide the effects of the render time by adding a premptive scroll,
    // however the premptive scroll operating asynchrnously must know when to stop... very difficult

    if (!datesContainer.current) {
      console.error('Expected Datenode Container');
      return;
    };
    const container = datesContainer.current;
    
    const initRange   = getInitDateRange(); // get new start and end dates
    const screenRange = getRenderedDates(); // get start and end dates on screen at the moment

    if (screenRange) {
      // render more dates downwards if the screen ending date is above the target end date
      if (screenRange.endDate < initRange.endDate) {
        dispatch({ type: 'set-render-range', renderRange: { startDate: screenRange.startDate, endDate: initRange.endDate} })
      } 
      // render more dates upwards if the screen start date is below the target start date
      else if (screenRange.startDate > initRange.startDate) {
        dispatch({ type: 'set-render-range', renderRange: { startDate: initRange.startDate, endDate: screenRange.endDate} })
      }
    }

    let handler: NodeJS.Timeout;
    function renderCompleteCallback() { 
      if (!document.querySelector(`[fp-role="calendar-date-root"][data-date="${dateToStr()}"]`)) {
        // this bracket is likely never reached as our interval has been queued behind React's rerender
      } else {
        clearInterval(handler);
        console.timeEnd("Today Event Render Time");

        container.style.scrollBehavior = 'smooth';
        // eslint-disable-next-line
        let m = container.offsetTop; // flush styles
        container.scrollTop = getInitScrollHeight(container);

        let timer: NodeJS.Timeout; // listen for smooth scroll to finish
        function scrollStopCallback() {
          clearTimeout( timer );
          timer = setTimeout( () => { // function to run when smooth scroll finishes
            container.removeEventListener( 'scroll', scrollStopCallback);
            container.style.scrollBehavior = '';

            // declare new render range
            dispatch({ type: 'set-render-range', renderRange: { startDate: initRange.startDate, endDate: initRange.endDate } })
          }, 50 );
        }
        container.addEventListener( 'scroll', scrollStopCallback, { passive: true } );
        scrollStopCallback();
      }
    }
    handler = setInterval(renderCompleteCallback, 50);
  }

  return (
    <div fp-role={"calendar-container"} className={style.root}>
      <div className={style.menu}>
        <div onMouseDown={handleToday} className={style.todayButton}>
          <Button> {dateDisplay} </Button>
        </div>
        <UndoRedo undo={{ callback: undo, length: undoLength }} redo={{ callback: redo, length: redoLength }} />
      </div>
      <div>
        <DayHeaders />
      </div>
      <ScrollHandlerContext.Provider value={{ addScrollEventListener, removeScrollEventListener }}>
        <ul
          className={style.datesContainer}
          ref={datesContainer}
          onScroll={handleScroll}
          fp-role={"dates-container"}
        >
          {children}
        </ul>
      </ScrollHandlerContext.Provider>
    </div>
  )
}

export default CalendarContainer;