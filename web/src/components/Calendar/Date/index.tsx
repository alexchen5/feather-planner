import React, { MouseEventHandler, ReactNode } from "react";
import { CalendarDateLabel } from "types/calendar";

import AddPlan from "../Plan/AddPlan";
import DateLabel from "./DateLabel";
import { strToDate, dateToStr } from '../utils/dateUtil';

import style from "./date.module.scss";

function Date({ dateStr, label, children }: { dateStr: string, label: CalendarDateLabel | null, children: ReactNode }) {
  const [isToday, setIsToday] = React.useState(dateStr === dateToStr());
  const thisDate = strToDate(dateStr);
  const addPlan = React.createRef<HTMLButtonElement>();
  
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
   */
  const handleMouseDown: MouseEventHandler<HTMLLIElement> = (event) => {
    const target = event.target as HTMLElement; // assume target is a HTML element
    if (target.getAttribute('fp-role') === 'calendar-date') {
      addPlan.current && 
      !document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement) && 
      !document.querySelector('[fp-role="calendar-plan"][fp-state^="edit"]') &&
      addPlan.current.click()
    }
  }

  return (
    <li
      className={style.root}
      fp-role={'calendar-date-root'}
      data-date={dateStr}
      onMouseDown={handleMouseDown}
    >
      <div fp-role={'calendar-date'} className={style.item}>
        <div className={style.header}>
          <DateLabel dateStr={dateStr} label={label}/>
          <div 
            className={style.date}
            fp-state={isToday ? 'highlight' : 'standard'}
          >
            {thisDate.getDate() === 1 ? '1 ' + thisDate.toLocaleDateString('default', {month: 'short'}) : thisDate.getDate()}
          </div>
        </div>
        {children}
        <AddPlan
          dateStr={dateStr}
          ref={addPlan}
        />
      </div>
    </li> 
  )
}

export default Date;
