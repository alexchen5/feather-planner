import React, { useEffect, useState } from "react";
import { CalendarContext } from ".";
import TextEdit from "../TextEdit";

function Plan({plan: {date_str, plan_id, content}}) {
  const {dispatchDates} = React.useContext(CalendarContext);
  const textEdit = React.createRef(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (content.textContent === '') {
      getFocus();
    }
    // eslint-disable-next-line
  }, []);

  const planHoverIn = (event) => {
    event.currentTarget.closest('[datenode]').style.border = `1px solid transparent`;
  }
  const planHoverOut = (event) => {
    event.currentTarget.closest('[datenode]').style.border = ``;
  }

  const getFocus = () => {
    document.querySelector(`[plan="${plan_id}"]`).setAttribute('editing', '');
    setEditing(true)
    textEdit.current.focus();
  }
  const getBlur = () => {
    document.querySelector(`[plan="${plan_id}"]`).removeAttribute('editing');
    setEditing(false);
  }

  const submitInput = val => {
    getBlur();
    if (!val) {
      dispatchDates({type: 'delete', date_str, plan_id});
      return;
    }
    const entries = {
      ...content,
      textContent: val,
    }
    if (JSON.stringify(content) === JSON.stringify(entries)) return;
    dispatchDates({type: 'edit', date_str, plan_id, entries});
  };

  const toggleDone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.closest('.plan-node').blur();

    const entries = {
      ...content,
      done: !(content.done),
    }
    dispatchDates({type: 'edit', date_str, plan_id, entries});
  }

  const menuEvent = (e) => {
    if (e.currentTarget !== e.target) return;

    if (e.key === 'c' && e.getModifierState('Meta')) {
      e.stopPropagation();
      dispatchDates({type: 'menu-c', date_str, plan_id});
    }
    else if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      dispatchDates({type: 'menu-v', date_str});
    }
    else if (e.key === 'Backspace') {
      e.stopPropagation();
      dispatchDates({type: 'delete', date_str, plan_id});
    }
    else if (e.key === '1' && e.getModifierState('Meta')) {
      e.stopPropagation();
      console.log('xd');
    }
    // else console.log(e.key)
  }

  const handleDragStart = e => {
    const target = e.currentTarget;
    const placeholder = document.createElement('div');
    placeholder.style.height = window.getComputedStyle(target).height;
    placeholder.style.pointerEvents = 'none';
    placeholder.setAttribute('placeholder', date_str);

    setTimeout(() => {
      target.style.display = 'none'
      target.closest('[plans]').insertBefore(placeholder, target);
      target.closest('[datenode]').setAttribute('drag-display', '');
    }, 0);

    target.setAttribute('dragging', plan_id);
    target.closest('[datenode]').style.border = `1px solid transparent`;
  }

  const handleDragEnd = e => {
    e.currentTarget.style.display = '';
    e.currentTarget.removeAttribute('dragging');
    e.currentTarget.closest('[datenode]').removeAttribute('drag-display');
    if (document.querySelector('[placeholder]')) document.querySelector('[placeholder]').remove();
  }

  return (<div
    plan={plan_id}
    className={`plan-node ${content.done ? '-done' : ''}`}
    onMouseOver={planHoverIn}
    onMouseOut={planHoverOut}
    onClick={e => {
      e.stopPropagation();
      if(e.detail === 2) getFocus();
    }}
    draggable={!editing}
    onDragEnd={handleDragEnd}
    onDragStart={handleDragStart}
    onContextMenu={e => {
      e.stopPropagation();
      dispatchDates({type: 'menu', event: e, plan_id, date_str, plan_el: textEdit.current})
    }}
    tabIndex='0'
    onKeyDown={menuEvent}
  >
    <div className={'plan-complete-toggle'} style={{display: `${editing ? 'none' : ''}`}}>
      <span 
        className={`plan-complete-toggle-button ${content.done ? '-done' : ''}`}
        onClick={toggleDone}
      >
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <circle cx="50%" cy="50%" r="50%"/>
        </svg>
      </span>
    </div>
    <TextEdit ref={textEdit} readOnly={!editing} menu={editing} init={content.textContent} submit={submitInput}/>
  </div>)
}

export default Plan;
