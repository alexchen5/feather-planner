import { Button } from "@material-ui/core";
import { FormatBold, FormatItalic, FormatUnderlined } from "@material-ui/icons";
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import { DocumentFocusContext } from "components/DocumentFocusStack";
import { DraftInlineStyle, SelectionState } from "draft-js";
import React from "react";
import { MouseEventHandler } from "react";
import { PinStyling } from ".";

import style from './styleMenu.module.scss';

const textStyles = [
  {
    style: 'header-one',
    content: 'Heading',
  }, 
  {
    style: 'header-two',
    content: 'Subheading',
  }, 
  {
    style: 'unstyled',
    content: 'Body',
  }, 
  {
    style: 'code-block',
    content: 'Code',
  }, 
]

function TextStyleSelector({ activeStyle, isDisabled, onBlockToggle 
}: { 
  activeStyle: string, 
  isDisabled: boolean, 
  onBlockToggle: (blockType: string) => void 
}) {
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  const [ state, setState ] = React.useState<'open' | 'closed'>('closed');
  const rootRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDownContainer: MouseEventHandler = (e) => {
    if (isDisabled) return;
    if (state === 'closed') {
      e.stopPropagation()
      e.preventDefault()
      setState('open')
      mountFocus('text-style-dropdown', 'pin-edit', [
        {
          key: 'mousedown',
          callback: (e) => {
            e.preventDefault();
            unmountFocus('text-style-dropdown')
          }
        }
      ], () => {
        if (rootRef.current) setState('closed')
      })
    }
  }

  const handleMouseDownButton = (e: React.MouseEvent<Element, MouseEvent>, style: string) => {
    if (isDisabled) return;
    e.stopPropagation()
    e.preventDefault()
    onBlockToggle(style)
    unmountFocus('text-style-dropdown')
  }

  return (
    <div 
      ref={rootRef}
      className={style.textStyleContainer}
    >
      <div
        className={style.activeStyleButton}
        onMouseDown={handleMouseDownContainer}
        fp-state={isDisabled ? 'disabled' : state}
      >
        {!isDisabled ? textStyles.find(s => s.style === activeStyle)?.content : ''}
      </div>
      {state === 'open' && (
        <div className={style.allStylesContainer}>
          {textStyles.map((s) => (
            <div 
              key={s.style}
              className={style.textStyleButton}
              fp-state={isDisabled ? 'disabled' : (activeStyle === s.style ? 'active' : 'inactive')}
              onMouseDown={(e) => handleMouseDownButton(e, s.style)}
            >
              {s.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InlineStyleSelector({ isDisabled, currentStyle, onInlineToggle }: {
  isDisabled: boolean,
  currentStyle: DraftInlineStyle | null,
  onInlineToggle: (inlineStyle: string) => void
}) {

  const handleMouseDownButton = (e: React.MouseEvent<Element, MouseEvent>, style: string) => {
    if (isDisabled) return;
    e.stopPropagation()
    e.preventDefault()
    onInlineToggle(style)
  }

  return (
    <div
      className={style.inlineStyleContainer}
    >
      <Button
        disabled={isDisabled}
        fp-state={isDisabled ? 'disabled' : (currentStyle?.has('BOLD') ? 'active' : 'inactive')}
        onMouseDown={e => handleMouseDownButton(e, 'BOLD')}
      ><FormatBold/></Button>
      <Button
        disabled={isDisabled}
        fp-state={isDisabled ? 'disabled' : (currentStyle?.has('ITALIC') ? 'active' : 'inactive')}
        onMouseDown={e => handleMouseDownButton(e, 'ITALIC')}
      ><FormatItalic/></Button>
      <Button
        disabled={isDisabled}
        fp-state={isDisabled ? 'disabled' : (currentStyle?.has('UNDERLINE') ? 'active' : 'inactive')}
        onMouseDown={e => handleMouseDownButton(e, 'UNDERLINE')}
      ><FormatUnderlined/></Button>
    </div>
  )
}

function ListStyleSelector({ activeStyle, isDisabled, onBlockToggle 
}: { 
  activeStyle: string, 
  isDisabled: boolean, 
  onBlockToggle: (blockType: string) => void 
}) {

  const handleMouseDownButton = (e: React.MouseEvent<Element, MouseEvent>, style: string) => {
    if (isDisabled) return;
    e.stopPropagation()
    e.preventDefault()
    onBlockToggle(style)
  }

  return (
    <div className={style.listStyleContainer}>
      <Button
        disabled={isDisabled}
        fp-state={isDisabled ? 'disabled' : (activeStyle === 'unordered-list-item' ? 'active' : 'inactive')}
        onMouseDown={e => handleMouseDownButton(e, 'unordered-list-item')}
      ><FormatListBulletedIcon/></Button>
      <Button
        disabled={isDisabled}
        fp-state={isDisabled ? 'disabled' : (activeStyle === 'ordered-list-item' ? 'active' : 'inactive')}
        onMouseDown={e => handleMouseDownButton(e, 'ordered-list-item')}
      ><FormatListNumberedIcon/></Button>
    </div>
  )
}

function StyleMenu({ pin }: { pin: PinStyling | null }) {
  let selection: SelectionState, blockType: string = '', currentStyle: DraftInlineStyle | null = null;
  if (pin) {
    selection = pin.editorState.getSelection();

    blockType = pin.editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();
    currentStyle = pin.editorState
      .getCurrentInlineStyle();
  }

  const handleBlockToggle = (blockType: string) => {
    pin?.onBlockToggle(blockType);
  }

  const handleInlineToggle = (inlineStyle: string) => {
    pin?.onInlineToggle(inlineStyle);
  }

  return (
    <div className={style.root}>
      <TextStyleSelector isDisabled={!blockType} activeStyle={blockType} onBlockToggle={handleBlockToggle}/>
      <InlineStyleSelector isDisabled={!blockType} currentStyle={currentStyle} onInlineToggle={handleInlineToggle}/>
      <ListStyleSelector isDisabled={!blockType} activeStyle={blockType} onBlockToggle={handleBlockToggle}/>
    </div>
  )
}

export default StyleMenu