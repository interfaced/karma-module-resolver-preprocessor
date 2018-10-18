# karma-module-resolver-preprocessor
[Karma](http://karma-runner.github.io) preprocessor to resolve ES6 modules.

## The problem
Karma can natively run ES6 modules when using a suitable environment (a modern browser). Browsers module implementation is limited however to local modules (i.e. `./foo.js`) and browsers will not resolve paths missing extension leaving that to the server.

This preprocessor solves both problems by rewriting import declarations on the fly and replacing aliased path with relative ones as well as adding extensions if necessary allowing for native ES6 modules testing without compiling or bundling.

## Installation
```bash
npm install karma-module-resolver-preprocessor --save-dev
```

## Configuration
Preprocessor is configured with `moduleResolverPreprocessor` field:
```js
// karma.conf.js
module.exports = (config) => {
	config.set({
		files: [
			{type: 'module', pattern: 'test/**/*.js'},
			{type: 'module', pattern: 'alias-root/**/*.js'}
		],
		preprocessors: {
			'test/**/*.js': ['module-resolver']
		},
		moduleResolverPreprocessor: {
			addExtension: 'js',
			customResolver: null,
			aliases: {}
		}
	});
};
```

### Options
#### `addExtension`
Default value: `'js'`

Extension to be added to import path if it's not already present. Leave falsy (`undefined`, `null` or `''`) not to add any extensions.

Example: 
```js
// Given
import Foo from './foo';
import Bar from 'alias/bar';

// Rewrites to
import Foo from './foo.js';
import Bar from 'alias/bar.js';
```

#### `aliases`

Default value: `{}`

A hash map containing alias names and paths relative from karma `basePath`.

Example: 
```js
// karma.conf.js
	aliases: {
		'alias': 'alias-root'
	}
```
```js
// Given
import Foo from 'alias/foo';

// Rewrites to
import Foo from '../relative/from/current/file/alias-root/foo';
```

#### `customResolver`
Default value: `null`

A function to be called instead of normal rewriting.

Takes a single argument: A string containing imported file path.

Return value: string.

Example: 
```js
// karma.conf.js
	customResolver: (path) => `http://example.com/${path}`
```
```js
// Given
import Foo from 'foo';

// Rewrites to
import Foo from 'http://example.com/foo';
```

## Karma module support
As of version 3.0.0 Karma has limited support of modules: It can integrated it, but there's [a bug](https://github.com/karma-runner/karma/issues/2955) preventing tests described in modules from running. It is fixed in develop branch, but there's no release with the fix and no information on when it's going to be available.

There are some workarounds for the issue: Using `customContextFile` to substitute 3.0.0 `context.html` with a newer one and delaying `__karma__.loaded` call until DOM `load` event, see Karma GitHub for details.
