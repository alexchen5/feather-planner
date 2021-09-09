import React from 'react';
import { Link, Route, Switch } from 'react-router-dom';
import firebase from "firebase/app";
import "firebase/auth";

import { db, UidContext } from 'utils/globalContext';
import { FeatherContext } from './context';
import { init, reducer } from './reducer';
import DateRangeListener from '../Calendar/DateRangeListener';

import DocumentEventListener from 'components/DocumentEventListener';
import CalendarComponent from 'pages/Calendar';

import { SetStyles } from 'types/pages/HomePage/reducer';
import Notes from 'pages/Notes';
import { useAllNotes } from 'pages/Notes/data';
import { DirectoryListener, InodeListener, PinboardListener } from 'pages/Notes/Listeners';

import { IconButton } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import DescriptionIcon from '@material-ui/icons/Description';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';

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
        {notes.listeners.inodeListeners.map(path => <InodeListener key={path} inodePath={path}/>)}
        {notes.listeners.directoryListeners.map(path => <DirectoryListener key={path} inodePath={path}/>)}
        {notes.listeners.pinboardListeners.map(path => <PinboardListener key={path} inodePath={path}/>)}
        <div id="home-layout"> 
          <div id="home-menu">
            <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
            <Link to={'/'}><IconButton size='medium'><HomeIcon/></IconButton></Link>
            <Link to={'/notes'}><IconButton size='medium'><DescriptionIcon/></IconButton></Link>
            <Link to={'/profile'}><IconButton size='medium'><AccountCircleIcon/></IconButton></Link>
          </div>
          <div id="home-app">
            <Switch>
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
