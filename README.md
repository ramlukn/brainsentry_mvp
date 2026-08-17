# BrainSentry

A stroke self-check on a phone, as a demo site. I designed it and co-built it; it was presented to the health ministries of Indonesia and South Sudan for potential collaboration.

**Live: [brainsentry-mvp.vercel.app](https://brainsentry-mvp.vercel.app)**

It is a proof of concept with no scoring behind it yet. What it demonstrates is the instrument set: the camera runs timed face-exam prompts, the microphone drives a live waveform through a Web Audio analyser, the analysing screen draws a globe in WebGL, and a trends view plots each reading against a baseline.

## Built with

React and Vite, with no server behind it — one client bundle and a hand-rolled History API router. The face step drives `getUserMedia` through timed prompts; the voice step reads the live `MediaStream` into a Web Audio analyser; the globe is react-three-fiber over world-atlas topology, code-split and fetched the moment a check begins.

## Run it

```
npm install
npm run dev
```
