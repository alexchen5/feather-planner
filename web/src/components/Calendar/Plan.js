import React, { useEffect, useState } from "react";
import { CalendarContext } from ".";
import TextEdit from "../TextEdit";
import MoreVertIcon from '@material-ui/icons/MoreVert';

function Plan({plan: {date_str, plan_id, content}}) {
  const {dispatchDates} = React.useContext(CalendarContext);
  const planRef = React.useRef();
  const textEdit = React.createRef(null);
  const [hasFocus, setFocus] = useState(false);

  if (!content) dispatchDates({type: 'delete', date_str, plan_id});

  const textEditOptions = {
    readOnly: !hasFocus,
    menu: true,
    init: ((content && content.textContent) || ''),
    submit: val => {
      setFocus(false);
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
    },
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

  const dispatchContextMenu = () => {
    const e = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    planRef.current.dispatchEvent(e);
  }

  return (<div
    ref={planRef}
    plan={plan_id}
    className={`plan-node ${(content && content.done) ? '-done' : ''}`}
    draggable={!hasFocus}
    onContextMenu={e => {
      console.log(e);
      e.stopPropagation();
      dispatchDates({type: 'menu', event: e, plan_id, date_str, plan_el: textEdit.current})
    }}
    tabIndex='0'
    onKeyDown={menuEvent}
    onClick={() => setFocus(true)}
    onBlur={(e) => setTimeout(() => {if (!planRef?.current.contains(document.activeElement)) setFocus(false)})}
  >
    <div className={`plan-node-content`}>
      <TextEdit ref={textEdit} options={textEditOptions}/>
    </div>
    <div className={'plan-node-menu'} onClick={dispatchContextMenu}>
      <MoreVertIcon/>
    </div>
    <div className={'plan-complete-toggle'}>
      <span 
        className={`plan-complete-toggle-button ${content.done ? '-done' : ''}`}
        onMouseDown={e => {e.stopPropagation(); e.preventDefault()}}
        onClick={toggleDone}
      >
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <circle cx="50%" cy="50%" r="50%"/>
        </svg>
      </span>
    </div>
  </div>)
}

export default Plan;
