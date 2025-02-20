const CharModel = require("../models/char.js");
const fs = require("fs");
const httpz = require("@octanuary/httpz");
const path = require("path");

const base = Buffer.alloc(1, "0");
const defaultTypes = {
	anime: "guy",
	cctoonadventure: "default",
	family: "adam",
};
const bfTypes = {
	man: "default&ft=_sticky_filter_guy",
	woman: "default&ft=_sticky_filter_girl",
	boy: "kid&ft=_sticky_filter_littleboy",
	girl: "kid&ft=_sticky_filter_littlegirl",
	heavy_man: "heavy&ft=_sticky_filter_heavyguy",
	heavy_woman: "heavy&ft=_sticky_filter_heavygirl"
};
const thumbUrl = process.env.THUMB_BASE_URL;
const group = new httpz.Group();

/*
load
*/
group.route("POST", "/goapi/getCcCharCompositionXml/", (req, res) => {
	const id = req.body.assetId;
	if (typeof id == "undefined") {
		return res.status(400).end("Missing one or more fields.");
	}

	console.log(`Loading character #${id}...`);
	try {
		const buf = CharModel.charXml(id);
		res.setHeader("Content-Type", "application/xml");
		res.end(Buffer.concat([base, buf]));
	} catch (err) {
		if (err == "404") {
			return res.status(404).end("1");
		}
		console.log(req.parsedUrl.pathname, "failed. Error:", err);
		res.status(500).end("1");
	}
});

/*
thumb
*/
group.route("GET", /\/stock_thumbs\/([\S]+)/, (req, res) => {
	const filepath = path.join(__dirname, "../../", thumbUrl, req.matches[1]);
	if (fs.existsSync(filepath)) {
		fs.createReadStream(filepath).pipe(res);
	} else {
		console.warn(req.parsedUrl.pathname, "attempted on nonexistent asset.");
		res.status(404).end();
	}
});

/*
redirect
*/
group.route("GET", /\/go\/character_creator\/(\w+)(\/\w+)?(\/.+)?$/, (req, res) => {
	let [, theme, mode, id] = req.matches;

	let redirect, external = "";
	if (req.headers.referer?.indexOf("external=true") != -1) {
		external = "&external=true";
	}
	switch (mode) {
		case "/copy": {
			redirect = `/cc?themeId=${theme}&original_asset_id=${id.substring(1)}${external}`;
			break;
		} default: {
			const type = theme == "business" ?
				bfTypes[req.query.type || "woman"] || "":
				req.query.type || defaultTypes[theme] || "";
			redirect = `/cc?themeId=${theme}&bs=${type}${external}`;
			break;
		}
	}
	
	res.redirect(redirect);
});

/*
save
*/
// save character + thumbnail
group.route("POST", "/goapi/saveCCCharacter/", (req, res) => {
	if (!req.body.body || !req.body.thumbdata || !req.body.themeId) {
		return res.status(400).end("Missing one or more fields.");
	}
	const body = Buffer.from(req.body.body);
	const thumb = Buffer.from(req.body.thumbdata, "base64");

	const meta = {
		type: "char",
		subtype: 0,
		title: req.body.title,
		themeId: req.body.themeId
	};
	const id = CharModel.save(body, meta);
	CharModel.saveThumb(id, thumb);
	res.end("0" + id);
});
// save thumbnail only
group.route("POST", "/goapi/saveCCThumbs/", (req, res) => {
	const id = req.body.assetId;
	if (typeof id == "undefined" || !req.body.thumbdata) {
		return res.status(400).end("1");
	}
	const thumb = Buffer.from(req.body.thumbdata, "base64");

	if (CharModel.exists(`${id}.xml`)) {
		CharModel.saveThumb(id, thumb);
		res.end("0" + id);
	} else {
		res.end("1");
	}
});

/*
upload
*/
group.route("*", "/api/char/upload", (req, res) => {
	const file = req.files.import;
	if (!file) {
		return res.status(400).json({ msg: "No file" });
	} else if (file.mimetype !== "text/xml") {
		return res.status(400).json({ msg: "Character is not an XML" });
	}
	const origName = file.originalFilename;
	const path = file.filepath, buffer = fs.readFileSync(path);

	const meta = {
		type: "char",
		subtype: 0,
		title: origName || "Untitled",
		themeId: CharModel.getThemeId(buffer)
	};
	try {
		CharModel.save(buffer, meta);
		fs.unlinkSync(path);
		const url = `/cc_browser?themeId=${meta.themeId}`;
		res.redirect(url);
	} catch (e) {
		console.error("Error uploading character:", e);
		res.status(500).end();
	}
});

module.exports = group;
