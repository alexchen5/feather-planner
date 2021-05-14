import React from "react";

import IconButton from '@material-ui/core/IconButton';
import { AddCircle } from "@material-ui/icons";
import { db } from "../../pages/HomePage";
import { UidContext } from "../../App";

function AddNote() {
  const {uid} = React.useContext(UidContext);

  const handleAddClick = () => {
    db.collection(`users/${uid}/notes`).add({
      content: '',
      position: {
        left: 0,
        right: 0,
      }
    })
  }

  return (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  }}>
    <IconButton
      size='small'
      onClick={handleAddClick}
    >
      <AddCircle/>
    </IconButton>
    Add Note
  </div>)
}

export default AddNote;
