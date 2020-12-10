import React from "react";
import {makeStyles, GridList, GridListTile} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  datenode_container: {
    margin: '24px',
    height: '640px',
    overflow: 'scroll',
    minWidth: '700px',
  },
  datenode: {
    minHeight: '160px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: `2px solid transparent`,
  },
  datenodeHeader: {
    borderRadius: '6px',
    fontWeight: 'bold',
    padding: '0.5em',
  },
  nodeFocus: {
    // border: '2px solid rgba(0, 0, 0, .05)',
    backgroundColor: 'rgba(0, 0, 0, .05)',
  },
  background0: {
    backgroundColor: '#ff8080',
  },
  background1: {
    backgroundColor: '#ffcc99',
  },
  background2: {
    backgroundColor: '#ffff99',
  },
  background3: {
    backgroundColor: '#ccffcc',
  },
  background4: {
    backgroundColor: '#99ccff',
  },
  background5: {
    backgroundColor: '#ccccff',
  },
  background6: {
    backgroundColor: '#cc99ff',
  },
}));

function Calendar() {
  const dayStart = -6;
  const numWeeksStart = 5;
  const paginateWeeksNext = 4;
  const paginateWeeksPrv = 3;

  const classes = useStyles();
  const [dateNodes, setDateNodes] = React.useState(dateNodesInit());

  function dateNodesInit() {
    let currDate = new Date();
    currDate.setDate(currDate.getDate() - currDate.getDay() + dayStart);
    return newDateNodes(currDate, numWeeksStart);
  }

  function newDateNodes(startDate, weeks) {
    let ret = [];
    for (let d = 0; d < 7 * weeks; d++) {
      let newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + d);
      ret.push({
        isFocused: false,
        day: newDate,
      });
    }
    return ret;
  }

  const handleDatenodeClick = event => {
    if (!event.target.hasAttribute('nodefocus')) return;
    let targetDay = event.target.getAttribute('day');
    for (let i = 0; i < dateNodes.length; i++) {
      if (`${dateNodes[i].day}` !== targetDay) dateNodes[i].isFocused = false;
      else dateNodes[i].isFocused = true;
    }
    setDateNodes([...dateNodes]);
  }

  const handleNodePagination = event => {
    if (event.target.scrollHeight - event.target.scrollTop === event.target.clientHeight) {
      let nextDate = new Date(dateNodes[dateNodes.length - 1].day);
      nextDate.setDate(nextDate.getDate() + 1);
      setDateNodes([...dateNodes, ...newDateNodes(nextDate, paginateWeeksNext)]);
    } else if (event.target.scrollTop === 0) {
      let prvDate = new Date(dateNodes[0].day);
      prvDate.setDate(prvDate.getDate() - 7 * paginateWeeksPrv);
      setDateNodes([...newDateNodes(prvDate, paginateWeeksPrv), ...dateNodes]);
      event.target.scrollTop = 1;
    };
  } 

  return (
    <GridList cols={7} spacing={0} className={classes.datenode_container} style={{margin: ''}} onScroll={handleNodePagination}>
      {dateNodes.map(e => (
        <GridListTile key={e.day} style={{height: 'auto'}}>
          <div day={e.day} className={`${classes.datenode} ${e.isFocused ? classes.nodeFocus : ''}`} 
            onClick={handleDatenodeClick} nodefocus='true'
          >
            <div className={`${classes.datenodeHeader} ${classes['background' + e.day.getDay()]}`}>
              {e.day.getDate() === 1 ? e.day.toLocaleDateString('default', {month: 'long'}) : e.day.getDate()}
            </div>
          </div>
        </GridListTile>
      ))}
    </GridList>
  );
}

export default Calendar;
