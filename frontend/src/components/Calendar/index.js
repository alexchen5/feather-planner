import React, { createContext, useCallback, useReducer, useRef } from "react";
import axios from 'axios';
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';

import '../../Calendar.css'

import AuthContext from '../../AuthContext';
import {getPlanIds, getPlan} from './util';
import Plan from './Plan'
import ScrollHandler from "./ScrollHandler";
import Datenode from "./Datenode";
import DayHeaders from "./DayHeaders";
import CalendarContainer from "./CalendarContainer";

export const CalendarContext = createContext(null);

const reducer = (state, action) => {
  switch (action.type) {
    case 'add': 
      // action.date_str: Date that needs a plan to be added
      // action.new_plan: New plan to be added
      // action.new_index: Index of new plan (add to end if undefined)
      // NOTE: No Duplicate ID Rule: Will silently filter new_plan from date if new_plan.plan_id already exists in the date
      function insertAt(array, item, index) {
        const ret = [...array];
        index === undefined ? ret.push(item) : ret.splice(index, 0, item);
        return ret;
      }
      return {
        dates: state.dates.map(date => 
          date.date_str === action.date_str ? {
            ...date, 
            plans: insertAt(date.plans.filter(e => e.plan_id !== action.new_plan.plan_id), action.new_plan, action.new_index),
          } : date
        )
      }
    case 'edit': 
      return {
        dates: state.dates.map(date => 
          date.date_str === action.date_str ? { ...date, plans: 
            date.plans.map(plan => 
              plan.plan_id === action.plan_id ? {...plan, content: action.entries} : plan
            )
          } : date
        )
      }
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
      };
    default:
      console.log(`Unknown action type: ${action.type}`);
      return state;
  }
}

function Calendar() {
  const token = React.useContext(AuthContext);
  const [{ dates }, dispatch] = useReducer(reducer, {dates: []});
  const { show } = useContextMenu({
    id: 'planContextMenu',
  });
  const clipboard = useRef(null);

  const dispatchWrapper = useCallback(async (action) => {
    try {
      switch (action.type) {
        case 'add': {
          const res = await axios.post('/calendar/plan/new', {
            token,
            date: action.date_str,
            content: action.entries,
          })
          const new_plan = {
            plan_id: parseInt(res.data.plan_id),
            content: action.entries,
          }
          dispatch({...action, new_plan});
          break;
        }
        case 'edit': {
          await axios.put('/calendar/plan/edit', {
            token,
            plan_id: action.plan_id,
            content: action.entries,
          })
          dispatch(action);
          break;
        }
        case 'delete': {
          dispatch(action);
          await axios.put('/calendar/date/edit', {
            token,
            date: action.date_str,
            plan_ids: getPlanIds(dates, action.date_str).filter(id => id !== action.plan_id),
          })
          await axios.delete('/calendar/plan/delete', {
            data: {
              token,
              plan_id: action.plan_id,
            }
          })
          break;
        }
        case 'duplicate': {
          const refContent = getPlan(dates, action.ref_id).content;
          const res = await axios.post('/calendar/plan/copy', {
            token,
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
          const {plan_id, from_date, to_date, to_index} = action;
          const ref_plan = getPlan(dates, plan_id);

          dispatch({type: 'add', date_str: to_date, new_plan: ref_plan, new_index: to_index});
          if (from_date !== to_date) dispatch({type: 'delete', date_str: from_date, plan_id});

          const to_dates = getPlanIds(dates, to_date).filter(id => id !== plan_id);
          to_dates.splice(to_index, 0, plan_id)
          await axios.put('/calendar/date/edit', {
            token,
            date: to_date,
            plan_ids: to_dates,
          });
          if (from_date !== to_date) await axios.put('/calendar/date/edit', {
            token,
            date: from_date,
            plan_ids: getPlanIds(dates, from_date).filter(id => id !== plan_id),
          });
          break;
        }
        case 'load': {
          const res = await axios.post('/calendar/dates', {
            token,
            dates: action.dateRange,
          });
          // function resolveAfter2Seconds() {
          //   return new Promise(resolve => {
          //     setTimeout(() => {
          //       resolve('resolved');
          //     }, 2000);
          //   });
          // }
          // console.log(await resolveAfter2Seconds());
          if (action.dir === 'FRONT') document.getElementById('datenode-container').scrollTop = 1;
          dispatch({...action, dates: [...res.data.dates]});
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
  }, [dates, token, show]);
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
