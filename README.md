# Geometry Dash (Clone)

Clone jogável inspirado em Geometry Dash — HTML5 Canvas + JavaScript puro.

## Jogar online

- **Vercel:** https://geometry-dash-five.vercel.app
- **GitHub Pages:** https://contatomkmnz-oss.github.io/geometry-dash/
- **Repo:** https://github.com/contatomkmnz-oss/geometry-dash

## Como jogar localmente

Abra um servidor local na pasta do projeto (módulos ES não funcionam em `file://`):

```bash
cd C:\Users\Maciel\Games\geometry-dash
npx --yes serve -p 5188
```

Depois abra: http://localhost:5188

## Controles

- **Espaço / Clique / Toque** — ação do modo
- **P** — modo prática
- **Z** — checkpoint (prática)
- **Esc** — pausar

## Conteúdo

- 8 níveis (Stereo Madness → Time Machine)
- Modos: Cubo, Nave, Bola, UFO, Wave
- Orbs, pads, portais e gravidade
- Progresso, estrelas e ícones no `localStorage`
- Música e SFX via Web Audio API
- Pulo duplo no modo Cubo
