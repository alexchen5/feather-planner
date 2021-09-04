import React from 'react';
import { Link, Route, Switch } from 'react-router-dom';
import firebase from "firebase/app";
import "firebase/auth";

import { db, UidContext } from 'utils/globalContext';
import { FeatherContext } from './context';
import { init, reducer } from './reducer';
import DateRangeListener from './DateRangeListener';

import DocumentEventListener from 'components/DocumentEventListener';
import CalendarComponent from 'components/Calendar';

import { SetStyles } from 'types/pages/HomePage/reducer';
import Notes from 'components/Notes';
import { useAllNotes } from 'components/Notes/data';
import { InodeListener } from 'components/Notes/Listeners';
import SideNotes from 'components/SideNotes';

function HomePage() {
  const {uid} = React.useContext(UidContext);
  const [featherPlanner, dispatch] = React.useReducer(reducer, null as never, init);

  const notes = useAllNotes(uid);

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

  React.useEffect(() => {
    // attach listener to clean up unused date range listeners after 60 seconds
    // of no changes to featherPlanner.dateRanges
    let t = setTimeout(() => dispatch({ type: 'clean-date-ranges' }), 60000);
    return () => clearTimeout(t);
  }, [featherPlanner.dateRanges])

  return (
    <DocumentEventListener>
      <FeatherContext.Provider value={{ featherPlanner, dispatch, notes }}>
        {featherPlanner.dateRanges.map(range => <DateRangeListener key={range.startDate} startDate={range.startDate} endDate={range.endDate}/>)}
        {notes.listeners.inodeListeners.map(path => <InodeListener path={path} giveFile={notes.inodes.giveFile}/>)}
        <div id="home-layout"> 
          <div id="home-menu">
            <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
            <Link to={'/'}><button>Calendar</button></Link>
            <Link to={'/notes'}><button>Notes</button></Link>
            <Link to={'/old-notes'}><button>Old Notes</button></Link>
          </div>
          <div id="home-app">
            <Switch> 
              <Route
                exact
                path='/old-notes'
                render={() => <SideNotes/>}
              />
              <Route
                exact
                path='/notes'
                render={() => <Notes/>}
              />
              <Route
                exact
                path={['/', 'calendar']}
                render={() => 
                  <CalendarComponent allDates={featherPlanner.calendarDates}/>
                }
              />
            </Switch>
          </div>
        </div>
      </FeatherContext.Provider>
    </DocumentEventListener>
  );
}

export default HomePage;
