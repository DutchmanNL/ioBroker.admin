import React, { Component } from 'react';
import semver from 'semver';

import { withStyles } from '@material-ui/core/styles';

import PropTypes from 'prop-types';

import { Button } from '@material-ui/core';
import { Dialog } from '@material-ui/core';
import { DialogActions } from '@material-ui/core';
import { DialogContent } from '@material-ui/core';
import { DialogTitle } from '@material-ui/core';
import { Grid } from '@material-ui/core';
import { IconButton } from '@material-ui/core';
import { Typography } from '@material-ui/core';

import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import IconWarning from '@material-ui/icons/Warning';
import IconError from '@material-ui/icons/Error';
import IconInfo from '@material-ui/icons/Info';
import IconWeb from '@material-ui/icons/Public';

import State from '../components/State';
import {MOBILE_WIDTH} from '../helpers/MobileDialog';
import I18n from '@iobroker/adapter-react/i18n';
import Utils from '@iobroker/adapter-react/Components/Utils';

const styles = theme => {
    return ({
        closeButton: {
            position: 'absolute',
            right: theme.spacing(1),
            top: theme.spacing(1),
            color: theme.palette.grey[500],
        },
        typography: {
            paddingRight: 30
        },
        version: {
            background: '#4dabf5',
            borderRadius: 3,
            paddingLeft: 10,
            fontWeight: 'bold',
            color: theme.palette.type === 'dark' ? 'black' : 'white'
        },
        wrapperButton: {
        },
        '@media screen and (max-width: 465px)': {
            wrapperButton: {
                '& *': {
                    fontSize: 10
                }
            },
        },
        '@media screen and (max-width: 380px)': {
            wrapperButton: {
                '& *': {
                    fontSize: 9
                }
            },
        },
        messageText: {

        },
        messageIcon: {
            width: 32,
            height: 32,
            marginRight: 8
        },
        messageColor_warn: {
            color: '#cb7642',
        },
        messageColor_error: {
            color: '#f5614d',
        },
        messageColor_info: {
            color: '#5abd29',
        },
        messageTitle_warn: {
            background: '#cb7642',
            borderRadius: 3,
            paddingLeft: 10,
            fontWeight: 'bold',
            color: theme.palette.type === 'dark' ? 'black' : 'white'
        },
        messageTitle_error: {
            background: '#f5614d',
            borderRadius: 3,
            paddingLeft: 10,
            fontWeight: 'bold',
            color: theme.palette.type === 'dark' ? 'black' : 'white'
        },
        messageTitle_info: {
            background: '#5abd29',
            borderRadius: 3,
            paddingLeft: 10,
            fontWeight: 'bold',
            color: theme.palette.type === 'dark' ? 'black' : 'white'
        },
        messageDialogText: {
            fontSize: 18
        },
        messageDialogTitle: {

        }
    })
};

class AdapterUpdateDialog extends Component {
    constructor(props) {
        super(props);

        this.t = props.t;
        this.mobile = window.innerWidth < MOBILE_WIDTH;

        this.state = {
            showMessageDialog: false
        };

        const messages = false; /*[
            {
                "condition": {
                    "operand": "and",
                    "rules": [
                        "oldVersion<=1.0.44",
                        "newVersion>=1.0.45"
                    ]
                },
                "title": {
                    "en": "Important notice",
                    "de": "Wichtiger Hinweis",
                    "ru": "Важное замечание",
                    "pt": "Notícia importante",
                    "nl": "Belangrijke mededeling",
                    "fr": "Avis important",
                    "it": "Avviso IMPORTANTE",
                    "es": "Noticia importante",
                    "pl": "Ważna uwaga",
                    "zh-cn": "重要通知"
                },
                "text": {
                    "en": "From the ioBroker.knx@2.0.0 version only 500 data points can be used fro free. If you have more than 500 KNX data points, you must order the paid license",
                    "de": "Ab der Version ioBroker.knx@2.0.0 können nur noch 500 Datenpunkte frei verwendet werden. Wenn Sie mehr als 500 KNX-Datenpunkte haben, müssen Sie die kostenpflichtige Lizenz bestellen",
                    "ru": "Из версии ioBroker.knx@2.0.0 только 500 точек данных можно использовать бесплатно. Если у вас более 500 точек данных KNX, необходимо заказать платную лицензию.",
                    "pt": "Na versão ioBroker.knx@2.0.0, apenas 500 pontos de dados podem ser usados gratuitamente. Se você tiver mais de 500 pontos de dados KNX, você deve solicitar a licença paga",
                    "nl": "Van de ioBroker.knx@2.0.0 versie kunnen slechts 500 datapunten gratis worden gebruikt. Als u meer dan 500 KNX-datapunten heeft, moet u de betaalde licentie bestellen",
                    "fr": "À partir de la version ioBroker.knx@2.0.0, seuls 500 points de données peuvent être utilisés gratuitement. Si vous avez plus de 500 points de données KNX, vous devez commander la licence payante",
                    "it": "Dalla versione ioBroker.knx@2.0.0 è possibile utilizzare gratuitamente solo 500 punti dati. Se hai più di 500 punti dati KNX, devi ordinare la licenza a pagamento",
                    "es": "Desde la versión ioBroker.knx@2.0.0, solo se pueden usar 500 puntos de datos de forma gratuita. Si tiene más de 500 puntos de datos KNX, debe solicitar la licencia paga",
                    "pl": "Od wersji ioBroker.knx@2.0.0 można bezpłatnie korzystać tylko z 500 punktów danych. Jeśli masz więcej niż 500 punktów danych KNX, musisz zamówić płatną licencję",
                    "zh-cn": "从 ioBroker.knx@2.0.0 版本开始，只能免费使用 500 个数据点。如果您有超过 500 个 KNX 数据点，则必须订购付费许可证"
                },
                "link": "https://iobroker.net/www/pricing",
                "linkText": "Prices",
                "level": "warn",
                "buttons": ["agree", "cancel"]
            }
        ]*/

        this.messages = AdapterUpdateDialog.checkCondition(
            this.props.adapterObject && (this.props.adapterObject.messages || messages),
            this.props.installedVersion,
            this.props.adapterObject?.version
        );
        this.lang = I18n.getLanguage();
    }

    getDependencies() {
        const result = [];

        this.props.dependencies && this.props.dependencies.forEach(dependency => {
            result.push(
                <State
                    key={dependency.name}
                    state={dependency.rightVersion}
                >
                    {`${dependency.name}${dependency.version ? ` (${dependency.version})` : ''}: ${dependency.installed ? dependency.installedVersion : '-'}`}
                </State>
            );
        });

        return result;
    }

    getNews() {
        const result = [];

        this.props.news && this.props.news.forEach(entry => {
            const news = (entry.news ? entry.news.split('\n') : [])
                .map(line => line
                    .trim()
                    .replace(/^\*\s?/, '')
                    .replace(/<!--[^>]*->/, '')
                    .replace(/<! -[^>]*->/, '')
                    .trim()
                )
                .filter(line => !!line);

            if (this.props.adapterObject?.version && entry.version &&
                semver.gt(entry.version, this.props.adapterObject?.version)) {
                return;
            }

            result.push(
                <Grid item key={entry.version}>
                    <Typography className={this.props.classes.version}>
                        {entry.version}
                    </Typography>
                    {news.map((value, index) => {
                        return <Typography key={`${entry.version}-${index}`} component="div" variant="body2">
                            { '• ' + value}
                        </Typography>;
                    })}
                </Grid>
            );
        });

        return result;
    }

    static checkCondition(objMessages, oldVersion, newVersion) {
        let messages = null;

        if (objMessages) {
            // const messages = {
            //     "condition": {
            //         "operand": "and",
            //         "rules": [
            //             "oldVersion<=1.0.44",
            //             "newVersion>=1.0.45"
            //         ]
            //     },
            //     "title": {
            //         "en": "Important notice",
            //     },
            //     "text": {
            //         "en": "Main text",
            //     },
            //     "link": "https://iobroker.net/www/pricing",
            //     "buttons": ["agree", "cancel", "ok],
            //     "linkText" {
            //          "en": "More info",
            //     },
            //     "level": "warn"
            // };

            objMessages.forEach(message => {
                let show = !message.condition || !message.condition.rules;
                if (message.condition && message.condition.rules) {
                    const results = (Array.isArray(message.condition.rules) ? message.condition.rules : [message.condition.rules])
                        .map(rule => {
                            // oldVersion<=1.0.44
                            let version;
                            if (rule.includes('oldVersion')) {
                                version = oldVersion;
                                rule = rule.substring('newVersion'.length);
                            } else if (rule.includes('newVersion')) {
                                version = newVersion;
                                rule = rule.substring('newVersion'.length);
                            } else {
                                // unknown rule
                                return false;
                            }
                            let op;
                            let ver;
                            if (rule[1] >= '0' && rule[1] <= '9') {
                                op = rule[0];
                                ver = rule.substring(1);
                            } else {
                                op = rule.substring(0, 2);
                                ver = rule.substring(2);
                            }
                            try {
                                if (op === '==') {
                                    return semver.eq(version, ver);
                                } else if (op === '>') {
                                    return semver.gt(version, ver);
                                } else if (op === '<') {
                                    return semver.lt(version, ver);
                                } else if (op === '>=') {
                                    return semver.gte(version, ver);
                                } else if (op === '<=') {
                                    return semver.lte(version, ver);
                                } else if (op === '!=') {
                                    return semver.neq(version, ver);
                                } else {
                                    console.warn(`Unknown rule ${version}${rule}`);
                                    return false;
                                }
                            } catch (e) {
                                console.warn(`Cannot compare ${version}${rule}`);
                                return false;
                            }
                        });

                    if (message.condition.operand === 'or') {
                        show = results.find(res => res);
                    } else {
                        show = !results.find(res => !res);
                    }
                }

                if (show) {
                    messages = messages || [];
                    messages.push({title: message.title, text: message.text, link: message.link, buttons: message.buttons, level: message.level});
                }
            });
        }

        return messages;
    }

    getText(text) {
        if (text && typeof text === 'object') {
            return text[this.lang] || text.en;
        } else {
            return text;
        }
    }

    renderOneMessage(message, index) {
        return <Grid item key={index}>
            <Typography className={this.props.classes['messageTitle_' + (message.level || 'warn')]}>
                {this.getText(message.title) || ''}
            </Typography>
            <Typography component="div" variant="body2"  className={this.props.classes.messageText}>
                {this.getText(message.text) || ''}
            </Typography>
            {message.link ?
                <Button
                    onClick={() => {
                        const w = window.open(message.link, '_blank');
                        w.focus();
                    }}
                    startIcon={<IconWeb />}
                    variant="contained"
                >{this.getText(message.linkText) || this.props.t('More info')}</Button>
                : null}
        </Grid>
    }

    renderMessages() {
        if (this.messages) {
            return <Grid
                container
                spacing={2}
                direction="column"
                wrap="nowrap"
            >
                {this.messages.map((message, i) => this.renderOneMessage(message, i))}
            </Grid>;
        } else {
            return null;
        }
    }

    renderMessageDialog() {
        if (!this.state.showMessageDialog) {
            return null;
        } else {
            const message = this.messages.find(m => m.buttons);
            const version = this.props.adapterObject?.version;
            const classes = this.props.classes;

            return <Dialog
                onClose={() => this.setState({showMessageDialog: false})}
                open={true}
            >
                <DialogTitle className={classes.messageDialogTitle}>
                    {this.getText(message.title) || this.props.t('Please confirm')}
                </DialogTitle>
                <DialogContent className={classes.messageDialogText}>
                    {message.level === 'warn' ? <IconWarning className={Utils.clsx(classes.messageIcon, classes.messageColor_warn)}/> : null}
                    {message.level === 'error' ? <IconError className={Utils.clsx(classes.messageIcon, classes.messageColor_error)} /> : null}
                    {message.level === 'info' ? <IconInfo className={Utils.clsx(classes.messageIcon, classes.messageColor_info)} /> : null}
                    {this.getText(message.text)}
                </DialogContent>
                <DialogActions>
                    {message.link ?
                        <Button
                            onClick={() => {
                                const w = window.open(message.link, '_blank');
                                w.focus();
                            }}
                            startIcon={<IconWeb />}
                            variant="contained"
                            color="secondary"
                        >{this.getText(message.linkText) || this.props.t('More info')}</Button>
                        : null
                    }
                    {message.link ? <div style={{flexGrow: 1}} /> : null}
                    {message.buttons.map(button => {
                        if (button === 'ok') {
                            return <Button
                                variant="contained"
                                onClick={() =>
                                    this.setState({showMessageDialog: false}, () =>
                                        this.props.onUpdate(version))}
                                color="primary"
                                startIcon={<CheckIcon/>}
                            >
                                {this.t('Update')}
                            </Button>
                        } else if (button === 'agree') {
                            return <Button
                                className={classes['messageTitle_' + (message.level || 'warn')]}
                                variant="contained"
                                onClick={() =>
                                    this.setState({showMessageDialog: false}, () =>
                                        this.props.onUpdate(version))}
                                color="primary"
                                startIcon={<CheckIcon/>}
                            >
                                {this.t('Agree')}
                            </Button>
                        } else if (button === 'cancel') {
                            return <Button
                                variant="contained"
                                onClick={() => this.setState({showMessageDialog: false})}
                                startIcon={<CloseIcon />}
                            >
                                {this.t('Cancel')}
                            </Button>
                        }
                        return null;
                    })}
                </DialogActions>
            </Dialog>;
        }
    }

    render() {
        const { classes } = this.props;

        const version = this.props.adapterObject?.version;

        const news = this.getNews();

        return <Dialog
            onClose={this.props.onClose}
            open={this.props.open}
        >
            {this.renderMessageDialog()}
            <DialogTitle disableTypography={true}>
                <Typography component="h2" variant="h6" classes={{ root: classes.typography }}>
                    {this.t('Update "%s" to v%s', this.props.adapter, version)}
                    <IconButton className={classes.closeButton} onClick={this.props.onClose}>
                        <CloseIcon />
                    </IconButton>
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Grid
                    container
                    direction="column"
                    spacing={2}
                    wrap="nowrap"
                >
                    {this.props.dependencies && this.props.dependencies.length > 0 &&
                        this.props.dependencies.find(dependency => !dependency.rightVersion) &&
                        <Grid item>
                            <Typography variant="h6" gutterBottom>{this.t('Dependencies')}</Typography>
                            {this.getDependencies()}
                        </Grid>
                    }
                    {news.length ? <Grid item>
                        <Typography variant="h6" gutterBottom>{this.t('Change log')}</Typography>
                        <Grid
                            container
                            spacing={2}
                            direction="column"
                            wrap="nowrap"
                        >
                            {news}
                        </Grid>
                    </Grid> : this.t('No change log available')}
                </Grid>
                {this.renderMessages()}
            </DialogContent>
            <DialogActions className={classes.wrapperButton}>
                {!!this.props.rightDependencies && this.props.onIgnore && version && <Button
                    variant="outlined"
                    onClick={() => this.props.onIgnore(version)}
                    color="primary"
                >
                    {this.t('Ignore version %s', version)}
                </Button>}
                <Button
                    variant="contained"
                    autoFocus
                    disabled={!this.props.rightDependencies || !version || !this.props.adapterObject}
                    onClick={() => {
                        if (this.messages && this.messages.find(message => message.buttons)) {
                            this.setState({showMessageDialog: true});
                        } else {
                            this.props.onUpdate(version);
                        }
                    }}
                    color="primary"
                    startIcon={<CheckIcon/>}
                >
                    {this.mobile ? null : (this.props.textUpdate ? this.props.textUpdate : this.t('Update'))}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => this.props.onClose()}
                    color="default"
                    startIcon={<CloseIcon />}
                >
                    {this.mobile ? null : this.t('Close')}
                </Button>
            </DialogActions>
        </Dialog>;
    }
}

AdapterUpdateDialog.propTypes = {
    adapter: PropTypes.string.isRequired,
    adapterObject: PropTypes.object.isRequired,
    dependencies: PropTypes.array,
    news: PropTypes.array,
    onUpdate: PropTypes.func.isRequired,
    onIgnore: PropTypes.func,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
    rightDependencies: PropTypes.bool,
    installedVersion: PropTypes.string,
    t: PropTypes.func.isRequired
}

export default  withStyles(styles)(AdapterUpdateDialog);
