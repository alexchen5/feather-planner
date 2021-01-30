import {makeStyles} from "@material-ui/core";
import {dateToStr, strToDate} from './util'

const useStyles = makeStyles(() => ({
  datenodeHeader: {
    borderRadius: '4px',
    fontWeight: 'bold',
    padding: '0.5em',
    marginBottom: '2px',
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

function DatenodeHeader({date_str}) {
  const classes = useStyles();
  const thisDate = strToDate(date_str);

  return (
  <div className={`${classes.datenodeHeader} ${classes['background' + thisDate.getDay()]}`}>
    {date_str === dateToStr() ? 'T o d a y' : thisDate.getDate() === 1 ? thisDate.toLocaleDateString('default', {month: 'long'}) : thisDate.getDate()}
  </div>
  )
}

export default DatenodeHeader;
