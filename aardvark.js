var cp = require('child_process'),
	fs = require('fs'),
	path = require('path'),

	TS_TIME_TO_EXEC = 'Time to exec',

	ADVK_CONFIG_FILE = '.advk.json',

	cwd = process.cwd();

console.time(TS_TIME_TO_EXEC);

function NO_OP() {}

function isExistingDirectory(dir, callback) {
	fs.exists(dir, function(dirExists) {
		if (!dirExists) {
			callback(null, false);
			return;
		}

		fs.stat(dir, function(err, stats) {
			if (err) {
				callback(err);
			} else {
				callback(null, stats.isDirectory());
			}
		});
	});
}

function findProperties(dir, callback) {
	var propsFile = path.join(dir, ADVK_CONFIG_FILE);

	function next() {
		var parentDir = path.join(dir, '../');
		if (parentDir === dir) {
			callback('No .advk.json file found in the folder hierarchy');
		} else {
			findProperties(parentDir, callback);
		}
	}

	fs.exists(propsFile, function(exists) {
		if (!exists) {
			return next();
		}

		fs.readFile(propsFile, { encoding: 'utf8' }, function(err, contents) {
			var properties;

			if (err) {
				return callback(err);
			}

			try {
				properties = JSON.parse(contents);
				properties.taskRunnerDir = path.resolve(dir, properties.taskRunnerDir);

				callback(null, properties);
			} catch(e) {
				callback(e);
			}
		});
	});
}

// Inspired by https://github.com/caolan/async
function all(fns, callback) {
	var completed = 0,
		total = fns.length,
		results = [];

	function done(index, err, result) {
		if (err) {
			callback(err);
			callback = NO_OP;
		} else {
			completed += 1;
			results[index] = result;

			if (completed >= total) {
				callback(null, results);
				callback = NO_OP;
			}
		}
	}

	fns.forEach(function(fn, index) {
		fn(done.bind(null, index));
	});
}

function statFile(file) {
	return function(callback) {
		fs.stat(file, callback);
	};
}

function ensureDependencies(taskRunnerDir, callback) {
	var nodeModulesDir = path.join(taskRunnerDir, 'node_modules');

	fs.exists(nodeModulesDir, function(exists) {
		if (!exists) {
			return npmInstall(taskRunnerDir, callback);
		}

		all([
			statFile(nodeModulesDir),
			statFile(path.join(taskRunnerDir, 'package.json'))
		], function(err, stats) {
			if (err) {
				return callback(err);
			}

			var nodeModulesStats = stats[0],
				packageJsonStats = stats[1];

			if (!nodeModulesStats.isDirectory()) {
				return callback(nodeModulesDir + ' is not a directory!');
			}

			if (packageJsonStats.mtime.getTime() > nodeModulesStats.mtime.getTime()) {
				npmInstall(taskRunnerDir, callback);
			} else {
				callback();
			}
		});
	});
}

function exec(cmd, args, cwd, callback) {
	var execCmd = cmd,
		opts = {
			cwd: cwd,
			stdio: 'inherit'
		};

	if (process.platform === 'win32') {
		execCmd = 'cmd';
		args = ['/c', '"' + cmd + '"'].concat(args);
		opts.windowsVerbatimArguments = true;
	}

	cp.spawn(execCmd, args, opts)
		.on('exit', callback);
}

function npmInstall(taskRunnerDir, callback) {
	exec('npm', ['install'/*, '--production'*/], taskRunnerDir, function(code) {
		callback(code ? ('npm install exited with code ' + code) : null);
	});
}

function logAndExit(err) {
	console.error(err);
	process.exit(1);
}

function execTaskRunner(properties) {
	var args = [properties.workingDirArg, cwd].concat(process.argv.slice(2)),
		taskRunnerDir = properties.taskRunnerDir;

	console.timeEnd(TS_TIME_TO_EXEC);

	exec(path.join(taskRunnerDir, 'node_modules', '.bin', properties.taskRunnerBin), args, taskRunnerDir, function(code) {
		if (code) {
			logAndExit(properties.taskRunnerBin + ' process exited with code ' + code);
		}
	});
}

findProperties(cwd, function(err, properties) {
	if (err) {
		return logAndExit(err);
	}

	isExistingDirectory(properties.taskRunnerDir, function(err, exists) {
		if (err || !exists) {
			return logAndExit(err || 'Specified taskRunnerDir "' + properties.taskRunnerDir + '" not found.');
		}

		ensureDependencies(properties.taskRunnerDir, function(err) {
			if (err) {
				return logAndExit(err);
			}

			execTaskRunner(properties);
		});
	});
});
