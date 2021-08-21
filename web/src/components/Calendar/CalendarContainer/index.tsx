import React, { ReactNode, UIEventHandler } from "react";

import {CalendarContext} from '..'
import {newDateRange, dateToStr, getResetIndices, getRangeDates } from '../utils/dateUtil';
import DayHeaders from "./DayHeaders";

import style from "./container.module.scss";

function getInitScrollHeight(datenodeEl: Element) {
  const targetY = -150;
  let todayY = document.querySelector(`[datenode="${dateToStr()}"]`)?.getBoundingClientRect()?.y || 0;
  let calendarY = datenodeEl.getBoundingClientRect().y;
  // console.log(targetY - (calendarY - todayY));
  if (Math.abs(targetY - (calendarY - todayY)) > 20) return datenodeEl.scrollTop + targetY - (calendarY - todayY);
  return datenodeEl.scrollTop;
}

function CalendarContainer({children} : {children: ReactNode}) {
  const { calendar, dispatch } = React.useContext(CalendarContext);
  const datenodeContainer = React.useRef<HTMLUListElement>(null);

  // const loadDates = async (dateRange, dir, start, end) => {
  //   if (loading) return;
  //   setLoading(dir);
  //   await dispatchDates({type: 'load', dir, dateRange, start, end});
  //   if (dir === "INIT") {
  //     datenodeContainer.current.scrollTop = getInitScrollHeight(datenodeContainer.current);
  //     document.querySelector(`[datenode="${dateToStr()}"]`).firstElementChild.focus();
  //   } 
  //   setLoading(false);
  // }

  const handleNodePagination: UIEventHandler = (event) => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      const [startDate, endDate] = newDateRange(calendar.dates, "end");
      dispatch({ type: 'load-raw-dates', dir: 'end', startDate, endDate });
      dispatch({ type: 'load-dates', dir: 'end', startDate, endDate });
    } else if (event.currentTarget.scrollTop === 0) {
      if (datenodeContainer.current) datenodeContainer.current.scrollTop = 1;  

      const [startDate, endDate] = newDateRange(calendar.dates, "start")
      dispatch({ type: 'load-raw-dates', dir: 'start', startDate, endDate });
      dispatch({ type: 'load-dates', dir: 'start', startDate, endDate });
    }
  }

  const handleToday = () => {
    if (!datenodeContainer.current) {
      console.error('Expected Datenode Container');
      return;
    };
    datenodeContainer.current.style.scrollBehavior = 'smooth';
    // eslint-disable-next-line
    let m = datenodeContainer.current.offsetTop; // flush styles
    datenodeContainer.current.scrollTop = getInitScrollHeight(datenodeContainer.current);

    let timer: NodeJS.Timeout; // listen for smooth scroll to be finish
    function scrollStopCallback() {
      clearTimeout( timer );
      timer = setTimeout( () => { // function to run when smooth scroll finishes
        if (!datenodeContainer.current) {
          console.error('Expected Datenode Container');
          return;
        };
        datenodeContainer.current.removeEventListener( 'scroll', scrollStopCallback);
        datenodeContainer.current.style.scrollBehavior = '';

        // find dates to unload
        const i = getResetIndices(calendar.weekRanges);
    
        const newRange = calendar.weekRanges.slice(i.floor, i.roof);
        calendar.weekRanges.forEach(r => {
          if (!newRange.includes(r)) {
            r.detachLabelsListener();
            r.detachPlansListener();
          }
        });
    
        const newDateRange = getRangeDates(newRange[0].startDate, newRange[newRange.length - 1].endDate);
        const newDates = calendar.dates.filter(d => newDateRange.includes(d.dateStr));
    
        // unload the dates
        dispatch({ type: 'set-dates', dates: newDates });
        dispatch({ type: 'set-week-ranges', weekRanges: newRange });
      }, 50 );
    }
    datenodeContainer.current.addEventListener( 'scroll', scrollStopCallback, { passive: true } );
    scrollStopCallback();
  }

  return (
    <div className={style.root}>
      <button 
        onClick={handleToday} 
        className={style.today}
      >today</button>
      <DayHeaders />
      <ul
        className={style.dates}
        ref={datenodeContainer}
        onScroll={handleNodePagination}
      >
        {children}
      </ul>
    </div>
  )
}

export default CalendarContainer;