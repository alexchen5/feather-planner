import React, { useEffect, useRef } from "react";

import {CalendarContext} from '.'
import {newDateRange } from './util';

function ScrollHandler({children}) {
  const {dates, dispatchDates} = React.useContext(CalendarContext);
  const datenodeContainer = useRef(null);

  const handleNodePagination = event => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      const [dateRange, dir] = newDateRange(dates, "END")
      dispatchDates({type: 'load', dir, dateRange});
    } else if (event.currentTarget.scrollTop === 0) {
      const [dateRange, dir] = newDateRange(dates, "FRONT")
      dispatchDates({type: 'load', dir, dateRange});
    }
  }

  useEffect(() => {
    if (dates.length === 0) {
      const [dateRange, dir] = newDateRange(dates, "INIT")
      dispatchDates({type: 'load', dir, dateRange});
    }
    // eslint-disable-next-line
  }, []);

  return (
    <ul
      ref={datenodeContainer}
      cols={7} spacing={0} 
      id={'datenode-container'} 
      onScroll={handleNodePagination}
    >
      {children}
    </ul>
  )
}

export default ScrollHandler;