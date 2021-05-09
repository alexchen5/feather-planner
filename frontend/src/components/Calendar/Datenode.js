import React from "react";

import {CalendarContext} from '.'
import AddPlan from "./AddPlan";
import { strToDate, dateToStr } from './util';

function Datenode({date_str, children}) {
  const { dispatchDates } = React.useContext(CalendarContext);
  const [isToday, setIsToday] = React.useState(date_str === dateToStr());
  const thisDate = strToDate(date_str);
  
  React.useEffect(() => {
    if (date_str < dateToStr()) return;
    const timer = setInterval(() => {
      if (isToday !== (date_str === dateToStr())) setIsToday(date_str === dateToStr());
    }, 1000);
    return () => clearInterval(timer);
  }, [date_str, isToday]);

  const menuEvent = (e) => {
    if (e.currentTarget !== e.target) return;
    
    if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      dispatchDates({type: 'menu-v', date_str});
    }
  }
  return (
    <li
      className={'datenode-root -calendar-bg'}
      datenode={date_str}
      onContextMenu={e => {
        e.stopPropagation();
        dispatchDates({type: 'menu', event: e, date_str})
      }}
      onKeyDown={menuEvent}
    >
      <div 
        className={'datenode-item'}
        tabIndex='0'
      >
        <div className={`datenode-header`} >
          {isToday ? 'T o d a y' : thisDate.getDate() === 1 ? thisDate.toLocaleDateString('default', {month: 'long'}) : thisDate.getDate()}
        </div>
        {children}
        <AddPlan
          date_str={date_str}
        />
      </div>
    </li> 
  )
}

export default Datenode;
