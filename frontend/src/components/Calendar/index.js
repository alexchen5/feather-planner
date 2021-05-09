import React, { createContext, useCallback, useReducer, useRef } from "react";
import axios from 'axios';
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';

import '../../Calendar.css'

import {getPlanIds, getPlan} from './util';
import Plan from './Plan'
import ScrollHandler from "./ScrollHandler";
import Datenode from "./Datenode";
import DayHeaders from "./DayHeaders";
import CalendarContainer from "./CalendarContainer";
import { db } from "../../pages/HomePage";
import { UidContext } from "../../App";

export const CalendarContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    // case 'add': 
    //   // action.date_str: Date that needs a plan to be added
    //   // action.new_plan: New plan to be added
    //   // action.new_index: Index of new plan (add to end if undefined)
    //   // NOTE: No Duplicate ID Rule: Will silently filter new_plan from date if new_plan.plan_id already exists in the date
    //   function insertAt(array, item, index) {
    //     const ret = [...array];
    //     index === undefined ? ret.push(item) : ret.splice(index, 0, item);
    //     return ret;
    //   }
    //   return {
    //     dates: state.dates.map(date => 
    //       date.date_str === action.date_str ? {
    //         ...date, 
    //         plans: insertAt(date.plans.filter(e => e.plan_id !== action.new_plan.plan_id), action.new_plan, action.new_index),
    //       } : date
    //     )
    //   }
    // case 'edit': 
    //   return {
    //     dates: state.dates.map(date => 
    //       date.date_str === action.date_str ? { ...date, plans: 
    //         date.plans.map(plan => 
    //           plan.plan_id === action.plan_id ? {...plan, content: action.entries} : plan
    //         )
    //       } : date
    //     )
    //   }
    case 'delete': 
      // action.date_str: Date that needs plans to be removed
      // action.plan_id: Plan id to be filtered from the date
      return {
        dates: state.dates.map(date => 
          date.date_str === action.date_str ? { ...date, plans: date.plans.filter(plan => plan.plan_id !== action.plan_id)} : date
        )
      }
    case 'load': 
      return action.dir === 'END' ? {
        dates: [...state.dates, ...action.dates]
      } : {
        dates: [...action.dates, ...state.dates]
      }
    case 'update':
      return {
        dates: state.dates.map(date => 
          action.plans[date.date_str] ? { date_str: date.date_str, plans: action.plans[date.date_str] } : date
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
          db.collection(`users/${uid}/plans`).add({
            date: action.date_str,
            content: action.entries,
            prc: '',
          });
          break;
        }
        case 'edit': {
          db.doc(`users/${uid}/plans/${action.plan_id}`).update('content', action.entries);
          break;
        }
        case 'delete': {
          db.doc(`users/${uid}/plans/${action.plan_id}`).delete();
          break;
        }
        case 'duplicate': {
          const refContent = getPlan(dates, action.ref_id).content;
          const res = await axios.post('/calendar/plan/copy', {
            plan_id: parseInt(action.ref_id), 
            date: action.to_date,
          });
          const new_plan = {
            plan_id: parseInt(res.data.plan_id),
            content: refContent,
          };
          dispatch({...action, type: 'add', new_plan, date_str: action.to_date});
          break;
        }
        case 'move': {
          const {plan_id, to_date, from_date, from_prv_id, from_nxt_id, to_prv_id, to_nxt_id } = action;
          if (to_prv_id) db.doc(`users/${uid}/plans/${to_prv_id}`).update('prc', plan_id);
          db.doc(`users/${uid}/plans/${plan_id}`).update('date', to_date, 'prc', to_nxt_id);
          if (from_prv_id) db.doc(`users/${uid}/plans/${from_prv_id}`).update('prc', from_nxt_id);

          break;
        }
        case 'load': {
          dispatch({...action, dates: action.dateRange});
          db.collection(`users/${uid}/plans`)
            .where('date', '>=', action.start)
            .where('date', '<', action.end)
            .onSnapshot((snapshot) => {
              const newPlans = {};
              snapshot.docChanges().forEach(change => {
                newPlans[change.doc.data().date] = []
              })
              snapshot.forEach(doc => {
                const d = doc.data();
                if (newPlans[d.date]) {
                  const newPlan = {
                    plan_id: doc.id,
                    content: d.content,
                    prc: d.prc,
                  };
                  const prc = newPlans[d.date].findIndex(plan => plan.plan_id === d.prc);
                  if (prc !== -1) newPlans[d.date].splice(prc, 0, newPlan);
                  else newPlans[d.date].push(newPlan);
                }
              });
              console.log(newPlans)
              dispatch({ type: 'update', plans: newPlans })
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
          clipboard.current = {
            plan_id: action.plan_id,
            date_str: action.date_str,
          }
          break;
        }
        case 'menu-v': {
          if (!clipboard.current) {
            console.log('Clipboard Empty');
            return;
          }
          dispatchWrapper({type: 'duplicate', ref_id: clipboard.current.plan_id, to_date: action.date_str})
          break;
        }
        default: {
          console.log(`Unknown action type: ${action.type}`);
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
