"use client";

import type Hls from "hls.js";
import type { Level } from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { PreRollAd } from "./PreRollAd";
import {
  FullscreenIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  SettingsIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "./player-icons";

type Status = "idle" | "ad" | "loading" | "playing" | "paused" | "error";

interface VideoPlayerProps {
  src: string;
  title: string;
  isLive: boolean;
  /** المشتركون: بدون إعلان قبل البث */
  isPremium: boolean;
  poster?: string;
}

const MAX_NETWORK_RETRIES = 3;
const CONTROLS_HIDE_MS = 3000;

/**
 * مشغل بث يدعم HLS (.m3u8):
 * - hls.js في المتصفحات التي تدعم MediaSource (Chrome, Firefox, Edge, Android)
 * - التشغيل الأصلي في Safari / iOS
 * - اختيار الجودة، العودة للبث المباشر، ملء الشاشة، صورة داخل صورة، اختصارات لوحة المفاتيح
 * - استعادة تلقائية من أخطاء الشبكة والوسائط
 */
export function VideoPlayer({ src, title, isLive, isPremium, poster }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retriesRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = تلقائي
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [showQuality, setShowQuality] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [behindLive, setBehindLive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, duration: 0, buffered: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ---------- تحميل المصدر ----------
  const destroy = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const load = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    destroy();
    setError(null);
    setStatus("loading");
    retriesRef.current = 0;

    const { default: HlsLib } = await import("hls.js");

    if (HlsLib.isSupported()) {
      const hls = new HlsLib({
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 30 : 90,
        liveSyncDurationCount: 3,
      });
      hlsRef.current = hls;

      hls.on(HlsLib.Events.MANIFEST_PARSED, (_e, data) => {
        setLevels(data.levels);
        video.play().catch(() => setStatus("paused"));
      });
      hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => {
        setActiveHeight(hls.levels[data.level]?.height ?? null);
      });
      hls.on(HlsLib.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR && retriesRef.current < MAX_NETWORK_RETRIES) {
          retriesRef.current++;
          setTimeout(() => hls.startLoad(), 1000 * retriesRef.current);
        } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          destroy();
          setStatus("error");
          setError("تعذّر تحميل البث. تحقق من اتصالك ثم أعد المحاولة.");
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: دعم HLS أصلي
      video.src = src;
      video.play().catch(() => setStatus("paused"));
    } else {
      setStatus("error");
      setError("متصفحك لا يدعم تشغيل البث المباشر.");
    }
  }, [destroy, isLive, src]);

  useEffect(() => destroy, [destroy]);

  const start = () => {
    if (!isPremium) setStatus("ad");
    else void load();
  };

  // ---------- أحداث عنصر الفيديو ----------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => setStatus("playing");
    const onPause = () => setStatus((s) => (s === "error" ? s : "paused"));
    const onWaiting = () => setStatus("loading");
    const onVolume = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const onTime = () => {
      const buffered = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
      setProgress({ current: video.currentTime, duration: video.duration, buffered });
      const hls = hlsRef.current;
      if (isLive && hls?.liveSyncPosition) setBehindLive(hls.liveSyncPosition - video.currentTime > 10);
    };
    const onNativeError = () => {
      if (hlsRef.current) return; // hls.js يتعامل مع أخطائه
      setStatus("error");
      setError("تعذّر تشغيل البث.");
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("error", onNativeError);
    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("error", onNativeError);
    };
  }, [isLive]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ---------- أوامر التحكم ----------
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else video?.webkitEnterFullscreen?.(); // iOS
  }, []);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  };

  const goLive = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;
    video.currentTime = hls?.liveSyncPosition ?? video.seekable.end(video.seekable.length - 1);
    void video.play();
  };

  const selectLevel = (level: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level;
    setCurrentLevel(level);
    setShowQuality(false);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) video.currentTime = Number(e.target.value);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Number(e.target.value);
    video.muted = video.volume === 0;
  };

  // ---------- إظهار/إخفاء أدوات التحكم ----------
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (status === "idle" || status === "ad") return;
    const key = e.key.toLowerCase();
    if (key === " " || key === "k") togglePlay();
    else if (key === "m") toggleMute();
    else if (key === "f") toggleFullscreen();
    else return;
    e.preventDefault();
    revealControls();
  };

  const started = status !== "idle" && status !== "ad";
  const showControls = started && status !== "error" && (controlsVisible || status === "paused");
  const isVod = !isLive && Number.isFinite(progress.duration) && progress.duration > 0;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`مشغل البث: ${title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      className={`group relative aspect-video w-full overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isFullscreen ? "" : "rounded-2xl"
      } ${started && !showControls ? "cursor-none" : ""}`}
    >
      <video
        ref={videoRef}
        className="size-full"
        playsInline
        poster={poster}
        onClick={started ? togglePlay : undefined}
        aria-label={title}
      />

      {/* شاشة البداية */}
      {status === "idle" && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/80 via-black/40 to-black/20 text-white"
        >
          <span className="grid size-18 place-items-center rounded-full bg-brand text-brand-fg shadow-lg shadow-brand/30 transition group-hover:scale-110">
            <PlayIcon width={30} height={30} />
          </span>
          <span className="text-sm font-bold">{isLive ? "شاهد البث المباشر" : "شاهد المباراة"}</span>
        </button>
      )}

      {/* إعلان قبل البث (النسخة المجانية) */}
      {status === "ad" && <PreRollAd onDone={() => void load()} />}

      {/* مؤشر التحميل */}
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="size-12 animate-spin rounded-full border-4 border-white/20 border-t-brand" aria-label="جارٍ التحميل" />
        </div>
      )}

      {/* حالة الخطأ */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 text-center text-white">
          <p className="text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-fg"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* شارة مباشر */}
      {started && isLive && status !== "error" && (
        <button
          type="button"
          onClick={goLive}
          disabled={!behindLive}
          className={`absolute top-3 start-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-white transition ${
            behindLive ? "bg-black/60 hover:bg-live" : "bg-live"
          }`}
          title={behindLive ? "العودة إلى البث المباشر" : "مباشر"}
        >
          <span className="size-1.5 rounded-full bg-white" />
          {behindLive ? "العودة للمباشر" : "مباشر"}
        </button>
      )}

      {/* شريط التحكم — اتجاهه LTR مثل أغلب المشغلات */}
      <div
        dir="ltr"
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-300 ${
          showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {isVod && (
          <div className="relative mb-1 h-4">
            <div className="absolute top-1.5 h-1 w-full rounded bg-white/20">
              <div className="h-full rounded bg-white/30" style={{ width: `${(progress.buffered / progress.duration) * 100}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={progress.duration}
              step={0.1}
              value={progress.current}
              onChange={seek}
              aria-label="التقدم"
              className="absolute inset-0 w-full cursor-pointer accent-brand"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <ControlButton label={status === "playing" ? "إيقاف مؤقت (K)" : "تشغيل (K)"} onClick={togglePlay}>
            {status === "playing" ? <PauseIcon /> : <PlayIcon />}
          </ControlButton>

          <div className="group/vol flex items-center">
            <ControlButton label={muted ? "إلغاء الكتم (M)" : "كتم (M)"} onClick={toggleMute}>
              {muted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={changeVolume}
              aria-label="مستوى الصوت"
              className="w-0 cursor-pointer accent-brand opacity-0 transition-all group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100"
            />
          </div>

          {isVod && (
            <span className="ms-2 text-xs tabular-nums text-white/80">
              {formatTime(progress.current)} / {formatTime(progress.duration)}
            </span>
          )}

          <div className="ms-auto flex items-center gap-1">
            {levels.length > 1 && (
              <div className="relative">
                <ControlButton label="الجودة" onClick={() => setShowQuality((v) => !v)}>
                  <SettingsIcon />
                  <span className="text-[10px] font-bold">
                    {currentLevel === -1 ? `Auto${activeHeight ? ` ${activeHeight}p` : ""}` : `${levels[currentLevel]?.height}p`}
                  </span>
                </ControlButton>
                {showQuality && (
                  <ul role="menu" className="absolute end-0 bottom-11 min-w-32 overflow-hidden rounded-lg bg-black/90 py-1 text-sm ring-1 ring-white/10">
                    {[{ index: -1, label: "تلقائي" }, ...levels.map((l, i) => ({ index: i, label: `${l.height}p` }))]
                      .reverse()
                      .map((option) => (
                        <li key={option.index}>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={currentLevel === option.index}
                            onClick={() => selectLevel(option.index)}
                            className={`w-full px-4 py-1.5 text-start hover:bg-white/10 ${
                              currentLevel === option.index ? "font-bold text-brand" : ""
                            }`}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
            <ControlButton label="صورة داخل صورة" onClick={() => void togglePip()}>
              <PipIcon />
            </ControlButton>
            <ControlButton label="ملء الشاشة (F)" onClick={toggleFullscreen}>
              <FullscreenIcon />
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-1.5 transition hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
