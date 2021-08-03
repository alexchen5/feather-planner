import React from "react";

import {CalendarContext} from '.'
import AddPlan from "./AddPlan";
import DateLabel from "./DateLabel";
import { strToDate, dateToStr } from './util';

function Datenode({date_str, label, children}) {
  const { dispatchDates } = React.useContext(CalendarContext);
  const [isToday, setIsToday] = React.useState(date_str === dateToStr());
  const thisDate = strToDate(date_str);
  const addPlan = React.createRef();
  
  React.useEffect(() => {
    if (date_str < dateToStr()) return;
    const timer = setInterval(() => {
      if (isToday !== (date_str === dateToStr())) setIsToday(date_str === dateToStr());
    }, 1000);
    return () => clearInterval(timer);
  }, [date_str, isToday]);

  const menuEvent = (e) => {
    // if (e.currentTarget !== e.target) return;
    
    if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      dispatchDates({type: 'menu-v', date_str});
    }
  }

  /**
   * Mouse down will add a new plan to the datenode
   * We use mousedown because we want to check for focused elements before
   * activating a new plan
   * @param {*} e 
   */
  const handleMouseDown = (e) => {
    // console.log(e.target.className);
    if (e.target.className === 'datenode-item') {
      addPlan.current && 
      !document.querySelector('#calendar-container').contains(document.activeElement) && 
      !document.querySelector('div[plan][state="edit"]') &&
      addPlan.current.click()
    }
  }

  return (
    <li
      // className={'datenode-root -calendar-bg'}
      className={'datenode-root'}
      datenode={date_str}
      onContextMenu={e => {
        e.stopPropagation();
        dispatchDates({type: 'menu', event: e, date_str})
      }}
      onKeyDown={menuEvent}
      onMouseDown={handleMouseDown}
    >
      <div className={'datenode-item'}>
        <div className={`datenode-header`}>
          <DateLabel date_str={date_str} label={label}/>
          <div className={'datenode-date' + (isToday ? ' today' : '')}>
            {thisDate.getDate() === 1 ? '1 ' + thisDate.toLocaleDateString('default', {month: 'short'}) : thisDate.getDate()}
          </div>
        </div>
        {children}
        <AddPlan
          date_str={date_str}
          ref={addPlan}
        />
      </div>
    </li> 
  )
}

export default Datenode;
