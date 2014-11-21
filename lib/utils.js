var inspect = require('util').inspect;
var chalk = require('chalk');

module.exports = {
    logError: function(message) {
        console.log(chalk.bold.red(message));
    },
    logInspect: function(obj) {
        console.log(inspect(obj, {colors: true, depth: Infinity}));
    }
}