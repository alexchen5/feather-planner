import React, { createContext, useCallback, useReducer, useRef } from "react";
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';

import '../../Calendar.css'

import { getPlan, getPlanIds, getUpdateRange} from './util';
import Plan from './Plan'
import ScrollHandler, { dragFinalised } from "./ScrollHandler";
import Datenode from "./Datenode";
import DayHeaders from "./DayHeaders";
import CalendarContainer from "./CalendarContainer";
import { db } from "../../pages/HomePage";
import { UidContext } from "../../App";

export const CalendarContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'load': 
      return action.dir === 'END' ? {
        dates: [...state.dates, ...action.dates]
      } : {
        dates: [...action.dates, ...state.dates]
      }
    case 'update':
      return {
        dates: state.dates.map(date => 
          action.plans[date.date_str] ? { ...date, plans: action.plans[date.date_str] } : date
        )
      }
    case 'update-label':
      return {
        dates: state.dates.map(date =>
          action.labels[date.date_str] ? { ...date, label: action.labels[date.date_str] } : date
        )
      }
    default:
      console.log(`Unknown action type: ${action.type}`);
      return state;
  }
}

function Calendar() {
  const [{ dates }, dispatch] = useReducer(reducer, {dates: []});
  const { show } = useContextMenu({
    id: 'planContextMenu',
  });
  const clipboard = useRef(null);
  const {uid} = React.useContext(UidContext);

  const dispatchWrapper = useCallback(async (action) => {
    try {
      switch (action.type) {
        case 'add': {
          const ids = getPlanIds(dates, action.date_str);
          const prv = ids[ids.length - 1] || '';
          db.collection(`users/${uid}/plans`).add({
            date: action.date_str,
            content: action.entries,
            prv: prv,
          });
          break;
        }
        case 'edit': {
          db.doc(`users/${uid}/plans/${action.plan_id}`).update('content', action.entries);
          break;
        }
        case 'delete': {
          const ids = getPlanIds(dates, action.date_str);
          const p = ids.indexOf(action.plan_id);

          const delBatch = db.batch();
          if (ids[p+1]) delBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', ids[p-1] || '');
          delBatch.delete(db.doc(`users/${uid}/plans/${action.plan_id}`));
          delBatch.commit();

          break;
        }
        case 'move': {
          const {plan_id, to_date, from_prv_id, from_nxt_id, to_prv_id, to_nxt_id } = action;
          
          const moveBatch = db.batch();
          if (to_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', plan_id);
          moveBatch.update(db.doc(`users/${uid}/plans/${plan_id}`), 'date', to_date, 'prv', to_prv_id);
          if (from_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', from_prv_id);
          moveBatch.commit();

          break;
        }
        case 'load': {
          dispatch({...action, dates: action.dateRange});
          db.collection(`users/${uid}/date-labels`)
            .where('date', '>=', action.start)
            .where('date', '<', action.end)
            .onSnapshot((snapshot) => {
              const newLabels = {};
              snapshot.forEach((doc) => {
                const d = doc.data();
                newLabels[d.date] = {
                  label_id: doc.id,
                  content: d.content,
                };
              })
              dispatch({ type: 'update-label', labels: newLabels });

              // snapshot.docChanges().forEach(change => {
              //   console.log(change.doc.data(), change.type)
              // })
            });

          db.collection(`users/${uid}/plans`)
            .where('date', '>=', action.start)
            .where('date', '<', action.end)
            .onSnapshot((snapshot) => {
              const newPlans = getUpdateRange(action.start, action.end);
              let reserves = [];
              snapshot.forEach((doc) => {
                const d = doc.data();
                const newPlan = {
                  plan_id: doc.id,
                  content: d.content,
                  prv: d.prv,
                };
                if (!d.prv) {
                  newPlans[d.date].push(newPlan);
                } else {
                  const prv = newPlans[d.date].findIndex(plan => plan.plan_id === d.prv);
                  if (prv !== -1) newPlans[d.date].splice(prv + 1, 0, newPlan);
                  else reserves.push({date: d.date, plan: newPlan});
                }
              });
              let prvlen;
              while (reserves.length && reserves.length !== prvlen) {
                let nextReserves = [];
                reserves.forEach(r => {
                  const prv = newPlans[r.date].findIndex(plan => plan.plan_id === r.plan.prv);
                  if (prv !== -1) newPlans[r.date].splice(prv + 1, 0, r.plan);
                  else nextReserves.push(r);
                })
                prvlen = reserves.length;
                reserves = nextReserves;
              }
              reserves.forEach(r => {
                r.plan.prv = '';
                newPlans[r.date].push(r.plan);
              })
              dispatch({ type: 'update', plans: newPlans });
              dragFinalised();

              // snapshot.docChanges().forEach(change => {
              //   console.log(change.doc.data(), change.type)
              // })
            });
          break;
        }
        case 'menu': {
          show(action.event, {
            props: {
              plan_id: action.plan_id,
              date_str: action.date_str,
              plan_el: action.plan_el,
            }
          });
          break;
        }
        case 'menu-c': {
          // clipboard.current = {
          //   plan_id: action.plan_id,
          //   date_str: action.date_str,
          // }
          break;
        }
        case 'menu-v': {
          if (!clipboard.current) {
            console.log('Clipboard Empty');
            return;
          }
          const plan = getPlan(dates, clipboard.current.plan_id);
          dispatchWrapper({type: 'add', date_str: action.date_str, entries: plan.content})
          break;
        }
        default: {
          console.warn(`Unknown action type: ${action.type}`);
        }
      }
    } catch (error) {
      console.log(action, error);
    }
  }, [uid, dates, show]);
  // const clipboard = React.useRef();

  return (
    <CalendarContext.Provider value={{dates: dates, dispatchDates: dispatchWrapper}}>
      <CalendarContainer>
        <DayHeaders />
        <ScrollHandler>
          {dates.map(date => <Datenode
            key={date.date_str}
            date_str={date.date_str}
            label={date.label}
          >
            {date.plans.map(plan => <Plan
              key={plan.plan_id}
              plan={{date_str: date.date_str, ...plan}}
            />)}
          </Datenode>)}
        </ScrollHandler>
      </CalendarContainer>
      <Menu id='planContextMenu'>
        <Item onClick={e => dispatchWrapper({type: 'menu-edit', ...e.props})}>Edit</Item>
        <Item onClick={e => dispatchWrapper({type: 'delete', ...e.props})}>Delete</Item>
        <Separator/>
        {/* <Item onClick={handleMenuEvent} data={{role: 'cut'}}>Cut</Item> */}
        <Item onClick={e => dispatchWrapper({type: 'menu-c', ...e.props})}>Copy</Item>
        <Item onClick={e => dispatchWrapper({type: 'menu-v', ...e.props})}>Paste</Item>
      </Menu>
    </CalendarContext.Provider>
  );
}

export default Calendar;
