import React, { createContext, useCallback, useReducer } from "react";

import { addWeekRanges, getInitCalendarDates, getRangeDates, getScrollRange, getWeekRanges, newDateRange} from './utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { db, UidContext } from "globalContext";
import { Calendar, CalendarAction, SetStyles } from "types/calendar";
import WeekRangeListener from "./WeekRangeListener";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: (action: CalendarAction) => Promise<void> });

const init = (_noArg: never): Calendar => {
  const [ startDate, endDate ] = newDateRange([], "init");

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
    weekRanges: getWeekRanges(startDate, endDate),
    renderRange: getRangeDates(startDate, endDate),
    dates: getInitCalendarDates(localDatesAll, startDate, endDate), // TODO: error checking for valid local storage is incomplete
  }
}

const reducer = (state: Calendar, action: CalendarAction): Calendar => {
  switch (action.type) {
    case 'set-styles': 
      try {
        localStorage.setItem('planStyles', JSON.stringify(action.planStyles));
      } catch (error) {
        console.error(error);
      }
      return {
        ...state,
        planStyles: {...action.planStyles},
      }
    case 'set-labels': {
      const dateStrs = Object.keys(action.labels); // date strings of each label group
      const newDatesAll = {...state.datesAll}; // instantiate the new object for datesAll

      dateStrs.forEach(dateStr => {
        const date = newDatesAll[dateStr];
        const label = action.labels[dateStr];

        if (label && ('labelId' in label)) { // if there exists a relevant label
          if (date) { // if date exists 
            newDatesAll[dateStr] = {...date, label}; // update the label
          } else { // else date doesnt exist 
            newDatesAll[dateStr] = { // make a new date item with label
              dateStr, 
              plans: [],
              label,
            }
          }
        } else { // no label
          if (!date) { // no date
            newDatesAll[dateStr] = { // add empty date
              dateStr, 
              plans: [],
            }
          }
        }
      })

      try {
        localStorage.setItem('datesAll', JSON.stringify(newDatesAll));
      } catch (error) {
        console.error(error);
      }

      return {
        ...state,
        datesAll: newDatesAll, // updated datesAll
        dates: state.renderRange.map(dateStr => newDatesAll[dateStr] || {dateStr, plans: []}), // default date if outside of action range
      }
    }
    case 'set-plans': {
      const dateStrs = Object.keys(action.plans); // date strings of each plan group
      const newDatesAll = {...state.datesAll}; // instantiate the new object for datesAll

      dateStrs.forEach(dateStr => {
        const date = newDatesAll[dateStr];
        if (date) { // if date exists 
          newDatesAll[dateStr] = {...date, plans: action.plans[dateStr]}; // update the plans array 
        } else { // else date doesnt exist 
          newDatesAll[dateStr] = { // make a new date item with plans array
            dateStr, 
            plans: action.plans[dateStr],
          }
        }
      })

      try {
        localStorage.setItem('datesAll', JSON.stringify(newDatesAll));
      } catch (error) {
        console.error(error);
      }

      return {
        ...state,
        datesAll: newDatesAll, // updated datesAll
        dates: state.renderRange.map(dateStr => newDatesAll[dateStr] || {dateStr, plans: []}), // default date if outside of action range
      }
    }
    case 'move-render-range': {
      const newRenderRange = getScrollRange(state.renderRange, action.dir);

      return {
        ...state,
        renderRange: newRenderRange,
        weekRanges: addWeekRanges(state.weekRanges, newRenderRange),
        dates: newRenderRange.map(dateStr => state.datesAll[dateStr] || { dateStr, plans: [] }),
      }
    }
    case 'set-render-range':
      return {
        ...state,
        renderRange: [...action.renderRange],
        weekRanges: action.updateWeekRange ? addWeekRanges([], action.renderRange) : state.weekRanges,
        dates: action.renderRange.map(dateStr => state.datesAll[dateStr] || { dateStr, plans: [] }),
      }
    default:
      const _exhaustiveCheck: never = action;
      return _exhaustiveCheck;
  }
}

function CalendarComponent() {
  const {uid} = React.useContext(UidContext);
  const [calendar, dispatchCore] = useReducer(reducer, null as never, init);

  const dispatch = useCallback(async (action: CalendarAction) => {
    try {
      switch (action.type) {
        case 'set-styles': 
        case 'set-labels': 
        case 'set-plans': 
        case 'set-render-range': 
        case 'move-render-range': 
          dispatchCore(action);
          break;
        default: {
          // eslint-disable-next-line
          const _exhaustiveCheck: never = action;
          break;
        }
      }
    } catch (error) {
      console.log(action, error);
    }
  }, []);
  
  // calendar mount and unmount
  React.useEffect(() => {
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
      detachPlanStyleListener();
    }
  }, [uid, dispatch]);

  return (
    <CalendarContext.Provider value={{ calendar, dispatch }}>
      {calendar.weekRanges.map(range => <WeekRangeListener key={range.startDate} startDate={range.startDate} endDate={range.endDate}/>)}
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
