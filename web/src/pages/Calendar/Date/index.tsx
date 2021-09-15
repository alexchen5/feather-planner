import React, { MouseEventHandler, ReactNode } from "react";
import { CalendarDateLabel } from "types/components/Calendar";

import AddPlan from "../Plan/AddPlan";
import { monthArray, strToDate } from 'utils/dateUtil';

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

  return (
    <li
      className={style.root}
      fp-role={'calendar-date-root'}
      data-date={dateStr}
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
                  <div className={style.monthText}>{monthArray[thisDate.getMonth()]}</div>
                }
              </div>
            </div>
            {children}
          </div>
        </animated.div>
        <div fp-role={'add-plan-hitbox'} className={style.addPlanHitbox}>
          <AddPlan
            dateStr={dateStr}
            ref={addPlan}
          />
        </div>
      </div>
    </li> 
  )
}

export default Date;
