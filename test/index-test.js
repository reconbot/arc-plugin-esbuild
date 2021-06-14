const inventory = require('@architect/inventory');
const pkg = require('@architect/package');
const Bundler = require('parcel-bundler');
const fse = require('fs-extra');
const fs = require('fs');
const { join } = require('path');
const glob = require('glob');
const plugin = require('..');
const sampleDir = join(__dirname, '..', 'sample-app');
const appDir = join(__dirname, 'tmp');
const originalCwd = process.cwd();

describe('plugin-parcel', () => {
    let inv = {};
    let origInv = {};
    let arc = {};
    let origArc = {};
    beforeAll(async () => {
        // Set up integration test directory as a copy of sample app
        const appPluginDir = join(appDir, 'node_modules', '@copper', 'plugin-parcel');
        await fse.mkdirp(appPluginDir);
        await fse.copy(join(sampleDir, 'app.arc'), join(appDir, 'app.arc'));
        await fse.mkdirp(join(appDir, 'src', 'http'));
        await fse.mkdirp(join(appDir, 'src', 'events'));
        await fse.copy(join(sampleDir, 'src', 'http'), join(appDir, 'src', 'http'));
        await fse.copy(join(sampleDir, 'src', 'events'), join(appDir, 'src', 'events'));
        await fse.copy(join(__dirname, '..', 'index.js'), join(appPluginDir, 'index.js'));
        await fse.copy(join(__dirname, '..', 'run-parcel.js'), join(appPluginDir, 'run-parcel.js'));
        process.chdir(appDir);
        origInv = await inventory({});
        origArc = origInv.inv._project.arc;
    });
    afterAll(async () => {
        process.chdir(originalCwd);
        await fse.remove(appDir);
    });
    beforeEach(() => {
        inv = origInv;
        arc = origArc;
    });
    describe('cloudformation packaging', () => {
        beforeEach(() => {
            spyOn(Bundler.prototype, 'bundle').and.resolveTo(true);
            spyOn(fse, 'copySync');
        });
        it('changes the code uri from a `src/` path to a `dist` path', async () => {
            const cloudformation = pkg(inv);
            const result = await plugin.package({ arc, cloudformation, inventory: inv });
            const code = result.Resources.FooEventLambda.Properties.CodeUri;
            const expected = join('dist', 'events', 'foo');
            expect(code).toContain(expected);
        });
    });
    describe('sandbox integration', () => {
        beforeAll(() => {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
        });
        afterAll(() => {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
        });
        it('compiles function typescript code into JS on startup and removes compiled JS on shutdown', (done) => {
            plugin.sandbox.start({ arc }, (err) => {
                expect(err).toBeUndefined();
                const jsFiles = glob.sync('./src/**/*.js', { ignore: './src/**/node_modules/**' });
                expect(jsFiles).toContain('./src/events/foo/index.js');
                expect(jsFiles).toContain('./src/http/get-hi/index.js');
                expect(jsFiles).toContain('./src/http/get-index/index.js');
                plugin.sandbox.end().then(() => {
                    jsFiles.forEach((f) => {
                        expect(fs.existsSync(f)).toBeFalse();
                    });
                    done();
                });
            });
        });
    });
});
