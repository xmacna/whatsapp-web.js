'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const EventEmitter = require('node:events');
const { exposeFunctionIfAbsent } = require('../src/util/Puppeteer');

function loadBrowserModule(relativePath, window) {
    const context = { window, exports: {}, module: { exports: {} }, require: name => name === 'events' ? EventEmitter : {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), context, { filename: relativePath });
    return context;
}

test('existing page binding is preserved', async () => {
    let calls = 0;
    await exposeFunctionIfAbsent({ evaluate: async () => true, exposeFunction: async () => { calls++; } }, 'event', () => {});
    assert.equal(calls, 0);
});

test('cleared page context replaces a stale CDP binding exactly once', async () => {
    const events = [];
    const fn = () => {};
    const page = {
        evaluate: async () => false,
        exposeFunction: async (name, callback) => {
            assert.equal(callback, fn);
            events.push(['expose', name]);
            if (events.length === 1) throw new Error('Function already exists');
        },
        removeExposedFunction: async name => { events.push(['remove', name]); }
    };
    await exposeFunctionIfAbsent(page, 'event', fn);
    assert.deepEqual(events, [['expose', 'event'], ['remove', 'event'], ['expose', 'event']]);
});

test('navigation during exposure is retried by the next lifecycle instead of crashing', async () => {
    await exposeFunctionIfAbsent({ evaluate: async () => false, exposeFunction: async () => { throw new Error('Execution context was destroyed'); } }, 'event', () => {});
});

test('unrelated exposure failures still propagate', async () => {
    await assert.rejects(exposeFunctionIfAbsent({ evaluate: async () => false, exposeFunction: async () => { throw new Error('permission denied'); } }, 'event', () => {}), /permission denied/);
});

test('Store falls back to moved collections and tolerates absent optional pushname module', async () => {
    const chat = { get: id => id === 'known' ? { id } : undefined };
    const msg = {};
    const state = {};
    const conn = {};
    const modules = {
        WAWebL10N: { getRegion: () => 'BR' }, WAWebCollections: {}, WAWebChatCollection: { Chat: chat }, WAWebMsgCollection: { Msg: msg },
        WAWebAppStateModel: { AppState: state }, WAWebConnCollection: { Conn: conn }
    };
    const window = { require: name => {
        if (['WAWebSocketModel', 'WAWebConnModel', 'WAWebSetPushnameConnAction'].includes(name)) throw new Error('module unavailable');
        return modules[name] || {};
    } };
    loadBrowserModule('src/util/Injected/Store.js', window).exports.ExposeStore();
    assert.equal(window.Store.Chat, chat);
    assert.equal(window.Store.Msg, msg);
    assert.equal(window.Store.AppState, state);
    assert.equal(window.Store.Conn, conn);
    assert.equal(window.Store.Settings.setPushname, undefined);
    assert.equal((await window.Store.Chat.findImpl('known')).id, 'known');
    assert.equal((await window.Store.Chat.findImpl('missing')).id, 'missing');
});

test('Store preserves a supported pushname implementation', () => {
    const setPushname = () => {};
    const window = { require: name => name === 'WAWebSetPushnameConnAction' ? { setPushname } : name === 'WAWebL10N' ? { getRegion: () => 'BR' } : {} };
    loadBrowserModule('src/util/Injected/Store.js', window).exports.ExposeStore();
    assert.equal(window.Store.Settings.setPushname, setPushname);
});

for (const legacy of [false, true]) {
    test(`sendSeen supports ${legacy ? 'legacy fallback' : 'current signature'}`, async () => {
        const chat = { id: 'chat' };
        const calls = [];
        const presence = [];
        const window = { Store: {
            WAWebStreamModel: { Stream: { markAvailable: () => presence.push('available'), markUnavailable: () => presence.push('unavailable') } },
            SendSeen: { sendSeen: async input => {
                calls.push(input);
                if (legacy && input !== chat) throw new Error('unsupported signature');
            } }
        } };
        loadBrowserModule('src/util/Injected/Utils.js', window).exports.LoadUtils();
        window.WWebJS.getChat = async () => chat;
        assert.equal(await window.WWebJS.sendSeen('chat'), true);
        assert.equal(calls[0].chat, chat);
        assert.equal(calls.length, legacy ? 2 : 1);
        if (legacy) assert.equal(calls[1], chat);
        assert.deepEqual(presence, ['available', 'unavailable']);
    });
}

test('setDisplayName reports unsupported capability without calling an absent module', async () => {
    const window = { Store: { Settings: {}, Conn: { canSetMyPushname: () => true } } };
    const Client = loadBrowserModule('src/Client.js', window).module.exports;
    assert.equal(await Client.prototype.setDisplayName.call({ pupPage: { evaluate: (fn, ...args) => fn(...args) } }, 'test'), false);
});

test('setDisplayName retains the supported behavior', async () => {
    const names = [];
    const window = { Store: { Settings: { setPushname: async name => { names.push(name); } }, Conn: { canSetMyPushname: () => true } } };
    const Client = loadBrowserModule('src/Client.js', window).module.exports;
    assert.equal(await Client.prototype.setDisplayName.call({ pupPage: { evaluate: (fn, ...args) => fn(...args) } }, 'test'), true);
    assert.deepEqual(names, ['test']);
});
