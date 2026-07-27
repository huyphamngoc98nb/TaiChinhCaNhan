# App Lock Android QA

Run this checklist on at least one supported Android device before release. Use a
draft transaction with recognizable unsaved values to verify that navigation and
form state are preserved.

## Background and timeout

- Open Recent Apps and return within the configured timeout: the privacy shield
  hides financial data and the app returns without an unlock prompt.
- Switch to another app for longer than each configured timeout boundary: unlock
  is required at the boundary, not before it.
- Verify Immediate, 30 seconds, 1, 2, 5 and 15 minutes.
- Select Never, leave the app in the background, then return: elapsed time alone
  does not lock the app.
- Repeat background/foreground transitions quickly several times and confirm
  there is one stable unlock screen and no navigation reset.

## Device lock

- Turn the screen off and on after five seconds: unlock is required.
- Press the device lock button and return: unlock is required.
- With automatic locking set to Never, lock the device and return: unlock is
  still required.
- Unlock Android with PIN and biometrics in separate runs.
- Rotate the device and repeat after Android recreates the activity.

## System UI

- Open and dismiss the notification panel, permission dialog, file picker, share
  sheet, date picker, keyboard/IME switcher and biometric prompt.
- Confirm these surfaces do not start the background timeout or create a second
  biometric prompt.
- Confirm the native privacy shield does not remain visible after returning.

## Navigation and data

- Repeat timeout and device-lock flows while adding and editing a transaction,
  viewing reports, changing a report period, and while a modal is open.
- After successful unlock, confirm the same route, modal and unsaved form values
  remain.
- Press Back on the unlock screen and open the app through a launcher icon, deep
  link and notification. None may reveal or navigate around protected content.

## Sensitive operations

- Export backup and reports, restore a backup, erase local data and disable
  biometric unlock. Cancelled or failed authentication must leave data unchanged.
- Background the app while the step-up prompt is open. The request must be
  cancelled and the sensitive operation must not continue.
- Lock the device within the five-minute step-up cache and verify that a new
  authentication is required afterward.

## Privacy

- Inspect the Recent Apps snapshot from transaction, wallet, loan, report,
  backup and security screens. No financial data or PIN input may be visible.
- Confirm screenshots remain available on ordinary report screens and blocked on
  PIN, security and backup/restore screens.
