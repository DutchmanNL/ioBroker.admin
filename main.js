/**
 *      Admin backend
 *
 *      Controls Adapter-Processes
 *
 *      Copyright 2014-2021 bluefox <dogafox@gmail.com>,
 *      MIT License
 *
 */

/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
'use strict';

const adapterName = require('./package.json').name.split('.').pop();
const utils       = require('@iobroker/adapter-core'); // Get common adapter utils
const tools 	  = require(utils.controllerDir + '/lib/tools.js');
const SocketIO    = require('./lib/socket');
const Web         = require('./lib/web');
const semver      = require('semver');
const request     = require('request');
const fs          = require('fs');

const ONE_HOUR_MS = 3600000;
const ERROR_PERMISSION = 'permissionError';

let uuid          = '';
let socket        = null;
let webServer     = null;

let objects       = {};
let secret        = 'Zgfr56gFe87jJOM'; // Will be generated by first start
let adapter;
let systemLanguage = 'en';

function startAdapter(options) {
    options = options || {};
	Object.assign(options, {
	    name:           adapterName, // adapter name
	    dirname:        __dirname,   // say own position
	    logTransporter: true,        // receive the logs
	    systemConfig:   true,
	    install:        callback => typeof callback === 'function' && callback()
	});

    adapter = new utils.Adapter(options);

    adapter.on('objectChange', (id, obj) => {
        if (obj) {
            //console.log('objectChange: ' + id);
            objects[id] = obj;

            if (id === 'system.config') {
                if (obj.common && obj.common.language) {
                    systemLanguage = obj.common.language;
                    webServer && webServer.setLanguage(systemLanguage);
                }
            }

            if (id === 'system.repositories' || id.match(/^system\.adapter\.[^.]+$/)) {
                adapter.updaterTimeout && clearTimeout(adapter.updaterTimeout);
                adapter.updaterTimeout = setTimeout(() => {
                    adapter.updaterTimeout = null;
                    writeUpdateInfo(adapter);
                }, 5000);
            }
        } else {
            //console.log('objectDeleted: ' + id);
            if (objects[id]) {
                delete objects[id];
            }
        }

        // TODO Build in some threshold of messages
        socket && socket.objectChange(id, obj);
    });

    adapter.on('stateChange', (id, state) => {
        socket && socket.stateChange(id, state);
    });

    adapter.on('ready', () => {
        adapter.getForeignObject('system.config', (err, obj) => {
            if (!err && obj) {
                obj.native = obj.native || {};
                if (obj.common && obj.common.language) {
                    systemLanguage = obj.common.language;
                }

                if (!obj.native.secret) {
                    require('crypto').randomBytes(24, (ex, buf) => {
                        adapter.config.secret = buf.toString('hex');
                        adapter.extendForeignObject('system.config', {native: {secret: adapter.config.secret}});
                        main(adapter);
                    });
                } else {
                    adapter.config.secret = obj.native.secret;
                    main(adapter);
                }
            } else {
                adapter.config.secret = secret;
                adapter.log.error('Cannot find object system.config');
            }
        });
    });

    adapter.on('message', obj => {
        if (!obj || !obj.message) {
            return false;
        }

        if (obj.command === 'autocomplete') {
            if (obj.callback) {
                adapter.sendTo(obj.from, obj.command, [{value: 1, label: 'first'}, {value: 2, label: 'second'}], obj.callback);
            }
            return;
        }

        socket && socket.sendCommand(obj);

        return true;
    });

    adapter.on('unload', callback => {
        // unsubscribe all
        socket && socket.unsubscribeAll();
        adapter.timerRepo && clearTimeout(adapter.timerRepo);
        adapter.timerRepo = null;

        adapter.timerNews && clearTimeout(adapter.timerNews);
        adapter.timerNews = null;

        adapter.ratingTimeout && clearTimeout(adapter.ratingTimeout);
        adapter.ratingTimeout = null;

        adapter.updaterTimeout && clearTimeout(adapter.updaterTimeout);
        adapter.updaterTimeout = null;

        try {
            adapter.log.info(`terminating http${adapter.config.secure ? 's' : ''} server on port ${adapter.config.port}`);
            webServer.close();
            callback();
        } catch (e) {
            callback();
        }
    });

// obj = {message: msg, severity: level, from: this.namespace, ts: (new Date()).getTime()}
    adapter.on('log', obj => socket && socket.sendLog(obj));

    return adapter;
}

function createUpdateInfo(adapter) {
    const promises = [];
    // create connected object and state
    let updatesNumberObj = objects[adapter.namespace + '.info.updatesNumber'];

    if (!updatesNumberObj || !updatesNumberObj.common || updatesNumberObj.common.type !== 'number') {
        let obj = {
            _id:  'info.updatesNumber',
            type: 'state',
            common: {
                role:  'indicator.updates',
                name:  'Number of adapters to update',
                type:  'number',
                read:  true,
                write: false,
                def:   0
            },
            native: {}
        };

        adapter.setObject(obj._id, obj);
    }

    let updatesListObj = objects[adapter.namespace + '.info.updatesList'];

    if (!updatesListObj || !updatesListObj.common || updatesListObj.common.type !== 'string') {
        let obj = {
            _id:  'info.updatesList',
            type: 'state',
            common: {
                role:  'indicator.updates',
                name:  'List of adapters to update',
                type:  'string',
                read:  true,
                write: false,
                def:   ''
            },
            native: {}
        };

        adapter.setObject(obj._id, obj);
    }

    let newUpdatesObj = objects[adapter.namespace + '.info.newUpdates'];

    if (!newUpdatesObj || !newUpdatesObj.common || newUpdatesObj.common.type !== 'boolean') {
        let obj = {
            _id:  'info.newUpdates',
            type: 'state',
            common: {
                role:  'indicator.updates',
                name:  'Indicator if new adapter updates are available',
                type:  'boolean',
                read:  true,
                write: false,
                def:   false
            },
            native: {}
        };

        promises.push(adapter.setObjectAsync(obj._id, obj));
    }

    let updatesJsonObj = objects[adapter.namespace + '.info.updatesJson'];

    if (!updatesJsonObj || !updatesJsonObj.common || updatesJsonObj.common.type !== 'string') {
        let obj = {
            _id:  'info.updatesJson',
            type: 'state',
            common: {
                role:  'indicator.updates',
                name:  'JSON string with adapter update information',
                type:  'string',
                read:  true,
                write: false,
                def:   '{}'
            },
            native: {}
        };

        promises.push(adapter.setObjectAsync(obj._id, obj));
    }

    let lastUpdateCheckObj = objects[adapter.namespace + '.info.lastUpdateCheck'];

    if (!lastUpdateCheckObj || !lastUpdateCheckObj.common || lastUpdateCheckObj.common.type !== 'number') {
        let obj = {
            _id:  'info.lastUpdateCheck',
            type: 'state',
            common: {
                role:  'value.time',
                name:  'Timestamp of last update check',
                type:  'number',
                read:  true,
                write: false,
                def:   ''
            },
            native: {}
        };

        promises.push(adapter.setObjectAsync(obj._id, obj));
    }

    return Promise.all(promises);
}

// Helper methods
function upToDate(v1, v2) {
    return semver.gt(v2, v1);
}

function writeUpdateInfo(adapter, sources) {
    if (!sources) {
        let obj = objects['system.repositories'];
        if (!objects['system.config'] || !objects['system.config'].common) {
            adapter.log.warn('Repository cannot be read. Invalid "system.config" object.');
            return;
        }

        const activeRepo = objects['system.config'].common.activeRepo;

        if (obj && obj.native && obj.native.repositories && obj.native.repositories[activeRepo] &&
            obj.native.repositories[activeRepo].json) {
            sources = obj.native.repositories[activeRepo].json;
        } else {
            adapter.setState('info.updatesNumber', 0, true);
            adapter.setState('info.updatesList',  '', true);
            adapter.setState('info.newUpdates', false, true);
            adapter.setState('info.updatesJson', '{}', true);
            adapter.setState('info.lastUpdateCheck', Date.now(), true);
            if (obj && obj.native && obj.native.repositories && obj.native.repositories[activeRepo]) {
                adapter.log.warn('Repository cannot be read');
            } else {
                adapter.log.warn('No repository source configured');
            }
            return;
        }
    }

    let installed = tools.getInstalledInfo();
    let list  = [];
    let updatesJson = {};
    let newUpdateIndicator = false;

    adapter.getState('info.updatesJson', (err, state) => {
        let oldUpdates;
        if (state && state.val) {
            oldUpdates = JSON.parse(state.val) || {};
        } else {
            oldUpdates = {};
        }

        Object.keys(sources).forEach(name => {
            try {
                if (installed[name] && installed[name].version && sources[name].version) {
                    if (sources[name].version !== installed[name].version &&
                        !upToDate(sources[name].version, installed[name].version)) {
                        // Check if updates are new or already known to user
                        if (!oldUpdates || !oldUpdates[name] || oldUpdates[name].availableVersion !== sources[name].version) {
                            newUpdateIndicator = true;
                        } // endIf
                        updatesJson[name] = {
                            availableVersion: sources[name].version,
                            installedVersion: installed[name].version
                        };
                        // remove first part of the name
                        const n = name.indexOf('.');
                        list.push(n === -1 ? name : name.substring(n + 1));
                    }
                }
            } catch (err) {
                adapter.log.warn(`Error on version check for ${name}: ${err}`);
            }
        });

        adapter.setState('info.updatesNumber', list.length, true);
        adapter.setState('info.updatesList', list.join(', '), true);
        adapter.setState('info.newUpdates', newUpdateIndicator, true);
        adapter.setState('info.updatesJson', JSON.stringify(updatesJson), true);
        adapter.setState('info.lastUpdateCheck', Date.now(), true);
    });
}

function initSocket(server, store, adapter) {
    socket = new SocketIO(server, adapter.config, adapter, objects, store);
    socket.subscribe(null, 'objectChange', '*');
}

function processTasks(adapter) {
    if (!adapter._running && adapter._tasks.length) {
        adapter._running = true;

        const obj = adapter._tasks.shift();
        if (!obj.acl || obj.acl.owner !== adapter.config.defaultUser) {
            obj.acl.owner = adapter.config.defaultUser;
            adapter.setForeignObject(obj._id, obj, err => setImmediate(() => {
                adapter._running = false;
                processTasks(adapter);
            }));
        } else {
            setImmediate(() => {
                adapter._running = false;
                processTasks(adapter);
            });
        }
    }
}

function applyRightsToObjects(adapter, pattern, types, cb) {
    if (typeof types === 'object') {
        let count = types.length;
        types.forEach(type => applyRightsToObjects(adapter, pattern, type, () => !--count && cb && cb()));
    } else {
        adapter.getObjectView('system', types, {startkey: pattern + '.', endkey: pattern + '.\u9999'}, (err, doc) => {
            adapter._tasks = adapter._tasks || [];

            if (!err && doc.rows.length) {
                for (let i = 0; i < doc.rows.length; i++) {
                    adapter._tasks.push(doc.rows[i].value);
                }
                processTasks(adapter);
            }
        });
    }
}

function applyRights(adapter) {
    const promises = [];
    adapter.config.accessAllowedConfigs = adapter.config.accessAllowedConfigs || [];
    adapter.config.accessAllowedTabs    = adapter.config.accessAllowedTabs || [];

    adapter.config.accessAllowedConfigs.forEach(id => promises.push(new Promise(resolve =>
        adapter.getForeignObject('system.adapter.' + id, (err, obj) => {
            if (obj && obj.acl && obj.acl.owner !== adapter.config.defaultUser) {
                obj.acl.owner = adapter.config.defaultUser;
                adapter.setForeignObject('system.adapter.' + id, obj, err => resolve(!err));
            } else {
                resolve(false);
            }
        }))));

    adapter.config.accessAllowedTabs.forEach(id => {
        if (id.startsWith('devices.')) {
            // change rights of all alias.*
            applyRightsToObjects(adapter, 'alias', ['state', 'channel']);
        } else if (id.startsWith('javascript.')) {
            // change rights of all script.js.*
            applyRightsToObjects(adapter, 'javascript', ['script', 'channel']);
        } else if (id.startsWith('fullcalendar.')) {
            // change rights of all fullcalendar.*
            applyRightsToObjects(adapter, 'fullcalendar', ['schedule']);
        } else if (id.startsWith('scenes.')) {
            // change rights of all scenes.*
            applyRightsToObjects(adapter, 'scenes', ['state', 'channel']);
        }
    });

    Promise.all(promises)
        .then(results => {
            const len = results.filter(r => !!r).length;
            len && adapter.log.info(`Updated ${len} objects`);
        });
}

// read news from server
function updateNews() {
    adapter.timerNews && clearTimeout(adapter.timerNews);
    adapter.timerNews = null;

    let oldEtag;
    let newNews;
    let oldNews;
    let originalOldNews;
    let newEtag;

    return adapter.getStateAsync('info.newsETag')
        .then(state => {
            oldEtag = state && state.val;
            return new Promise((resolve, reject) =>
                request('https://iobroker.live/repo/news-hash.json', (error, state, body) => {
                    if (!error && body) {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject('Cannot parse news');
                        }
                    } else {
                        reject(error || 'Cannot read news URL');
                    }
                }));
        }).then(etag => {
            if (etag && etag.hash !== oldEtag) {
                newEtag = etag.hash;
                return new Promise((resolve, reject) =>
                    request('https://iobroker.live/repo/news.json', (error, state, body) => {
                        if (!error && body) {
                            try {
                                resolve(JSON.parse(body));
                            } catch (e) {
                                reject('Cannot parse news');
                            }
                        } else {
                            reject(error || 'Cannot read news URL');
                        }
                    }));
            } else {
                newEtag = oldEtag;
                return Promise.resolve([]);
            }
        })
        .then(_newNews => {
            newNews = _newNews || [];
            return adapter.getStateAsync('info.newsFeed');
        })
        .then(state => {
            try {
                oldNews = state && state.val ? JSON.parse(state.val) : [];
            } catch (e) {
                oldNews = [];
            }
            originalOldNews = JSON.stringify(oldNews);

            return adapter.getStateAsync('info.newsLastId');
        })
        .then(lastState => {
            // add all IDs newer than last seen
            newNews.forEach(item => {
                if (!lastState || !lastState.val || item.created > lastState.val) {
                    if (!oldNews.find(it => it.created === item.created)) {
                        oldNews.push(item);
                    }
                }
            });

            oldNews.sort((a, b) => a.created > b.created ? -1 : (a.created < b.created ? 1 : 0));

            // delete news older than 3 months
            let i;
            for (i = oldNews.length - 1; i >= 0; i--) {
                if (Date.now() - new Date(oldNews[i].created).getTime() > 180 * 24 * 3600000) {
                    oldNews.splice(i, 1);
                }
            }

            if (originalOldNews !== JSON.stringify(oldNews)) {
                return adapter.setStateAsync('info.newsFeed', JSON.stringify(oldNews), true);
            } else {
                return Promise.resolve();
            }
        })
        .then(() =>
            newEtag !== oldEtag ?
                adapter.setStateAsync('info.newsETag', newEtag, true) :
                Promise.resolve() )
        .catch(e => adapter.log.error(`Cannot update news: ${e}`))
        .then(() =>
            adapter.timerNews = setTimeout(() => updateNews(), 24 * ONE_HOUR_MS + 1));
}

function updateRatings() {
    return new Promise(resolve => {
        request('https://rating.iobroker.net/rating?uuid=' + uuid, (error, status, body) => {
            if (body) {
                try {
                    body = JSON.parse(body);
                    adapter._ratings = body;
                } catch (e) {
                    adapter.log.error('Cannot parse ratings: ' + e);
                }
                if (!adapter._ratings || typeof adapter._ratings !== 'object' || Array.isArray(adapter._ratings)) {
                    adapter._ratings = {};
                }
                adapter._ratings.uuid = uuid;
                resolve(adapter._ratings);
            }

            adapter.ratingTimeout && clearTimeout(adapter.ratingTimeout);
            adapter.ratingTimeout = setTimeout(() => {
                adapter.ratingTimeout = null;
                updateRatings()
                    .then(() => adapter.log.info('Adapter rating updated'));
            }, 24 * 3600000);
        });
    });
}

function main(adapter) {
    // adapter.subscribeForeignStates('*');
    // adapter.subscribeForeignObjects('*');

    adapter.config.defaultUser = adapter.config.defaultUser || 'admin';
    if (!adapter.config.defaultUser.match(/^system\.user\./)) {
        adapter.config.defaultUser = 'system.user.' + adapter.config.defaultUser;
    }

    adapter._updateRatings = updateRatings;

    if (adapter.config.secure) {
        // Load certificates
        adapter.getCertificates((err, certificates, leConfig) => {
            adapter.config.certificates = certificates;
            adapter.config.leConfig     = leConfig;

            getData(adapter, adapter => webServer = new Web(adapter.config, adapter, initSocket, {systemLanguage}));
        });
    } else {
        getData(adapter, adapter => webServer = new Web(adapter.config, adapter, initSocket, {systemLanguage}));
    }

    if (adapter.config.accessApplyRights && adapter.config.accessLimit && !adapter.config.auth && adapter.config.defaultUser !== 'system.user.admin') {
        applyRights(adapter);
    }

    // By default update repository every 24 hours
    if (adapter.config.autoUpdate === undefined || adapter.config.autoUpdate === null) {
        adapter.config.autoUpdate = 24;
    }

    // interval in hours
    adapter.config.autoUpdate = parseInt(adapter.config.autoUpdate, 10) || 0;

    adapter.config.autoUpdate && updateRegister();

    adapter.getForeignObject('system.meta.uuid', async (err, obj) => {
        if (obj && obj.native) {
            uuid = obj.native.uuid;
            await updateRatings();
        }
    });

    updateNews();
    updateIcons();
    validateUserData0();
}
// create 0_userdata if it does not exist
function validateUserData0() {
    adapter.getForeignObject('0_userdata.0', (err, obj) => {
        if (!obj) {
            try {
                let io = fs.readFileSync(utils.controllerDir + '/io-package.json').toString('utf8');
                io = JSON.parse(io);
                if (io.objects) {
                    const userData = io.objects.find(obj => obj._id === '0_userdata.0');
                    if (userData) {
                        adapter.setForeignObject(userData._id, userData, err =>
                            adapter.log.info('Object 0_userdata.0 was re-created'));
                    }
                }
            } catch (e) {
                adapter.log.error(`Cannot read ${utils.controllerDir}/io-package.json: ${e}`);
            }
        }
    })
}

function getData(adapter, callback) {
    adapter.log.info('requesting all states');
    /*
    tasks++;

    adapter.getForeignStates('*', (err, res) => {
        adapter.log.info('received all states');
        states = res;
        !--tasks && callback && callback();
    });*/

    adapter.log.info('requesting all objects');

    adapter.getObjectList({include_docs: true}, (err, res) => {
        adapter.log.info('received all objects');
        if (res) {
            res = res.rows;
            objects = {};
            let tmpPath = '';
            for (let i = 0; i < res.length; i++) {
                objects[res[i].doc._id] = res[i].doc;
                if (res[i].doc.type === 'instance' && res[i].doc.common && res[i].doc.common.tmpPath) {
                    tmpPath && adapter.log.warn('tmpPath has multiple definitions!!');
                    tmpPath = res[i].doc.common.tmpPath;
                }
            }

            // Some adapters want access on specified tmp directory
            if (tmpPath) {
                adapter.config.tmpPath      = tmpPath;
                adapter.config.tmpPathAllow = true;
            }

            createUpdateInfo(adapter)
                .then(() => writeUpdateInfo(adapter));
        }

        callback && callback(adapter);
    });
}

// update icons by all known default objects. Remove this function after 2 years (BF: 2021.04.20)
function updateIcons() {
    if (fs.existsSync(utils.controllerDir + '/io-package.json')) {
        const ioPackage = require(utils.controllerDir + '/io-package.json');
        ioPackage.objects.forEach(async obj => {
            if (obj.common && obj.common.icon && obj.common.icon.length > 50) {
                const cObj = await adapter.getForeignObjectAsync(obj._id);
                if (cObj && (!cObj.common.icon || cObj.common.icon.length < 50)) {
                    adapter.log.debug('Update icon for ' + cObj._id);
                    cObj.common.icon = obj.common.icon;
                    await adapter.setForeignObjectAsync(cObj._id, cObj);
                }
            }
        });
    }
}

// read repository information from active repository
function updateRegister(isForce) {
    adapter.getForeignObject('system.config', (err, systemConfig) => {
        err && adapter.log.error('May not read "system.config"');

        if (systemConfig && systemConfig.common) {
            adapter.getForeignObject('system.repositories', (err, repos) => {
                err && adapter.log.error('May not read "system.repositories"');
                // Check if repositories exists
                let exists = false;
                const active = systemConfig.common.activeRepo;

                // if repo is valid and actual
                if (!err &&
                    repos &&
                    repos.native &&
                    repos.native.repositories &&
                    repos.native.repositories[active] &&
                    Date.now() < repos.ts + adapter.config.autoUpdate * ONE_HOUR_MS) {
                    exists = true;
                }

                if (!exists || isForce) {
                    adapter.log.info('Request actual repository...');
                    // request repo from host
                    adapter.sendToHost(adapter.host, 'getRepository', {
                        repo:   active,
                        update: true
                    }, _repository => {
                        if (_repository === ERROR_PERMISSION) {
                            adapter.log.error('May not read "getRepository"');
                        } else {
                            adapter.log.info('Repository received successfully.');

                            socket && socket.repoUpdated();
                        }

                        // start next cycle
                        if (adapter.config.autoUpdate) {
                            adapter.timerRepo && clearTimeout(adapter.timerRepo);
                            adapter.log.debug(`Next repo update on ${new Date(Date.now() + adapter.config.autoUpdate * ONE_HOUR_MS + 1).toLocaleString()}`);
                            adapter.timerRepo = setTimeout(() => {
                                adapter.timerRepo = null;
                                updateRegister();
                            }, adapter.config.autoUpdate * ONE_HOUR_MS + 1);
                        }
                    });
                } else if (adapter.config.autoUpdate) {
                    const interval = repos.ts + adapter.config.autoUpdate * ONE_HOUR_MS - Date.now() + 1;
                    adapter.log.debug(`Next repo update on ${new Date(Date.now() + interval).toLocaleString()}`);
                    adapter.timerRepo && clearTimeout(adapter.timerRepo);
                    adapter.timerRepo = setTimeout(() => {
                        adapter.timerRepo = null;
                        updateRegister();
                    }, interval);
                }
            });
        }
    });
}

// If started as allInOne mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
