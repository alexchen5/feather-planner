import { Delete, FormatBold, FormatItalic, FormatUnderlined } from "@material-ui/icons";
import React, { useState } from "react";
import { CalendarContext } from ".";
import TextEdit from "../TextEdit";

/**
 * Enum for the state of the plan. Note that text values are connected to stylesheets.
 */
const PlanState = {
  Normal: "normal",
  Edit: "edit",
  Dragging: "dragging",
}

function Plan({plan: {date_str, plan_id, content}}) {
  const {dispatchDates} = React.useContext(CalendarContext);
  const planRef = React.useRef();
  const textEdit = React.createRef(null);
  const [state, setState] = useState(PlanState.Normal);

  if (!content) dispatchDates({type: 'delete', date_str, plan_id});

  React.useEffect(() => {
    return function cleanup() {
      deregisterPlanEdit(); // deregister plan on cleanup
    }
    // eslint-disable-next-line
  }, []);

  const textEditOptions = {
    readOnly: state !== PlanState.Edit,
    menu: true,
    init: ((content && content.textContent) || ''),
    submit: val => {
      setState(PlanState.Normal);
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

  /**
   * Handle the click even of a plan. 
   * This will handle refistering the edit state of the plan, and defocusing any other plans.
   * @param {MouseEvent} e 
   */
  const handleClick = (e) => {
    if (state === PlanState.Normal) { // register edit state
      e.stopPropagation(); 
      registerPlanEdit(); 
    } else if (state === PlanState.Edit) { // click while in edit state
      e.stopPropagation(); // stop click propagation only
    }
  }
  /**
   * Take the neccessary steps to register current plan as edit
   */
  const registerPlanEdit = () => {
    document.dispatchEvent(new MouseEvent('click')); // trigger deregister events on other plans in edit
    document.addEventListener('keydown', handleKeyDown); // keydown events to be handled by this plan
    document.addEventListener('click', deregisterPlanEdit); // add own deregister event
    setState(PlanState.Edit); // set edit state
  }
  /**
   * Take the neccessary steps to deregister current plan as edit
   */
  const deregisterPlanEdit = () => {
    document.removeEventListener('keydown', handleKeyDown); // remove keydown handler
    document.removeEventListener('click', deregisterPlanEdit); // remove deregister event
    setState(PlanState.Normal); // set normal state
  }

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

  /**
   * Function to handle the key interactions with the plan. This is added to document when the
   * plan is in edit state.
   * @param {KeyboardEvent} e 
   */
  const handleKeyDown = (e) => {
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
    else if (e.key === 'Enter') {
      e.stopPropagation();
      deregisterPlanEdit();
    }
    // else console.log(e.key)
  }

  return (<div
    ref={planRef}
    plan={plan_id}
    className={`plan-node ${(content && content.done) ? '-done' : ''}`}
    draggable={state === PlanState.Normal} // TODO: complete definition
    onClick={handleClick}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    state={state} // the state of this plan - see PlanState at top of this file
  >
    {state === PlanState.Edit && <div fp-role="edit-panel">
      <div fp-role="styling">
        <div fp-role="icon">
          <FormatBold/>
        </div>
        <div fp-role="icon">
          <FormatItalic/>
        </div>
        <div fp-role="icon">
          <FormatUnderlined/>
        </div>
      </div>
      <div fp-role="delete-icon" onClick={() => dispatchDates({type: 'delete', date_str, plan_id})}>
        <Delete/>
      </div>

      <div>

      </div>
    </div>}
    <div fp-role="content">
      <TextEdit ref={textEdit} options={textEditOptions}/>
      <div fp-role="toggle-container">
        <span 
          fp-role="toggle-button"
          onMouseDown={e => {e.stopPropagation(); e.preventDefault()}}
          onClick={toggleDone}
        >
          <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <circle cx="50%" cy="50%" r="50%"/>
          </svg>
        </span>
      </div>
    </div>
  </div>)
}

export default Plan;
