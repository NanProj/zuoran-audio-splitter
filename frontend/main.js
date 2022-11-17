import express from "express";
import moment from "moment";
import child_process from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import url from "node:url";
import util from "node:util";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {maxHttpBufferSize: 1e8 /* 100 MB */});
const exec = util.promisify(child_process.exec);

const data_dir = "/data";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function update_ext(old_path, new_ext) {
  return old_path.substring(0, old_path.length - path.extname(old_path).length) + new_ext;
}

function rel(file_path) {
  return path.relative(data_dir, file_path);
}

io.on("connection", async (socket) => {
  socket.on("upload", async (file, file_name) => {
    const date_str = moment().format("YYYYMMDD");
    const target_dir = path.join(data_dir, date_str)
    const target_path = path.join(target_dir, file_name);
    await fs.mkdir(target_dir, {recursive: true});
    await fs.writeFile(target_path, file);
    socket.emit("uploaded", rel(target_path));

    const mp3_path = target_path + ".mp3";
    await exec(`ffmpeg -i "${target_path}" "${mp3_path}"`);
    socket.emit("converted", rel(target_path), rel(mp3_path));

    const output_dir = path.join(path.dirname(target_path), "output");
    await exec(`spleeter separate -p spleeter:2stems -o "${output_dir}" "${mp3_path}"`);
    socket.emit("split", rel(target_path), rel(path.join(output_dir, path.basename(target_path), "vocals.wav")));
  });
});

app.get('/', function (req, res) {
  res.sendFile("index.html", {root: __dirname});
});

server.listen("80");