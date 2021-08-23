import React, { ReactNode, UIEventHandler } from "react";

import {CalendarContext} from '..'
import { dateToStr, getRangeDates, getInitDateRange } from '../utils/dateUtil';
import DayHeaders from "./DayHeaders";

import style from "./container.module.scss";

function getInitScrollHeight(datenodeEl: Element) {
  const targetY = -150;
  let todayY = document.querySelector(`[fp-role="calendar-date-root"][data-date="${dateToStr()}"]`)?.getBoundingClientRect()?.y || 0;
  let calendarY = datenodeEl.getBoundingClientRect().y;
  // console.log(targetY - (calendarY - todayY));
  if (Math.abs(targetY - (calendarY - todayY)) > 20) return datenodeEl.scrollTop + targetY - (calendarY - todayY);
  return datenodeEl.scrollTop;
}

function CalendarContainer({children} : {children: ReactNode}) {
  const { calendar, dispatch } = React.useContext(CalendarContext);
  const datesContainer = React.useRef<HTMLUListElement>(null);

  React.useLayoutEffect(() => {
    if (datesContainer.current) {
      datesContainer.current.scrollTop = getInitScrollHeight(datesContainer.current);
    }
  }, []);

  const handleNodePagination: UIEventHandler = (event) => {
    // TODO: smarter pagination rendering, using speed of scroll to determine how much pagination is needed
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      dispatch({ type: 'move-render-range', dir: 'down' });
    } else if (event.currentTarget.scrollTop === 0) {
      if (datesContainer.current) datesContainer.current.scrollTop = 1;  
      dispatch({ type: 'move-render-range', dir: 'up' });
    }
  }

  const handleToday = () => {
    if (!datesContainer.current) {
      console.error('Expected Datenode Container');
      return;
    };

    const firstDate = calendar.renderRange[0];
    const lastDate = calendar.renderRange[calendar.renderRange.length - 1];

    // get new start and end dates
    const { startDate, endDate } = getInitDateRange();
    if (firstDate < startDate) {
      dispatch({ type: 'set-render-range', updateDateRanges: false, renderRange: getRangeDates(firstDate, endDate) })
    } else if (lastDate > endDate) {
      dispatch({ type: 'set-render-range', updateDateRanges: false, renderRange: getRangeDates(startDate, lastDate) })
    }

    let handle = setInterval(renderCompleteCallback, 10); // listen for today node to be rendered
    function renderCompleteCallback() {
      if (!document.querySelector(`[fp-role="calendar-date-root"][data-date="${dateToStr()}"]`)) {
        return; // loop until today node is on the doc
      }
      clearInterval(handle);

      if (!datesContainer.current) {
        console.error('Expected Datenode Container');
        return;
      };

      datesContainer.current.style.scrollBehavior = 'smooth';
      // eslint-disable-next-line
      let m = datesContainer.current.offsetTop; // flush styles
      datesContainer.current.scrollTop = getInitScrollHeight(datesContainer.current);

      let timer: NodeJS.Timeout; // listen for smooth scroll to finish
      function scrollStopCallback() {
        clearTimeout( timer );
        timer = setTimeout( () => { // function to run when smooth scroll finishes
          if (!datesContainer.current) {
            console.error('Expected Datenode Container');
            return;
          };
          datesContainer.current.removeEventListener( 'scroll', scrollStopCallback);
          datesContainer.current.style.scrollBehavior = '';

          // declare new render range
          dispatch({ type: 'set-render-range', updateDateRanges: true, renderRange: getRangeDates(startDate, endDate) })
        }, 50 );
      }
      datesContainer.current.addEventListener( 'scroll', scrollStopCallback, { passive: true } );
      scrollStopCallback();
    }
  }

  return (
    <div fp-role={"calendar-container"} className={style.root}>
      <button 
        onClick={handleToday} 
        className={style.today}
      >today</button>
      <DayHeaders />
      <ul
        className={style.dates}
        ref={datesContainer}
        onScroll={handleNodePagination}
      >
        {children}
      </ul>
    </div>
  )
}

export default CalendarContainer;