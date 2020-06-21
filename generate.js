const fs = require("fs");
var path = require("path");
const timings = require("./intervals.json");

// We'll need to inspect OGG files, so... make sure we can do that
const { execSync } = require("child_process");
execSync(`npm install music-metadata`, { stdio: "inherit" });
fs.unlinkSync(`package-lock.json`);
const mm = require("music-metadata");

// See https://stackoverflow.com/a/42505874/3027390
function rimraf(dir_path) {
  if (fs.existsSync(dir_path)) {
    fs.readdirSync(dir_path).forEach(function (entry) {
      var entry_path = path.join(dir_path, entry);
      if (fs.lstatSync(entry_path).isDirectory()) {
        rimraf(entry_path);
      } else {
        fs.unlinkSync(entry_path);
      }
    });
    fs.rmdirSync(dir_path);
  }
}

// Convert a four byte sequence from t_bgm._dt into a normal number
function toUint32(buffer, offset) {
  const [a, b, c, d] = buffer.slice(offset, offset + 4);
  return (d << 24) + (c << 16) + (b << 8) + a;
}

// Convert a normal nuber into a four byte sequence for t_bgm._dt
function toHex(v) {
  return [
    (0xff & v) >> 0,
    (0xff00 & v) >> 8,
    (0xff0000 & v) >> 16,
    (0xff000000 & v) >> 24,
  ];
}

// Get the looping information for a given track, by id.
function getInterval(id) {
  let loop = timings.loops.find((t) => t.id === id);
  if (!loop) return;
  if (loop.substitute) return getInterval(loop.substitute.id);
  return loop;
}

/**
 * Class representation of an individual track entry,
 * with start, end, id, and ordering/loop indicators.
 */
class Entry {
  constructor() {
    this.values = [];
  }
  async parse(data) {
    let v = (this.values = [0, 0, 0, 0].map((_, i) => toUint32(data, i * 4)));
    if (toHex(v[3])[2] === 1) {
      let loop = getInterval(v[2]);
      if (loop) {
        if (loop.start && loop.end) {
          // custom values available.
          this.updated = true;
          v[0] = loop.start;
          v[1] = loop.end - loop.start;
        } else {
          // custom values missing: use entire track length.
          v[0] = 0;
          let filename = `./ed${v[2]}.ogg`;
          let metadata = await mm.parseFile(filename);
          v[1] = metadata.format.numberOfSamples;
        }
      }
    }
  }
  get id() {
    return this.values[2];
  }
  toString() {
    const [start, end, id, internal] = this.values;
    const f = toHex(internal);
    const looping = f[2] === 1;
    if (looping) {
      return `${id}}: {${start}, ${end}}${this.updated ? ` *` : ``}`;
    }
    return `${id}: -`;
  }
  toBinary() {
    return this.values.map((v) => toHex(v)).flat();
  }
}

/**
 * Class representation of the entire t_bmg._dt file.
 */
class DataFile {
  constructor() {
    this.entries = [];
    this.updated = 0;
    this.deduplicated = 0;
  }
  async parse(data) {
    for (let i = 0, entry; i < data.length; i += 16) {
      entry = new Entry();
      await entry.parse(data.slice(i, i + 16));
      this.addEntry(i, entry);
    }
  }
  addEntry(line, entry) {
    if (this.entries[entry.id]) {
      this.deduplicated++;
      return console.log(
        `Duplicate entry found for ${entry.id} at line ${line.toString(16)} (this entry will be ignored)`
      );
    }
    this.entries[entry.id] = entry;
    if (entry.updated) {
      this.updated++;
    }
  }
  toBinary() {
    return Buffer.from(
      Object.entries(this.entries)
        .sort()
        .map((entry) => entry[1].toBinary())
        .flat()
    );
  }
  toString() {
    return Object.entries(this.entries)
      .sort()
      .map((entry) => entry[1].toString())
      .flat()
      .concat([
        `\n`,
        `Updated ${this.updated} entries.`,
        `Skipped ${this.deduplicated} duplicates.`
      ])
      .join(`\n`);
  }
  write() {
    const filename = `t_bgm._dt`;
    console.log(`Writing ${filename}...`);
    fs.writeFile(filename, this.toBinary(), (_err) => {
      console.log("Done.\n");
    });
  }
}

/**
 * Build a t_bgm._dt! (and clean up the temp dependencies)
 */
(async function () {
  const dataFile = new DataFile();
  const data = Array.from(fs.readFileSync("./data.bin"));
  await dataFile.parse(data);
  console.log(dataFile.toString());
  dataFile.write();
  rimraf(`node_modules`);
})();
