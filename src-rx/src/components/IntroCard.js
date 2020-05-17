import React from 'react';

import PropTypes from 'prop-types';

import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import IconButton  from '@material-ui/core/IconButton';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';

import CheckIcon from '@material-ui/icons/Check';
import EditIcon from '@material-ui/icons/Create';
import CloseIcon from '@material-ui/icons/Close';
import SaveIcon from '@material-ui/icons/Save';

import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';
import copy from 'copy-to-clipboard';

const boxShadow = '0 2px 2px 0 rgba(0, 0, 0, .14),0 3px 1px -2px rgba(0, 0, 0, .12),0 1px 5px 0 rgba(0, 0, 0, .2)';
const boxShadowHover = '0 8px 17px 0 rgba(0, 0, 0, .2),0 6px 20px 0 rgba(0, 0, 0, .19)';

const styles = theme => ({
    root: {
        padding: '.75rem',
        [theme.breakpoints.up('xl')]: {
            flex: '0 1 20%'
        }
    },
    card: {
        display: 'flex',
        minHeight: '235px',
        position: 'relative',
        overflow: 'hidden',
        maxHeight: '235p',
        '&:hover': {
            overflowY: 'auto',
            boxShadow: boxShadowHover
        }
    },
    edit: {
        opacity: '.6',
        userSelect: 'none',
        pointerEvents: 'none'
    },
    media: {
        backgroundColor: '#e2e2e2',
        maxWidth: '30%'
    },
    img: {
        width: '120px',
        height: 'auto',
        padding: '2rem .5rem',
        maxWidth: '100%'
    },
    contentContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1
    },
    content: {
        height: '170px',
        flexGrow: 1,
        overflowY: 'hidden'
    },
    action: {
        minHeight: '49px',
        padding: '16px 24px'
    },
    expand: {
        position: 'absolute',
        right: '10px',
        bottom: '10px'
    },
    collapse: {
        backgroundColor: '#ffffff',
        position: 'absolute',
        width: '100%',
        '& button': {
            position: 'absolute',
            top: '10px',
            color: '#000000',
            '&:focus': {
                color: '#ffffff',
                backgroundColor: blue[500]
            }
        }
    },
    close: { 
        right: '10px'
    },
    save: {
        right: '50px'
    },
    enabled: {
        color: '#ffffff',
        backgroundColor: blue[500],
        position: 'absolute',
        top: theme.spacing(1),
        right: theme.spacing(1),
        boxShadow,
        '&:hover': {
            backgroundColor: blue[300]
        },
        '&:focus': {
            backgroundColor: blue[500]
        }
    },
    disabled: {
        color: '#ffffff',
        backgroundColor: grey[500],
        position: 'absolute',
        top: theme.spacing(1),
        right: theme.spacing(1),
        boxShadow,
        '&:hover': {
            backgroundColor: grey[300]
        },
        '&:focus': {
            backgroundColor: grey[500]
        }
    },
    editButton: {
        color: '#ffffff',
        backgroundColor: grey[500],
        position: 'absolute',
        top: theme.spacing(2) + 48, // 48 is the height of button
        right: theme.spacing(1),
        boxShadow,
        '&:hover': {
            backgroundColor: grey[300]
        },
        '&:focus': {
            backgroundColor: grey[500]
        }
    }
});

class IntroCard extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            expanded: false
        }
    }

    static getDerivedStateFromProps(props) {
        if (props.edit) {
            return { expanded: false };
        } else {
            return null;
        }
    }

    handleExpandClick() {
        this.setState({
            expanded: !this.state.expanded
        });
    }

    render() {

        const { classes } = this.props;
        const editClass = this.props.edit ? ' ' + classes.edit : '';

        return (
            <Grid
                item
                xs={ 12 }
                sm={ 6 }
                md={ 4 }
                lg={ 3 }
                className={ classes.root }
            >
                <Card className={ classes.card }>
                    {
                        this.props.reveal &&
                        <Button
                            className={ classes.expand + editClass }
                            variant="contained"
                            size="small"
                            onClick={ () => this.handleExpandClick() }
                            color="primary"
                        >
                            INFO
                        </Button>
                    }
                    <div className={ classes.media + editClass } style={{ backgroundColor: this.props.color }}>
                        <CardMedia
                            className={ classes.img }
                            component="img"
                            image={ this.props.image }
                        />
                    </div>
                    <div className={ classes.contentContainer + editClass }>
                        <CardContent className={ classes.content }>
                            <Typography gutterBottom variant="h5" component="h5">
                                { this.props.title }
                            </Typography>
                            { this.props.children }
                        </CardContent>
                        {
                            this.props.action && this.props.action.link &&
                            <Divider />
                        }
                        {
                            this.props.action && this.props.action.link &&
                            <CardActions className={ classes.action }>
                                <Link href={ this.props.action.link } underline="none">
                                    { this.props.action.text }
                                </Link>
                            </CardActions>
                        }
                    </div>
                    {
                        this.props.reveal &&
                        <Collapse
                            className={ classes.collapse }
                            in={ this.state.expanded }
                            timeout="auto"
                            unmountOnExit
                        >
                            <IconButton className={ classes.save } size="small" onClick={ () => copy(this.props.reveal) }>
                                <SaveIcon />
                            </IconButton>
                            <IconButton className={ classes.close } size="small" onClick={ () => this.handleExpandClick() }>
                                <CloseIcon />
                            </IconButton>
                            <CardContent>
                                <Typography gutterBottom variant="h5" component="h5">
                                    Info
                                </Typography>
                                { this.props.reveal }
                            </CardContent>
                        </Collapse>
                    }
                    {
                        this.props.edit && this.props.toggleActivation &&
                        <IconButton className={ this.props.enabled ? classes.enabled : classes.disabled } onClick={ () => this.props.toggleActivation() }>
                            <CheckIcon />
                        </IconButton>
                    }
                    {
                        this.props.edit && this.props.onEdit &&
                        <IconButton className={ classes.editButton } onClick={ () => this.props.onEdit() }>
                            <EditIcon />
                        </IconButton>
                    }
                </Card>
            </Grid>
        );
    }
}

IntroCard.propTypes = {
    ready: PropTypes.bool,
    instances: PropTypes.object,
    updateIntro: PropTypes.string,
    openLinksInNewWindow: PropTypes.bool,
    onEdit: PropTypes.func,
    t: PropTypes.func,
};

export default withStyles(styles)(IntroCard);