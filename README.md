# karma-module-resolver-preprocessor
[Karma](http://karma-runner.github.io) preprocessor to resolve ES6 modules.

## The problem
Starting version *unreleased* Karma properly supports ES6 modules when running in a suitable environment. Browsers module implementation is limited however to local modules (i.e. `./foo.js`) and browsers will not resolve path missing extension leaving that to the server.

This preprocessor solves both problems by rewriting import declarations in files on the fly and replacing aliased with relative paths as well as adding extensions if necessary.

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
			'test/**/*.js': ['module-resolver'],
			'alias-root/**/*.js': ['module-resolver']
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

### `aliases`

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

### `customResolver`
Default value: `null`

A function to be called instead of normal rewriting.

Takes two arguments:
* A string containing imported file path,
* File object for currently processed file containing some meta information, see [karma preprocessor documentation](http://karma-runner.github.io/3.0/dev/plugins.html)

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
