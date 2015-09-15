// set encoding to utf8
process.stdout.setEncoding('utf8');

var async = require('async');
var colors = require('chalk');
var pkg = require('./package');

/**
 * Log boxes
 *
 * @param {*} parent - a parent box, a line or options
 * @param opt
 * @constructor
 */
function Log(parent, opt){
	// generate id (timestr+rand)
	this.id = (new Date().getTime()).toString(36)+((Math.random().toString(36).substr(2, 5)));

	this.options(opt);

	this.lines = [];
	this.parent = null;
	this.level = 0;
	this.colors = colors;

	// make color function accessible
	this.col = Log.col;

	// is direct log
	if(this._instanceof(parent)){
		this.parent = parent;
		this.level = parent && parent.level ? parent.level+1 : 1;
	}
	else if(parent !== undefined){
		this.line(parent);
	}

	this.timer = {
		_: new Date().getTime(),
		_calls: {}
	};
}

//─── Static methods ──────────────────────────────────────────────────

/**
 * Color[color] shortcut
 *
 * @param {String} str - the text
 * @param {...String} cmd - the color or action (red, bold...)
 * @returns {*}
 */
Log.col = function(str, cmd){
	var cmds = Array.prototype.slice.call(arguments, 1);

	// convert 2 str
	if(typeof str != 'string')
		str += '';

	var res = str;

	switch(cmd){
		// rainbow
		// using the first 5 colors of Log.chalkColors
		case 'rainbow':
			var cols = Log.chalkColors.slice(0, 5);
			return str.split('').map(function(char, i){
				return colors[cols[i % cols.length]](char);
			}).join('');
		break;

		// zebra
		// using white, then bgWhite & black
		case 'zebra':
			return str.split('').map(function(char, i){
				return i % 2 ? colors.white(char) : colors.bgWhite.black.dim(char);
			}).join('');
		break;

		case 'code':
			return colors.bgBlue.white(str.split('').map(function(char){
				if('.,:;=()[]{}+-*|"/\''.indexOf(char) > -1)
					return colors.grey(char);
				return char;
			}).join(''));
		break;
	}

	// add attributes
	cmds.forEach(function(cmd){
		res = colors[cmd](res);
	});

	return res;
};

/**
 * Copies all properties from the source to the destination object.
 * Source: Prototype.js
 *
 * @param {Object} destination
 * @param {Object} source
 * @returns {*}
 */
Log.extend = function(destination, source){
	for (var property in source)
		destination[property] = source[property];
	return destination;
};

/**
 * Truncate string containing ansi color codes
 * (not in use)
 *
 * Source:
 * http://stackoverflow.com/questions/26238553
 *
 * @param {String} str
 * @param {Number} len
 * @param {String} [postfix]
 * @returns {String}
 */
//Log.truncateAnsi = function(str, len, postfix){
//	// default postfix
//	if(!postfix) postfix = '…';
//
//	// substract postfix from length
//	len -= postfix.length;
//
//	if (!len || len < 10) return str; // probably not a valid console -- send back the whole line
//	var count = 0,        // number of visible chars on line so far
//	    esc = false,      // in an escape sequence
//	    longesc = false;  // in a multi-character escape sequence
//	var outp = true;      // should output this character
//	var arr = str.split('');
//	var res = arr.filter(function(c){ // filter characters...
//		if (esc && !longesc && c == '[') longesc = true; // have seen an escape, now '[', start multi-char escape
//		if (c == '\x1b') esc = true; // start of escape sequence
//
//		outp = (count < len || esc); // if length exceeded, don't output non-escape chars
//		if (!esc && !longesc) count++; // if not in escape, count visible char
//
//		if (esc && !longesc && c != '\x1b') esc = false; // out of single char escape
//		if (longesc && c != '[' && c >= '@' && c <= '~') {esc=false; longesc=false;} // end of multi-char escape
//
//		return outp; // result for filter
//	});
//
//	if(arr.length == res.length)
//		return res.join('');
//
//	return res.slice(0, res.length-7).join('') + "\x1b[0m" + postfix;
//};

/**
 * Truncate string
 *
 * @param {String} str
 * @param {Number} length
 * @param {String} [postfix]
 * @returns {String}
 */
Log.truncate = function(str, length, postfix){
	// convert 2 string
	str = str+'';
	var plain = Log.strip(str);

	// no action required
	if(plain.length <= length)
		return str;

	// default postfix
	if(!postfix) postfix = '…';

	// substract postfix from length
	length -= postfix.length;

	// return empty
	if(length < 0)
		return '';

	return str.substring(str, length)+postfix;
};

/**
 * Uppercase first character
 * @param {String} str
 * @returns {String}
 */
Log.capitalize = function(str){
	return str.substr(0,1).toUpperCase()+str.substr(1);
};

/**
 * Pad a str
 *
 * Use in two ways:
 * .pad('-', 5)           = '-----'
 * .pad('.', 'Hello', 7)  = 'Hello..'
 *
 * @param {String} padSymbol
 * @param {Number|String} length
 * @param {Number} [max]
 * @returns {String}
 */
Log.pad = function(padSymbol, length, max){
	var out = '';

	if(typeof length == 'string'){
		while(length.length < max){
			length += padSymbol;
		}
		return length;
	}
	for(var i = 0; i < length; i += padSymbol.length){
		out += padSymbol;
	}

	return out;
};

/**
 * Format str in printf style as console does
 * Slightly edited version of the original node utils.format
 *
 * @param f
 * @returns {*}
 */
Log.format = function(f) {
	var args = Array.prototype.slice.call(arguments);
	if(args.length === 1) return args;

	var i = 1;
	var len = args.length;
	var str = String(f).replace(/%[sdj%]/g, function(x){
		if(x === '%%') return '%';
		if(i >= len) return x;

		switch (x) {
			case '%s': return String(args[i++]);
			case '%d': return Number(args[i++]);
			case '%j':
				try {
					return JSON.stringify(args[i++]);
				} catch (_) {
					return '[Circular]';
				}
			// falls through
			default:
				return x;
		}
	});

	// formatting happened
	if(str != args[0]){
		// use result
		args[0] = str;
		// remove formatting argument
		args.splice(1, 1);
	}

	return args;
};

/**
 * Check if script is run from terminal
 *
 * @returns {boolean}
 */
Log.isTerminalConsole = function(){
	return module && module.parent && (module.parent.id+'') == 'repl';
};

/**
 * Parse keywords / add colors
 *
 * @param word
 * @returns {String}
 * @private
 */
Log.parseWord = function(word){
	// basic types
	if(word === null)
		word = colors.grey.italic('null');
	else if(word === undefined)
		word = colors.red('undefined');
	else if(word === true)
		word = colors.green.bold('true');
	else if(word === false)
		word = colors.bold.red('false');
	else if(word === pkg.name){
		var l = word.split('');
		word = colors.bold(
			colors.red(l[0])
			+ colors.magenta([l[1]])
			+ colors.blue([l[2]])
			+ colors.cyan([l[3]])
			+ colors.green(l[4])
			+ colors.yellow(l[5])
			+ colors.red(l[6])
			+ colors.white(l[7])
		);
	}
	else if(typeof word == 'number')
		word = colors.cyan(word+'');
	else {
		var s = word.toString();
		switch(s){
//			case 'function (){}': s = colors.yellow(s); break;
			default: s = null;
		}

		if(s)
			word = s;
	}

	return word;
};

/**
 * Wrap text
 *
 * @param {String} str
 * @param {Number} length
 * @returns {*}
 */
Log.wrap = function(str, length){
	var linewrap = require('linewrap');

	return linewrap(length, {
		skipScheme:'ansi-color',
		repectLineBreaks: 'multi',
		tabWidth: 3
	})(str);
};

/**
 * Get stdout columns
 *
 * @returns {number}
 * @private
 */
Log.getTerminalWidth = function(){
	return process.stdout.columns-1 || 100;
};

/**
 * Pluralize a string, poor mans function
 *
 * @param nr
 * @param str
 * @returns {string}
 */
Log.plural = function(nr, str){
	var i = parseFloat(nr);
	nr = typeof nr == 'number' ? nr.toFixed(0) : nr;

	return str.replace('%s', Log.col(nr, 'cyan')) + (i !== 1 ? 's' : '');
};

// clone console
Log.console = Log.extend({}, console);

// color names
Log.chalkColors = ['cyan','green','yellow','red','magenta','blue','white','grey','black'];
Log.chalkCommands = ['reset','bold','dim','italic','underline','inverse','hidden','strikethrough'];

// shortcuts
Log.strip = colors.stripColor;


//─── Dynamic methods ──────────────────────────────────────────────────

/**
 * Override the console with this
 *
 * @returns {Log}
 */
Log.prototype.overrideConsole = function(){
	// im a dirty little whore
	if(console instanceof Log)
		return this.warn('Console already overwritten');

	if(Log.isTerminalConsole()){
		// disable 'undefined' console messages
		process.stdin.emit('data', "module.exports.repl.ignoreUndefined = true;\n");
	}

	// copy original console
	this.opt.console = Log.console;

	// override console
	console = Log.extend(console, this);

	// finish
	return this;
};

/**
 * Set options
 *
 * @param opt
 * @returns {Log}
 */
Log.prototype.options = function(opt){
	// default options
	opt = Log.extend({
		override:   true,
		console:    this.parent ? this.parent.opt.console : Log.console,
		border:     typeof opt == 'number' ? opt : 1,
		color:      typeof opt == 'string' ? opt : 'grey',
		colorText:  typeof opt == 'string' ? opt : 'grey',
		disableNewline: false,
		disableAutoOut: true
	}, opt||{});

	this.opt = opt;

	return this;
};

/**
 * Create a new box
 *
 * @param [line]
 * @param [opt]
 * @returns {Log}
 */
Log.prototype.box = function(line, opt){
	var box = new Log(this, opt||{});

	// auto add 1st line when given

	if(line){
		box.line(line);
	}

	// add box to myself
	this.line(box);

	return box;
};

/**
 * Display help
 */
Log.prototype.help = function(){
	// title
	this
		._(pkg.name, colors.grey('─ v'+pkg.version))
		._('---').line(colors.grey(pkg.repository.url))
		.$();

	// desc
	this
		._('Description', 'bold')
		._('---')
		._(pkg.description)
		.$();

	// install
	this
		._('Installation', 'white')
		.title('npm install --save console2');
	this.$();

	// reference
	var ref = this
		._('Reference', 'white')
		._('Open README.md for complete reference')
		._()
		.box();

	// reference
	var lineArgs = '['+Log.col('line', 'white')+'], ['+Log.col('option', 'white')+']';
	var docs = {
		$: '~out',
		beep: ['Beep noise, outputs "BEEP"', '['+Log.col('title', 'white')+']'],
		box: ['Create a sub box', lineArgs],
		col: ['Colorize a string', Log.col('input', 'white')+', {...'+Log.col('color', 'white')+'}'],
		dir: '~log',
		error: ['Displays text in '+Log.col('red','red'), lineArgs],
		flush: '~out',
		getParent: ['Return a specific parent box', '['+Log.col('generations', 'white')+'=1]'],
		help: 'Display these information',
		info: ['Displays text in '+Log.col('green','green'), lineArgs],
		line: ['Add a new line', lineArgs],
		log: ['Alias for .line AND .out', lineArgs],
		options: ['Set option/s', Log.col('object', 'white')],
		out: 'Print current stack',
		time: ['Display timer', '['+Log.col('timerName', 'white')+'], ['+Log.col('reset', 'white')+']'],
		timeEnd: '~time',
		title: ['Display text inside a box', lineArgs],
		trace: ['Beautified console.trace', '['+Log.col('message')+']'],
		warn: ['Displays text in '+Log.col('yellow','yellow'), lineArgs]
	};

	// insert docs
	Object.keys(this).sort().forEach(function(key){
		if(key.substr(0,1)=='_'
			|| ['Console','assert','overrideConsole'].indexOf(key) > -1
			|| typeof this[key] != 'function') return;
		var doc = docs[key];
		var line = Log.col(key, 'cyan')
						 + '('+(Array.isArray(doc) ? doc[1] : '')+')';

		// alias
		if(typeof doc == 'string' && doc.substr(0,1) == '~')
			doc = 'Alias for '+doc.substr(1);

		// add desc
		line += Log.pad(' ', 35 - Log.strip(line).length)
			+ ' - '
			+ (Array.isArray(doc) ? doc[0] : doc);

		ref._(line);
	}.bind(this));

	this.$();

	/**
	 * Example 1
	 */
	var example1 = function(){
	console.line('New Line');

	var box = console.box('Red Box Title', 'red');
	box
		.line('Red Box Line')
		.box('Yellow Box Title', {color:'yellow',colorText:'yellow',border:2})
		.line('Yellow Box Line')
		.box(null, 'green').title('Hello World');

	box.line('Red Box Bottom');
	box.out();
};

	// example
	this
		.title('Example 1: Box-Tree', 'bold');
	this
		._(example1)._();

	example1();

	/**
	 * Example 2
	 */
	var example2 = function(){
	console.log({user:'RienNeVaPlus',id:123,attr:{items:2432,top:[1,2],note:null},online:true});
};

	// example
	this
		.title('Example 2: Object inspection', 'bold');
	this
		._(example2)._();

	example2();

	/**
	 * Example 3
	 */
	var example3 = function(){
		console.time('CustomTimer');    // create new timer
		console.time();                 // global timer
		console.time('CustomTimer');    // output created timer
	};

	// example
	this
		.title('Example 3: Stopwatch', 'bold');
	this
		._(example3)._();

	example3();
	this.$();

	/**
	 * Example 4
	 */
	var example4 = function(){
		console.trace();
};

	// example
	this
		.title('Example 4: Stack trace', 'bold');
	this
		._(example4)._();

	example4();

	this.options('green')
		.title(console.col('Have fun!', 'rainbow'));
	this
		.$();

	return this;
};

/**
 * Save a line to buffer
 *
 * @param {String|Object} line
 * @param {...String|Object} [option]
 * @returns {Log}
 */
Log.prototype.line = function(line, option){
	var args = Array.prototype.slice.call(arguments);

	var obj = {
		prefix: ' ',
		color: this.opt.color,
		colorText: this.opt.colorText
	};

	// handle .line()
	if(line === undefined){
		args[0] = undefined;
	}

	// try to find an option
	option = (args[args.length-1]+'');

	// prefix
	if(option.substr(0,4)=='pre:'){
		args.pop();
		obj.prefix = option.substr(4);
	}
	// color
	else if(Log.chalkColors.indexOf(option) > -1 || Log.chalkCommands.indexOf(option) > -1){
		args.pop();
		obj.color = option;
		obj.colorText = option;
	}

	// use format (sprintf) like console does
	args = Log.format.apply(this, args);

	// handle section
	var processStash = function(){
		// empty line (undefined,'')
		if(!stash.length && line === undefined){
			this.lines.push(obj);
		}
		// join word string
		else if(stash.length){
			obj.line = stash.join(' ');
			this.lines.push(obj);
		}
		// log
		else if(this._instanceof(line)){
			this.lines.push(line);
		}

		// empty stash
		stash = [];
	}.bind(this);

	// iterate args
	var stash = [];
	args.forEach(function(word){
		// types to strings
		word = Log.parseWord(word);

		// is str
		if(typeof word == 'string'){
			stash.push(word);
		}
		// object
		else {
			// skip sub boxes
			if(this._instanceof(word))
				return;

			// add to this.lines
			processStash();

			// log obj
			this._try(this._object, word);
		}
	}.bind(this));

	// add
	processStash();
	return this;
};

/**
 * _ - Alias for this.line
 *
 * @returns {Log}
 */
Log.prototype._ = function(){
	var args = Array.prototype.slice.call(arguments);
	return this.line.apply(this, args);
};

/**
 * log - Alias for this.line
 *
 * @returns {Log}
 */
Log.prototype.log = function(){
	var args = Array.prototype.slice.call(arguments);
	this.line.apply(this, args);
	return this.out();
};

/**
 * info - Alias for this.log in "green"
 *
 * @returns {Log}
 */
Log.prototype.info = function(){
	var args = Array.prototype.slice.call(arguments);

	// add red
	args.push('green');

	// log
	this.line.apply(this, args);
	this.out('info');

	return this;
};

/**
 * dir - Alias for this.log
 *
 * @returns {Log}
 */
Log.prototype.dir = Log.prototype.log;

/**
 * error - Alias for this.line in "red"
 *
 * @returns {Log}
 */
Log.prototype.error = function(){
	var args = Array.prototype.slice.call(arguments);

	// add red
	args.push('red');

	// log
	this.line.apply(this, args);
	this.out('error');

	return this;
};

/**
 * warn - Alias for this.line in "yellow"
 *
 * @returns {Log}
 */
Log.prototype.warn = function(){
	var args = Array.prototype.slice.call(arguments);

	// add yellow
	args.push('yellow');

	// log
	this.line.apply(this, args);
	this.out('warn');

	return this;
};

/**
 * Output time
 *
 * Use as:
 * .time()                              - Prints time since box was initialized
 * .time('TimerTony') (1st call)        - starts a timer for tony, outputs 'TimerTony: start'
 * .time('TimerTony', true) (1st call)  - same as above, no output
 * .time('TimerTony') (2nd call)        - outputs 'TimerTony: Xms'
 * .time('TimerTony', true) (2nd call)  - outputs 'TimerTony: Xms - reset', resets the timer
 *
 * @param {String} [label]
 * @param {Boolean} [reset]
 * @returns {Log}
 */
Log.prototype.time = function(label, reset){
	var now = new Date().getTime();

	// initialize timer
	if(label && !this.timer[label]){
		this.timer[label] = now;

		// finish quietly
		if(reset){
			return this._autoOut();
		}

		// indicate event
		this.line(Log.col(label, 'green')+': start');

		return this._autoOut();
	}

	// calc
	var passed = (now - (this.timer[label||'_']));
	var lastExec = this.timer._calls[label||'_'];

	// build line
	var line = Log.col(label||'Time','green')+Log.col(': ', 'grey')
		+ Log.col(passed.toFixed(0)+'ms', 'white')
		+ (reset ? Log.col(' - ', 'grey') + Log.col('reset', 'yellow'):'');

	// add "+Xms"
	if(lastExec){
		lastExec = (now - lastExec);

		var str = lastExec.toFixed(0);
		str = ' '+Log.col(Log.pad('─', (Log.getTerminalWidth()-(this.level+2)-Log.strip(line).length-str.length) - 7), 'grey')
				+ ' +'+lastExec.toFixed(0)+'ms';

		if(lastExec <= 10)
			str = Log.col(str, 'green');
		if(lastExec <= 100)
			str = Log.col(str, 'yellow');
		if(lastExec > 100)
			str = Log.col(str, 'red');

		line += str;
	}

	// reset timer
	if(label && this.timer[label] && reset){
		this.timer[label] = now;
	}

	// output time passed
	this.line(line);

	// save call time
	this.timer._calls[label||'_'] = now;

	if(passed > 1000){
		var delta = passed / 1000;
		var res = [];

		var struc = {
			year: 31536000,
			month: 2592000,
			day: 86400,
			hour: 3600,
			minute: 60,
			second: 1
		};

		// calc time
		Object.keys(struc).forEach(function(key){
			var r = Math.floor(delta / struc[key]);
			struc[key+'s'] = r;
			delta -= r * struc[key];

			if(r > 0 || res.length > 0)
				res.push(Log.plural(r, '%s '+key));
		});

		this.box(Log.col(res.join(' + '), 'grey'));
	}

	// output?
	return this._autoOut();
};

/**
 * timeEnd - Alias for this.log
 *
 * @returns {Log}
 */
Log.prototype.timeEnd = Log.prototype.time;

/**
 * trace - beautified
 *
 * @param {String} [message]
 */
Log.prototype.trace = function(message){
	var obj = {};
	Error.captureStackTrace(obj, this);

	var lines = [];
	obj.stack.split("\n").forEach(function(line, indexLine){
		// remove surrounding whitespaces
		line = line.trim();
		var words = [];

		// 1st line
		if(indexLine == 0){
			return lines.push(colors.yellow(message||'Trace')+colors.grey(': ')+colors.cyan(line));
		}
		// skip trace to this place
		else if(indexLine == 1){

		}
		// show rest of stack
		else {
			// split to words
			line.split(' ').forEach(function(word, indexWord){
				switch(indexWord){
					case 0:
//							words.push(colors.grey(word));
						break;

					case 1:
						words.push(colors.white(word));
						break;

					case 2:
						words.push(colors.grey(word));
						break;
				}
			});

			lines.push(words.join(' '));
		}
	});

	var box;
	lines.forEach(function(line, i){
		if(i == 0)
			return box = this.line(line);

		box = box.box(line);
	}.bind(this));

	box.out();

	return this;
};

/**
 * Display text inside a box
 *
 * @param line
 * @returns {Log}
 */
Log.prototype.title = function(line){
	var args = Array.prototype.slice.call(arguments);
	var maxWidth = Log.getTerminalWidth();

	// top border
	this.line(Log.col(Log.pad('─', maxWidth - this.level - 2)+'┐', this.opt.color, 'dim'), 'pre:');

	// build line
	this.line.apply(this, args);

	// get inserted line
	var newLine = this.lines[this.lines.length-1];

	// add right border
	newLine.line += Log.pad(' ', maxWidth - this.level - Log.strip(newLine.line).length - 3)
		+ Log.col('│', this.opt.color, 'dim');

	// save to this.lines
	this.lines[this.lines.length-1] = newLine;

	// bottom border
	this.line(Log.col((Log.pad('─', maxWidth - this.level - 2)+'┘'), this.opt.color, 'dim'), 'pre:');

	// use out?
	return this._autoOut();
};

/**
 * beep sound
 *
 * @returns {*}
 */
Log.prototype.beep = function(label){
	process.stdout.write('\x07');
	return this.line(colors.red('BEEP'+(typeof label == 'string'?': '+label:''))).out();
};

/**
 * Build output string
 *
 * @param {Function} callback
 * @returns {string}
 */
Log.prototype._buildString = function(callback){
	var body = '';
	var lines = [];
	var allNr = 0;
	var maxWidth = Log.getTerminalWidth();
	var mapBase = this;

	// gather lines
	var walk = function(log, callbackWalk){
		var boxNr = 0;

		// iterate lines
		async.each(log.lines, function(line, callbackLines){
			// sub box
			if(this._instanceof(line))
				return walk(line, callbackLines);

			// format
			lines.push({
				id: log.id,
				level: log.level,
				boxNr: boxNr,
				allNr: allNr,
				prefix: line.prefix,
				color: line.color,
				colorText: line.colorText,
				line: line.line,
				log: log
			});

			// count
			boxNr++;
			allNr++;

			// end
			callbackLines();
		}.bind(this), function end(){
			callbackWalk();
		});
	}.bind(this);

	// prepare
	walk(this, function(){
		// iterate
		async.each(lines, function(obj, callbackLine){
			var i = lines.indexOf(obj);
			// structure
			var pre = {
				str: '',
				plain: ''
			};

			// shortcuts
			obj.levelPrev = lines[i-1] ? lines[i-1].level : null;
			obj.levelNext = lines[i+1] ? lines[i+1].level : null;
			obj.hasPrev = lines[i-1] || false;
			obj.hasNext = lines[i+1] || false;
			obj.hasBoxPrev = obj.hasPrev && obj.hasPrev.id == obj.id;
			obj.hasBoxNext = obj.hasNext && obj.hasNext.id == obj.id;

			// iterate level times (|)
			for(var posLeft = 0; posLeft <= obj.level; posLeft++){
				// str
				var s;

				// set base obj
				mapBase = obj.log.getParent(obj.level-posLeft);

				// 1st from right
				if(posLeft == obj.level){
					if(obj.hasPrev == false && obj.hasNext == true){
						s = '┌';
					}
					else if(obj.boxNr == 0){
						if(obj.hasBoxNext || obj.levelNext > obj.level)
							s = '┬';
						else if(obj.hasBoxPrev)
							s = '└';
						else
							s = '─';
					}
					else if(obj.hasNext && obj.levelNext >= obj.level && Log.strip(obj.line) == 'undefined')
						s = '│';
					else if(
						obj.hasNext
						&& (
						obj.hasNext.log.id == obj.log.id
						|| (
						obj.hasNext.log
						&& obj.hasNext.log.parent
						&& obj.hasNext.log.parent.id == obj.log.id
						)
						)
					){
						s = '├';
					}
					else if(['═','╛'].indexOf(obj.prefix.substr(0,1)) > -1)
						s = '╘';
					else {
						s = '└';
					}
				}
				// 2nd from right when first of box
				else if(obj.boxNr == 0 && posLeft == obj.level-1){
					if(!obj.hasPrev)
						s = '┌';
					else if(!obj.hasNext || obj.hasNext.log.level < obj.level)
						s = '┴';
					else {
						s = '├';
					}
				}
				// 2nd from right when no next (is closing)
				else if(!obj.hasBoxNext && obj.levelNext < obj.level-1 && posLeft == obj.level-1){
					s = '┘';
				}
				else if(!obj.hasBoxNext && obj.levelNext < obj.level-1){
					if(!obj.hasNext)
						if(posLeft == 0)
							s = '└';
						else if(posLeft < obj.level)
							s = '┴';
						else
							s = '└';
					else {
						if(posLeft == obj.levelNext )
							s = '├';
						else if(posLeft < obj.levelNext)
							s = '│';
						else if(posLeft == 0 || posLeft == obj.levelNext)
							s = '├';
						else{
							s = '┴';
						}
					}
				}
				// any other char
				else {
					if(posLeft == 0 && !obj.hasNext)
						s = '┘';
					else {
						s = '│';
					}
				}

				if(s){
					pre.plain += s;
					pre.str += mapBase._map(s);
				}
			}

			// add final prefix (customizable)
			pre.plain += obj.prefix;
			pre.str += Log.col(obj.prefix, obj.log.opt.color);

			// create str
			var str = {
				str: obj.line
			};

			// add plain str
			str.plain = Log.strip(str.str);

			switch(str.plain){
				case 'undefined':
					str.str = '';
				break;

				case '---':
					str.str = '';
					var width = Log.getTerminalWidth() - obj.level - 1;
					for(var iLine = 0; iLine < width; iLine++){
						str.str += '─';
					}
					pre.str = pre.str.substr(0,pre.str.length-6);
					pre.plain = pre.plain.substr(0,pre.plain.length-1);
					str.str = Log.col(str.str, obj.color, 'dim'); //+'┤');
				break;
			}

			// truncate
			if((pre.plain.length + str.plain.length) > maxWidth || str.plain.indexOf("\n") > -1){
				// generate new lines
				var addLines = Log.wrap(str.str, maxWidth - obj.level-10).split("\n");
				str.str = '';

				// iterate new lines
				addLines.forEach(function(line, posTop){
					var isTopLast = posTop == addLines.length-1;

					line = ' '+Log.col(line, obj.color, 'bold');

					// iterate prefix chars
					pre.str = '';
					pre.plain.split('').slice(0, -1).forEach(function(char, posLeft, all){
						var isLeftLast = posLeft == all.length-1;
						var s = null;

						if(isLeftLast && posTop == 0){
							if(char == '└')
								s = '├';
							else if(char == '├')
								s = '├';
							else
								s = '┌';
						}
						else if(isLeftLast && !isTopLast)
							s = '│';
						else if(isLeftLast && isTopLast){
							if(obj.hasNext && (obj.hasNext.level == obj.level+1 || obj.hasNext.level == obj.level))
								s = '│';
							else//├
								s = '└';
						}
						else if(posTop && ['┴','┘'].indexOf(char) > -1)
							s = ' ';
						else if(!posLeft && posTop)
							s = '│';
						else if(char == '├' && posTop != 0){
							s = '│';
						}
						else
							s = char;

						if(s)
							pre.str += this._map(s);
					}.bind(this));

					// add truncated
					body += "\n" + Log.col(pre.str, obj.color) + Log.col(line, obj.colorText);
				}.bind(this));
			}
			else {
				// add without truncation
				body += "\n" + pre.str + Log.col(str.str, obj.colorText, 'bold');
			}

			// append line
			//		body += "\n" + pre.str + str.str;
			callbackLine();
		}.bind(this),
		// bind callback so the garbage collector doesn't eat it
		function(){ arguments[0](body); }.bind(this, callback));
	}.bind(this));

};

/**
 * Output box string
 *
 * @param {String} [method="log"]
 * @returns {*}
 */
Log.prototype.out = function(method){
	if(!method) method = 'log';

	// use parent out when available
	if(this.parent){
		return this.parent.out();
	}

	// try to build
	this._try(
		this._buildString,
		function(str){
			// the output
			Log.console[method](this.opt.disableNewline ? str.substr(1) : str);

			// clear lines
			this.lines = [];
		}.bind(this)
	);

	return this._return();
};

/**
 * $ - Alias for this.out
 *
 * @type {Function}
 */
Log.prototype.$ = Log.prototype.out;

/**
 * flush - Alias for this.out
 *
 * @type {Function}
 */
Log.prototype.flush = Log.prototype.out;

/**
 * Return a specific parent for _buildString structure
 *
 * @param [generations=1]
 */
Log.prototype.getParent = function(generations){
	var log = this;

	while(generations > 0){
		if(!log.parent)
			return generations = 0;

		log = log.parent;
		generations--;
	}

	return log;
};

/**
 * Make sure promised are not used when on node console
 *
 * @returns {undefined|Log}
 * @private
 */
Log.prototype._return = function(){
	// don't use promise on node console
	return Log.isTerminalConsole() ? undefined : this;
};

/**
 * Try-catch a function with args
 *
 * @param {Function} funct
 * @param {...*} arg
 * @private
 */
Log.prototype._try = function(funct, arg){
	var args = Array.prototype.slice.call(arguments);
	args.shift();

	try {
		funct.apply(this, args);
	} catch(error) {
		if(error instanceof RangeError){
			this
				.line('RangeError: '+error.message, 'red')
				.line('Fallback to native console:').out();
			Log.console.log("\n", arg);
		}
	}
};

/**
 * Determine whether instance is an instance of Log or console.Console (if override happened)
 *
 * @param {*} instance
 * @returns {boolean}
 * @private
 */
Log.prototype._instanceof = function(instance){
	return instance instanceof Log || instance instanceof Log.console.Console;
};

/**
 * Use out when there is no parent
 *
 * @returns {Log}
 * @private
 */
Log.prototype._autoOut = function(){
	return this.parent === null && this.opt.disableAutoOut === false ? this.out() : this;
};


// ─── Dynamic private methods ──────────────────────────────────────────────────

/**
 * Map symbols
 *
 * @param sym
 * @returns {*}
 * @private
 */
Log.prototype._map = function(sym){
	var opt = this.opt;

	if(opt.border > 1){
		switch(sym){
			case '╘': sym = '╚'; break;
			case '┌': sym = '╓'; break;
			case '┘': sym = '╜'; break;
			case '│': sym = '║'; break;
			case '├': sym = '╟'; break;
			case '└': sym = '╙'; break;
			case '┬': sym = '╥'; break;
			case '┼': sym = '╫'; break;
			case '┴': sym = '╨'; break;
		}
	}

	if(opt.color){
		sym = colors[opt.color||'white'](sym);
	} else
		sym = (sym).grey;

	return sym;
};

/**
 * Add an object table
 *
 * @param {Object} obj
 * @param {Object} [data]
 * @private
 */
Log.prototype._object = function(obj, data){
	// handle data
	data = Log.extend({
		title: null,
		colors: ['cyan','green','yellow','red','magenta'],
		pathLabel: '#',
		padKey: 15,
		padVal: 45,
		maxLevel: this.level,
		stdWidth: Log.getTerminalWidth()
	}, data);

	// gather structural layout data
	var compile = function(objSub, level){
		// handle array
		if(Array.isArray(objSub)){
			// count key length
			data.padKey = Math.max(data.padKey, objSub.length);

			// handle values (can go deeper)
			return objSub.forEach(function(val, callbackArr){
				compile(val, level+1, callbackArr);
			}.bind(this));
		}

		// handle object
		if(objSub && typeof objSub == 'object'){
			// add obj.toString name (40/60 to key & val)
			data.padKey = Math.max(data.padKey, Math.round(objSub.toString().length *.4)+2);
			data.padVal = Math.max(data.padVal, Math.round(objSub.toString().length *.6)+2);

			// handle first level of keys
			return Object.keys(objSub).forEach(function(key, callbackObj){
				// count key length
				data.padKey = Math.max(data.padKey, (key+'').length);

				// handle value (can go deeper)
				compile(objSub[key], level+1, callbackObj);
			}.bind(this));
		}

		// count level
		data.maxLevel = Math.max(data.maxLevel, level);

		// handle value
		data.padVal = Math.max(data.padVal, (objSub+'').length);
	}.bind(this);

	/**
	 * Insert any object
	 *
	 * @param {Object} objSub
	 * @param {Log} parent
	 * @param {String} [title]
	 * @param {Array} [path]
	 * @type {function(this:Log)}
	 */
	function insert(objSub, parent, title, path){
		if(!path) path = [data.pathLabel];

		// create sub box
		var keys = Object.keys(objSub);
		var box = parent.box();

		// calc colors
		var color = data.colors[(box.level-this.level-1) % data.colors.length];
		var colorNext = data.colors[data.colors.indexOf(color)+1] || data.colors[0];
		var objStr = '';

		if(objSub instanceof Function){
			objStr = '[Function]';
			color = 'blue';
		}
		else if(objSub instanceof Array){
			objStr = '[object Array]';
		}
		else
			objStr = '[object Object]';

		// set color
		box.options({color:color});

		// title "──────[object Object]─┤"
		if(!title){
			title = Log.col(objStr, color);
			title = (
				colors[color].dim(Log.pad('─', data.pad - box.level - (colors.stripColor(title).length)-3))
			)
				+ title
				+ colors[color].dim('─┐');
		}

		// add title
		if(objStr != '[Function]')
			box.line(title, 'pre:');

		if(objSub instanceof Date){


		}
		// build function
		else if(objSub instanceof Function){
			var functStr = objSub.toString().replace(/\t/g, '  ').replace(/\r/g, '').split("\n");
			var spacer = (functStr.length+'').length;
			var functPad = Math.max(data.pad, Log.getTerminalWidth());

			return functStr.forEach(function(line, i){
				box.line(
					// prefix
					Log.col(
							Log.pad('─', spacer - ((i+1)+'').length)
						+ Log.col(i+1,'grey')
						+ '─'
						, color)
					// code & spacer
					+ Log.col(
							Log.truncate(line, data.pad - box.level - 4 - spacer)
							+ Log.pad(' ', functPad - line.length - box.level - 4 - spacer),
							'code'
						)
					, 'pre:─'
				)
			});
		}
		// no properties found
		else if(!keys.length){
			var emptyStr = '┤ empty object ├';
			var emptyPad = (data.pad - box.level - emptyStr.length)-3;
			var padLeft = Math.floor(emptyPad / 2);
			var padRight = padLeft < emptyPad/2 ? padLeft+1 : padLeft;

			emptyStr = Log.col(
						Log.pad('─', padLeft)
					+ emptyStr.replace('empty object', Log.col('empty object', 'bold'))
					+ Log.pad('─', padRight)
					+ (box.level-this.level>1?'┤':'─')
					+ Log.col((box.level-this.level>1?'│':'┤'), data.colors[0]), color, 'dim');
			box.line(emptyStr, 'pre:');
		}

		// iterate object keys
		keys.forEach(function(key, iKeys){
			var val = objSub[key];

			// sub object
			if(val && typeof val == 'object'){
				// build path
				path[box.level+1] = (parseInt(key) == key+'' ? '['+key+']' : '.'+key);

				// title "key────[object Object]─┤"
				var title = Log.col(Array.isArray(val) ? '[object Array]' : val.toString(), colorNext);
				title = Log.col(key, color, 'bold')
					+ Log.col(
							Log.pad('─',
								data.pad - (box.level) - colors.stripColor(key).length - colors.stripColor(title).length -5)
					, colorNext
					, 'dim')
					+	title
					+ Log.col('─┬', colorNext, 'dim')
					+ Log.col('┤', data.colors[0], 'dim');

				return insert.call(this, val, box, title, path);
			}

			// truncate key
			key = Log.truncate(key, data.padKey-box.level-2);

			// prepare
			var valueLines = [val];
			var line = {
				prefix:	[
						Log.col(key, color, 'bold')
					+ Log.col(Log.pad('·', data.padKey-key.length-box.level)+': ', color, 'dim')
					, Log.pad(' ', data.padKey-box.level+2)
				]
			};

			if(val instanceof Function){
				valueLines = val.toString().replace(/\t/g, '  ').replace(/\r/g, '').split("\n");
			}
			// break value into multiple lines
			else if(typeof val == 'string'){
				valueLines = Log.wrap(val, data.padVal-9).replace(/\r/g, '').split("\n");
			}

			// insert lines
			line.lines = valueLines.length-1;
			valueLines.forEach(function(val, i){
				// convert val to string
				val = Log.parseWord(val);

				// build "title···: value │"
				box.line(
						// prefix
						line.prefix[i<1?0:1]
						// value
					+	Log.col(Log.truncate(val, data.padVal-6), 'grey')
						// spacer
					+	Log.pad(' ', data.padVal-colors.stripColor(val).length-6)
						// postfix
					+ Log.col(
						// is min 2nd lvl
						(box.level - this.level	> 1
							// is last of any > lvl1
							? (i == valueLines.length-1 && keys[iKeys+1] && typeof objSub[keys[iKeys+1]] == 'object'
							? '↓'
							: (i == 0 && keys[iKeys-1] && typeof objSub[keys[iKeys-1]] == 'object'
							? '↑'
							: '│')
						)
							: ' '
						), color, 'dim'
					)
					+ Log.col('│', data.colors[0], 'dim')
					, 'pre:'+(line.lines && line.lines == i?'┘':(line.lines && i<1?'┐':(line.lines?'┤':'─')))
				);
			}.bind(this));
		}.bind(this));

		// insert footer
		var footerStr = (''
			+ Log.col(
					Log.truncate(path.slice(0, box.level+1).join(''), data.pad - box.level - 11)
				+ '─('
				+ (keys.length+'')
				+ ')'
			, color, 'dim')
		);

		box.line(Log.col(
			'─'
			+ (Log.pad('─', (data.pad - (box.level) - colors.stripColor(footerStr).length -6)))
			+ ('─')
		, color, 'dim')
		+ footerStr
		+ Log.col('─', color, 'dim')
		+ (box.parent && box.parent.level == this.level
			? Log.col('─┘', color, 'dim')
			: Log.col('┴', color, 'dim') + Log.col('┤', data.colors[0], 'dim')
		), 'pre:');
	}

	// run calculations for layout structure
	compile(obj, this.level);

	// add ": " and level to value
	data.padKey += data.maxLevel;
	data.padVal += 2;

	// calc needed with
	data.pad = data.padKey + data.padVal;

	// set max with
	if(data.pad > data.stdWidth){
		data.pad = data.stdWidth;
		if(data.padKey > data.pad){
			data.padKey = Math.round(data.pad * .7);
			data.padVal = Math.round(data.pad * .3);
		} else {
			data.padVal = data.pad - data.padKey;
		}
	}

	// insert
	insert.call(this, obj, this);
};

// instance
var log = new Log();

module.exports = function(opt){
	// config
	log.options(opt);

	if(log.opt.override)
		log.overrideConsole();

	return log;
};

//// auto override
//if(console instanceof Log === false && this.opt.override){
//	this.override();
//}