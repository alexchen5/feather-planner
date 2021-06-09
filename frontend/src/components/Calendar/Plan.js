import React, { useEffect, useState } from "react";
import { CalendarContext } from ".";
import TextEdit from "../TextEdit";

function Plan({plan: {date_str, plan_id, content}}) {
  const {dispatchDates} = React.useContext(CalendarContext);
  const textEdit = React.createRef(null);
  const [editing, setEditing] = useState(false);
  const planRef = React.useRef();
  const [hasFocus, setFocus] = useState(false);

  if (!content) dispatchDates({type: 'delete', date_str, plan_id});

  useEffect(() => {
    if (content.textContent === '') {
      getFocus();
    }
    if (document.hasFocus() && planRef.current.contains(document.activeElement)) {
      setFocus(true);
    }
    // eslint-disable-next-line
  }, []);

  const getFocus = () => {
    setEditing(true)
    textEdit.current.focus();
  }
  const getBlur = () => {
    setEditing(false);
  }

  const textEditOptions = {
    readOnly: !editing,
    menu: editing,
    init: ((content && content.textContent) || ''),
    submit: val => {
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

  // const handleMouseDownDrag = (e) => {
  //   // e.preventDefault();
  // };

  return (<div
    ref={planRef}
    plan={plan_id}
    className={`plan-node ${(content && content.done) ? '-done' : ''}`}
    onMouseDown={e => {
      e.stopPropagation();
      if (hasFocus) getFocus();
    }}
    draggable={hasFocus && !editing}
    onContextMenu={e => {
      e.stopPropagation();
      dispatchDates({type: 'menu', event: e, plan_id, date_str, plan_el: textEdit.current})
    }}
    tabIndex='0'
    onKeyDown={menuEvent}
    onFocus={() => setFocus(true)}
    onBlur={() => setFocus(false)}
  >
    <div className={`plan-node-content`}>
      <div className={'plan-complete-toggle'}>
        <span 
          className={`plan-complete-toggle-button ${content.done ? '-done' : ''}`}
          onClick={toggleDone}
        >
          <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <circle cx="50%" cy="50%" r="50%"/>
          </svg>
        </span>
      </div>
      <TextEdit ref={textEdit} options={textEditOptions}/>
    </div>
  </div>)
}

export default Plan;
