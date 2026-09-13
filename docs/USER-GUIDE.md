# Modern Data Analyst User Guide

This guide explains how to use every learner and teacher feature in **Modern Data Analyst — AI Agent Era**. The app is self-paced and runs entirely in your browser; it does not require an account or backend.

## Getting Started

1. Start a static server from the repository root:

   ```bash
   cd app
   python3 -m http.server 8123
   ```

2. Open `http://localhost:8123/` in a modern browser.
3. Open a module from the course cards or module navigation.

You can also open the local `app/index.html` directly if your browser permits local content loading; a static server is the recommended method.

## Home Page

- **Module cards** provide short descriptions and direct access to all 15 modules and the final assessment.
- **Review packs** list flashcards scheduled for today.
- **Progress summary** links to the final assessment, progress export/import, and completion certificate.

## Course Navigation

### Module Sidebar

- The left sidebar shows course progress and every module.
- An empty badge means **not started**.
- A colored badge means **visited**.
- A check badge means **checkpoint quiz passed**.
- The current module is highlighted.
- On mobile, select the **☰** button to open the sidebar, then select a module. Select the backdrop or press `Esc` to close it.

### Bottom Module Navigation

- At the end of each page, use **← Previous** and **Next →** to move between modules.
- The module registry includes Modules 1–15 followed by the final assessment.

### Top Navigation

- **Home** returns to the course overview.
- **Modules** opens Module 1.
- **Final** opens the final assessment and completion tools.

## Guided Walkthrough Mode

Every content module is presented as a guided walkthrough.

- Use **← Previous** and **Next →** below a slide to move one slide at a time.
- Select any progress dot to jump to a specific slide.
- Use the left and right arrow keys to move between slides.
- The slide indicator shows your current position, such as `Slide 3 / 7`.
- The app remembers your last slide in the current module and returns you there later.
- Slide addresses can be shared or bookmarked, for example `#/module/M2/s3`.

Interactive components mount only when their slide is shown, which keeps the initial module load fast.

## Read Mode

Read mode shows the complete module as a continuous document.

- Select **Read mode** in the slide toolbar to leave guided flow.
- Select **Flow mode** to return to the same guided slide.
- Read mode mounts all module components and is useful when you want full context or easier scrolling.

## Presentation Mode

Presentation mode is designed for teaching and screen sharing.

- Select **Present**, or press `P` or `F`, to enter full-screen presentation mode.
- Use the left and right arrow keys to change slides.
- Press `N` to show or hide the speaker note, when a slide includes one.
- Press `Esc` or select the presentation control to exit.

Presentation mode enlarges text and hides non-teaching controls.

## Quizzes

### Checkpoint Quizzes

Checkpoint quizzes are marked **✅ Checkpoint quiz**.

1. Select an answer.
2. Select **Check**.
3. Review the explanation.

The first attempt is recorded. A perfect first attempt marks the module as passed. Repeating a checkpoint can support learning, but it does not replace the recorded first attempt.

### Practice Checks

Practice checks are marked **🟡 Practice check**.

1. Select an answer.
2. Select **Check**.
3. Read the feedback.
4. Select **Try again** to retry with a fresh answer.

Practice checks are formative only: they never affect progress, badges, or the certificate.

## Confidence Reflection

After a module, answer **How well did this module land?**

- **🟢 Got it**
- **🟡 Shaky**
- **🔴 Lost**

Your selection is saved locally and does not affect module completion or the certificate. Use it to flag modules for a later review session.

## Flashcards

Flashcards provide quick retrieval practice.

1. Select **Flip** to reveal the answer.
2. Select **Got it** if you answered it correctly.
3. Select **Miss** if you did not.

Flashcards use a three-box Leitner schedule. A correct answer promotes the card to the next review box and schedules it later; a miss returns it to an earlier box and schedules it sooner. Card scheduling is stored only in your browser.

## Review Packs

Review packs appear on Home and the Final Assessment page.

- Cards due today are listed as direct links.
- Select a card link to open the module containing that flashcard.
- If no card is due, continue with new material or revisit a module you marked as shaky or lost.

## Interactive Labs

### Modern Analytics Pipeline

This lab compares agent work with analyst responsibility.

1. Select any pipeline stage: Ask, Acquire, Prepare, Analyze, Interpret, Communicate, or Automate.
2. Review the **Agent** task and **Analyst** responsibility.
3. Move through all stages to understand the division of judgment and execution.

### Agent Trace Simulator

This lab steps through a deterministic analyst-agent workflow.

- Select **Advance →** to reveal the next event.
- Select **← Back** to review a previous event.
- Use the trace to see where the analyst approves scope, challenges an explanation, and approves the final recommendation.

### Data Guardrails Lab

This lab shows why publication should be blocked when critical controls fail.

- Enable or disable checks for row count, freshness, reconciliation, null rate, model drift, and privacy.
- The result changes between **Publication blocked** and **Ready for human approval**.
- Leaving every check disabled is intentionally marked as untrustworthy.

### Chart Lab

The chart lab lets you explore an interactive series chart.

- Adjust **Window** to change the rolling-statistic period.
- Adjust **Range** to narrow the displayed observations.
- Toggle **rolling stats** to add rolling mean and rolling standard-deviation series.

## Progress and Completion

Course progress is calculated from perfect first-attempt checkpoint scores. Practice checks and confidence selections do not count toward completion.

The certificate unlocks only after all 15 modules and the final assessment are passed. Until then, the completion panel shows:

- Modules passed
- Modules visited but incomplete
- Modules not started
- Direct links to each incomplete item

When all requirements are complete, the certificate shows the completion date and total score.

## Progress Export and Import

Progress is stored in your browser under the local storage key `mda-progress-v1`.

### Export Progress

1. Open the **Final** page.
2. Enter your name in the progress kit.
3. Select **Generate code**.
4. Copy the resulting `MDA1....` code and keep it somewhere safe.

The export includes your progress, student name, and export time. It does not contain your flashcard schedule or confidence selections.

### Import Progress

1. Open the Final page on the browser or device you want to restore.
2. Paste a valid `MDA1....` code into the progress code field.
3. Select **Import**.
4. Your checkpoint progress will be restored locally.

Import replaces the current progress data in that browser, so only import a code you trust.

## Teacher Progress Viewer

Teachers can review submitted progress codes without an account or backend.

1. Open `app/teacher.html` from the same static server, for example `http://localhost:8123/teacher.html`.
2. Paste one `MDA1....` progress code per line.
3. Select **Parse submissions**.
4. Review the valid count, invalid count, student names, export dates, modules passed, and percentages.

The teacher viewer decodes codes locally in the browser. Invalid lines are reported without preventing valid lines from being parsed.

## Themes

Use the theme selector in the top bar:

- **Midnight**
- **Daylight**
- **Sepia**
- **Nord**
- **Blossom**

Your choice is saved locally and reapplied on the next visit.

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Next slide | `→` |
| Previous slide | `←` |
| Enter presentation mode | `P` or `F` |
| Exit presentation mode | `Esc` |
| Toggle speaker note | `N` in presentation mode |
| Close mobile drawer | `Esc` |

## Privacy and Data Storage

- The app runs entirely in the browser.
- No account, login, backend, or tracking service is required.
- Progress, confidence, theme, and flashcard scheduling are stored locally.
- Exporting a progress code is the only way to intentionally share checkpoint progress.

Clearing browser data for this site removes local progress and review state.

## Troubleshooting

- **Content does not update after edits:** hard refresh the browser, typically `Cmd+Shift+R` on macOS or `Ctrl+Shift+R` elsewhere.
- **Progress disappeared:** the app reads from the browser profile that created it. Try the same browser/profile or import your saved `MDA1....` code.
- **Import fails:** confirm the code begins with `MDA1.`, was copied completely, and came from this course.
- **Certificate is locked:** check the completion list for any module or final assessment without a passing first-attempt score.
- **Mobile navigation is hidden:** select the **☰** button to open the module drawer.

## Recommended Learning Flow

1. Work modules in order because later modules build on earlier concepts.
2. Complete the checkpoint quiz before moving on.
3. Use practice checks and flashcards freely; they cannot harm your score.
4. Mark shaky or lost modules before leaving a topic.
5. Return to the review pack before starting the next module.
6. Export your progress after each study session.
7. Complete the final assessment and download or print the certificate when unlocked.
