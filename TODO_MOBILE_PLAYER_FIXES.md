# Mobile Player Fixes TODO

## Critical Issues to Fix
- [ ] Fix single tap detection (currently misidentifies as double taps)
- [ ] Prevent touch gestures from blocking button clicks
- [ ] Improve tap vs double-tap detection timing
- [ ] Add touch-action: manipulation CSS to buttons
- [ ] Fix touch event conflicts in control panel
- [ ] Optimize gesture recognition thresholds
- [ ] Add debouncing for smoother interactions
- [ ] Ensure buttons register single taps correctly

## Implementation Steps
1. Update touch event handlers in VideoPlayer component
2. Add proper event prevention on interactive elements
3. Improve tap detection logic with better thresholds
4. Add touch-action CSS classes
5. Test button responsiveness
6. Verify gesture conflicts are resolved
