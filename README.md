# 青のBackgroundMusic

A script for generating the `t_bgm._dt` file that contains the loop timing information for [Ao no Kiseki](https://en.wikipedia.org/wiki/The_Legend_of_Heroes:_Ao_no_Kiseki).

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

## Decoding example: the original Crossbell City music

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

## Encoding example: the OST version of the Crossbell City music

Updating this file so that the background loops work for different music, and specifically the OST versions of each track, is mostly a matter of figuring out what makes for a good loop interval, writing down the sample numbers for the loop start and end, and then updating `t_bgm._dt` with the new `{start, length = end - start}` values.

For my copy of the OST version of the Crossbell City theme, and the track loop points are at samples 480,199 (~0m10) and 5,520,176 (~1m55) for start and end respectively, which means the loop length is 5,520,176 - 48,0199 = 5,039,977.

In hex, those start and length values are `0x000753C7` and `0x004CE769`, which means LSB`xC7530700` and LSB`x69E74C00`, so the new full entry would be:

| A1 | A2 | A3 | A4 | B1 | B2 | B3 | B4 | C1 | C2 | C3 | C4 | X1 | X2 | Y1 | Y2 |
|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| **C7** | **53** | **07** | **00** | **69** | **E7** | **4C** | **00** | EE | 1B | 00 | 00 | 96 | 00 | 01 | 00 |

