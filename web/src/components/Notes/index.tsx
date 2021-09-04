import { FeatherContext } from 'pages/HomePage/context';
import React from 'react';
import { UidContext } from 'utils/globalContext';
import Inode from './Inode';
import style from './styles/index.module.scss';

function Notes() {
  const { notes: {allNotes} } = React.useContext(FeatherContext);
  const {uid} = React.useContext(UidContext);

  const homeNodes = React.useMemo<string[]>(() => {
    const ret = allNotes[`users/${uid}/inodes/index/dir/index`];
    if (ret && ret.type === 'dir') {
      return ret.file ? ret.file.inodes : []
    }
    return [];
  }, [uid, allNotes]);

  return <div className={style.root}>
    <div className={style.directory}>
      <button>Add pinboard</button>
      <button>Add directory</button>
      {
        homeNodes.map(path => <Inode path={path}/>)
      }
    </div>
    <div className={style.notesContainer}></div>
  </div>
}

export default Notes;