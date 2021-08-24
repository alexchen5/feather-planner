import CalendarComponent from 'components/Calendar';
import DateRangeListener from 'components/Calendar/DateRangeListener';
import { addRangeListeners, getInitDateRange } from 'components/Calendar/utils/dateUtil';
import SideNotes from 'components/SideNotes';

import firebase from "firebase/app";
import "firebase/auth";
import { db, IS_CACHE_ON, UidContext } from 'globalContext';
import React from 'react';
import { Link, Route, Switch } from 'react-router-dom';
import { FeatherPlanner, FeatherPlannerAction, SetStyles } from 'types';

export const FeatherContext = React.createContext({} as { featherPlanner: FeatherPlanner, dispatch: React.Dispatch<FeatherPlannerAction> });

let listenerCleanTime = 0;

const init = (_noArg: never): FeatherPlanner => {
  const { startDate, endDate } = getInitDateRange();

  // TODO: trim local storage when it inevitably gets too big to load in at once
  let localDatesAll, localPlanStyles = {}
  if (IS_CACHE_ON) {
    console.time("Cache Loading Time")
    localDatesAll = JSON.parse(localStorage.getItem('datesAll')!);
    localPlanStyles = JSON.parse(localStorage.getItem('planStyles')!);
    console.timeEnd("Cache Loading Time"); // not sure why this function is called twice...
  }

  for (const [styleId, style] of Object.entries(localPlanStyles)) {
    // @ts-ignore
    if (style?.color) document.documentElement.style.setProperty(`--plan-color-${styleId}`, style.color);
    // @ts-ignore
    if (style?.colorDone) document.documentElement.style.setProperty(`--plan-color-done-${styleId}`, style.colorDone);
  }

  return {
    calendarDates: localDatesAll || {}, 
    calendarPlanStyles: localPlanStyles || {},
    dateRanges: addRangeListeners([], {startDate, endDate}),
  };
}

/**
 * Wrapper for storing an object in localStorage. Does not store if 
 * IS_CACHE_ON is false.
 * 
 * TODO: define error cases
 * @precondition object is valid JSON 
 * @param name name of object to be stored as 
 * @param object object to store
 */
 const tryCacheItem = (name: string, object: any) => {
  if (IS_CACHE_ON) {
    try {
      localStorage.setItem(name, JSON.stringify(object));
    } catch (error) {
      console.error(error);
    }
  }
}

const reducer = (state: FeatherPlanner, action: FeatherPlannerAction): FeatherPlanner => {
  if (action.type === 'set-styles') {
    tryCacheItem('planStyles', action.planStyles);

    return {
      ...state,
      calendarPlanStyles: {...action.planStyles},
    }
  } else if (action.type === 'set-labels' || action.type === 'set-plans') {
    const dateStrs = action.type === 'set-labels' ? Object.keys(action.labels) : Object.keys(action.plans); // date strings for action
    const newDatesAll = {...state.calendarDates}; // instantiate the new object for datesAll

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
    tryCacheItem('datesAll', newDatesAll); // cache the resultant datesAll

    return {
      ...state,
      calendarDates: newDatesAll, // updated datesAll
    }
  } else if (action.type === 'update-date-ranges') {
    listenerCleanTime = 1;  // set to 1 to start cleanup timer
    return {
      ...state,
      dateRanges: addRangeListeners(state.dateRanges, action.newRenderRange),
    }
  } else if (action.type === 'clean-date-ranges') {
    return {
      ...state,
      dateRanges: state.dateRanges.filter(listener => listener.onScreen), 
    }
  } else {
    const _exhaustiveCheck: never = action;
    return _exhaustiveCheck;
  }
}

function HomePage() {
  const {uid} = React.useContext(UidContext);
  const [featherPlanner, dispatch] = React.useReducer(reducer, null as never, init);

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

    // attach listener to clean up unused date range listeners after 60 seconds
    const timer = setInterval(() => {
      if (listenerCleanTime) listenerCleanTime++; // increment time if positive number
      if (listenerCleanTime === 60) {
        listenerCleanTime = 0; // set to zero for clean
        dispatch({ type: 'clean-date-ranges' });
      }
    }, 1000);

    return () => {
      // detach db listeners 
      detachPlanStyleListener();
      clearInterval(timer);
    }
  }, [uid]);

  return (
    <FeatherContext.Provider value={{ featherPlanner, dispatch }}>
      {featherPlanner.dateRanges.map(range => <DateRangeListener key={range.startDate} startDate={range.startDate} endDate={range.endDate}/>)}
      <div id="home-layout"> 
        <div id="home-menu">
          <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
          <Link to={'/'}><button>Show Calendar</button></Link>
          <Link to={'/notes'}><button>Show Notes</button></Link>
        </div>
        <div id="home-app">
          <Switch> 
            <Route
              exact
              path='/notes'
              component={SideNotes}
            />
            <Route
              exact
              path={['/', 'calendar']}
              render={() => <CalendarComponent allDates={featherPlanner.calendarDates}/>}
            />
          </Switch>
        </div>
      </div>
    </FeatherContext.Provider>
  );
}

export default HomePage;
