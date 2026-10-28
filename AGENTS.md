<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Gesture classification is pure geometry in `src/lib/gestures.ts` (tested in `gestures.test.ts`); keep it framework-free so demo mode, illustrations and tests share the same synthetic poses.
- All camera/MediaPipe lifecycle lives in `src/hooks/use-hand-tracker.ts`; MediaPipe is dynamically imported so SSR never loads it.
- Counting values belong to gesture metadata, with distinct poses for three and four and shared existing poses for zero, one, two and five; this avoids competing labels for identical hand shapes.
- Two-hand snapshots are ordered by handedness and debounced as a pair; sum counting metadata only when every visible hand has a counting pose to avoid partial totals.
- Symbol and starter ASL modes select separate candidate sets from shared geometry; identical shapes get mode-specific labels rather than competing predictions, and ASL support is explicitly limited to static letters.
