import React from "react";

import IconButton from '@material-ui/core/IconButton';
import { AddCircle } from "@material-ui/icons";
import { CalendarContext } from ".";
import { convertToRaw, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";

const AddPlan = React.forwardRef(({date_str}, ref) => {
  const {dispatchDates} = React.useContext(CalendarContext);
  const [isAdding, setIsAdding] = React.useState(false);
  const editor = React.createRef(null);
  const [editorState, setEditorState] = React.useState(() => EditorState.createEmpty());

  const handleAddClick = (e) => {
    e.stopPropagation();
    setIsAdding(true);
  }
  const handleEditorBlur = () => {
    handleSubmission();
  }

  const handleSubmission = () => {
    if (!editorState.getCurrentContent().hasText()) {
      setIsAdding(false);
      return;
    }
    dispatchDates({ type: 'add', date_str, entries: { textContent: convertToRaw(editorState.getCurrentContent()) } });
    setIsAdding(false);
  }

  React.useEffect(() => {
    if (isAdding) {
      editor.current.focus();
    }
    if (editorState.getCurrentContent().hasText()) {
      setEditorState(() => EditorState.createEmpty());
    }
    // eslint-disable-next-line
  }, [isAdding]);

  const handleKeyCommand = command => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  return (<>
    {
      isAdding ? 
      <div style={{
        border: '1px dashed var(--edge-blue)',
        padding: '4px 12px 2px 2px',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: 'var(--plan-font-size)',
        marginBottom: '5px',
      }}>  
        <Editor
          ref={editor}
          editorState={editorState} 
          handleKeyCommand={handleKeyCommand}
          onChange={setEditorState}
          keyBindingFn={checkSubmit}
          onBlur={handleEditorBlur}
        />
      </div> :
      <div className={'plan-add'} >
        <IconButton ref={ref} size='small' onClick={handleAddClick}><AddCircle/></IconButton> 
      </div>
    }
  </>)
});

export default AddPlan;
