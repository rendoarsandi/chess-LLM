---
name: GameBench
description: A research workbench for inspecting game-based LLM experiments.
colors:
  blue: '#2955d5'
  blue-dark: '#2042a7'
  blue-pale: '#edf2ff'
  surface: '#ffffff'
  canvas: '#f3f5f8'
  ink: '#202d40'
  muted: '#607087'
  line: '#dfe5ed'
  rail: '#f9fafc'
  support-surface: '#eaf0fc'
  field-border: '#cdd7e5'
  focus: '#6085ee'
  button-border: '#d0d9e6'
  button-hover: '#f0f3f8'
  button-hover-border: '#aab9cf'
  icon-hover: '#eaf0f8'
  danger: '#a53437'
  danger-surface: '#fff1f0'
  danger-border: '#e5bdbc'
  connected-ink: '#326246'
  connected-surface: '#f1f8f3'
  connected-border: '#c8dcd0'
  status-running: '#26714a'
  status-completed: '#365ba5'
  status-paused: '#8c601e'
  live: '#2c8758'
  board-light: '#e6ebf0'
  board-dark: '#7790aa'
  board-light-coordinate: '#465b72'
  board-dark-coordinate: '#0d1b2a'
  piece-white: '#fffdf7'
  piece-white-stroke: '#3d4956'
  piece-black: '#26313f'
  piece-black-stroke: '#e6ebee'
  move-highlight: '#f0dc66'
typography:
  display:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: 'clamp(26px, 2.5vw, 38px)'
    fontWeight: 630
    lineHeight: 1.18
    letterSpacing: '-0.035em'
  headline:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: 'clamp(27px, 2.6vw, 35px)'
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: '-0.035em'
  title:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '19px'
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: '-0.025em'
  section:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '14px'
    fontWeight: 620
    lineHeight: 1.5
  body:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '14px'
    lineHeight: 1.7
  control:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '13px'
    fontWeight: 570
  compact-control:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '12px'
    fontWeight: 570
  navigation:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '13px'
    fontWeight: 550
  label:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '12px'
    fontWeight: 550
  data:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '11px'
  caption:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '11px'
    lineHeight: 1.6
  status:
    fontFamily: 'Public Sans Variable, Public Sans, sans-serif'
    fontSize: '10px'
    fontWeight: 570
  raw-response:
    fontFamily: 'monospace'
    fontSize: '10px'
    lineHeight: 1.7
rounded:
  '3': '3px'
  '4': '4px'
  '5': '5px'
  '6': '6px'
  '7': '7px'
  radius: '12px'
  dot: '100%'
spacing:
  '4': '4px'
  '7': '7px'
  '8': '8px'
  '9': '9px'
  '10': '10px'
  '12': '12px'
  '14': '14px'
  '16': '16px'
  '20': '20px'
  '22': '22px'
  '24': '24px'
  '28': '28px'
  '30': '30px'
components:
  button-primary:
    backgroundColor: '{colors.blue}'
    textColor: '{colors.surface}'
    typography: '{typography.control}'
    rounded: '{rounded.7}'
    padding: '0 16px'
  button-primary-hover:
    backgroundColor: '{colors.blue-dark}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.control}'
    rounded: '{rounded.7}'
    padding: '0 16px'
  button-secondary-hover:
    backgroundColor: '{colors.button-hover}'
  button-compact:
    typography: '{typography.compact-control}'
    padding: '0 11px'
  button-danger:
    backgroundColor: '{colors.danger-surface}'
    textColor: '{colors.danger}'
    rounded: '{rounded.7}'
  button-connected:
    backgroundColor: '{colors.connected-surface}'
    textColor: '{colors.connected-ink}'
    rounded: '{rounded.7}'
  button-icon:
    backgroundColor: 'transparent'
    textColor: '{colors.muted}'
    rounded: '{rounded.6}'
    padding: '0'
    width: '34px'
    height: '34px'
  button-icon-hover:
    backgroundColor: '{colors.icon-hover}'
    textColor: '{colors.ink}'
  button-text:
    backgroundColor: 'transparent'
    textColor: '{colors.blue}'
    typography: '{typography.compact-control}'
    padding: '3px 0'
  input-field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.6}'
    padding: '9px 12px'
  main-navigation:
    textColor: '{colors.muted}'
    typography: '{typography.navigation}'
  main-navigation-active:
    textColor: '{colors.blue}'
  model-chip:
    backgroundColor: '{colors.blue-pale}'
    textColor: '{colors.blue-dark}'
    rounded: '{rounded.5}'
    padding: '7px 9px'
  form-section:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.radius}'
    padding: '28px'
  chessboard:
    rounded: '{rounded.4}'
    width: '100%'
---

# Design System: GameBench

## Overview

**Creative North Star: "Research workbench"**

Cool pale surfaces, graphite text, deep blue controls, and Public Sans form a quiet working environment. Compact labels and square data rows carry the record; headings and restrained rounded controls establish hierarchy. The slate chessboard belongs to the same material palette as the surrounding interface.

Flat surfaces and thin dividers keep related measurements legible. Color identifies actions, selection, and status; visible status text accompanies its color. The committed world is recorded in [PRODUCT.md](PRODUCT.md) and [the surface brief](docs/arena-surface.md), with the implemented source as the authority for values.

This is a source-derived record of `client/src/styles.css`, `App.tsx`, `Board.tsx`, and `main.tsx`. The validated Empty, Setup, and Live screenshots in `client/.impeccable/review` precede the final contrast and operator-control changes; they do not establish visual approval of the final source. Sidecar tonal ramps are generated swatch previews, not additional shipped color tokens.

**Key Characteristics:**

- Cool pale grounds and white working surfaces.
- Public Sans with tabular numerals throughout the interface.
- Blue action and selection states, plus text-bearing operational status.
- Flat, square data rows within softly rounded containers.
- A slate chessboard with outlined SVG pieces and restrained move motion.

## Colors

The palette combines cool neutral surfaces with a deep blue action color and distinct operational signals; frontmatter values are normative.

### Primary

- **Workbench Blue** (`blue`): primary actions, links, selected moves, progress fills, and active navigation.
- **Pressed Blue** (`blue-dark`): primary-button hover, selected-model text, and live-response headings.
- **Blue Wash** (`blue-pale`): selected models and matches, model chips, and live-response containers.
- **Focus Blue** (`focus`): the keyboard outline and search-field focus treatment.

### Secondary

- **Running Green** (`status-running`) and **Live Green** (`live`): running or accepted-action status and the live connection indicator, each beside text.
- **Completed Blue** (`status-completed`): completed status text and dot.
- **Paused Amber** (`status-paused`): paused or timed-out status.
- **Failure Red** (`danger`): invalid, interrupted, and provider-error status, error text, and stop controls. Its pale surface and border belong to the stop-button variant.
- **Connected Green** (`connected-ink`): the saved-token control, with its connected surface and border.
- **Move Yellow** (`move-highlight`): a translucent overlay on the source and destination squares of the selected last move.

### Neutral

- **White Surface** (`surface`) and **Cool Canvas** (`canvas`): working panels and page ground.
- **Graphite** (`ink`) and **Slate Text** (`muted`): headings and data, followed by descriptions, metadata, and placeholders.
- **Divider** (`line`): container edges, tables, rails, and section boundaries.
- **Rail Paper** (`rail`) and **Support Wash** (`support-surface`): the run rail, move record, connection strip, and launch summary.
- **Control Strokes** (`field-border`, `button-border`, `button-hover-border`): input and button edges. The button and icon hover grounds are recorded separately.
- **Board Slate** (`board-light`, `board-dark`): alternating squares. Separate coordinate inks (`board-light-coordinate`, `board-dark-coordinate`) preserve the implemented labels on each ground.
- **Piece Ivory** (`piece-white`) and **Piece Graphite** (`piece-black`): SVG pieces with their separate contrasting stroke tokens.

**The Status Text Rule.** Keep the status name or connection message beside its colored indicator.

## Typography

**Display and Body Font:** Public Sans Variable, Public Sans, sans-serif. The variable font is self-hosted through the Fontsource import in `main.tsx`.

**Raw Response Font:** the CSS monospace family, used for recorded response blocks and inline code.

The same sans-serif face handles headings, controls, and tables. Variable weights distinguish emphasis without a second display face. Tabular numerals apply at the root so costs, timings, progress, and scores align.

### Hierarchy

- **Display:** the empty-state heading uses the `display` role; on narrow screens its size is overridden to (33px).
- **Headline:** page headings use `headline`; the mobile page-heading size is (25px).
- **Title:** section headings use `title`; form headings use (17px), and methodology headings use (20px).
- **Section:** compact inspector and result headings use `section`.
- **Body:** page descriptions start at `body`; workbench explanations and form copy use (11–13px). Methodology lead copy uses (17px), reduced to (15px) on mobile. Reading paragraphs and the result note cap at (75ch) where the source defines it.
- **Control, Label, Data, Caption, Status:** the frontmatter captures the reused (10–13px) working hierarchy. Model chips use (10px); status names use the separately weighted `status` role.
- **Raw Response:** captured text uses the `raw-response` role; inline code uses (12px) with the same line height.

**The Numeric Alignment Rule.** Preserve tabular numerals for measurements and score tables.

## Layout

The page container is centered at a maximum width of (1480px), with desktop padding of (40px 28px 56px). The header shares its width logic and has a minimum height of (76px). The workbench pairs a run rail (236px) with a fluid working surface, using a minimum height of (575px) and internal workspace padding of (26px 28px).

The match view uses three columns: a picker (160px), a board column `minmax(220px, 1fr)`, and an inspector `minmax(200px, 0.9fr)`, separated by (25px). The board maintains a square aspect ratio. Form sections sit beside a launch summary in `minmax(0, 780px)` and `minmax(250px, 300px)` columns with a gap of (54px); fields form two columns with a gap of (22px).

Spacing is recorded from recurring literal values rather than a declared mathematical scale. Small gaps support control groups; (20–30px) intervals separate working regions. Tables use full-width collapsed borders, no rounded row shells, and horizontal scrolling when needed.

- At (1200px) and below, the rail becomes (210px), workspace padding becomes (23px), and the inspector moves beneath the board in column two. Protocol definitions become one column.
- At (900px) and below, the main navigation wraps to its own full-width row. The run rail moves above the workspace and its items scroll horizontally. The form retains a (260px) launch column.
- At (650px) and below, the workspace and form become single-column. Match choices scroll horizontally, the board caps at (390px), field pairs stack, and the launch summary stops being sticky. Main padding becomes (25px 16px 36px).
- At (1550px) and above, the empty-state board column expands to (380px). These are source breakpoints, not a universal device naming scheme.

## Elevation & Depth

The system uses flat surfaces, tonal layers, and one-pixel borders. Cards and controls have no ambient elevation shadows. The only box shadow is the selected workspace tab's blue underline (`0 2px 0 var(--blue)`); the main navigation draws its underline as a pseudo-element. Focus uses an outline, not a shadow.

**The Flat Surface Rule.** Separate working regions with surface tone and dividers; reserve the existing shadow treatment for the selected tab indicator.

## Shapes

Working containers use the root radius token, while controls, fields, chips, and the board use progressively tighter corners. Move selections and progress fills use the smallest recorded radius; status and player-seat dots are circular. Data rows stay square. The brand mark (9px) and empty-state symbol (14px) are local icon treatments rather than new container radii.

The board clips its eight-by-eight grid at its outer corners. Pieces are inline SVG drawings with rounded strokes, occupying (88%) of each square. Interface icons are stroke SVGs sized to their control, typically (13–21px), with larger symbols in the empty and setup states.

## Components

### Buttons

Compact, clear controls express action through fill, text, and border.

- **Primary:** blue fill, white text, control typography, tight rounded corners, padding (0 16px), and minimum height (41px). Hover uses the darker blue. Background and border changes take (0.15s).
- **Secondary:** white fill, graphite text, and a visible control stroke; hover changes the ground and stroke.
- **Compact:** minimum height (34px), padding (0 11px), and compact-control typography. Connected and danger variants keep their status-specific fills and borders.
- **Icon:** a transparent (34px) square with field-sized corners; hover changes the ground and ink. Playback uses narrower local dimensions (29px by 31px).
- **Text:** blue text with padding (3px 0); hover underlines it.
- **Focus and disabled:** interactive controls inherit a focus outline (3px) with offset (3px). Disabled buttons reduce opacity to (0.48) and use the unavailable cursor.

### Chips and status

Selected-model chips use Blue Wash, darker blue text, padding (7px 9px), tight corners, and an inline removal SVG. They wrap with a gap of (7px). Status is an inline text label with a circular dot (5px), not a pill-shaped container; the source converts underscores to spaces in visible status text.

### Cards and containers

Form sections use white surfaces, the root container radius, a one-pixel divider border, and padding (28px). Their padding reduces at the responsive breakpoints. The workbench encloses its rail and workspace in the same outer corner language. The launch summary uses Support Wash and stays (24px) from the viewport top on wide layouts. Containers remain flat at rest.

### Inputs and fields

Text inputs and selects have a white surface, graphite text, a field stroke, field-sized corners, minimum height (41px), and padding (9px 12px). Labels sit above fields with a gap of (9px); helper copy follows at (7px). Placeholders use the `muted` token, and the caret uses blue. Search puts its SVG and input inside one stroke; focus surrounds the shared wrapper. Model checkboxes use blue accent color.

### Navigation

Main navigation uses muted labels; the active route uses blue text and a bottom rule (2px). Links retain hover underlining and the global keyboard outline. The mobile header places navigation on a separate row. Workspace tabs repeat the underline language with slightly smaller labels, using `aria-selected`, a single tab stop, arrow keys, Home, and End to manage selection.

### Chessboard and move inspection

The slate board uses an eight-column square grid, separate coordinate ink for each square tone, and the outlined white and black SVG pieces from `Board.tsx`. Rank and file labels sit (3px) from their edges; label size is fluid (7–10px), with a mobile override of (9px). A board-wide text alternative names the position, side to move, and pieces.

Selecting a move updates both the position and response detail. The selected move uses a blue fill with white text in a compact square data row. The last move highlights both involved squares; its overlay settles from opacity (0.8) to (0.4) over (0.8s). The arriving piece translates into place over (0.36s), with `cubic-bezier(0.16, 1, 0.3, 1)`. The loading indicator rotates over (1.1s) linearly. Reduced-motion preferences remove animation and transitions and disable smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** use blue for primary actions, links, progress, and selection.
- **Do** retain visible status text beside color indicators.
- **Do** preserve Public Sans and tabular numerals for working data.
- **Do** use flat surfaces, thin dividers, and square data rows inside the recorded container shapes.
- **Do** keep board labels, focus outlines, and placeholder text in their recorded contrast treatments.
- **Do** retain reduced-motion handling for state transitions and board movement.

### Don't:

- **Don't** replace status names with color alone.
- **Don't** add ambient card shadows to the existing flat container vocabulary.
- **Don't** replace the existing SVG piece and control artwork with text glyphs.
- **Don't** present fabricated rankings, costs, or match results as measured data.
- **Don't** treat generated sidecar color ramps or earlier screenshots as approval of new shipped tokens.
