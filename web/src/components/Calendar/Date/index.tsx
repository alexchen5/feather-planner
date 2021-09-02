import React, { MouseEventHandler, ReactNode } from "react";
import { CalendarDateLabel } from "types/components/Calendar";

import AddPlan from "../Plan/AddPlan";
import { strToDate } from 'utils/dateUtil';

import { useSpring, animated } from 'react-spring';
import { useMeasure } from "react-use";

import style from "./date.module.scss";
import { useIsToday } from "utils/useDateUtil";
import DateLabel from "./DateLabel";

function Date({ dateStr, label, children }: { dateStr: string, label: CalendarDateLabel | null, children: ReactNode }) {
  const isToday = useIsToday(dateStr);
  const thisDate = strToDate(dateStr);
  const addPlan = React.createRef<HTMLButtonElement>();

  // track the height of the date's content 
  const [contentRef, { height }] = useMeasure<HTMLDivElement>(); 
  // animate the height of a wrapper div of the content
  const [spring] = useSpring(() => {
    if (!height) return; // height is either not loaded, or there's no content. Don't use spring.
    return { // otherwise, we can animate the wrapper's height to the new height
      config: { tension: 270, clamp: true, },
      to: { height: height },
    }
  }, [height]);

  /**
   * Mouse down will add a new plan to the datenode
   * 
   * We use mousedown because we want to check for focused elements before
   * activating a new plan
   */
  const handleMouseDown: MouseEventHandler<HTMLLIElement> = (event) => {
    const target = event.target as HTMLElement; // assume target is a HTML element
    if (
      target.getAttribute('fp-role') === 'calendar-date'
      && addPlan.current 
      && !document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement)
      && !document.querySelector('[fp-role="calendar-plan"][fp-state^="edit"]')
    ) {
      event.preventDefault();
      event.stopPropagation();
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
        <animated.div style={{...spring}}> {/* Wrapper with animated height based on content */}
          <div ref={contentRef}> {/* Content, whose height is tracker */}
            <div className={style.headerContainer}>
              <DateLabel dateStr={dateStr} label={label}/>
              <div className={style.headerDate} fp-state={isToday ? 'highlight' : 'standard'}>
                <div className={style.dateNumber}>{thisDate.getDate()}</div>
                {
                  thisDate.getDate() === 1 &&  
                  <div className={style.monthText}>{thisDate.toLocaleDateString('default', {month: 'short'})}</div>
                }
              </div>
            </div>
            {children}
          </div>
        </animated.div>
        <AddPlan
          dateStr={dateStr}
          ref={addPlan}
        />
      </div>
    </li> 
  )
}

export default Date;
