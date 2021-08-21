import React, { createContext, useCallback, useReducer } from "react";

import { getEmptyCalendarDates, getUpdateRange, getWeekRanges, newDateRange} from './utils/dateUtil';
import Plan from './Plan'
import Date from "./Date";
import CalendarContainer from "./CalendarContainer";
import { db, UidContext } from "globalContext";
import { Calendar, CalendarAction, CalendarPlan, InitDispatch, LoadDates, SetLabels, SetPlans, SetStyles, WeekRange } from "types/calendar";
import { RawDraftContentState } from "draft-js";

export const CalendarContext = createContext({} as { calendar: Calendar, dispatch: (action: CalendarAction) => Promise<void> });

const init = (_noArg: never): Calendar => {
  const [ startDate, endDate ] = newDateRange([], "init");

  return {
    dates: getEmptyCalendarDates(startDate, endDate), 
    weekRanges: [],
    planStyles: {},
  }
}

const reducer = (state: Calendar, action: CalendarAction): Calendar => {
  switch (action.type) {
    case 'set-dates': 
      return {
        ...state,
        dates: [...action.dates],
      }
    case 'set-week-ranges': 
      return {
        ...state,
        weekRanges: [...action.weekRanges],
      }
    case 'set-styles': 
      return {
        ...state,
        planStyles: {...action.planStyles},
      }
    case 'set-labels': 
      return {
        ...state,
        dates: state.dates.map(date => {
          const label = action.labels[date.dateStr];
          if (label && ('labelId' in label)) {
            return { ...date, label: label }
          }
          return date;
        }),
      }
    case 'set-plans': 
      return {
        ...state,
        dates: state.dates.map(date => 
          action.plans[date.dateStr] ? { ...date, plans: action.plans[date.dateStr] } : date
        ),
      }
    case 'load-raw-dates': 
      return action.dir === 'end' ? {
        ...state,
        dates: [...state.dates, ...getEmptyCalendarDates(action.startDate, action.endDate)],
      } : {
        ...state,
        dates: [...getEmptyCalendarDates(action.startDate, action.endDate), ...state.dates],
      }
    default:
      const _exhaustiveCheck: InitDispatch | LoadDates = action;
      return _exhaustiveCheck as never;
  }
}

function CalendarComponent() {
  const {uid} = React.useContext(UidContext);
  const [calendar, dispatchCore] = useReducer(reducer, null as never, init);

  const dispatch = useCallback(async (action: CalendarAction) => {
    try {
      switch (action.type) {
        case 'set-dates':
        case 'set-week-ranges':
        case 'load-raw-dates':
        case 'set-styles': 
        case 'set-labels': 
        case 'set-plans': 
          dispatchCore(action);
          break;
        case 'init': {
          // attach db listeners to plan styles 
          db.collection(`users/${uid}/plan-style`) 
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
          
          // dispatch loading for initial dates
          const [ startDate, endDate ] = newDateRange([], "init");
          const action: LoadDates = {
            type: 'load-dates',
            dir: 'start',
            startDate,
            endDate,
          }
          dispatch(action);

          break;
        }
        case 'load-dates': {
          // attach db listeners to dates
          const weekRanges = getWeekRanges(action.startDate, action.endDate) as Array<WeekRange>;
          weekRanges.forEach(r => {
            r.detachLabelsListener = db.collection(`users/${uid}/date-labels`) // labels for each date
              .where('date', '>=', r.startDate)
              .where('date', '<', r.endDate)
              .onSnapshot((snapshot) => {
                const action: SetLabels = {
                  type: 'set-labels', 
                  labels: getUpdateRange(r.startDate, r.endDate, 'object'), 
                }
                snapshot.forEach((doc) => {
                  const d = doc.data();
                  const content = d.content as string | RawDraftContentState | undefined;
                  if (!content) {
                    console.error('Deleting date label due to empty content. labelId: ' + doc.id);
                    db.doc(`users/${uid}/date-labels/${doc.id}`).delete();
                  } else {
                    action.labels[d.date] = {
                      labelId: doc.id,
                      content,
                    };
                  }
                })
                dispatch(action);
              });

            r.detachPlansListener = db.collection(`users/${uid}/plans`) // user's plans
              .where('date', '>=', r.startDate)
              .where('date', '<', r.endDate)
              .onSnapshot((snapshot) => {
                const action: SetPlans = { 
                  type: 'set-plans', 
                  plans: getUpdateRange(r.startDate, r.endDate, 'array'), 
                }
                let reserves: { date: string, plan: CalendarPlan }[] = [];
                snapshot.forEach((doc) => {
                  const d = doc.data();
                  const dateStr = d.date                              as string | undefined;
                  const isDone  = (d.done || d.content.done || false) as boolean;
                  const content = (d.header || d.content.textContent) as string | RawDraftContentState | undefined;
                  const styleId = (d.planStyleId || "default")        as string;
                  const prv     = (d.prv || '')                       as string;

                  if (!dateStr) {
                    console.error('Deleting plan due to corrupt date string. planId: ' + doc.id);
                    db.doc(`users/${uid}/plans/${doc.id}`).delete();
                  } else if (!content) {
                    console.error('Deleting plan due to empty content. planId: ' + doc.id);
                    db.doc(`users/${uid}/plans/${doc.id}`).delete();
                  } else {
                    const newPlan: CalendarPlan = {
                      planId: doc.id,
                      dateStr,
                      isDone,
                      content,
                      styleId,
                      prv,
                    };

                    if (!d.prv) {
                      action.plans[d.date].push(newPlan);
                    } else {
                      const prv = action.plans[d.date].findIndex(plan => plan.planId === d.prv);
                      if (prv !== -1) action.plans[d.date].splice(prv + 1, 0, newPlan);
                      else reserves.push({ date: d.date, plan: newPlan });
                    }
                  }
                });
                let prvlen;
                while (reserves.length && reserves.length !== prvlen) {
                  let nextReserves: { date: string, plan: CalendarPlan }[] = [];
                  reserves.forEach(r => {
                    const prv = action.plans[r.date].findIndex(plan => plan.planId === r.plan.prv);
                    if (prv !== -1) action.plans[r.date].splice(prv + 1, 0, r.plan);
                    else nextReserves.push(r);
                  })
                  prvlen = reserves.length;
                  reserves = nextReserves;
                }
                reserves.forEach(r => {
                  r.plan.prv = '';
                  action.plans[r.date].push(r.plan);
                })
                dispatch(action);
              });
          });
          dispatch({ type: 'set-week-ranges', weekRanges });
          break;
        }
        default: {
          // eslint-disable-next-line
          const _exhaustiveCheck: never = action;
          break;
        }
      }
    } catch (error) {
      console.log(action, error);
    }
  }, [uid]);
  
  // calendar mount and unmount
  React.useEffect(() => {
    console.log('xd');
    
    dispatch({ type: 'init' });
    return () => {
      // action when uid changes
    }
  }, [dispatch]);

  return (
    <CalendarContext.Provider value={{ calendar, dispatch }}>
      <CalendarContainer>
        {calendar.dates.map(date => <Date
          key={date.dateStr}
          dateStr={date.dateStr}
          label={date.label}
        >
          {date.plans.map(plan => <Plan
            key={plan.planId}
            plan={plan}
          />)}
        </Date>)}
      </CalendarContainer>
    </CalendarContext.Provider>
  );
}

export default CalendarComponent;
