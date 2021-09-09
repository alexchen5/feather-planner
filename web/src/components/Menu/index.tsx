import { IconButton } from "@material-ui/core";
import { Link } from "react-router-dom";
import HomeIcon from '@material-ui/icons/Home';
import DescriptionIcon from '@material-ui/icons/Description';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';

import style from './style.module.scss';

function Menu() {

  return <div className={style.root}>
    <Link to={'/'}><IconButton size='medium'><HomeIcon/></IconButton></Link>
    <Link to={'/notes'}><IconButton size='medium'><DescriptionIcon/></IconButton></Link>
    <Link to={'/profile'}><IconButton size='medium'><AccountCircleIcon/></IconButton></Link>
  </div>
}

export default Menu;