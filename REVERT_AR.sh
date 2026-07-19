#!/usr/bin/env bash
# Run ONLY if the import cleanup broke something on device. Reverts the cleanup
# commit (restores the unused imports), keeps clean history.
set -e
git revert 9bc4982 --no-edit
git push origin main

# Previous safety net (engraving removal) — uncomment if you need to restore the
# ring engraving render + UI + price line instead:
# git revert c18d5e4 --no-edit
# git push origin main
