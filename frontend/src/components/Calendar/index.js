import React, { useCallback, useEffect, useRef } from "react";
import axios from 'axios';
import {makeStyles, GridList, GridListTile} from "@material-ui/core";
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';

import AuthContext from '../../AuthContext';
import {newDateRange, getPlanIds, getPlan} from './util';
import DatenodeHeader from './DatenodeHeader';
import Plan from './Plan'
import AddPlan from './AddPlan'

const useStyles = makeStyles(() => ({
  datenodeContainer: {
    margin: '24px',
    height: '640px',
    overflow: 'scroll',
    minWidth: '700px',
  },
  datenode: {
    minHeight: '160px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: `1px solid transparent`,
    '&:hover': {
      border: `1px solid rgba(0, 0, 0, .2)`, 
    },
    // '&:active': {
    //   border: `2px solid rgba(0, 0, 0, .2)`,
    // },
    '&:focus': {
      border: `1px solid transparent`,
      backgroundColor: 'rgba(0, 0, 0, .05)',
      outline: '0',
    },
    // pointerEvents: 'none',
  },
  planContextMenu: {
    // boxShadow: 'none',
    // border: '1px solid rgba(0, 0, 0, .1)',
  },
}));

function Calendar() {
  const token = React.useContext(AuthContext);
  const classes = useStyles();

  const [dates, setDates] = React.useState([]);
  const datenodeContainer = useRef(null);
  const { show } = useContextMenu({
    id: 'planContextMenu',
  });
  const clipboard = React.useRef();

  useEffect(() => {
    if (dates.length === 0) {
      loadPlans(newDateRange(dates, "INIT"));
    }
    // eslint-disable-next-line
  }, []);

  function loadPlans([dateRange, dir="END"]) {
    axios
      .post('/calendar/dates', {
        token,
        dates: dateRange,
      })
      .then(({data}) => {
        if (dir === 'END') setDates(cur => [...cur, ...data.dates]);
        else if (dir === 'FRONT') {
          datenodeContainer.current.scrollTop = 1;
          setDates(cur => [...data.dates, ...cur]);
        }
      })
      .catch((err) => {})
  }

  const handleNodePagination = event => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) 
      loadPlans(newDateRange(dates, "END"));
    else if (event.currentTarget.scrollTop === 0) {
      loadPlans(newDateRange(dates, "FRONT"));
    }
  }

  function displayMenu(e, dateStr, planId){
    // put whatever custom logic you need
    // you can even decide to not display the Menu
    show(e, {
      props: {
        planId: planId,
        dateStr: dateStr,
        planEl: e.currentTarget,
      }
    });
  }

  function handleMenuEvent({data: {role}, props: {planId, dateStr, planEl}}){
    switch (role) {
      case "edit": 
        const plannode = planEl.closest('[plan]');
        plannode.style.border = '1px dotted green';
        plannode.style.backgroundColor = '#f3fef3';
        plannode.style.outline = '0';

        const planInput = planEl.getElementsByTagName('textarea')[0]; 
        planInput.removeAttribute('disabled')
        planInput.focus();
        break;
      case "delete":
        deletePlan(dateStr, planId);
        break;
      case "copy":
        clipboard.current = {
          planId,
          dateStr,
        }
        // console.log(clipboard.current);
        break;
      case "paste":
        duplicatePlan(clipboard.current.planId, clipboard.current.dateStr, dateStr);
        // console.log(role, dateStr, planEl);
        break;
      default:
        console.log(role, planId, planEl);
        break;
    }
  }

  const addPlan = useCallback(
    (date_str, plan_id, entries) => {
      dates.find(e => e.date_str === date_str).plans.push({
        plan_id: plan_id,
        content: entries,
      });

      setDates([...dates]);
    },
    [dates, setDates]
  );

  const editPlan = useCallback(
    (date_str, plan_id, entries) => {
      dates.find(e => e.date_str === date_str).plans.find(e => e.plan_id === plan_id).content = entries;

      setDates([...dates]);
    },
    [dates, setDates]
  );

  const deletePlan = useCallback(
    (date_str, plan_id) => {
      dates.find(e => e.date_str === date_str).plans =
        dates.find(e => e.date_str === date_str).plans.filter(e => e.plan_id !== plan_id);

      axios
        .put('/calendar/date/edit', {
          token,
          date: date_str,
          plan_ids: getPlanIds(dates, date_str),
        })
        .then((r) => {});

      axios 
        .delete('/calendar/plan/delete', {
          data: {
            token,
            plan_id: plan_id,
          }
        })
        .then((r) => {});

      setDates([...dates]);
    }, 
    [token, dates, setDates]
  );

  const duplicatePlan = (refId, refDate, newDate, newIndex=-1) => {
    const refContent = getPlan(dates, refId).content;

    axios
      .post('/calendar/plan/copy', {
        token,
        plan_id: refId, 
        date: newDate,
      })
      .then((r) => {
        dates.find(e => e.date_str === newDate).plans.push({
          plan_id: r.data.plan_id,
          content: refContent,
        });

        setDates([...dates]);
      })
  }

  const menuEvent = (e, date_str) => {
    if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      handleMenuEvent({data: {role: 'paste'}, props: {planId: '', dateStr: date_str, planEl: null}})
    }
    // else console.log(e.key)
  }

  const handlePlanDrop = event => {
    const planId = parseInt(document.querySelector('[dragging]').getAttribute('dragging'));
    const fromDate = document.querySelector('[placeholder]').getAttribute('placeholder');
    const toDate = event.target.closest(`[plans]`).getAttribute('plans');
    const refPlan = getPlan(dates, planId);
    const newIndex = [...document.querySelector(`[plans='${toDate}']`).children].filter(e => !e.hasAttribute('dragging')).indexOf(document.querySelector('[placeholder]'));
    document.querySelector('[placeholder]').remove();

    dates.find(e => e.date_str === fromDate).plans =
      dates.find(e => e.date_str === fromDate).plans.filter(e => e.plan_id !== planId);

    dates.find(e => e.date_str === toDate).plans =
      dates.find(e => e.date_str === toDate).plans.filter(e => e.plan_id !== planId);

    dates.find(e => e.date_str === toDate).plans.splice(newIndex, 0, refPlan);

    axios
      .put('/calendar/date/edit', {
        token,
        date: fromDate,
        plan_ids: getPlanIds(dates, fromDate),
      })
      .then((r) => {});

    axios
      .put('/calendar/date/edit', {
        token,
        date: toDate,
        plan_ids: getPlanIds(dates, toDate),
      })
      .then((r) => {});
    
    // document.querySelector('[dragging]').remove();
    setDates([...dates]);
  }

  const handleDragOver = (event) => {
    event.preventDefault();
    const afterElement = getDragAfterElement(event.target.closest('[plans]'), event.clientY);
    const placeholder = document.querySelector('[placeholder]');

    event.target.closest('[plans]').insertBefore(placeholder, afterElement);
  }

  const handleDragLeave = e => {
    e.stopPropagation();
    if (!e.target.hasAttribute('placeholder')) return;
    
    const placeholder = document.querySelector('[placeholder]');
    document.querySelector(`[plans="${placeholder.getAttribute('placeholder')}"]`).insertBefore(placeholder, document.querySelector('[dragging]'));
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('[plan]:not([dragging])')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY}).element;
  }

  return (
    <>
      <GridList 
        ref={datenodeContainer}
        cols={7} spacing={0} 
        className={classes.datenodeContainer} 
        style={{margin: ''}} 
        onScroll={handleNodePagination}
      >
        {dates.map(date =>
          <GridListTile 
            key={date.date_str}
            style={{height: 'auto'}}
            className={classes.datenode}
            tabIndex='0'
            datenode={date.date_str}
            onContextMenu={(event) => {
              event.stopPropagation();
              displayMenu(event, date.date_str, '');
            }}
            onKeyDown={(e) => menuEvent(e, date.date_str)}
          >
            <DatenodeHeader date_str={date.date_str}/>
            <div
              style={{minHeight: '10px'}}
              plans={date.date_str}
              onDragOver={handleDragOver}
              onDrop={handlePlanDrop}
              onDragLeave={handleDragLeave}
            >
              {date.plans.map(plan => 
                <Plan 
                  key={plan.plan_id}
                  editPlan={editPlan}
                  handleMenuEvent={handleMenuEvent}
                  plan={{date_str: date.date_str, ...plan}}
                  displayMenu={(event) => {event.stopPropagation(); displayMenu(event, date.date_str, plan.plan_id)}}
                />
              )}
            </div>
            <AddPlan 
              addPlan={addPlan}
              date_str={date.date_str}
            />
          </GridListTile>
        )}
      </GridList>
      <Menu id='planContextMenu' className={classes.planContextMenu}>
        <Item onClick={handleMenuEvent} data={{role: 'edit'}}>Edit</Item>
        <Item onClick={handleMenuEvent} data={{role: 'delete'}}>Delete</Item>
        <Separator/>
        <Item onClick={handleMenuEvent} data={{role: 'cut'}}>Cut</Item>
        <Item onClick={handleMenuEvent} data={{role: 'copy'}}>Copy</Item>
        <Item onClick={handleMenuEvent} data={{role: 'paste'}}>Paste</Item>
      </Menu>
    </>
  );
}

export default Calendar;
