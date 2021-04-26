const inventory = require('@architect/inventory');
const pkg = require('@architect/package');
const Bundler = require('parcel-bundler');
const fs = require('fs-extra');
const { join } = require('path');
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
        await fs.mkdirp(appPluginDir);
        await fs.copy(join(sampleDir, 'app.arc'), join(appDir, 'app.arc'));
        await fs.copy(join(__dirname, '..', 'index.js'), join(appPluginDir, 'index.js'));
        await fs.copy(join(__dirname, '..', 'run-parcel.js'), join(appPluginDir, 'run-parcel.js'));
        process.chdir(appDir);
        origInv = await inventory({});
        origArc = origInv.inv._project.arc;
    });
    afterAll(async () => {
        process.chdir(originalCwd);
        await fs.remove(appDir);
    });
    beforeEach(() => {
        inv = origInv;
        arc = origArc;
    });
    describe('cloudformation packaging', () => {
        beforeEach(() => {
            spyOn(Bundler.prototype, 'bundle').and.resolveTo(true);
            spyOn(fs, 'copySync');
        });
        it('changes the code uri from a `src/` path to a `dist` path', async () => {
            const cloudformation = pkg(inv);
            const result = await plugin.package({ arc, cloudformation, inventory: inv });
            const code = result.Resources.FooEventLambda.Properties.CodeUri;
            const expected = join('dist', 'events', 'foo');
            expect(code).toContain(expected);
        });
    });
});
