# Usability Validation Kit

This folder provides reproducible usability evidence for dissertation Chapter 6.

## Protocol

1. Use a clean local profile and launch Myriad.
2. Ask each participant to complete three tasks:
   - Import browser/chat data and reach the stats dashboard.
   - Create a habit-change goal with a max daily minute target.
   - Use the intervention panel to choose one action to stop an unwanted habit.
3. Record task completion times in `results-template.csv` format.
4. Collect SUS responses (1-5) for questions Q1-Q10.
5. Add one qualitative observation per participant.

## Metrics

- Task completion median and average (seconds)
- SUS mean score out of 100
- Qualitative themes grouped by repeated notes

## Generate Summary

```bash
npm run usability:report
```

This updates `artifacts/usability/summary.md`.
