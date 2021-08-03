import React from "react";
import {ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding, RichUtils} from 'draft-js';

const TextEdit = React.forwardRef(({options: { init, submit, readOnly }}, ref) => {
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof init === 'string' ? ContentState.createFromText(init) : convertFromRaw(init)
    ),
  );
  const [didChange, setDidChange] = React.useState(false);

  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      submit(
        editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
        didChange,
        true
      );
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

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

  const handleFocus = () => {
    setDidChange(false);
  }

  const handleBlur = () => {
    submit(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
      didChange,
      false
    )
  }

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
 
  return (
    <>
    <Editor 
      ref={ref}
      readOnly={readOnly}
      editorState={editorState} 
      handleKeyCommand={handleKeyCommand}
      onChange={handleChange}
      keyBindingFn={checkSubmit}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
    </>
  );
})

export default TextEdit;