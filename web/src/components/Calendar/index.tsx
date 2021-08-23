import React, { createContext, useReducer } from "react";

import { addWeekRanges, getInitCalendarDates, getInitDateRange, getRangeDates, getScrollRange, getWeekRanges } from './utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { db, UidContext } from "globalContext";
import { Calendar, CalendarAction, SetStyles } from "types/calendar";
import DateRangeListener from "./DateRangeListener";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: React.Dispatch<CalendarAction> });

const init = (_noArg: never): Calendar => {
  const { startDate, endDate } = getInitDateRange();

  // TODO: trim local storage when it inevitably gets too big to load in at once
  console.time("Cache Loading Time")
  const localDatesAll = JSON.parse(localStorage.getItem('datesAll')!);
  const localPlanStyles = JSON.parse(localStorage.getItem('planStyles')!);
  console.timeEnd("Cache Loading Time"); // not sure why this function is called twice...

  for (const [styleId, style] of Object.entries(localPlanStyles)) {
    // @ts-ignore
    if (style?.color) document.documentElement.style.setProperty(`--plan-color-${styleId}`, style.color);
    // @ts-ignore
    if (style?.colorDone) document.documentElement.style.setProperty(`--plan-color-done-${styleId}`, style.colorDone);
  }

  return {
    datesAll: localDatesAll || {}, 
    planStyles: localPlanStyles || {},
    dateRanges: getWeekRanges(startDate, endDate),
    renderRange: getRangeDates(startDate, endDate),
    dates: getInitCalendarDates(localDatesAll, startDate, endDate), // TODO: error checking for valid local storage is incomplete
  }
}

/**
 * Wrapper for storing an object in localStorage
 * 
 * TODO: define error cases
 * @precondition object is valid JSON 
 * @param name name of object to be stored as 
 * @param object object to store
 */
const cacheItem = (name: string, object: any) => {
  try {
    localStorage.setItem(name, JSON.stringify(object));
  } catch (error) {
    console.error(error);
  }
}

const reducer = (state: Calendar, action: CalendarAction): Calendar => {
  if (action.type === 'set-styles') {
    cacheItem('planStyles', action.planStyles);

    return {
      ...state,
      planStyles: {...action.planStyles},
    }
  } else if (action.type === 'set-labels' || action.type === 'set-plans') {
    const dateStrs = action.type === 'set-labels' ? Object.keys(action.labels) : Object.keys(action.plans); // date strings for action
    const newDatesAll = {...state.datesAll}; // instantiate the new object for datesAll

    dateStrs.forEach(dateStr => {
      let label = newDatesAll[dateStr]?.label || null; // initiate date label
      let plans = newDatesAll[dateStr]?.plans || []; // initiate date plans
      if ('labels' in action) {
        label = action.labels[dateStr]; // update label from action
      } else {
        plans = action.plans[dateStr]; // or update plans from action
      }

      newDatesAll[dateStr] = { dateStr, label, plans }; // update date
    });
    cacheItem('datesAll', newDatesAll); // cache the resultant datesAll

    return {
      ...state,
      datesAll: newDatesAll, // updated datesAll
      dates: state.renderRange.map(dateStr => newDatesAll[dateStr] || {dateStr, label: null, plans: []}), // map to newDatesAll
    }
  } else if (action.type === 'move-render-range' || action.type === 'set-render-range') {
    let newDateRanges;
    let newRenderRange;

    if (action.type === 'set-render-range') {
      newRenderRange = action.renderRange; // new render range from action 
      newDateRanges = action.updateDateRanges ? addWeekRanges([], action.renderRange) : state.dateRanges; // optionally replace render range
    } else {
      newRenderRange = getScrollRange(state.renderRange, action.dir); // get render range from helper function
      newDateRanges = addWeekRanges(state.dateRanges, newRenderRange); // expand date ranges based on new render range
    }
    
    return {
      ...state,
      dateRanges: newDateRanges, // update date ranges
      renderRange: newRenderRange, // update render range
      dates: newRenderRange.map(dateStr => state.datesAll[dateStr] || { dateStr, label: null, plans: [] }), // map new render range
    }
  } else {
    // ensure this is never reached
    const _exhaustiveCheck: never = action;
    return _exhaustiveCheck;
  }
}

function CalendarComponent() {
  const {uid} = React.useContext(UidContext);
  const [calendar, dispatch] = useReducer(reducer, null as never, init);
  
  // calendar mount and unmount
  React.useEffect(() => {
    // attach listener to db for plan styles 
    const detachPlanStyleListener = db.collection(`users/${uid}/plan-style`) 
      .onSnapshot((snapshot) => {
        const action: SetStyles = {
          type: 'set-styles',
          planStyles: {},
        }
        snapshot.forEach((doc) => {
          const d = doc.data();
          // TODO: complete error checking protocol
          action.planStyles[doc.id] = {
            label: d.label,
            color: d.color,
            colorDone: d.colorDone,
          }
          document.documentElement.style.setProperty(`--plan-color-${doc.id}`, d.color);
          document.documentElement.style.setProperty(`--plan-color-done-${doc.id}`, d.colorDone);
        });
        dispatch(action);
      });

    return () => {
      // detach db listeners 
      detachPlanStyleListener();
    }
  }, [uid]);

  return (
    <CalendarContext.Provider value={{ calendar, dispatch }}>
      {calendar.dateRanges.map(range => <DateRangeListener key={range.startDate} startDate={range.startDate} endDate={range.endDate}/>)}
      <CalendarContainer>
        {calendar.dates.map(date => 
          <Date
            key={date.dateStr}
            dateStr={date.dateStr}
            label={date.label}
          >
            {date.plans.map(plan => 
              <Plan
                key={plan.planId}
                plan={plan}
              />
            )}
          </Date>
        )}
      </CalendarContainer>
    </CalendarContext.Provider>
  );
}

export default CalendarComponent;
