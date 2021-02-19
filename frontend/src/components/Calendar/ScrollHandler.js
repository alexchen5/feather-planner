import React, { useEffect } from "react";

import {CalendarContext} from '.'
import {newDateRange, dateToStr } from './util';

function ScrollHandler({children}) {
  const {dates, dispatchDates} = React.useContext(CalendarContext);
  const [loading, setLoading] = React.useState(false);

  const loadDates = async (dateRange, dir) => {
    if (loading) return;
    setLoading(dir);
    await dispatchDates({type: 'load', dir, dateRange});
    if (dir === "INIT") {
      document.getElementById('datenode-container').scrollTop = 80;
      document.querySelector(`[datenode="${dateToStr()}"]`).focus();
    } else if (dir === "FRONT") {
      document.getElementById('datenode-container').scrollTop -= 1;
    }
    setLoading(false);
  }

  const handleNodePagination = event => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      const [dateRange, dir] = newDateRange(dates, "END")
      loadDates(dateRange, dir);
    } else if (event.currentTarget.scrollTop === 0) {
      const [dateRange, dir] = newDateRange(dates, "FRONT")
      loadDates(dateRange, dir);
    }
  }

  useEffect(() => {
    if (dates.length === 0) {
      const [dateRange, dir] = newDateRange(dates, "INIT");
      loadDates(dateRange, dir);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <ul
      id={'datenode-container'} 
      onScroll={handleNodePagination}
    >
      {children}
      {(loading === "FRONT" || loading === "INIT") && <div style={{width: '100%', order: -1, position: 'absolute'}}>loading</div>}
      {(loading === "END") && <div style={{position: 'absolute'}}>loading</div>}
    </ul>
  )
}

export default ScrollHandler;