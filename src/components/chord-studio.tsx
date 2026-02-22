"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Progression, ChatMessage, MelodyNote } from "@/lib/types";
import { DEFAULT_PROGRESSIONS } from "@/lib/constants";
import {
  ensureAudioGraph,
  getMasterGain,
  getBassBus,
  getDrumGain,
  getHatPanner,
  setMasterVol as setMasterVolAudio,
} from "@/lib/audio-engine";
import { playVoice } from "@/lib/voices";
import {
  playDrum,
  initSamplePlayer,
  getSamplePlayer,
  setDrumEngineMode,
} from "@/lib/drums";
import type { DrumEngineMode } from "@/lib/audio/drums/types";
import { getPackForGenre } from "@/lib/audio/drums/genre-pack-map";
import { chordToMidi, normalizeToDisplayRange } from "@/lib/chord-utils";
import { generateMelody, playMelodyNote } from "@/lib/melody-engine";
import { LookaheadScheduler } from "@/lib/scheduler";
import { triggerSidechainDuck } from "@/lib/effects";
import type { StepGridPattern } from "@/lib/drums/pattern-library";
import {
  stepGridToDrumPattern,
  PATTERN_MAP,
} from "@/lib/drums/pattern-library";
import { useDrumRecommendations } from "@/hooks/useDrumRecommendations";
import { useDrumPreview } from "@/hooks/useDrumPreview";
import {
  updateMixState,
  setDrumIntensity as setMixDrumIntensity,
  setMelodyPriority as setMixMelodyPriority,
} from "@/lib/mix-engine";
import BackgroundCanvas from "./background-canvas";
import LoadingScreen from "./loading-screen";
import Header from "./header";
import ChatPanel from "./chat-panel";
import QuickTags from "./quick-tags";
import MetaCards from "./meta-cards";
import PianoRipple from "./piano-ripple";
import TransportBar from "./transport-bar";
import ChordCard from "./chord-card";
import MidiExport from "./midi-export";
import DrumPatternSelector from "./drum-pattern-selector";
import DrumColumn from "./drum-kit/drum-kit";
import {
  LEFT_COLUMN_PIECES,
  RIGHT_COLUMN_PIECES,
} from "./drum-kit/drum-kit-types";
import { useDrumKitState } from "@/hooks/useDrumKitState";
import { useInstrumentRecommendations } from "@/hooks/useInstrumentRecommendations";
import InstrumentBrowser from "./instrument-browser";

interface PlaybackRef {
  scheduler: LookaheadScheduler | null;
  melodyNotes: MelodyNote[];
  defaultIdx: number;
  playing: boolean;
  progression: Progression | null;
  instrument: string;
  drumsOn: boolean;
  melodyOn: boolean;
}

export default function ChordStudio() {
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hello. Describe your sound \u2014 genre, mood, key, BPM \u2014 and I\u2019ll compose a progression with drums, bass, and melody.",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [progression, setProgression] = useState<Progression | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [drumsOn, setDrumsOn] = useState(true);
  const [melodyOn, setMelodyOn] = useState(false);
  const [instrument, setInstrument] = useState("piano");
  const [tempo, setTempo] = useState(120);
  const [masterVol, setMasterVol] = useState(80);
  const [melodyStyle, setMelodyStyle] = useState("none");
  const [drumEngine, setDrumEngine] = useState<DrumEngineMode>("samples");
  const [activeChordIdx, setActiveChordIdx] = useState(-1);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);

  // Drum pattern system state
  const [drumPatternPanelOpen, setDrumPatternPanelOpen] = useState(false);
  const [activeStepGridPattern, setActiveStepGridPattern] =
    useState<StepGridPattern | null>(null);
  const [drumIntensity, setDrumIntensity] = useState(70);
  const [humanizeOn, setHumanizeOn] = useState(false);
  const [randomVariation, setRandomVariation] = useState(false);
  const [melodyPriority, setMelodyPriority] = useState(true);
  const [autoMix, setAutoMix] = useState(true);
  const [activeStep, setActiveStep] = useState(-1);

  const playbackRef = useRef<PlaybackRef>({
    scheduler: null,
    melodyNotes: [],
    defaultIdx: 0,
    playing: false,
    progression: null,
    instrument: "piano",
    drumsOn: true,
    melodyOn: false,
  });

  // Drum recommendations
  const recommendations = useDrumRecommendations(progression);
  const { togglePreview, stopPreview } = useDrumPreview();

  // Drum kit mute/solo state
  const drumKitState = useDrumKitState();

  // Instrument browser state
  const [instrumentBrowserOpen, setInstrumentBrowserOpen] = useState(false);
  const [recentInstruments, setRecentInstruments] = useState<string[]>([
    "piano", "synth", "bass", "pad", "pluck", "epiano",
  ]);
  const instrumentRecs = useInstrumentRecommendations(progression);

  // Sync vol to audio engine
  useEffect(() => {
    if (getMasterGain()) setMasterVolAudio(masterVol / 100);
  }, [masterVol]);

  // Sync mix engine state
  useEffect(() => {
    setMixDrumIntensity(drumIntensity / 100);
  }, [drumIntensity]);

  useEffect(() => {
    setMixMelodyPriority(melodyPriority);
  }, [melodyPriority]);

  useEffect(() => {
    updateMixState({ autoMix });
  }, [autoMix]);

  // ─── APPLY DRUM PATTERN ───
  const handleApplyDrumPattern = useCallback(
    (patternId: string) => {
      const pattern = PATTERN_MAP[patternId];
      if (!pattern || !progression) return;

      setActiveStepGridPattern(pattern);
      stopPreview();

      const drumPattern = stepGridToDrumPattern(pattern, {
        intensityScale: drumIntensity / 100,
        humanize: humanizeOn,
        humanizeAmount: 0.5,
        swingPercent: progression.swing || 0,
        applyProbability: randomVariation,
      });

      const updated = { ...progression, drums: drumPattern };
      setProgression(updated);
      playbackRef.current.progression = updated;

      // Update scheduler steps per bar for visual cursor
      if (playbackRef.current.scheduler) {
        playbackRef.current.scheduler.setStepsPerBar(pattern.totalSteps);
      }

      setDrumPatternPanelOpen(false);
    },
    [progression, drumIntensity, humanizeOn, randomVariation, stopPreview],
  );

  // Re-convert pattern when intensity/humanize/variation changes
  useEffect(() => {
    if (!activeStepGridPattern || !progression) return;

    const drumPattern = stepGridToDrumPattern(activeStepGridPattern, {
      intensityScale: drumIntensity / 100,
      humanize: humanizeOn,
      humanizeAmount: 0.5,
      swingPercent: progression.swing || 0,
      applyProbability: randomVariation,
    });

    const updated = { ...progression, drums: drumPattern };
    setProgression(updated);
    playbackRef.current.progression = updated;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drumIntensity, humanizeOn, randomVariation]);

  const handlePreviewPattern = useCallback(
    (patternId: string) => {
      const pattern = PATTERN_MAP[patternId];
      if (!pattern) return;
      const bpm = progression?.tempo || 120;
      togglePreview(pattern, bpm);
    },
    [progression?.tempo, togglePreview],
  );

  // ─── PLAYBACK ENGINE ───
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setActiveChordIdx(-1);
    setActiveNotes([]);
    setActiveStep(-1);
    const ref = playbackRef.current;
    if (ref.scheduler) {
      ref.scheduler.stop();
    }
    ref.playing = false;
  }, []);

  const startPlayback = useCallback(() => {
    if (!progression) return;
    const ref = playbackRef.current;
    const ctx = ensureAudioGraph();

    // Initialize sample player if not yet created
    if (!getSamplePlayer()) {
      const drumGain = getDrumGain();
      if (drumGain) {
        const player = initSamplePlayer(ctx, drumGain);
        // Set hat destination for stereo routing
        const hatPanner = getHatPanner();
        if (hatPanner) player.setHatDestination(hatPanner);
        // Preload common pack + genre pack
        const genre = progression.genre || "";
        const packId = getPackForGenre(genre);
        player.loadPack(packId).catch(() => {
          // Silently fall back to synth if samples fail to load
        });
      }
    }

    ref.playing = true;
    ref.progression = progression;
    ref.instrument = instrument;
    ref.drumsOn = drumsOn;
    ref.melodyOn = melodyOn;

    if (melodyStyle !== "none") {
      ref.melodyNotes = generateMelody(
        progression.chords,
        progression.key || "C",
        melodyStyle,
      );
    } else {
      ref.melodyNotes = [];
    }

    const bpm = progression.tempo || 120;
    const totalBars = progression.bars || progression.chords.length;

    // Create scheduler with bar callback + visual step callback
    const scheduler = new LookaheadScheduler(
      ctx,
      ({ barIndex, barStartTime }) => {
        if (!ref.playing || !ref.progression) return;
        const prog = ref.progression;
        const spb = 60 / (prog.tempo || 120);
        const barDur = spb * 4;
        const numChords = prog.chords.length;

        const chord = prog.chords[barIndex % numChords];
        const midiNotes = chordToMidi(chord);

        // Schedule voices
        midiNotes.forEach((midi) => {
          const freq = 440 * Math.pow(2, (midi - 69) / 12);
          playVoice(ref.instrument || "piano", freq, barStartTime, barDur);
        });

        // Drums with velocity
        if (ref.drumsOn && prog.drums) {
          const d = prog.drums;
          const pl = d.patternLengthBeats || 4;
          const swing = (prog.swing || 0) / 100;
          const swOff = (pos: number) =>
            [0.5, 1.5, 2.5, 3.5].some((b) => Math.abs(pos - b) < 0.02)
              ? swing * (spb / 3)
              : 0;

          const schedWithVel = (
            arr: number[],
            vels: number[] | undefined,
            type: string,
          ) =>
            arr.forEach((pos, i) => {
              const vel = vels && vels[i] !== undefined ? vels[i] : 1.0;
              const time = barStartTime + (pos % pl) * spb + swOff(pos);
              playDrum(type, time, vel);

              // Trigger sidechain duck on bass bus when kick plays
              if (type === "kick") {
                const bassBus = getBassBus();
                if (bassBus) {
                  triggerSidechainDuck(bassBus.input, time);
                }
              }
            });

          schedWithVel(d.kicks || [], d.kickVels, "kick");
          schedWithVel(d.snares || [], d.snareVels, "snare");
          schedWithVel(d.hihats || [], d.hihatVels, "hihat");
          schedWithVel(d.claps || [], d.clapVels, "clap");
          schedWithVel(d.ohats || [], d.ohatVels, "ohat");
          // Extended drum types
          schedWithVel(d.crashes || [], d.crashVels, "crash");
          schedWithVel(d.rides || [], d.rideVels, "ride");
          schedWithVel(d.highToms || [], d.highTomVels, "high_tom");
          schedWithVel(d.midToms || [], d.midTomVels, "mid_tom");
          schedWithVel(d.floorToms || [], d.floorTomVels, "floor_tom");
        }

        // Melody
        if (ref.melodyOn && ref.melodyNotes.length) {
          const spb = 60 / (prog.tempo || 120);
          ref.melodyNotes
            .filter((n) => n.bar === barIndex)
            .forEach((n) => {
              playMelodyNote(
                n.midi,
                barStartTime + n.beatOffset * spb,
                n.durationBeats * spb,
              );
            });
        }
      },
      // Visual bar update callback
      (barIndex) => {
        if (!ref.playing || !ref.progression) return;
        const numChords = ref.progression.chords.length;
        const chordIdx = barIndex % numChords;
        const chord = ref.progression.chords[chordIdx];
        const midiNotes = chordToMidi(chord);
        setActiveChordIdx(chordIdx);
        setActiveNotes(normalizeToDisplayRange(midiNotes));
      },
      // Visual step update callback
      (_barIndex, step) => {
        setActiveStep(step);
      },
    );

    // Set steps per bar based on active pattern
    if (activeStepGridPattern) {
      scheduler.setStepsPerBar(activeStepGridPattern.totalSteps);
    }

    ref.scheduler = scheduler;
    setIsPlaying(true);
    scheduler.start(bpm, totalBars);
  }, [
    progression,
    instrument,
    drumsOn,
    melodyOn,
    melodyStyle,
    activeStepGridPattern,
  ]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  // Sync ref values without restarting playback
  useEffect(() => {
    playbackRef.current.instrument = instrument;
  }, [instrument]);
  useEffect(() => {
    playbackRef.current.drumsOn = drumsOn;
  }, [drumsOn]);
  useEffect(() => {
    playbackRef.current.melodyOn = melodyOn;
  }, [melodyOn]);
  useEffect(() => {
    if (progression) {
      const p = { ...progression, tempo };
      playbackRef.current.progression = p;
      if (playbackRef.current.scheduler) {
        playbackRef.current.scheduler.updateBpm(tempo);
        const totalBars = p.bars || p.chords.length;
        playbackRef.current.scheduler.updateTotalBars(totalBars);
      }
    }
  }, [tempo, progression]);

  // ─── AI BACKEND ───
  const conversationRef = useRef<{ role: string; content: string }[]>([]);

  const sendMessage = async (msg: string) => {
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setIsThinking(true);
    try {
      conversationRef.current.push({ role: "user", content: msg });
      const res = await fetch("/api/chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory: conversationRef.current,
          userMessage: msg,
          currentProgression: progression || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Backend error");
      const data = await res.json();
      conversationRef.current.push({
        role: "assistant",
        content: data.raw || data.message,
      });
      setMessages((m) => [...m, { role: "ai", content: data.message }]);
      if (data.progression) {
        setProgression(data.progression);
        setTempo(data.progression.tempo || 120);
        setActiveStepGridPattern(null); // reset active pattern on new progression
        // Apply AI-suggested instrument if valid
        if (data.suggestedInstrument) {
          handleInstrumentChange(data.suggestedInstrument);
        }
        // Preload genre-specific sample pack
        const player = getSamplePlayer();
        if (player) {
          const packId = getPackForGenre(data.progression.genre || "");
          player.loadPack(packId).catch(() => {});
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          content: `<span style="color:var(--color-rose)">Connection error. Make sure your OPENAI_API_KEY is set.</span>`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const loadDefault = () => {
    const ref = playbackRef.current;
    const prog = JSON.parse(
      JSON.stringify(
        DEFAULT_PROGRESSIONS[ref.defaultIdx % DEFAULT_PROGRESSIONS.length],
      ),
    );
    ref.defaultIdx = (ref.defaultIdx || 0) + 1;
    setProgression(prog);
    setTempo(prog.tempo);
    setActiveStepGridPattern(null);
    setMessages((m) => [
      ...m,
      {
        role: "ai",
        content: `Loaded: <strong style="color:var(--color-gold)">${prog.label}</strong> \u2014 ${prog.key}, ${prog.tempo} BPM, ${prog.chords.join(" \u2192 ")}`,
      },
    ]);
  };

  const updateTempo = (v: number) => {
    setTempo(v);
    if (progression) {
      const p = { ...progression, tempo: v };
      setProgression(p);
      playbackRef.current.progression = p;
      if (playbackRef.current.scheduler) {
        playbackRef.current.scheduler.updateBpm(v);
      }
    }
  };

  const updateSwing = (v: number) => {
    if (!progression) return;
    const p = { ...progression, swing: v };
    setProgression(p);
    playbackRef.current.progression = p;

    // Re-convert active pattern with new swing
    if (activeStepGridPattern) {
      const drumPattern = stepGridToDrumPattern(activeStepGridPattern, {
        intensityScale: drumIntensity / 100,
        humanize: humanizeOn,
        humanizeAmount: 0.5,
        swingPercent: v,
        applyProbability: randomVariation,
      });
      const updated = { ...p, drums: drumPattern };
      setProgression(updated);
      playbackRef.current.progression = updated;
    }
  };

  const editChord = (idx: number, newChord: string) => {
    if (!progression) return;
    const chords = [...progression.chords];
    chords[idx] = newChord;
    const p = { ...progression, chords };
    setProgression(p);
    playbackRef.current.progression = p;
  };

  const handleInstrumentChange = useCallback((id: string) => {
    setInstrument(id);
    setRecentInstruments((prev) => {
      const filtered = prev.filter((x) => x !== id);
      return [id, ...filtered].slice(0, 8);
    });
  }, []);

  const handleDrumEngine = (mode: DrumEngineMode) => {
    setDrumEngine(mode);
    setDrumEngineMode(mode);
  };

  const handleMelodyStyle = (style: string) => {
    setMelodyStyle(style);
    setMelodyOn(style !== "none");
    if (progression && style !== "none") {
      playbackRef.current.melodyNotes = generateMelody(
        progression.chords,
        progression.key || "C",
        style,
      );
      playbackRef.current.melodyOn = true;
    } else {
      playbackRef.current.melodyNotes = [];
      playbackRef.current.melodyOn = false;
    }
  };

  return (
    <>
      <BackgroundCanvas />

      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}

      <div
        className="fixed inset-0 overflow-y-auto z-10 transition-all duration-[1100ms] ease-out"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "scale(0.97)",
        }}
      >
        <div className="max-w-[920px] mx-auto px-5 pb-15">
          <Header connected={true} />

          <div className="pt-6 flex flex-col gap-[18px]">
            {/* Quick tags */}
            <QuickTags onSelect={sendMessage} onDefault={loadDefault} />

            {/* Chat */}
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              onSend={sendMessage}
            />

            {/* Progression panel */}
            {progression && (
              <div
                className="result-appear relative overflow-hidden rounded-[20px] p-6"
                style={{
                  background: "rgba(8,8,12,0.88)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Top shimmer border */}
                <div className="shimmer-line absolute top-0 left-0 right-0 h-px" />

                <h2 className="font-display font-normal text-[1.35rem] text-gold mb-[18px] tracking-[0.04em]">
                  Your Progression
                </h2>

                {/* Meta cards */}
                <MetaCards
                  genre={progression.genre}
                  mood={progression.mood}
                  tempo={tempo}
                  keyName={progression.key}
                />

                {/* Keyboard + Drums */}
                <div
                  className="overflow-hidden rounded-[14px] px-4 pt-3.5 pb-2.5 mb-3.5"
                  style={{
                    background: "rgba(4,4,6,0)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="font-mono text-[0.58rem] text-text-dim tracking-[0.18em] uppercase mb-2.5 opacity-70">
                    Keyboard{drumsOn ? " \u00b7 Drums" : ""} &middot; click to
                    play
                  </div>
                  <div className="flex items-center gap-3">
                    {drumsOn && (
                      <DrumColumn
                        pieces={LEFT_COLUMN_PIECES}
                        onTrigger={(type, velocity) => {
                          if (!drumKitState.isAudible(type)) return;
                          const ctx = ensureAudioGraph();
                          playDrum(type, ctx.currentTime, velocity);
                        }}
                        isAudible={drumKitState.isAudible}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <PianoRipple
                        activeNotes={activeNotes}
                        onKeyClick={(midi) => {
                          const ctx = ensureAudioGraph();
                          const freq = 440 * Math.pow(2, (midi - 69) / 12);
                          playVoice(instrument, freq, ctx.currentTime, 1.0);
                          setActiveNotes([midi]);
                          setTimeout(() => setActiveNotes([]), 1200);
                        }}
                      />
                    </div>
                    {drumsOn && (
                      <DrumColumn
                        pieces={RIGHT_COLUMN_PIECES}
                        onTrigger={(type, velocity) => {
                          if (!drumKitState.isAudible(type)) return;
                          const ctx = ensureAudioGraph();
                          playDrum(type, ctx.currentTime, velocity);
                        }}
                        isAudible={drumKitState.isAudible}
                      />
                    )}
                  </div>
                </div>

                {/* Transport */}
                <TransportBar
                  isPlaying={isPlaying}
                  tempo={tempo}
                  instrument={instrument}
                  drumsOn={drumsOn}
                  melodyOn={melodyOn}
                  masterVol={masterVol}
                  melodyStyle={melodyStyle}
                  drumEngine={drumEngine}
                  drumIntensity={drumIntensity}
                  humanizeOn={humanizeOn}
                  swing={progression.swing || 0}
                  randomVariation={randomVariation}
                  melodyPriority={melodyPriority}
                  autoMix={autoMix}
                  hasActivePattern={activeStepGridPattern !== null}
                  recentInstruments={recentInstruments}
                  onPlayToggle={togglePlayback}
                  onTempo={updateTempo}
                  onInstrument={handleInstrumentChange}
                  onDrums={setDrumsOn}
                  onMelody={setMelodyOn}
                  onMasterVol={(v) => {
                    setMasterVol(v);
                    setMasterVolAudio(v / 100);
                  }}
                  onMelodyStyle={handleMelodyStyle}
                  onDrumEngine={handleDrumEngine}
                  onOpenPatterns={() => setDrumPatternPanelOpen(true)}
                  onOpenInstruments={() => setInstrumentBrowserOpen(true)}
                  onDrumIntensity={setDrumIntensity}
                  onHumanize={setHumanizeOn}
                  onSwing={updateSwing}
                  onRandomVariation={setRandomVariation}
                  onMelodyPriority={setMelodyPriority}
                  onAutoMix={setAutoMix}
                />

                {/* Chord cards */}
                <div className="mt-4 mb-1">
                  <div className="font-mono text-[0.58rem] text-text-dim tracking-[0.18em] uppercase mb-2.5 opacity-70">
                    Progression &middot; click card to edit
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {progression.chords.map((chord, i) => (
                      <ChordCard
                        key={i}
                        chord={chord}
                        index={i}
                        isActive={activeChordIdx === i}
                        isPlaying={isPlaying}
                        onEdit={editChord}
                      />
                    ))}
                  </div>
                </div>

                {/* MIDI Export */}
                <MidiExport progression={{ ...progression, tempo }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drum Pattern Selector Overlay */}
      <DrumPatternSelector
        open={drumPatternPanelOpen}
        onClose={() => setDrumPatternPanelOpen(false)}
        recommendations={recommendations?.scores || []}
        activeStep={isPlaying ? activeStep : undefined}
        onPreview={handlePreviewPattern}
        onApply={handleApplyDrumPattern}
      />

      {/* Instrument Browser Overlay */}
      <InstrumentBrowser
        open={instrumentBrowserOpen}
        onClose={() => setInstrumentBrowserOpen(false)}
        currentInstrument={instrument}
        onSelect={handleInstrumentChange}
        recommendations={instrumentRecs?.scores}
      />
    </>
  );
}
