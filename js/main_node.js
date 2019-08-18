var argv = process.argv;
if (argv.length != 3 || '-h' === argv[2]|| '--help' === argv[2]|| '--usage' === argv[2]) {
    console.error(`Convert network blueprint to shell script
Usage: %s %s network.json`, argv[0], argv[1]);
    process.exit(255);
}

var fs = require("fs");
var data = fs.readFileSync(argv[2]);

var vnet = require('./core');

process.stdout.write(vnet.fromJson(data).script());
