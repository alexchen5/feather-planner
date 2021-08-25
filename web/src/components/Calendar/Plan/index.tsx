import { Delete, FormatBold, FormatItalic, FormatUnderlined, MoreVert } from "@material-ui/icons";
import { ContentState, convertFromRaw, convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils, SelectionState } from "draft-js";
import React, { KeyboardEvent, useState } from "react";
import PlanStyles from "./PlanStyles";
import { CalendarPlan } from "types/calendar";
import { db, UidContext } from "utils/globalContext";
import { MouseEventHandler } from "react";
import { CalendarContext } from "..";
import { getPlanIds } from "../../../utils/dateUtil";
import { getDragAfterElement, getTargetDatenode, smoothMove } from "../../../utils/dragUtil";

import style from './plan.module.scss';
import panelStyle from './editPanel.module.scss';
import { DocumentListenerContext } from "components/DocumentEventListener";

/**
 * Describes the state of the plan. Note that text values are connected to stylesheets.
 */
type PlanState = 'normal' | 'edit' | 'edit-expand' | 'dragging';

function isEdit(state: PlanState): boolean {
  return state === "edit" || state === "edit-expand";
}

/**
 * Context for if the plan style menu is open. Boolean.
 */
export const StyleOpenContext = React.createContext({} as { styleOpen: boolean; setStyleOpen: React.Dispatch<React.SetStateAction<boolean>>; });

const timeOutSubscriptions: NodeJS.Timeout[] = []; // track any timeout functions being used
let pos1, pos2, pos3: number, pos4 = 0; // track drag positions
let placeholder: HTMLElement | null = null; // current placeholder for drag

function Plan({plan: {dateStr, restoreData, planId, styleId, isDone, content}}: {plan: CalendarPlan}) {
  const { calendar, dispatch } = React.useContext(CalendarContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const planRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = useState('normal' as PlanState);
  const [styleOpen, setStyleOpen] = useState(false);

  const {uid} = React.useContext(UidContext);

  // text editor management
  const textEdit = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ),
  );
  const [originalState, setOriginalState] = useState(editorState);
  const [didChange, setDidChange] = React.useState(false);

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useCallback(() => {
    // delete plan from db
    const ids = getPlanIds(calendar.dates, dateStr);
    const p = ids.indexOf(planId);

    const undo = () => {
      const restoreBatch = db.batch();
      if (ids[p+1]) restoreBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', planId);
      restoreBatch.set(db.doc(`users/${uid}/plans/${planId}`), {...restoreData})
      restoreBatch.commit();
    }

    const action = () => {
      const delBatch = db.batch();
      if (ids[p+1]) delBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', ids[p-1] || '');
      delBatch.delete(db.doc(`users/${uid}/plans/${planId}`));
      delBatch.commit();
    }
    action();

    dispatch({ type: 'add-undo', undo: {undo: undo, redo: action} });
    
    // deregisterPlanEdit will then be called in useEffect cleanup
  }, [uid, calendar, dateStr, planId, restoreData, dispatch]);

  React.useEffect(() => {
    return function cleanup() {
      // console.log('cleanup');
      deregisterPlanEdit(); // deregister plan on cleanup
      timeOutSubscriptions.forEach(t => clearTimeout(t)); // remove unused timeouts at end of cleanup
    }
    // eslint-disable-next-line
  }, []);

  /**
   * Take the necessary steps to submit plan changes to the db
   * @param val the current text content
   * @param shouldClose true if we want to lose edit state
   * @param hasChange true if the submission contains meaningful content changes
   */
  const submitPlanChanges = (val: RawDraftContentState | false, shouldClose: boolean, hasChange: boolean) => {
    console.log('submit');
    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    if (shouldClose) deregisterPlanEdit(); // turn off edit state if need
    if (hasChange) { // dispatch changes to the plan content
      db.doc(`users/${uid}/plans/${planId}`).update('header', val);
    } else {
      // no changes to dispatch
    }
  }

  /**
   * Handle the click event of a plan. 
   * This will handle registering the edit state of the plan, and de-focusing any other plans.
   * @param e 
   */
  const handleClick: MouseEventHandler = (e) => {
    e.stopPropagation(); // prevent event from propagating further
    if (state === 'normal') { // register edit state
      registerPlanEdit(); 
      selectAllText();
    } else if (state === 'edit') { // click while in edit state

    } else if (state === 'dragging') {
      // console.log('click handle');
      // completeDragEnd();
    }
  }
  /**
   * Handle the mousedown event of a plan
   * This will handle de-registering the edit states of other plans - if current plan is not in edit state
   * Also initiates drag events
   * @param e 
   */
  const handleMouseDown: MouseEventHandler = (e) => {
    const dragInitiate = () => { // helper function to set up drag from mousedown
      // log starting position
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // set up drag listeners
      dispatchListeners({ 
        type: 'register-focus', 
        componentId: 'plan-try-drag',
        listeners: [
          { 
            componentId: 'plan-try-drag', 
            type: 'mousemove', 
            callback: tryStartDrag, 
          },
          {
            componentId: 'plan-try-drag', 
            type: 'mouseup', 
            callback: cancelTryStartDrag,
          }
        ],
      });
    }

    e.stopPropagation(); // prevent event from propagating further
    const target = e.target as HTMLElement; // assume target is html element
    if (state === 'normal') {
      document.dispatchEvent(new MouseEvent('mousedown')); // trigger deregister events on other plans in edit
      dragInitiate();
    } else if (isEdit(state) && target.getAttribute('fp-role') === 'edit-panel') {
      dragInitiate();
    }
  }
  /**
   * Take the necessary steps to register current plan as edit
   */
  const registerPlanEdit = () => {
    console.log('reg');
    document.dispatchEvent(new MouseEvent('mousedown')); // (called in handleMouseDown, but leave for safety)
    dispatchListeners({ 
      type: 'register-focus', 
      componentId: 'plan-edit-reg',
      listeners: [
        { 
          // keydown events to be handled by this plan
          componentId: 'plan-edit-reg', 
          type: 'keydown', 
          callback: handleKeyDown, 
        },
        {
          // add own deregister event
          componentId: 'plan-edit-reg', 
          type: 'mousedown', 
          callback: deregisterPlanEdit,
        }
      ],
    });

    setState('edit'); // set edit state
  }
  /**
   * Take the necessary steps to deregister current plan as edit
   */
  const deregisterPlanEdit = React.useCallback(() => {
    // console.log('dereg');
    dispatchListeners({ type: 'deregister-focus', componentId: 'plan-edit-reg', removeListeners: true });
    timeOutSubscriptions.push(setTimeout(() => setState('normal'), 0)); // set normal state, with timeout so that the editor blur event has time to fire 
    // eslint-disable-next-line
  }, []);

  /**
   * Callback to start drag on the plan
   */
  const tryStartDrag = React.useCallback((e) => {
    if (!planRef.current) {
      console.error('Expected planRef during drag');
      return;
    }
    
    // ensure mouse moved enough for a drag
    if (!(Math.abs(e.clientX - pos3) > 2 || Math.abs(e.clientY - pos4) > 2)) return;
    
    // now remove try drag listeners
    dispatchListeners({ type: 'deregister-focus', componentId: 'plan-try-drag', removeListeners: true });
    e.preventDefault(); // TODO: test if necessary

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

    // get rid of edit listeners
    dispatchListeners({ type: 'deregister-focus', componentId: 'plan-edit-reg', removeListeners: true });
    setState('dragging'); // set state to dragging

    // add placeholder
    if (placeholder) placeholder.remove();
    placeholder = document.createElement('div');
    placeholder.setAttribute('placeholder', dateStr);
    const container = planRef.current.closest('[fp-role="calendar-date"]');
    container?.insertBefore(placeholder, planRef.current);
    placeholder.style.height = window.getComputedStyle(planRef.current).height;

    // add drag handle listeners 
    dispatchListeners({ 
      type: 'register-focus', 
      componentId: 'plan-dragging',
      listeners: [
        { 
          componentId: 'plan-dragging', 
          type: 'mousemove', 
          callback: elementDrag, 
        },
        {
          componentId: 'plan-dragging', 
          type: 'mouseup', 
          callback: closeDragElement,
        }
      ],
    });

    // eslint-disable-next-line
  }, [dateStr]);

  /**
   * Callback to cancel the start drag listener
   */
  const cancelTryStartDrag = React.useCallback(() => {
    dispatchListeners({ type: 'deregister-focus', componentId: 'plan-try-drag', removeListeners: true });
    // eslint-disable-next-line
  }, []);

  /**
   * Callback to handle the dragging of the plan
   */
  const elementDrag = React.useCallback(e => {
    e.preventDefault();

    if (!planRef.current) {
      console.error('Expected planRef during drag');
      return;
    }

    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos4 = e.clientY;
    pos3 = e.clientX;

    planRef.current.style.top = (planRef.current.offsetTop - pos2) + "px";
    planRef.current.style.left = (planRef.current.offsetLeft - pos1) + "px";

    const datenodeRoot = getTargetDatenode(e.clientX, e.clientY);
    const datenode = datenodeRoot?.firstElementChild;
    if (datenode) {
      const afterElement = getDragAfterElement(datenode, e.clientY) || datenode.querySelector('[fp-role="plan-add"]');
      smoothMove(datenode, placeholder!, afterElement!);
    } else {
      const container = document.querySelector(`[fp-role="calendar-date-root"][data-date="${placeholder?.getAttribute('placeholder')}"]`)?.firstElementChild;
      smoothMove(container!, placeholder!, planRef.current);
    }
  }, []);

  /**
   * Callback to handle the mouseup after dragging
   */
  const closeDragElement = React.useCallback((e) => {
    console.log('close');
    e.preventDefault();
    // complete plan drag
    dispatchListeners({ type: 'deregister-focus', componentId: 'plan-dragging', removeListeners: true });

    const targetDatenodeRoot = getTargetDatenode(e.clientX, e.clientY);
    if (targetDatenodeRoot && placeholder) {
      const to_date = targetDatenodeRoot.getAttribute('data-date');
      const from_date = placeholder.getAttribute('placeholder');

      const plansTo = [...targetDatenodeRoot.querySelectorAll('[placeholder], [fp-role="calendar-plan"]:not([fp-state="dragging"])')];
      const to_index = plansTo.indexOf(placeholder);
      const to_prv_id = (plansTo[to_index - 1] || '') && plansTo[to_index - 1].getAttribute('data-id');
      const to_nxt_id = (plansTo[to_index + 1] || '') && plansTo[to_index + 1].getAttribute('data-id');

      // TODO: complete definition
      // @ts-ignore
      const plansFrom = [...document.querySelector(`[fp-role="calendar-date-root"][data-date="${from_date}"]`)?.querySelectorAll('[fp-role="calendar-plan"]')];
      const from_index = plansFrom.indexOf(planRef.current);
      const from_prv_id = (plansFrom[from_index - 1] || '') && plansFrom[from_index - 1].getAttribute('data-id');
      const from_nxt_id = (plansFrom[from_index + 1] || '') && plansFrom[from_index + 1].getAttribute('data-id');

      if (to_date === from_date && to_prv_id === from_prv_id && to_nxt_id === from_nxt_id) {
        // no need to move position
      } else {
        // update db
        const moveBatch = db.batch();
        if (to_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', planId);
        moveBatch.update(db.doc(`users/${uid}/plans/${planId}`), 'date', to_date, 'prv', to_prv_id);
        if (from_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', from_prv_id);
        moveBatch.commit();

        // completeDragEndDrop(); 
      }
    } else { // no target when dropped
      // completeDragEndDrop(); 
    }

    timeOutSubscriptions.push(setTimeout(() => {
      // we hope for set state normal to be called through the click event that fires
      // afterwards, but if the plan is dropped then it must be called here
      completeDragEndDrop(); 
    }, 10));

    // eslint-disable-next-line
  }, [dateStr, planId]);

  // const completeDragEnd = () => {
  //   // timeOutSubscriptions.forEach(t => clearTimeout(t)); // remove redundant setState timeout
  //   // completeDragEndDrop();
  // }

  /**
   * Complete the minimum steps to turn a dragging plan back to normal
   */
  const completeDragEndDrop = () => {
    console.log('end');
    setState('normal'); 

    if (!planRef.current) {
      console.error('Expected planRef at drag end');
      return;
    }

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
  const handleExpandEditMouseDown: MouseEventHandler  = (e) => {
    e.preventDefault();
    setState('edit-expand'); // set edit expand state
  }

  const toggleDone: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    db.doc(`users/${uid}/plans/${planId}`).update('done', !isDone);
  }

  /**
   * Function to handle the key interactions with the plan. This is added to document when the
   * plan is in edit state.
   * @param {KeyboardEvent} e 
   */
  const handleKeyDown = React.useCallback((e) => { // useCallback to preserve referential equality between renders 
    if (e.key === 'Backspace') {
      e.stopPropagation();
      console.log('delete from backspace');
      
      deleteSelf();
    }
    else if (e.key === 'Enter') {
      e.stopPropagation();
      deregisterPlanEdit();
    }
    // else console.log(e.key)
    // eslint-disable-next-line
  }, []);

  /**
   * Handle key-styling command for text edit
   * @param {string} command 
   * @returns 
   */
  const handleKeyCommand = (command: string): DraftHandleValue => {
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
  const checkSubmit = (e: KeyboardEvent): string | null => {
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
  const handleStyleToggleMouseDown = (e: React.MouseEvent, style: string) => {
    e.preventDefault(); 
    const newState = RichUtils.toggleInlineStyle(editorState, style);
    handleChange(newState);
    // TODO: find proper way to implement textEdit.current?.editor
    // @ts-ignore 
    if (document.activeElement === textEdit.current?.editor) {
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
  const handleChange = (newState: EditorState) => {
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
    data-id={planId}
    className={style.root}
    onClick={handleClick}
    onMouseDown={handleMouseDown}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    fp-role={"calendar-plan"}
    fp-state={state} // the state of this plan - see PlanState at top of this file
  >
    {isEdit(state) && 
      <div className={style.editPanel} fp-role={"edit-panel"}>
        {state === "edit-expand" ? 
          <> {/* Case: fully expanded */}
            <div className={panelStyle.styleIcons}>
              <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('BOLD') ? 'active' : 'inactive'}
                onMouseDown={e => handleStyleToggleMouseDown(e, 'BOLD')}
              >
                <FormatBold/>
              </div>
              <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('ITALIC') ? 'active' : 'inactive'}
                onMouseDown={e => handleStyleToggleMouseDown(e, 'ITALIC')}
              >
                <FormatItalic/>
              </div>
              <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('UNDERLINE') ? 'active' : 'inactive'}
                onMouseDown={e => handleStyleToggleMouseDown(e, 'UNDERLINE')}
              >
                <FormatUnderlined/>
              </div>
            </div>
            <div className={panelStyle.deleteIcon} onMouseDown={e => {e.preventDefault(); deleteSelf();}}>
              <Delete/>
            </div>
            <div className={panelStyle.labelsAnchor}>
              <StyleOpenContext.Provider value={{styleOpen, setStyleOpen}}>
                <PlanStyles planId={planId} currentStyleId={styleId}/>
              </StyleOpenContext.Provider>
            </div>
          </>
          : <> {/* Case: half expanded */}
            <div className={panelStyle.expandIcon} onMouseDown={handleExpandEditMouseDown}>
              <MoreVert/>
            </div>
          </>
        }
      </div>
    }
    <div className={style.content} style={{color: `var(--plan-color${isDone ? '-done' : ''}-${styleId || 'default'})`}}>
      <Editor 
        ref={textEdit}
        readOnly={!isEdit(state)}
        editorState={editorState} 
        handleKeyCommand={handleKeyCommand}
        onChange={handleChange}
        keyBindingFn={checkSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      <div className={style.toggler} style={{color: `var(--plan-color${isDone ? '-done' : '-done'}-${styleId || 'default'})`}}>
        <span 
          className={style.button}
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
