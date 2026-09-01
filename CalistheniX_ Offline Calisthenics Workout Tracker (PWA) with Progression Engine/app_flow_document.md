# CalistheniX App Flow Document

## Onboarding and Sign-In/Sign-Up

When a new user first navigates to the CalistheniX web address, they land on a clean splash and introduction screen that briefly explains the power of offline calisthenics tracking and guides them to get started. There is no account creation or external login involved, as all data remains on the device by default. On first launch, the user is prompted to set up their weekly training split in the Split Manager. They choose or name each day’s workout grouping and proceed directly into the Workout Editor, where they build or customize one or more workout blueprints. No email or social sign-in options exist, and no sign-out button is shown because the app does not require credentials. If a user closes the browser or loses connectivity, their progress in initial setup remains saved locally and they return to the same setup screen on reload. Password or credential recovery is not applicable since no sign-in exists.

## Main Dashboard or Home Page

After finishing the initial split and workout templates, the user arrives at the Main Dashboard. At the top, a header displays "Today’s Workout" with the name of the routine assigned to the current day of the week. Below the header, a streak indicator and a summary of the last few sessions appear. A left-side navigation panel shows icons or links for Dashboard, Split Manager, Workout Editor, History, Progress, and Settings. This view automatically highlights the current workout and offers a large button labeled "Start Workout". Whenever the user clicks or taps any icon on the sidebar, the main panel transitions smoothly to the corresponding page, ensuring that the user always knows how to return to the Dashboard by tapping the home icon.

## Detailed Feature Flows and Page Transitions

### Split Manager

From the sidebar, the user selects Split Manager to view or edit their weekly schedule. The page shows each day of the week and the workout template assigned to it. The user taps on a day to change its template or to assign a new one. When they tap to add or edit, a modal dialog appears with a dropdown of existing workout blueprints or an option to create a new template. After confirming their choice, the modal closes and the updated schedule is saved immediately to local storage. A back arrow at the top left returns the user to the Main Dashboard.

### Workout Editor

Tapping Workout Editor from the navigation opens a list of all saved workout blueprints. The user can scroll through these and select one to view its details. Within a workout template, exercises are grouped under Warm-up, Main, and Cool-down phases. To add an exercise, the user clicks the “Add Exercise” control, which slides in the global exercise library panel. Here they search by name or muscle group and pick an exercise. They configure target sets, reps, tempo codes, hold durations, or supersets. When they save, the editor writes the template to local storage and returns to the list of templates. Editing or duplicating a template follows the same in-place flow with the save action updating or creating a new entry.

### Live Workout Runner

When the user presses "Start Workout" on the Dashboard, the app transitions into the Live Workout Runner screen. It begins by displaying the Warm-up phase with the first exercise details at the top and a large timer display beneath. The user taps to start their set, logs actual reps or hold durations, and enters RPE if required. Immediately after logging, an audio chime and optional vibration cue mark completion, and the rest countdown begins automatically. The user sees a circular rest timer with time remaining and may pause or adjust duration manually. At the end of rest, another cue signals the next set or exercise unlock. When the Warm-up phase is completed, the screen animates forward to the Main Workout phase in the same layout. On any set that breaks a personal record, a brief celebration banner appears. After completing Main, the runner flows into Cool-down. At the end of the final set, a summary screen shows total volume, any PRs, and a "Finish Session" button. Tapping that returns the user to the Main Dashboard and saves an immutable snapshot in History.

### History View

Selecting History from the sidebar opens a chronological list of past sessions. Each entry shows date, workout name, and a mini heatmap icon. Tapping an entry expands it in place to reveal detailed set logs, tempo data, and hold durations. The user can swipe left on an entry to export that session’s data as JSON. A back gesture or the dashboard icon brings them back to the Dashboard.

### Progress Analytics

When the user opens the Progress tab, they see a series of interactive charts powered by Chart.js. The first chart is a 2-week rolling delta line showing volume change, the second is a long-term bar graph of total workload per week, and a consistency heatmap grid appears for the last four weeks. Each chart has a date range selector at the top. The user taps a point or cell to see a tooltip with exact numbers. An auto-suggestion prompt appears if the progression engine determines readiness to advance an exercise. Tapping the suggestion opens the Workout Editor directly to update that exercise in its template.

### Data Backup and Restore

Under Settings, the user finds the Backup section. Tapping Export opens a full JSON dump dialog with a download button. The file is saved to the user’s device. To restore, the user taps Import, selects a JSON file from storage, and the app validates its format. If valid, the user confirms the overwrite and the app replaces local data while preserving any new templates added after export. After import completes, the Settings page shows a success message and a link to return to the Dashboard.

## Settings and Account Management

The Settings page offers several user preferences. Audio and haptic feedback toggles let the user turn on or off the chimes and vibrations, with a small test button for preview. A theme selector allows switching between dark and light modes. Notification settings configure automatic reminders for scheduled workouts when online. Since there is no cloud account, there are no email or password sections. The Backup and Restore tools appear here as described. A link at the bottom explains how to clear all data, prompting the user with a confirmation dialog. After any change, the page shows a brief tooltip and then the user can click the Dashboard icon to return to daily flow.

## Error States and Alternate Paths

If the user attempts to import a corrupt JSON backup, an error dialog appears explaining the file is invalid and offers buttons to retry or cancel. When the browser’s storage quota reaches critical levels, a yellow warning bar appears at the top of any page, urging the user to back up and clear old data. During a live workout, if connectivity is lost it does not affect the session, but if the browser crashes or is closed, reopening the app brings the user back into the runner at the exact set and timer state they left. If the service worker fails to load cached assets due to an update error, the app falls back to a minimal offline.html page that offers a button to reload and trigger the updated service worker installation. Any manual entry of numeric fields that is out of range triggers an inline validation message and prevents saving until corrected.

## Conclusion and Overall App Journey

In summary, the user begins by installing or visiting the CalistheniX PWA, sets up a weekly split and workout templates, and then jumps into the Main Dashboard to see Today’s Workout. From there, they can edit plans, launch the Live Workout Runner for guided exercise sessions with timing and feedback, and after completion review past sessions or dive into progress analytics for trends and promotion suggestions. Settings provide control over feedback, theme, and data safety via JSON backups. Across every page, state persistence and offline support ensure the athlete never loses progress, making CalistheniX a reliable companion for bodyweight training from onboarding through long-term tracking.

ASCII Flowchart

```
[Landing Page] --> [Split Manager] --> [Workout Editor] --> [Main Dashboard]
          |                                         |
          |                                         v
          |                                   [Start Workout]
          v                                         |
[Offline.html Fallback]                        [Live Workout Runner]
                                                  |
                                                  v
                                         [Session Summary]
                                                  |
                                                  v
                                  [Dashboard] <-- [History] <-->
                                                  ^
                                                  |
                                       [Progress Analytics]
                                                  |
                                                  v
                                              [Settings]
                                                  |
                                    [Backup] <---> [Restore]
```