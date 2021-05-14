import React from "react";
import {ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding, RichUtils} from 'draft-js';

var INLINE_STYLES = [
  // {label: 'Bold', style: 'BOLD'},
  // {label: 'Italic', style: 'ITALIC'},
  // {label: 'Underline', style: 'UNDERLINE'},
  {label: 'Green', style: 'GREEN'},
];

const styleMap = {
  GREEN: {
    color: '#34a853',
  }
}

const StyleButton = ({active, label, style, onToggle}) => {
  const handleToggle = e => {
    e.preventDefault();
    onToggle(style);
  }
  return (
    <span className={`textedit-button ${active ? '-active' : ''}`} onMouseDown={handleToggle}>
      {label}
    </span>
  )
}
// eslint-disable-next-line
const InlineStyleControls = ({editorState, onToggle}) => {
  const currentStyle = editorState.getCurrentInlineStyle();
  return (
    <div className={'textedit-controls'}>
      {INLINE_STYLES.map((type) => 
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={onToggle}
          style={type.style}
        />
      )}
    </div>
  )
}

const TextEdit = React.forwardRef(({options: {menu, init, submit, readOnly}}, ref) => {
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof init === 'string' ? ContentState.createFromText(init) : convertFromRaw(init)
    ),
  );

  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.currentTarget.closest('[plan]').focus();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  const handleKeyCommand = command => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }
// eslint-disable-next-line
  const toggleInlineStyle = style => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  }
 
  return (
    <>
    {/* {menu && <div className={'textedit-menu'}>
      <InlineStyleControls editorState={editorState} onToggle={toggleInlineStyle}/>
    </div>} */}
    <Editor 
      ref={ref}
      readOnly={readOnly}
      editorState={editorState} 
      customStyleMap={styleMap}
      handleKeyCommand={handleKeyCommand}
      onChange={setEditorState}
      keyBindingFn={checkSubmit}
      onBlur={e => submit(editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()))}
    />
    </>
  );
})

export default TextEdit;