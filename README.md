# Geometry Dash (Clone)

Clone jogável inspirado em Geometry Dash — HTML5 Canvas + JavaScript puro.

## Como jogar

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
