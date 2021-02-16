import React from "react";

import {CalendarContext} from '.'
import AddPlan from "./AddPlan";
import { strToDate, dateToStr } from './util';

function Datenode({date_str, children}) {
  const { dispatchDates } = React.useContext(CalendarContext);
  const thisDate = strToDate(date_str);

  const handlePlanDrop = event => {
    const plan_id = parseInt(document.querySelector('[dragging]').getAttribute('dragging'));
    const from_date = document.querySelector('[placeholder]').getAttribute('placeholder');
    const to_date = event.target.closest(`[plans]`).getAttribute('plans');
    const to_index = [...document.querySelector(`[plans='${to_date}']`).children].filter(e => !e.hasAttribute('dragging')).indexOf(document.querySelector('[placeholder]'));
    
    dispatchDates({type: 'move', plan_id, from_date, to_date, to_index });
    document.querySelector('[placeholder]').remove();
    document.querySelector(`[datenode="${from_date}"]`).removeAttribute('drag-display');
  }

  const handleDragOver = (event) => {
    event.preventDefault();
    const afterElement = getDragAfterElement(event.target.closest('[plans]'), event.clientY) || event.target.closest('[plans]').getElementsByClassName('plan-add')[0];
    const placeholder = document.querySelector('[placeholder]');

    event.target.closest('[plans]').insertBefore(placeholder, afterElement);
  }

  const handleDragLeave = e => {
    e.stopPropagation();
    if (e.target !== e.currentTarget) return;
    
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

  const menuEvent = (e) => {
    if (e.currentTarget !== e.target) return;
    
    if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      dispatchDates({type: 'menu-v', date_str});
    }
  }

  return (
    <li
      className={'datenode -calendar-bg'}
      tabIndex='0'
      datenode={date_str}
      onContextMenu={e => {
        e.stopPropagation();
        dispatchDates({type: 'menu', event: e, date_str})
      }}
      onKeyDown={menuEvent}
    >
      <div className={`datenode-header`} >
        {date_str === dateToStr() ? 'T o d a y' : thisDate.getDate() === 1 ? thisDate.toLocaleDateString('default', {month: 'long'}) : thisDate.getDate()}
      </div>
      <div
        className={'plan-container'}
        plans={date_str}
        onDragOver={handleDragOver}
        onDrop={handlePlanDrop}
        onDragLeave={handleDragLeave}
      >
        {children}
        <AddPlan
          date_str={date_str}
        />
      </div>
    </li> 
  )
}

export default Datenode;
