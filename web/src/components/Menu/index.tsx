import { Button, IconButton } from "@material-ui/core";
import { Link, useRouteMatch } from "react-router-dom";
import HomeIcon from '@material-ui/icons/Home';
import DescriptionIcon from '@material-ui/icons/Description';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';

import style from './style.module.scss';
import React, { ReactNode } from "react";
import { AppContext } from "utils/globalContext";

function StateLink({ to, children }: { to: string, children: ReactNode } ) {
  const match = useRouteMatch({
    path: to,
    exact: true
  });
      
  return <Link to={to} link-state={match ? 'on' : 'off'}>{ children }</Link>
}

function Menu() {
  const { user } = React.useContext(AppContext);

  return <div className={style.root}>
    <Link to={'/'}>
      <div className={style.logoContainer}>
        <img src={`${process.env.PUBLIC_URL}/assets/logo192.png`} alt="Home" className={style.logo}></img>
      </div>
    </Link>
    <div className={style.mainLinks}>
      <StateLink to={'/'}><Button size='medium'><HomeIcon/></Button></StateLink>
      <StateLink to={'/notes'}><Button size='medium'><DescriptionIcon/></Button></StateLink>
    </div>
    <StateLink to={'/profile'}><IconButton size='small'>
      <div className={style.profileContainer}>
        {
          user.photoURL 
          ? <img src={user.photoURL} alt='' className={style.profileImg}></img>
          : <AccountCircleIcon className={style.profileImg}/>
        }
      </div>
    </IconButton></StateLink>
  </div>
}

export default Menu;