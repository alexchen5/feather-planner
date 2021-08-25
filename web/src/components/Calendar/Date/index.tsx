import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import { db, UidContext } from "utils/globalContext";
import React, { KeyboardEvent, MouseEventHandler, ReactNode } from "react";
import { CalendarDateLabel } from "types/calendar";

import AddPlan from "../Plan/AddPlan";
import { strToDate, dateToStr } from '../../../utils/dateUtil';

import style from "./date.module.scss";

function Date({ dateStr, label, children }: { dateStr: string, label: CalendarDateLabel | null, children: ReactNode }) {
  const [isToday, setIsToday] = React.useState(dateStr === dateToStr());
  const thisDate = strToDate(dateStr);
  const addPlan = React.createRef<HTMLButtonElement>();

  const {uid} = React.useContext(UidContext);
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(() => {
    const content = label ? label.content : '';
    return EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    );  
  });
  const [editing, setEditing] = React.useState(false);
  
  React.useEffect(() => {
    if (dateStr < dateToStr()) return;
    const timer = setInterval(() => {
      if (isToday !== (dateStr === dateToStr())) setIsToday(dateStr === dateToStr());
    }, 1000);
    return () => clearInterval(timer);
  }, [dateStr, isToday]);

  /**
   * Mouse down will add a new plan to the datenode
   * 
   * We use mousedown because we want to check for focused elements before
   * activating a new plan
   */
  const handleMouseDown: MouseEventHandler<HTMLLIElement> = (event) => {
    const target = event.target as HTMLElement; // assume target is a HTML element
    if (target.getAttribute('fp-role') === 'calendar-date') {
      addPlan.current && 
      !document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement) && 
      !document.querySelector('[fp-role="calendar-plan"][fp-state^="edit"]') &&
      addPlan.current.click()
    }
  }

  const handleBlur = () => {
    handleSubmission();
  }
  const getFocus = () => {
    setEditing(true);
    editor.current?.focus();
  }
  const checkSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }
  const handleSubmission = () => {
    if (editorState.getCurrentContent().hasText()) {
      label ?
        db.doc(`users/${uid}/date-labels/${label.labelId}`).set(
          { content: convertToRaw(editorState.getCurrentContent()) }, { merge: true }
        )
        : db.collection(`users/${uid}/date-labels`).add({
            date: dateStr,
            content: convertToRaw(editorState.getCurrentContent()),
          });
    } else {
      label && db.doc(`users/${uid}/date-labels/${label.labelId}`).delete();
    }
    setEditing(false);
  }

  return (
    <li
      className={style.root}
      fp-role={'calendar-date-root'}
      data-date={dateStr}
      onMouseDown={handleMouseDown}
    >
      <div fp-role={'calendar-date'} className={style.item}>
        <div className={style.header}>
          <div 
            className={style.label}
            data-state={editing ? 'edit' : 'normal'}
            onMouseDown={e => {
              if (document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement)) return;
              e.stopPropagation();
              getFocus();
            }}
          >
            <Editor
              ref={editor}
              editorState={editorState} 
              readOnly={!editing}
              onChange={setEditorState}
              onBlur={handleBlur}
              keyBindingFn={checkSubmit}
            />
          </div>
          <div 
            className={style.date}
            fp-state={isToday ? 'highlight' : 'standard'}
          >
            {thisDate.getDate() === 1 ? '1 ' + thisDate.toLocaleDateString('default', {month: 'short'}) : thisDate.getDate()}
          </div>
        </div>
        {children}
        <AddPlan
          dateStr={dateStr}
          ref={addPlan}
        />
      </div>
    </li> 
  )
}

export default Date;
