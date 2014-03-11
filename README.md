Aardvark (advk)
===============

Lightweight abstraction for executing task runners like Grunt, Gulp, etc.

### Install

Install the `advk` CLI globally:

```
$ npm install -g advk
```

### Usage

Create a `.advk.json` file in your project directory (or once of its ancestors) to tell Aardvark where to find your task runner and how to execute it.

```json
{
    "targetDir": "path/to/gruntjs",
    "bin": "grunt",
    "workingDirProperty": "--cwd"
}
```

- **targetDir** - path to the task runner. This is where your `Gruntfile.js`, `gulpfile.js`, etc lives; at the very least should contain a `package.json`. Aardvark will perform an `npm install` in this directory if necessary.
- **bin** - the name of the bin file for the task runner e.g. `grunt`, `gulp`, etc.
- **workingDirProperty** - name of the property to specify the working directory to run the tasks on (i.e. the directory you ran `advk` from)

Execute `advk` in the directory you want to run tasks on, all arguments are passed through to the relevant task runner.

```
$ advk build test
```

For example, given the `.advk.json` file above (in the `~/Projects` dir) and running `advk build test` in `~/Projects/example` will result in Aardvark performing roughly the following operations:

```
$ cd ~/Projects/path/to/gruntjs
$ npm install
$ node_modules/.bin/grunt --cwd ~/Projects/example build test
```

## License

Copyright (c) 2014 Orion Health MIT License (enclosed)
