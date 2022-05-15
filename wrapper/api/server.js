/**
 * start wrapper: offline's server
 */
// modules
const http = require("http");
const url = require("url");
// stuff
const loadPost = require("./request/post_body");

/**
 * routes
 */
const asd = require("./asset/delete");
const asa = require("./asset/save");
const asl = require("./asset/load");
const asL = require("./asset/list");
const asm = require("./asset/meta");
const ast = require("./asset/thmb");
const chr = require("./character/redirect");
const pmc = require("./character/premade");
const chl = require("./character/load");
const chs = require("./character/save");
const chu = require("./character/upload");
const sts = require("./starter/save");
// these should only used for online lvms
//const Stl = require("./static/load");
//const Stp = require("./static/page");
const mvl = require("./movie/load");
const mvL = require("./movie/list");
const mvm = require("./movie/meta");
const mvs = require("./movie/save");
const mvt = require("./movie/thmb");
const thl = require("./theme/load");
const thL = require("./theme/list");
const tsv = require("./tts/voices");
const tsl = require("./tts/load");
const wal = require("./waveform/load");
const was = require("./waveform/save");

const functions = [
	asd,
	asa,
	asl,
	asL,
	asm,
	ast,
	chr,
	pmc,
	chl,
	chs,
	chu,
	sts,
	//Stl,
	//Stp,
	mvl,
	mvL,
	mvm,
	mvs,
	mvt,
	thl,
	thL,
	tsv,
	tsl,
	wal,
	was
];

/**
 * asynchronous version of Array.prototype.find 
 */
Array.prototype.findAsync = async function(...params) {
	for (let i = 0; i < this.length; i++) {
		if (await this[i](...params) == true) 
			return this[i];
	}
	return;
}

/**
 * create the server
 */
module.exports = {
	apiServer() {
		http
			.createServer(async (req, res) => {
				try {
					const parsedUrl = url.parse(req.url, true);
					// parse post requests
					if (req.method == "POST") req.body = await loadPost(req, res);
					// run each route function until the correct one is found
					const found = await functions.findAsync(req, res, parsedUrl);
					// log every request
					console.log(req.method, parsedUrl.path);
					if (!found) { // page not found
						res.statusCode = 404;
						res.end();
					}
				} catch (x) {
					res.statusCode = 404;
					res.end();
				}
			})
			.listen(process.env.SERVER_PORT);
	},
	assetServer() {
		
	}
}

// 1 year of 1.3.0 development
// thanks xom