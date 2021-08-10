import { Delete, FormatBold, FormatItalic, FormatUnderlined, MoreVert } from "@material-ui/icons";
import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding, RichUtils, SelectionState } from "draft-js";
import React, { useState } from "react";
import { CalendarContext } from ".";
import PlanStyles from "./PlanStyles";
import { getDragAfterElement, getTargetDatenode, smoothMove } from "./DragUtil";

/**
 * Enum for the state of the plan. Note that text values are connected to stylesheets.
 */
const PlanState = {
  Normal: "normal",
  Edit: "edit",
  EditExpand: "edit-expand",
  Dragging: "dragging",
  isEdit: (state) => state === "edit" || state === "edit-expand",
}

/**
 * Context for if the plan style menu is open. Boolean.
 */
export const StyleOpenContext = React.createContext(null);

const timeOutSubscriptions = []; // track any timeout functions being used
let pos1, pos2, pos3, pos4 = 0; // track drag positions
let placeholder; // current placeholder for drag

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
  const [originalState, setOriginalState] = useState(editorState);
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
      console.log('cleanup');
      deregisterPlanEdit(); // deregister plan on cleanup
      timeOutSubscriptions.forEach(t => clearTimeout(t)); // remove unused timeouts at end of cleanup
    }
    // eslint-disable-next-line
  }, []);

  /**
   * Take the necessary steps to submit plan changes to the db
   * @param {RawDraftContentState || boolean} val the current text content
   * @param {boolean} shouldClose true if we want to lose edit state
   * @param {boolean} hasChange true if the submission contains meaningful content changes
   */
  const submitPlanChanges = (val, shouldClose, hasChange) => {
    console.log('submit');
    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    if (shouldClose) deregisterPlanEdit(); // turn off edit state if need
    if (hasChange) { // dispatch changes to the plan content
      const entries = {
        ...content,
        textContent: val,
      }
      dispatchDates({type: 'edit', date_str, plan_id, entries});
    } else {
      // no changes to dispatch
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
      selectAllText();
    } else if (state === PlanState.Edit) { // click while in edit state

    } else if (state === PlanState.Dragging) {
      console.log('click handle');
      // completeDragEnd();
    }
  }
  /**
   * Handle the mousedown event of a plan
   * This will handle de-registering the edit states of other plans - if current plan is not in edit state
   * Also initiates drag events
   * @param {MouseEvent} e 
   */
  const handleMouseDown = (e) => {
    const initiateDrag = () => { // helper function to set up drag from mousedown
      // log starting position
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // set up drag listeners
      document.addEventListener('mousemove', startDrag);
      document.addEventListener('mouseup', cancelStartDrag);
    }

    e.stopPropagation(); // prevent event from propagating further
    if (state === PlanState.Normal) {
      document.dispatchEvent(new MouseEvent('mousedown')); // trigger deregister events on other plans in edit
      initiateDrag();
    } else if (PlanState.isEdit(state) && e.target.getAttribute('fp-role') === 'edit-panel') {
      initiateDrag();
    }
  }
  /**
   * Take the necessary steps to register current plan as edit
   */
  const registerPlanEdit = () => {
    console.log('reg');
    document.dispatchEvent(new MouseEvent('mousedown')); // (called in handleMouseDown, but leave for safety)
    document.addEventListener('keydown', handleKeyDown); // keydown events to be handled by this plan
    document.addEventListener('mousedown', deregisterPlanEdit); // add own deregister event
    setState(PlanState.Edit); // set edit state
  }
  /**
   * Take the necessary steps to deregister current plan as edit
   */
  const deregisterPlanEdit = React.useCallback(() => { // useCallback to preserve referential equality between renders 
    console.log('dereg');
    document.removeEventListener('keydown', handleKeyDown); // remove keydown handler
    document.removeEventListener('mousedown', deregisterPlanEdit); // remove deregister event
    timeOutSubscriptions.push(setTimeout(() => setState(PlanState.Normal))); // set normal state, with timeout so that the editor blur event has time to fire 
    // eslint-disable-next-line
  }, []);

  /**
   * Callback to start drag on the plan
   */
  const startDrag = React.useCallback((e) => {
    if (Math.abs(e.clientX - pos3) > 2 || Math.abs(e.clientY - pos4) > 2) {
      console.log('start');
    } else {
      console.log('false start');
      return;
    }
    document.removeEventListener('mousemove', startDrag);
    document.removeEventListener('mouseup', cancelStartDrag);
    e.preventDefault();

    // set up starting conditions
    pos3 = e.clientX;
    pos4 = e.clientY;
    planRef.current.style.width = getComputedStyle(planRef.current).width;
    planRef.current.style.position = 'absolute';

    const r = planRef.current.getBoundingClientRect();
    const x = r.x + (r.width ) / 2;
    const y = r.y + (r.height ) / 2;
    planRef.current.style.top = (planRef.current.offsetTop + e.clientY - y) + "px";
    planRef.current.style.left = (planRef.current.offsetLeft + e.clientX - x) + "px";

    setState(PlanState.Dragging); // set state to dragging

    // add placeholder
    if (placeholder) placeholder.remove();
    placeholder = document.createElement('div');
    placeholder.setAttribute('placeholder', date_str);
    const container = planRef.current.closest('.datenode-item');
    container.insertBefore(placeholder, planRef.current);
    placeholder.style.height = window.getComputedStyle(planRef.current).height;

    // add drag handle listeners 
    document.addEventListener('mousemove', elementDrag);
    document.addEventListener('mouseup', closeDragElement);

    // eslint-disable-next-line
  }, [date_str]);

  /**
   * Callback to cancel the start drag listener
   */
  const cancelStartDrag = React.useCallback(() => {
    document.removeEventListener('mousemove', startDrag);
    document.removeEventListener('mouseup', cancelStartDrag);

    // eslint-disable-next-line
  }, []);

  /**
   * Callback to handle the dragging of the plan
   */
  const elementDrag = React.useCallback(e => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos4 = e.clientY;
    pos3 = e.clientX;

    planRef.current.style.top = (planRef.current.offsetTop - pos2) + "px";
    planRef.current.style.left = (planRef.current.offsetLeft - pos1) + "px";

    const datenodeRoot = getTargetDatenode(e.clientX, e.clientY);
    const datenode = datenodeRoot?.firstElementChild;
    if (datenode) {
      const afterElement = getDragAfterElement(datenode, e.clientY) || datenode.querySelector('.plan-add');
      smoothMove(datenode, placeholder, afterElement);
    } else {
      const container = document.querySelector(`[datenode="${placeholder.getAttribute('placeholder')}"]`).firstElementChild;
      smoothMove(container, placeholder, planRef.current);
    }
  }, []);

  /**
   * Callback to handle the mouseup after dragging
   */
  const closeDragElement = React.useCallback((e) => {
    console.log('close');
    e.preventDefault();

    const targetDatenodeRoot = getTargetDatenode(e.clientX, e.clientY);
    if (targetDatenodeRoot) {
      const to_date = targetDatenodeRoot.getAttribute('datenode');
      const from_date = placeholder.getAttribute('placeholder');

      const plansTo = [...targetDatenodeRoot.querySelectorAll('[placeholder], [plan]:not([state="dragging"])')];
      const to_index = plansTo.indexOf(placeholder);
      const to_prv_id = (plansTo[to_index - 1] || '') && plansTo[to_index - 1].getAttribute('plan');
      const to_nxt_id = (plansTo[to_index + 1] || '') && plansTo[to_index + 1].getAttribute('plan');

      const plansFrom = [...document.querySelector(`[datenode="${from_date}"]`).querySelectorAll('[plan]')];
      const from_index = plansFrom.indexOf(planRef.current);
      const from_prv_id = (plansFrom[from_index - 1] || '') && plansFrom[from_index - 1].getAttribute('plan');
      const from_nxt_id = (plansFrom[from_index + 1] || '') && plansFrom[from_index + 1].getAttribute('plan');

      if (to_date === from_date && to_prv_id === from_prv_id && to_nxt_id === from_nxt_id) {
        // no need to move position
        timeOutSubscriptions.push(setTimeout(() => {
          completeDragEndDrop(); 
        }, 10));
      } else {
        if (to_date === from_date) {
          timeOutSubscriptions.push(setTimeout(() => {
            completeDragEndDrop(); 
          }, 0));

          // completeDragEndDrop(); // no re-render will occur so we deal with it here
        }
        dispatchDates({type: 'move', plan_id, to_date, from_prv_id, from_nxt_id, to_prv_id, to_nxt_id });
      }
    } else { // no target when dropped
      completeDragEndDrop(); 
    }
  
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);

    // timeOutSubscriptions.push(setTimeout(() => {
    //   // we hope for set state normal to be called through the click event that fires
    //   // afterwards, but if the plan is dropped then it must be called here
    //   completeDragEndDrop(); 
    // }, 10));

    // eslint-disable-next-line
  }, [date_str, plan_id]);

  // const completeDragEnd = () => {
  //   timeOutSubscriptions.forEach(t => clearTimeout(t)); // remove redundant setState timeout
  //   completeDragEndDrop();
  // }
  /**
   * Complete the minimum steps to turn a dragging plan back to normal
   */
  const completeDragEndDrop = () => {
    console.log('end');
    setState(PlanState.Normal); 
    planRef.current.style.width = '';
    planRef.current.style.position = '';
    planRef.current.style.top = '';
    planRef.current.style.left = '';

    if (placeholder) placeholder.remove();
    // eslint-disable-next-line
    let m = planRef.current.offsetTop;
    placeholder = null;
  }

  /**
   * Handle mousedown of clicking expand edit options
   * @param {MouseEvent} e 
   */
  const handleExpandEditMouseDown = e => {
    e.preventDefault();
    setState(PlanState.EditExpand); // set edit expand state
  }

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
      handleChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  /**
   * Callback on every key, to check if submit was called
   * @param {KeyboardEvent} e 
   * @returns 
   */
  const checkSubmit = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      submitPlanChanges(
        editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
        true,
        didChange
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
    setOriginalState(editorState);
  }

  /**
   * Callback when the editor loses focus. Call the submit event.
   */
  const handleBlur = () => {
    submitPlanChanges(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
      false,
      didChange
    )
    setDidChange(false);
    setTimeout(selectAllText); // set timeout so that blur event has time to finish firing 
  }

  /**
   * Handle the editor style changes that should occur when a toggle button is pressed
   * @param {MouseEvent} e 
   * @param {string} style
   */
  const handleStyleToggleMouseDown = (e, style) => {
    e.preventDefault(); 
    const newState = RichUtils.toggleInlineStyle(editorState, style);
    handleChange(newState);
    if (document.activeElement === textEdit.current.editor) {
      // editor is focused at the moment, edits will be pushed to db later
    } else {
      // push changes to db immediately
      submitPlanChanges(
        convertToRaw(newState.getCurrentContent()),
        false,
        true
      )
    }
  }

  /**
   * Helper function to reset selection to all text so that styling buttons affect all text
   */
  const selectAllText = () => {
    const currentContent = editorState.getCurrentContent();
    const firstBlock = currentContent.getBlockMap().first();
    const lastBlock = currentContent.getBlockMap().last();
    const firstBlockKey = firstBlock.getKey();
    const lastBlockKey = lastBlock.getKey();
    const lengthOfLastBlock = lastBlock.getLength();
    
    const selection = new SelectionState({
      anchorKey: firstBlockKey,
      anchorOffset: 0,
      focusKey: lastBlockKey,
      focusOffset: lengthOfLastBlock,
    });
    handleChange(EditorState.acceptSelection(editorState, selection));
  }

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
  const handleChange = (newState) => {
    const currentContentState = originalState.getCurrentContent()
    const newContentState = newState.getCurrentContent()
  
    // note that this comparison of variables is incomplete
    if (currentContentState !== newContentState) {
      // There was a change in the content  
      setDidChange(true);
    } else {
      // No change from original / the change was triggered by a change in focus/selection
      setDidChange(false);
    }
    setEditorState(newState);
  }

  return (<div
    ref={planRef}
    plan={plan_id}
    className={'plan-node'}
    onClick={handleClick}
    onMouseDown={handleMouseDown}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    state={state} // the state of this plan - see PlanState at top of this file
  >
    {PlanState.isEdit(state) && 
      <div fp-role="edit-panel">
        {state === PlanState.EditExpand ? 
          <> {/* Case: fully expanded */}
            <div fp-role="styling">
            <div fp-role="icon" state={editorState.getCurrentInlineStyle().has('BOLD') ? 'active' : 'inactive'}
              onMouseDown={e => handleStyleToggleMouseDown(e, 'BOLD')}
            >
              <FormatBold/>
            </div>
            <div fp-role="icon" state={editorState.getCurrentInlineStyle().has('ITALIC') ? 'active' : 'inactive'}
              onMouseDown={e => handleStyleToggleMouseDown(e, 'ITALIC')}
            >
              <FormatItalic/>
            </div>
            <div fp-role="icon" state={editorState.getCurrentInlineStyle().has('UNDERLINE') ? 'active' : 'inactive'}
              onMouseDown={e => handleStyleToggleMouseDown(e, 'UNDERLINE')}
            >
              <FormatUnderlined/>
            </div>
            </div>
            <div fp-role="delete-icon" onMouseDown={e => {e.preventDefault(); deleteSelf();}}>
              <Delete/>
            </div>
            <div fp-role="labels-anchor">
              <StyleOpenContext.Provider value={{styleOpen, setStyleOpen}}>
                <PlanStyles planId={plan_id} currentStyleId={styleId}/>
              </StyleOpenContext.Provider>
            </div>
          </>
          : <> {/* Case: half expanded */}
            <div fp-role="expand-icon" onMouseDown={handleExpandEditMouseDown}>
              <MoreVert/>
            </div>
          </>
        }
      </div>
    }
    <div fp-role="content" style={{color: `var(--plan-color${(content && content.done) ? '-done' : ''}-${styleId || 'default'})`}}>
      <Editor 
        ref={textEdit}
        readOnly={!PlanState.isEdit(state)}
        editorState={editorState} 
        handleKeyCommand={handleKeyCommand}
        onChange={handleChange}
        keyBindingFn={checkSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <div fp-role="toggle-container" style={{color: `var(--plan-color${(content && content.done) ? '-done' : '-done'}-${styleId || 'default'})`}}>
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
