# karma-module-resolver-preprocessor
[Karma](http://karma-runner.github.io) preprocessor to resolve ES6 modules.

## The problem
Starting version `3.1.0` Karma can natively run ES6 modules when running in a suitable environment (a modern browser). Browsers module implementation is limited however to local modules (i.e. `./foo.js`) and browsers will not resolve paths missing extension leaving that to the server.

This preprocessor solves both problems by rewriting import declarations on the fly and replacing aliased paths with absolute ones as well as adding extensions if necessary allowing for native ES6 modules testing without compiling or bundling.


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
			{type: 'module', pattern: './test/**/*.js'},
			{type: 'module', pattern: './project/**/*.js'}
		],
		preprocessors: {
			'test/**/*.js': ['module-resolver']
		},
		moduleResolverPreprocessor: {
			addExtension: 'js',
			customResolver: null,
			ecmaVersion: 6,
			aliases: {
				project: "./project"
			}
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

A hash map containing alias names and paths relative to Karma `basePath`.

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
import Foo from '/absolute/Path/To/alias-root/foo';
```

Note `/absolute/` prefix. This is the web route Karma adds to all urls leading to absolute files. It is important to keep it to avoid referencing same file with different urls. 

#### `customResolver`
Default value: `null`

A function to be called instead of normal rewriting.

Takes a single argument: A string containing imported file path.

Return value: string, a new file path.

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

#### `ecmaVersion`

Default value: `6`

ECMAScript version as accepted by [espree](https://github.com/eslint/espree), e.g. `6`, `9`, `2015`, `2018`.
