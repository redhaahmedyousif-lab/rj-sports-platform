#!/usr/bin/env bash
# بث HLS مباشر محلي (720p + 360p) لاختبار المشغل — يتطلب ffmpeg و python3
# الاستخدام: bash scripts/dev-hls-stream.sh   ثم الرابط: http://localhost:8090/master.m3u8
set -euo pipefail
DIR="${HLS_DIR:-/tmp/goalmood-hls}"
PORT=8090

if python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1', $PORT)) == 0 else 1)"; then
  echo "المنفذ $PORT مستخدم بالفعل — أوقف البث السابق أولاً" >&2
  exit 1
fi
mkdir -p "$DIR" && rm -f "$DIR"/*.ts "$DIR"/*.m3u8

ffmpeg -nostdin -hide_banner -loglevel error -re \
  -f lavfi -i "testsrc2=size=1280x720:rate=25" -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -filter_complex "[0:v]split=2[v1][v2];[v2]scale=640:360[v2o]" \
  -map "[v1]" -map "[v2o]" -map 1:a -map 1:a \
  -c:v libx264 -preset veryfast -g 50 -sc_threshold 0 -c:a aac -b:a 96k -b:v:0 2500k -b:v:1 800k \
  -f hls -hls_time 2 -hls_list_size 6 -hls_flags delete_segments+independent_segments \
  -master_pl_name master.m3u8 -var_stream_map "v:0,a:0 v:1,a:1" "$DIR/stream_%v.m3u8" < /dev/null &
FFMPEG_PID=$!
trap 'kill $FFMPEG_PID 2>/dev/null' EXIT

python3 -I - "$DIR" <<'PY'
import http.server, os, sys
os.chdir(sys.argv[1])
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
    def log_message(self, *a): pass
print("HLS: http://localhost:8090/master.m3u8")
http.server.ThreadingHTTPServer(("127.0.0.1", 8090), H).serve_forever()
PY
