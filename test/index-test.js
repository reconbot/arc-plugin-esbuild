const parse = require('@architect/parser');
const inventory = require('@architect/inventory');
const pkg = require('@architect/package');
const Bundler = require('parcel-bundler');
const fs = require('fs-extra');
const { join } = require('path');
const plugin = require('..');

const arcfile = `
@app
myapp

@src
dist

@events
foo
`;
const arc = parse(arcfile);
let inv = null;
let cfn = null;

describe('plugin-parcel', () => {
    beforeEach(async () => {
        spyOn(Bundler.prototype, 'bundle').and.resolveTo(true);
        spyOn(fs, 'copySync');
        inv = await inventory({ rawArc: arcfile });
        cfn = pkg(inv);
    });
    it('changes the code uri from a `src/` path to a `dist` path', async () => {
        const result = await plugin(arc, cfn, 'staging', inv);
        const code = result.Resources.FooEventLambda.Properties.CodeUri;
        const expected = join('dist', 'events', 'foo');
        expect(code).toContain(expected);
    });
});
