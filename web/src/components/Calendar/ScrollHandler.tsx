import React, { ReactNode, useEffect } from "react";

import {CalendarContext} from '.'
import {newDateRange, dateToStr, getResetIndices, getRangeDates } from './util';

function getInitScrollHeight(datenodeEl: Element) {
  const targetY = -150;
  let todayY = document.querySelector(`[datenode="${dateToStr()}"]`)?.getBoundingClientRect()?.y || 0;
  let calendarY = datenodeEl.getBoundingClientRect().y;
  // console.log(targetY - (calendarY - todayY));
  if (Math.abs(targetY - (calendarY - todayY)) > 20) return datenodeEl.scrollTop + targetY - (calendarY - todayY);
  return datenodeEl.scrollTop;
}

function ScrollHandler({children} : {children: ReactNode}) {
  const {dates, range, setRange, dispatchDates} = React.useContext(CalendarContext);
  const [loading, setLoading] = React.useState(false);
  const datenodeContainer = React.useRef(null);

  const loadDates = async (dateRange, dir, start, end) => {
    if (loading) return;
    setLoading(dir);
    await dispatchDates({type: 'load', dir, dateRange, start, end});
    if (dir === "INIT") {
      datenodeContainer.current.scrollTop = getInitScrollHeight(datenodeContainer.current);
      document.querySelector(`[datenode="${dateToStr()}"]`).firstElementChild.focus();
    } 
    setLoading(false);
  }

  const handleNodePagination = event => {
    if (loading) return;
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      const [dateRange, start, end] = newDateRange(dates, "END")
      loadDates(dateRange, "END", start, end);
    } else if (event.currentTarget.scrollTop === 0) {
      datenodeContainer.current.scrollTop = 1;
      const [dateRange, start, end] = newDateRange(dates, "FRONT")
      loadDates(dateRange, "FRONT", start, end);
    }
  }

  useEffect(() => {
    if (dates.length === 0) {
      const [dateRange, start, end] = newDateRange(dates, "INIT");
      loadDates(dateRange, "INIT", start, end);
    }
    // eslint-disable-next-line
  }, []);
  

  const handleToday = () => {
    setLoading(true);
    datenodeContainer.current.style.scrollBehavior = 'smooth';
    // eslint-disable-next-line
    let m = datenodeContainer.current.offsetTop; // flush styles
    datenodeContainer.current.scrollTop = getInitScrollHeight(datenodeContainer.current);

    let timer; // listen for smooth scroll to be finish
    function scrollStopCallback() {
      clearTimeout( timer );
      timer = setTimeout( () => { // function to run when smooth scroll finishes
        datenodeContainer.current.removeEventListener( 'scroll', scrollStopCallback);
        datenodeContainer.current.style.scrollBehavior = '';

        // find dates to unload
        const i = getResetIndices(range);
    
        const newRange = range.slice(i.floor, i.roof);
        range.forEach(r => {
          if (!newRange.includes(r)) {
            r.detachLabelsListener();
            r.detachPlansListener();
          }
        });
    
        const newDateRange = getRangeDates(newRange[0].start, newRange[newRange.length - 1].end);
        const newDates = dates.filter(d => newDateRange.includes(d.date_str));
    
        // unload the dates
        dispatchDates({ type: 'replace', dates: newDates });
        setRange(newRange);
        setLoading(false);
      }, 50 );
    }
    datenodeContainer.current.addEventListener( 'scroll', scrollStopCallback, { passive: true } );
    scrollStopCallback();
  }

  return (
  <>
    <button 
      onClick={handleToday} 
      style={{position: 'absolute', top: '54px', left: '16px'}}
    >today</button>
    <ul
      id={'datenode-container'} 
      ref={datenodeContainer}
      onScroll={handleNodePagination}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
    >
      {children}
      {(loading === "FRONT" || loading === "INIT") && <div style={{width: '100%', order: -1, position: 'absolute'}}>loading</div>}
      {(loading === "END") && <div style={{position: 'absolute'}}>loading</div>}
    </ul>
  </>
  )
}

export default ScrollHandler;