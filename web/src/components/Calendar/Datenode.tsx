import React, { MouseEventHandler, ReactNode } from "react";

import {CalendarContext} from '.'
import AddPlan from "./AddPlan";
import DateLabel from "./DateLabel";
import { strToDate, dateToStr } from './util';

function Datenode({ dateStr, label, children }: { dateStr: string, label: CalendarDateLabel, children: ReactNode }) {
  const { dispatch } = React.useContext(CalendarContext);
  const [isToday, setIsToday] = React.useState(dateStr === dateToStr());
  const thisDate = strToDate(dateStr);
  const addPlan = React.createRef();
  
  React.useEffect(() => {
    if (dateStr < dateToStr()) return;
    const timer = setInterval(() => {
      if (isToday !== (dateStr === dateToStr())) setIsToday(dateStr === dateToStr());
    }, 1000);
    return () => clearInterval(timer);
  }, [dateStr, isToday]);

  /**
   * Mouse down will add a new plan to the datenode
   * 
   * We use mousedown because we want to check for focused elements before
   * activating a new plan
   * @param e 
   */
  const handleMouseDown: MouseEventHandler = (event) => {
    // console.log(e.target.className);
    if (event.target.className === 'datenode-item') {
      addPlan.current && 
      !document.querySelector('#calendar-container').contains(document.activeElement) && 
      !document.querySelector('div[plan][state^="edit"]') &&
      addPlan.current.click()
    }
  }

  return (
    <li
      // className={'datenode-root -calendar-bg'}
      className={'datenode-root'}
      datenode={dateStr}
      onContextMenu={e => {
        e.stopPropagation();
        dispatch({type: 'menu', event: e, date_str: dateStr})
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={'datenode-item'}>
        <div className={`datenode-header`}>
          <DateLabel date_str={dateStr} label={label}/>
          <div className={'datenode-date' + (isToday ? ' today' : '')}>
            {thisDate.getDate() === 1 ? '1 ' + thisDate.toLocaleDateString('default', {month: 'short'}) : thisDate.getDate()}
          </div>
        </div>
        {children}
        <AddPlan
          date_str={dateStr}
          ref={addPlan}
        />
      </div>
    </li> 
  )
}

export default Datenode;
