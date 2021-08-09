import { Delete, FormatBold, FormatItalic, FormatUnderlined } from "@material-ui/icons";
import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";
import React, { useState } from "react";
import { CalendarContext } from ".";
import PlanStyles from "./PlanStyles";

/**
 * Enum for the state of the plan. Note that text values are connected to stylesheets.
 */
const PlanState = {
  Normal: "normal",
  Edit: "edit",
  Dragging: "dragging",
}

/**
 * Context for if the plan style menu is open. Boolean.
 */
export const StyleOpenContext = React.createContext(null);

let timeOutSubscription; // track any timeout functions being used

function Plan({plan: {date_str, plan_id, styleId, content}}) {
  const {dispatchDates} = React.useContext(CalendarContext);
  const planRef = React.useRef();
  const [state, setState] = useState(PlanState.Normal);
  const [styleOpen, setStyleOpen] = useState(false);

  // text editor management
  const textEdit = React.createRef(null);
  const init = ((content && content.textContent) || '');
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof init === 'string' ? ContentState.createFromText(init) : convertFromRaw(init)
    ),
  );
  const [didChange, setDidChange] = React.useState(false);

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = () => {
    dispatchDates({type: 'delete', date_str, plan_id});
    // deregisterPlanEdit will then be called in useEffect cleanup
  }
  if (!content) deleteSelf();

  React.useEffect(() => {
    return function cleanup() {
      deregisterPlanEdit(); // deregister plan on cleanup
      clearTimeout(timeOutSubscription); // remove unused timeouts
    }
    // eslint-disable-next-line
  }, []);

  /**
   * Take the necessary steps to submit plan changes to the db
   * @param {string} val the current text content
   * @param {boolean} shouldClose true if we want to lose edit state
   */
  const submitPlanChanges = (val, shouldClose) => {
    console.log('submit');
    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    if (shouldClose) deregisterPlanEdit(); // turn off edit state if need
    if (didChange) { // dispatch changes to the plan content
      const entries = {
        ...content,
        textContent: val,
      }
      dispatchDates({type: 'edit', date_str, plan_id, entries});
    }
  }

  /**
   * Handle the click event of a plan. 
   * This will handle registering the edit state of the plan, and de-focusing any other plans.
   * @param {MouseEvent} e 
   */
  const handleClick = (e) => {
    e.stopPropagation(); // prevent event from propagating further
    if (state === PlanState.Normal) { // register edit state
      registerPlanEdit(); 
    } else if (state === PlanState.Edit) { // click while in edit state

    }
  }
  /**
   * Handle the mousedown event of a plan
   * This will handle de-registering the edit states of other plans - if current plan is not in edit state
   * @param {MouseEvent} e 
   */
  const handleMouseDown = (e) => {
    e.stopPropagation(); // prevent event from propagating further
    if (state === PlanState.Normal) {
      document.dispatchEvent(new MouseEvent('mousedown')); // trigger deregister events on other plans in edit
    }
  }
  /**
   * Take the necessary steps to register current plan as edit
   */
  const registerPlanEdit = () => {
    document.dispatchEvent(new MouseEvent('mousedown')); // (called in handleMouseDown, but leave for safety)
    document.addEventListener('keydown', handleKeyDown); // keydown events to be handled by this plan
    document.addEventListener('mousedown', deregisterPlanEdit); // add own deregister event
    setState(PlanState.Edit); // set edit state
  }
  /**
   * Take the necessary steps to deregister current plan as edit
   */
  const deregisterPlanEdit = React.useCallback(() => { // useCallback to preserve referential equality between renders 
    document.removeEventListener('keydown', handleKeyDown); // remove keydown handler
    document.removeEventListener('mousedown', deregisterPlanEdit); // remove deregister event
    timeOutSubscription = setTimeout(() => setState(PlanState.Normal)); // set normal state, with timeout so that the editor blur event has time to fire 
    // eslint-disable-next-line
  }, []);

  const toggleDone = (e) => {
    e.preventDefault();
    e.stopPropagation();

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
  const handleKeyDown = React.useCallback((e) => { // useCallback to preserve referential equality between renders 
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
    // eslint-disable-next-line
  }, [date_str, plan_id]);

  /**
   * Handle key-styling command for text edit
   * @param {string} command 
   * @returns 
   */
  const handleKeyCommand = command => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      // set change when styles change
      setDidChange(true);
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  /**
   * Callback on every key, to check if submit was called
   * @param {*} e 
   * @returns 
   */
  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      submitPlanChanges(
        editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
        true
      );
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  /**
   * Callback when the editor element is focused. We reset our 
   * change event listener
   */
  const handleFocus = () => {
    setDidChange(false);
  }

  /**
   * Callback when the editor loses focus. Call the submit event.
   */
  const handleBlur = () => {
    submitPlanChanges(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
      false
    )
  }

  /**
   * Callback when editor state is changed
   * @param {EditorState} newState 
   */
  const handleChange = (newState) => {
    const currentContentState = editorState.getCurrentContent()
    const newContentState = newState.getCurrentContent()
  
    if (currentContentState !== newContentState) {
      // There was a change in the content  
      setDidChange(true);
    } else {
      // The change was triggered by a change in focus/selection
    }
    setEditorState(newState);
  }

  return (<div
    ref={planRef}
    plan={plan_id}
    className={'plan-node'}
    draggable={state === PlanState.Normal} // TODO: complete definition
    onClick={handleClick}
    onMouseDown={handleMouseDown}
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
      <div fp-role="delete-icon" onClick={deleteSelf}>
        <Delete/>
      </div>
      <div fp-role="labels-anchor">
        <StyleOpenContext.Provider value={{styleOpen, setStyleOpen}}>
          <PlanStyles planId={plan_id} currentStyleId={styleId}/>
        </StyleOpenContext.Provider>
      </div>
    </div>}
    <div fp-role="content" style={{color: `var(--plan-color${(content && content.done) ? '-done' : ''}-${styleId || 'default'})`}}>
      <Editor 
        ref={textEdit}
        readOnly={state !== PlanState.Edit}
        editorState={editorState} 
        handleKeyCommand={handleKeyCommand}
        onChange={handleChange}
        keyBindingFn={checkSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
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
