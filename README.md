# 青のBackgroundMusic

A script for generating the `t_bgm._dt` file that contains the loop timing information for [Ao no Kiseki](https://en.wikipedia.org/wiki/The_Legend_of_Heroes:_Ao_no_Kiseki).

Current `t_bgm._dt` status: 100%, with the following md5 identities:

| file name  |              md5                 |
|------------|----------------------------------|
| ed7052.ogg | 9b44d5415629d8645f6435b0ba7cc68d |
| ed7053.ogg | 6cdbe3086b35f6bef722af22008e038c |
| ed7150.ogg | 5756289c8b238c5ab6ed2765546d1f6c |
| ed7250.ogg | 3ec63c86d3aaf57f8bda5f0e41e133c4 |
| ed7350.ogg | c89b71573489c11051636f36cfdeb499 |
| ed7450.ogg | 1dae406c644b18d2800c7a3e022202f4 |
| ed7550.ogg | 8e1d779283e33d6d0a6fd0f58e799ac9 |


## Using the `t_bgm._dt` generator

Copy your `t_bgm._dt` from the `./data/text` dir into your `./data/bgm` dir, then rename it to `data.bin`.
Then, also put this repo's `generate.js` and `intervals.json` in the `./data/bgm` dir. Then:

1. update `intervals.json` with values that work for your background music, then
2. run `node generate.js` to get a new `t_bgm._dt` file, then
3. copy that file back into your `./data/text` directory

Note that this script requires Node.js, which is best installed using NVM (not the nodejs.org installer, apt, homebrew, or anything else. For Node, use the `nvm` system).

#### Installing Node on windows:

1. Install the latest [nvm-windows](https://github.com/coreybutler/nvm-windows/releases).
2. In a command prompt, run `nvm install latest`, then `nvm use latest`.

There is no step 3, you now have the latest version of Node installed.

#### Installing Node on something unixy:

1. [Install `nvm`](https://github.com/nvm-sh/nvm#installing-and-updating).
2. In a terminal, run `nvm install latest`, then `nvm use latest`.

There is no step 3, you now have the latest version of Node installed.


## Generation options

- the original data file has duplicate entries: this generator removes those.
- if a track should not loop according to the original data file, that entry gets skipped. You may notice that the `intervals.json` has the key:value pair `"standalone": true` for those tracks, but that's purely cosmetic.
- if a track has a `start` or `end` value set to `false`, it will be given a start value `0` and a length value equal to the number of samples in the track.
- if a track has a `"substitute": { id: <number> }` the normal start and end values will be ignored, and instead the start and end values for that substitute will be used instead. This is useful if there is a track that you really hate: rename that track to `originalfilename.ogg.old` and then copy-and-rename one of the other tracks that you do like and is close enough in role to the track you hated. I use this for `ed7405.ogg`, which is hot garbage because of its use of an almost pure sine wave synth used not even for bass notes, but a bass melody. It's absolutely ridiculous and whoever okayed that track should be ashamed of themselves.


## Data format

This file is a pure data file without header, representing an array of entries of the form:

|  type  |  description                         |
|--------|--------------------------------------|
| ULONG  | loop start, as sample number         |
| ULONG  | loop length, as samples number       |
| ULONG  | file id                              |
| USHORT | track shortcode (used in the fileid) |
| USHORT | should-loop indicatod (0=no, 1=yes)  |

All values are encoded using Little Endian (Least Signficicant Byte First) ordering.


### Decoding example: the original Crossbell City music

This track is stored on disk as `ed7150.ogg`, and so we know its id is `7150`. Normally that'd be `0x1BEE` in hex, and more specifically `0x00001BEE` as ULONG, but this file uses Little Endian so we need to reverse the byte ordering: `0xEE1B0000`.

If we search the `t_bgm._dt` file for that value with a hex editor (protip: Microsoft actually made one for VS Code themselves, and you probably want to install it. It's called [HexEditor](https://marketplace.visualstudio.com/items?itemName=ms-vscode.hexeditor)) we find the full 16 byte entry for this background track at hex position 0x0270:

| A1 | A2 | A3 | A4 | B1 | B2 | B3 | B4 | C1 | C2 | C3 | C4 | X1 | X2 | Y1 | Y2 |
|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| 74 | 8F | 07 | 00 | 98 | 64 | 47 | 00 | **EE** | **1B** | **00** | **00** | 96 | 00 | 01 | 00 |

So, we know that:

- This song should jump to sample LSB`x748F0700` = `0x00078F74` = 49,5476 (which is around 0m11)
- The looping interval spans LSB`x98644700` = `0x00476498` = 4,678,808 samples from its starting point (ending around 1m57)
- The file id is LSB`xEE1B0000` = `0x00001Bee` = 7150 (which we knew already)
- The track shortcode is LSB`x9600` = `0x96` = 150 (which we also knew already)
- The loop indicator is set to LSB`x0100` = `0x0001` = 1: this track should loop.

We can verify that these values are indeed what we're looking for by loading up the original `ed7150.ogg` in an audio editor and creating a loop region set to `{start, end = start + length}`: it loops perfectly.


### Encoding example: the OST version of the Crossbell City music

Updating this file so that the background loops work for different music, and specifically the OST versions of each track, is mostly a matter of figuring out what makes for a good loop interval, writing down the sample numbers for the loop start and end, and then updating `t_bgm._dt` with the new `{start, length = end - start}` values.

For my copy of the OST version of the Crossbell City theme, and the track loop points are at samples 480,199 (~0m10) and 5,520,176 (~1m55) for start and end respectively, which means the loop length is 5,520,176 - 48,0199 = 5,039,977.

In hex, those start and length values are `0x000753C7` and `0x004CE769`, which means LSB`xC7530700` and LSB`x69E74C00`, so the new full entry would be:

| A1 | A2 | A3 | A4 | B1 | B2 | B3 | B4 | C1 | C2 | C3 | C4 | X1 | X2 | Y1 | Y2 |
|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| **C7** | **53** | **07** | **00** | **69** | **E7** | **4C** | **00** | EE | 1B | 00 | 00 | 96 | 00 | 01 | 00 |

